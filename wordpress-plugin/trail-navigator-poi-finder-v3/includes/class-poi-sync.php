<?php
/**
 * POI Sync Class
 * 
 * Handles Google Places API integration and POI synchronization
 * with coordinate thinning and progress tracking
 */

if (!defined('ABSPATH')) {
    exit;
}

class TNPOI_Sync {
    
    private $api_key;
    private $db;
    public $interval = 200; // Default sampling interval in meters
    
    public function __construct() {
        $this->db = new TNPOI_POI_DB();
        $settings = new TNPOI_Settings();
        $this->api_key = $settings->get_setting('google_places_api_key');
        // API key logging removed for clean log
        
        add_action('wp_ajax_tnpoi_sync_pois', array($this, 'ajax_sync_pois'));
        add_action('wp_ajax_tnpoi_get_sync_progress', array($this, 'ajax_get_sync_progress'));
        add_action('wp_ajax_tnpoi_start_zone_sync', array($this, 'ajax_start_zone_sync'));
        add_action('wp_ajax_tnpoi_get_zone_sync_progress', array($this, 'ajax_get_zone_sync_progress'));
    }
    
    /**
     * AJAX handler for POI synchronization
     */
    public function ajax_sync_pois() {
        check_ajax_referer('tnpoi_sync_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $action = sanitize_text_field($_POST['action_type'] ?? '');
        
        switch ($action) {
            case 'start':
                $this->start_sync();
                break;
            case 'stop':
                $this->stop_sync();
                break;
            default:
                wp_send_json_error('Invalid action');
        }
    }
    
    /**
     * AJAX handler for sync progress
     */
    public function ajax_get_sync_progress() {
        check_ajax_referer('tnpoi_sync_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $progress = get_transient('tnpoi_sync_progress');
        if (!$progress) {
            $progress = array(
                'status' => 'idle',
                'current' => 0,
                'total' => 0,
                'message' => 'No sync in progress'
            );
        }
        
        wp_send_json_success($progress);
    }
    
    /**
     * AJAX handler for starting zone-based trail sync
     */
    public function ajax_start_zone_sync() {
        error_log('TNPOI DEBUG: ajax_start_zone_sync called');
        
        // Log nonce value
        error_log('TNPOI DEBUG: Received nonce: ' . (isset($_POST['nonce']) ? $_POST['nonce'] : 'NOT SET'));
        
        // Log user info
        $current_user = wp_get_current_user();
        error_log('TNPOI DEBUG: Current user: ' . $current_user->user_login . ' (ID: ' . $current_user->ID . ')');
        
        // Check nonce
        $nonce_ok = false;
        try {
            check_ajax_referer('tnpoi_sync_nonce', 'nonce');
            $nonce_ok = true;
            error_log('TNPOI DEBUG: Nonce check passed');
        } catch (Exception $e) {
            error_log('TNPOI DEBUG: Nonce check failed: ' . $e->getMessage());
        }
        
        // Check capability
        if (!current_user_can('manage_options')) {
            error_log('TNPOI DEBUG: current_user_can(manage_options) FAILED');
            wp_die('Unauthorized');
        } else {
            error_log('TNPOI DEBUG: current_user_can(manage_options) PASSED');
        }
        
        $trail_id = sanitize_text_field($_POST['trail_id'] ?? '');
        $search_radius = intval($_POST['search_radius'] ?? 500);
        $coordinate_interval = intval($_POST['coordinate_interval'] ?? 200);
        
        error_log('TNPOI DEBUG: trail_id=' . $trail_id . ', search_radius=' . $search_radius . ', coordinate_interval=' . $coordinate_interval);
        
        if (empty($trail_id)) {
            error_log('TNPOI DEBUG: Trail ID is required but missing');
            wp_send_json_error('Trail ID is required');
        }
        
        error_log('TNPOI DEBUG: Calling start_zone_based_trail_sync');
        $this->start_zone_based_trail_sync($trail_id, $search_radius, $coordinate_interval);
    }
    
    /**
     * AJAX handler for zone sync progress
     */
    public function ajax_get_zone_sync_progress() {
        check_ajax_referer('tnpoi_sync_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $progress = get_transient('tnpoi_zone_sync_progress');
        if (!$progress) {
            $progress = array(
                'status' => 'idle',
                'current' => 0,
                'total' => 0,
                'message' => 'No zone sync in progress'
            );
        }
        
        wp_send_json_success($progress);
    }
    
    /**
     * Start POI synchronization
     */
    private function start_sync() {
        if (empty($this->api_key)) {
            wp_send_json_error('Google Places API key not configured');
        }
        
        $search_terms = get_option('tnpoi_search_terms', array());
        if (empty($search_terms)) {
            wp_send_json_error('No search terms configured');
        }
        
        // Initialize progress
        $total_terms = count($search_terms);
        $progress = array(
            'status' => 'running',
            'current' => 0,
            'total' => $total_terms,
            'message' => 'Starting sync...'
        );
        set_transient('tnpoi_sync_progress', $progress, HOUR_IN_SECONDS);
        
        // Start background process
        wp_schedule_single_event(time(), 'tnpoi_process_sync', array($search_terms, 0));
        
        wp_send_json_success(array(
            'message' => 'Sync started',
            'total_terms' => $total_terms
        ));
    }
    
    /**
     * Stop POI synchronization
     */
    private function stop_sync() {
        $progress = array(
            'status' => 'stopped',
            'current' => 0,
            'total' => 0,
            'message' => 'Sync stopped by user'
        );
        set_transient('tnpoi_sync_progress', $progress, HOUR_IN_SECONDS);
        
        wp_clear_scheduled_hook('tnpoi_process_sync');
        
        wp_send_json_success('Sync stopped');
    }
    
    /**
     * Process sync in background
     */
    public function process_sync($search_terms, $current_index = 0) {
        if ($current_index >= count($search_terms)) {
            $this->complete_sync();
            return;
        }
        
        $term = $search_terms[$current_index];
        $this->sync_search_term($term);
        
        // Update progress
        $progress = array(
            'status' => 'running',
            'current' => $current_index + 1,
            'total' => count($search_terms),
            'message' => "Processed: {$term['name']}"
        );
        set_transient('tnpoi_sync_progress', $progress, HOUR_IN_SECONDS);
        
        // Schedule next batch
        wp_schedule_single_event(time() + 2, 'tnpoi_process_sync', array($search_terms, $current_index + 1));
    }
    
    /**
     * Sync a single search term
     */
    private function sync_search_term($term) {
        $location = $term['location'];
        $radius = intval($term['radius']);
        $types = $term['types'];
        
        // Search for places
        $places = $this->search_places($location, $radius, $types);
        
        if (empty($places)) {
            return;
        }
        
        // Save all POIs (no coordinate thinning)
        foreach ($places as $place) {
            $this->save_poi($place, $term);
        }
    }
    
    /**
     * Search Google Places API with enhanced coverage
     */
    private function search_places($location, $radius, $types) {
        $places = array();
        $places_by_id = array(); // Track places by ID to avoid duplicates
        $next_page_token = null;

        // Only use types that are explicitly allowed (not ignored)
        $type_param = '';
        if (!empty($types) && is_array($types)) {
            // Remove duplicates and empty values
            $types = array_filter(array_unique($types));
            if (!empty($types)) {
                $type_param = implode('|', $types);
            }
        }

        // If no allowed types, do not perform any search
        if (empty($type_param)) {
            error_log('TNPOI DEBUG: No allowed place types to search for at ' . $location . '. Skipping API call.');
            return array();
        }

        // Only one search strategy: use the allowed types
        $search_strategies = array();
        $search_strategies[] = array('type' => $type_param, 'name' => 'with allowed types: ' . $type_param);

        foreach ($search_strategies as $strategy) {
            $strategy_places = array();
            $next_page_token = null;
            $total_strategy_results = 0;

            do {
                $args = array(
                    'location' => $location,
                    'radius' => $radius,
                    'key' => $this->api_key
                );

                // Add types parameter if specified
                if (!empty($strategy['type'])) {
                    $args['type'] = $strategy['type'];
                }

                $url = add_query_arg($args, 'https://maps.googleapis.com/maps/api/place/nearbysearch/json');
                if ($next_page_token) {
                    $url = add_query_arg('pagetoken', $next_page_token, $url);
                }

                $response = wp_remote_get($url);
                if (is_wp_error($response)) {
                    error_log('TNPOI DEBUG: Google Places API WP_Error: ' . $response->get_error_message());
                    break;
                }

                $body = wp_remote_retrieve_body($response);
                $data = json_decode($body, true);
                $num_results = isset($data['results']) && is_array($data['results']) ? count($data['results']) : 0;
                $total_strategy_results += $num_results;

                if (!$data || $data['status'] !== 'OK') {
                    break;
                }

                $strategy_places = array_merge($strategy_places, $data['results']);
                $next_page_token = $data['next_page_token'] ?? null;

                if ($next_page_token) {
                    sleep(2);
                }
            } while ($next_page_token);

            // Merge places from this strategy, avoiding duplicates
            $new_places = 0;
            foreach ($strategy_places as $place) {
                $place_id = $place['place_id'] ?? '';
                if (!empty($place_id) && !isset($places_by_id[$place_id])) {
                    $places[] = $place;
                    $places_by_id[$place_id] = true;
                    $new_places++;
                }
            }

            // Add delay between strategies to avoid rate limiting (not needed with only one strategy)
        }

        // Compare with OSM data if available
        $this->compare_with_osm_data($location, $radius, $places);

        // Log every POI returned by Google Places at this point
        if (!empty($places)) {
            error_log('TNPOI DEBUG: Google Places API returned the following POIs at ' . $location . ':');
            foreach ($places as $place) {
                $name = $place['name'] ?? 'Unknown';
                $types = isset($place['types']) ? implode(', ', $place['types']) : 'No types';
                $vicinity = $place['vicinity'] ?? 'No address';
                error_log('TNPOI DEBUG:   - "' . $name . '" [' . $types . '] at ' . $vicinity);
            }
        }

        return $places;
    }
    
    /**
     * Compare Google Places results with OSM data for coverage analysis
     */
    private function compare_with_osm_data($location, $radius, $google_places) {
        // Parse location
        $coords = explode(',', $location);
        if (count($coords) !== 2) {
            return;
        }
        
        $lat = floatval(trim($coords[0]));
        $lng = floatval(trim($coords[1]));
        
        // Query OSM data for comparison
        $osm_data = $this->query_osm_area_data($lat, $lng);
        
        if (empty($osm_data)) {
            error_log('TNPOI DEBUG: No OSM data available for comparison at ' . $location);
            return;
        }
        
        // Count OSM POIs
        $osm_poi_count = 0;
        if (isset($osm_data['elements']) && is_array($osm_data['elements'])) {
            foreach ($osm_data['elements'] as $element) {
                if (isset($element['tags']) && !empty($element['tags'])) {
                    $osm_poi_count++;
                }
            }
        }
        
        $google_places_count = count($google_places);
        
        $coverage_ratio = $osm_poi_count > 0 ? round(($google_places_count / $osm_poi_count) * 100, 1) : 0;
        error_log('TNPOI DEBUG: Coverage at ' . $location . ' - Google: ' . $google_places_count . ', OSM: ' . $osm_poi_count . ', Ratio: ' . $coverage_ratio . '%');
        
        // Log summary of Google Places POIs found
        if (!empty($google_places)) {
            error_log('TNPOI DEBUG: Google Places found ' . count($google_places) . ' POIs at ' . $location);
        }
    }
    
    /**
     * Apply coordinate thinning to reduce density
     */
    private function thin_coordinates($places, $min_distance) {
        if (empty($places)) {
            return array();
        }
        
        $thinned = array();
        $thinned[] = $places[0]; // Keep first place
        
        foreach ($places as $place) {
            $keep = true;
            
            foreach ($thinned as $kept_place) {
                $distance = $this->calculate_distance(
                    $place['geometry']['location']['lat'],
                    $place['geometry']['location']['lng'],
                    $kept_place['geometry']['location']['lat'],
                    $kept_place['geometry']['location']['lng']
                );
                
                if ($distance < $min_distance) {
                    $keep = false;
                    break;
                }
            }
            
            if ($keep) {
                $thinned[] = $place;
            }
        }
        
        return $thinned;
    }
    
    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    private function calculate_distance($lat1, $lng1, $lat2, $lng2) {
        $earth_radius = 6371000; // meters
        
        $lat1_rad = deg2rad($lat1);
        $lng1_rad = deg2rad($lng1);
        $lat2_rad = deg2rad($lat2);
        $lng2_rad = deg2rad($lng2);
        
        $dlat = $lat2_rad - $lat1_rad;
        $dlng = $lng2_rad - $lng1_rad;
        
        $a = sin($dlat / 2) * sin($dlat / 2) +
             cos($lat1_rad) * cos($lat2_rad) *
             sin($dlng / 2) * sin($dlng / 2);
        
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        
        return $earth_radius * $c;
    }
    
    /**
     * Haversine distance calculation (alias for calculate_distance)
     */
    private function haversine_distance($lat1, $lng1, $lat2, $lng2) {
        return $this->calculate_distance($lat1, $lng1, $lat2, $lng2);
    }
    
    /**
     * Save POI to database
     */
    private function save_poi($place, $term) {
        $poi_data = array(
            'place_id' => $place['place_id'],
            'name' => $place['name'],
            'address' => $place['vicinity'] ?? '',
            'latitude' => $place['geometry']['location']['lat'],
            'longitude' => $place['geometry']['location']['lng'],
            'types' => implode(',', $place['types']),
            'rating' => $place['rating'] ?? 0,
            'user_ratings_total' => $place['user_ratings_total'] ?? 0,
            'price_level' => $place['price_level'] ?? 0,
            'search_term' => $term['name'],
            'search_location' => $term['location'],
            'search_radius' => $term['radius'],
            'created_at' => current_time('mysql'),
            'updated_at' => current_time('mysql')
        );
        $result = $this->db->insert_or_update_poi($poi_data);
        // Only log errors, not successful saves to reduce spam
        if ($result === false) {
            error_log('TNPOI DEBUG: Failed to save POI: ' . $poi_data['name'] . ' (' . $poi_data['place_id'] . ')');
        }
    }
    
    /**
     * Complete sync process
     */
    private function complete_sync() {
        $progress = array(
            'status' => 'completed',
            'current' => 0,
            'total' => 0,
            'message' => 'Sync completed successfully'
        );
        set_transient('tnpoi_sync_progress', $progress, HOUR_IN_SECONDS);
        
        // Clear scheduled events
        wp_clear_scheduled_hook('tnpoi_process_sync');
    }
    
    /**
     * Get sync statistics
     */
    public function get_sync_stats() {
        global $wpdb;
        
        $table_name = $this->db->get_table_name();
        
        $stats = array(
            'total_pois' => $wpdb->get_var("SELECT COUNT(*) FROM $table_name"),
            'recent_pois' => $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM $table_name WHERE created_at >= %s",
                date('Y-m-d H:i:s', strtotime('-24 hours'))
            )),
            'search_terms' => $wpdb->get_var("SELECT COUNT(DISTINCT search_term) FROM $table_name"),
            'last_sync' => get_option('tnpoi_last_sync', 'Never')
        );
        
        return $stats;
    }
    
    /**
     * Get sampled points for a trail (coordinate thinning)
     */
    public function get_sampled_points($trail_id) {
        error_log('TNPOI Sync: Getting sampled points for trail_id: ' . $trail_id);
        
        $trail_config = get_option('trail_navigator_config', array());
        $trails = isset($trail_config['trails']) ? $trail_config['trails'] : array();
        
        error_log('TNPOI Sync: Found ' . count($trails) . ' trails in config');
        
        $selected_trail = null;
        foreach ($trails as $trail) {
            if ((string)$trail['routeId'] === (string)$trail_id) {
                $selected_trail = $trail;
                error_log('TNPOI Sync: Found matching trail: ' . $trail['name']);
                break;
            }
        }
        
        if (!$selected_trail) {
            error_log('TNPOI Sync: No trail found with routeId: ' . $trail_id);
            return array();
        }
        
        if (empty($selected_trail['trackPoints'])) {
            error_log('TNPOI Sync: No trackPoints found in selected trail');
            error_log('TNPOI Sync: Trail keys: ' . implode(', ', array_keys($selected_trail)));
            return array();
        }
        
        error_log('TNPOI Sync: Found ' . count($selected_trail['trackPoints']) . ' track points');
        error_log('TNPOI Sync: Using interval: ' . $this->interval . 'm');
        
        // Use intelligent sampling based on OSM data if available
        if (isset($this->settings) && $this->settings->get_setting('enable_osm_intelligence', false)) {
            error_log('TNPOI Sync: Using intelligent sampling');
            return $this->get_intelligent_sampled_points($selected_trail['trackPoints']);
        }
        
        // Fallback to uniform sampling
        error_log('TNPOI Sync: Using uniform sampling');
        return $this->get_uniform_sampled_points($selected_trail['trackPoints']);
    }
    
    /**
     * Get uniformly sampled points (original method)
     */
    private function get_uniform_sampled_points($track_points) {
        error_log('TNPOI Sync: Starting uniform sampling with ' . count($track_points) . ' points');
        
        $sampled_points = array();
        $last_point = null;
        
        foreach ($track_points as $index => $pt) {
            if (!$last_point) {
                $sampled_points[] = $pt;
                $last_point = $pt;
                error_log('TNPOI Sync: Added first point at index ' . $index);
            } else {
                $dist = $this->haversine_distance($last_point['lat'], $last_point['lng'], $pt['lat'], $pt['lng']);
                if ($dist >= $this->interval) {
                    $sampled_points[] = $pt;
                    $last_point = $pt;
                    error_log('TNPOI Sync: Added point at index ' . $index . ' (distance: ' . round($dist) . 'm)');
                }
            }
        }
        
        error_log('TNPOI Sync: Uniform sampling complete. Sampled ' . count($sampled_points) . ' points from ' . count($track_points) . ' total points');
        return $sampled_points;
    }
    
    /**
     * Get intelligently sampled points using OSM data
     */
    private function get_intelligent_sampled_points($track_points) {
        $sampled_points = array();
        $last_point = null;
        $current_distance = 0;
        
        foreach ($track_points as $pt) {
            if (!$last_point) {
                $sampled_points[] = $pt;
                $last_point = $pt;
                continue;
            }
            
            $dist = $this->haversine_distance($last_point['lat'], $last_point['lng'], $pt['lat'], $pt['lng']);
            $current_distance += $dist;
            
            // Get adaptive interval based on OSM data
            $adaptive_interval = $this->get_adaptive_interval($pt['lat'], $pt['lng']);
            
            if ($current_distance >= $adaptive_interval) {
                $sampled_points[] = $pt;
                $last_point = $pt;
                $current_distance = 0;
            }
        }
        
        return $sampled_points;
    }
    
    /**
     * Get adaptive sampling interval based on OSM data
     */
    private function get_adaptive_interval($lat, $lng) {
        // Query OSM Overpass API for area characteristics
        $osm_data = $this->query_osm_area_data($lat, $lng);
        
        // Analyze the data to determine density
        $density_score = $this->calculate_area_density($osm_data);
        
        // Return adaptive interval based on density
        if ($density_score > 0.7) {
            return 150; // High density: 150m spacing
        } elseif ($density_score > 0.3) {
            return 300; // Medium density: 300m spacing
        } else {
            return 600; // Low density: 600m spacing
        }
    }
    
    /**
     * Query OSM Overpass API for area data
     */
    private function query_osm_area_data($lat, $lng) {
        $radius = 500; // 500m radius to analyze
        
        // Overpass query to get buildings, roads, and amenities
        $query = "
            [out:json][timeout:25];
            (
                way[\"building\"](around:$radius,$lat,$lng);
                way[\"highway\"](around:$radius,$lat,$lng);
                node[\"amenity\"](around:$radius,$lat,$lng);
                way[\"landuse\"](around:$radius,$lat,$lng);
            );
            out body;
            >;
            out skel qt;
        ";
        
        $url = 'https://overpass-api.de/api/interpreter';
        $response = wp_remote_post($url, array(
            'body' => $query,
            'timeout' => 30,
            'headers' => array(
                'Content-Type' => 'application/x-www-form-urlencoded'
            )
        ));
        
        if (is_wp_error($response)) {
            return array();
        }
        
        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }
    
    /**
     * Calculate area density score from OSM data
     */
    private function calculate_area_density($osm_data) {
        if (empty($osm_data['elements'])) {
            return 0.1; // Default to low density if no data
        }
        
        $building_count = 0;
        $road_count = 0;
        $amenity_count = 0;
        $commercial_landuse = 0;
        
        foreach ($osm_data['elements'] as $element) {
            if (isset($element['tags'])) {
                $tags = $element['tags'];
                
                // Count buildings
                if (isset($tags['building'])) {
                    $building_count++;
                }
                
                // Count roads (excluding paths and tracks)
                if (isset($tags['highway']) && !in_array($tags['highway'], ['path', 'track', 'footway'])) {
                    $road_count++;
                }
                
                // Count amenities
                if (isset($tags['amenity'])) {
                    $amenity_count++;
                }
                
                // Check for commercial land use
                if (isset($tags['landuse']) && in_array($tags['landuse'], ['commercial', 'retail', 'industrial'])) {
                    $commercial_landuse++;
                }
            }
        }
        
        // Calculate density score (0-1)
        $total_elements = count($osm_data['elements']);
        if ($total_elements === 0) {
            return 0.1;
        }
        
        // Weighted scoring
        $building_score = min($building_count / 50, 1.0) * 0.4; // 40% weight
        $road_score = min($road_count / 20, 1.0) * 0.3; // 30% weight
        $amenity_score = min($amenity_count / 10, 1.0) * 0.2; // 20% weight
        $commercial_score = min($commercial_landuse / 5, 1.0) * 0.1; // 10% weight
        
        return $building_score + $road_score + $amenity_score + $commercial_score;
    }
    
    /**
     * Start zone-based trail sync using OSM zone data
     */
    public function start_zone_based_trail_sync($trail_id, $search_radius = 500, $coordinate_interval = 200) {
        if (empty($this->api_key)) {
            wp_send_json_error('Google Places API key not configured');
        }
        // Get trail data
        $trail_data = $this->get_trail_data($trail_id);
        if (!$trail_data) {
            wp_send_json_error('Trail not found');
        }
        // Defensive check for trackPoints
        if (!isset($trail_data['trackPoints']) || !is_array($trail_data['trackPoints']) || count($trail_data['trackPoints']) === 0) {
            error_log('TNPOI Sync: No valid trackPoints found for trail ' . $trail_id);
            wp_send_json_error('No valid track points found for this trail.');
            return;
        }
        // Get zone data for the trail
        $map_preview = new TNPOI_Map_Preview();
        $zones = $this->get_trail_zones($trail_id);
        if (empty($zones)) {
            // No zones found, use regular sampling
            $sampled_points = $this->sample_trail_points($trail_data['trackPoints'], $coordinate_interval);
        } else {
            // Use zone-based optimization
            $sampled_points = $this->apply_zone_optimization($trail_data['trackPoints'], $zones, $search_radius, $coordinate_interval);
        }
        // Initialize progress
        $total_points = count($sampled_points);
        $progress = array(
            'status' => 'running',
            'current' => 0,
            'total' => $total_points,
            'message' => 'Starting zone-based trail sync...',
            'trail_id' => $trail_id,
            'sampled_points' => $sampled_points
        );
        set_transient('tnpoi_zone_sync_progress', $progress, HOUR_IN_SECONDS);
        // Start background process
        wp_schedule_single_event(time(), 'tnpoi_process_zone_sync', array($trail_id, $sampled_points, 0));
        wp_send_json_success(array(
            'message' => 'Zone-based trail sync started',
            'total_points' => $total_points,
            'estimated_api_calls' => $total_points
        ));
    }
    
    /**
     * Process zone-based sync in background
     */
    public static function process_zone_sync($trail_id, $sampled_points, $current_index) {
        $instance = new self();
        
        if ($current_index >= count($sampled_points)) {
            $instance->complete_zone_sync();
            return;
        }
        
        $point = $sampled_points[$current_index];
        $instance->sync_trail_point($point, $trail_id);
        
        // Update progress
        $progress = array(
            'status' => 'running',
            'current' => $current_index + 1,
            'total' => count($sampled_points),
            'message' => "Processed point " . ($current_index + 1) . " of " . count($sampled_points),
            'trail_id' => $trail_id
        );
        set_transient('tnpoi_zone_sync_progress', $progress, HOUR_IN_SECONDS);
        
        // Schedule next batch
        wp_schedule_single_event(time() + 2, 'tnpoi_process_zone_sync', array($trail_id, $sampled_points, $current_index + 1));
    }
    
    /**
     * Sync a single trail point using Google Places API
     */
    private function sync_trail_point($point, $trail_id) {
        $lat = $point['lat'];
        $lng = $point['lng'];
        $search_radius = $point['search_radius'] ?? 500;
        $zone_type = $point['zone_type'] ?? 'warm';
        
        // Get place types based on zone type
        $place_types = $this->get_place_types_for_zone($zone_type);
        
        // Search for places
        $places = $this->search_places("$lat,$lng", $search_radius, $place_types);
        
        if (empty($places)) {
            return;
        }
        
        // Save all POIs (no coordinate thinning)
        foreach ($places as $place) {
            $this->save_trail_poi($place, $trail_id, $point);
        }
    }
    
    /**
     * Get place types based on zone type and user settings
     */
    private function get_place_types_for_zone($zone_type) {
        // Get category mappings and filter out ignored types
        $category_mappings = get_option('tnpoi_category_mappings', array());
        $allowed_types = array();
        
        foreach ($category_mappings as $google_type => $mapped) {
            if ($mapped && $mapped !== 'IGNORE') {
                $allowed_types[] = $google_type;
            }
        }
        
        // If no category mappings configured, fall back to basic place types setting
        if (empty($allowed_types)) {
            $settings = new TNPOI_Settings();
            $configured_types = $settings->get_setting('place_types', array());
            
            if (empty($configured_types)) {
                error_log('TNPOI DEBUG: No place types configured, searching all types for maximum coverage');
                return array();
            }
            
            error_log('TNPOI DEBUG: Using configured place types: ' . implode(', ', $configured_types));
            return $configured_types;
        }
        
        error_log('TNPOI DEBUG: Using category-mapped place types: ' . implode(', ', $allowed_types));
        return $allowed_types;
    }
    
    /**
     * Apply zone-based optimization to trail points
     */
    private function apply_zone_optimization($track_points, $zones, $base_search_radius, $base_interval) {
        // Defensive check for valid track_points
        if (!is_array($track_points) || count($track_points) === 0) {
            error_log('TNPOI Sync: apply_zone_optimization called with empty or invalid track_points');
            return array();
        }
        $optimized_points = array();
        $current_distance = 0;
        $last_sampled_distance = -$base_interval;
        for ($i = 0; $i < count($track_points); $i++) {
            if ($i > 0) {
                $prev_point = $track_points[$i - 1];
                $curr_point = $track_points[$i];
                $current_distance += $this->calculate_distance($prev_point['lat'], $prev_point['lng'], $curr_point['lat'], $curr_point['lng']);
            }
            // Check if we should sample this point based on zone optimization
            $should_sample = $this->should_sample_point($track_points[$i], $zones, $current_distance, $last_sampled_distance, $base_interval);
            if ($should_sample) {
                $zone_params = $this->get_zone_parameters($track_points[$i], $zones, $base_search_radius, $base_interval);
                $optimized_points[] = array(
                    'lat' => $track_points[$i]['lat'],
                    'lng' => $track_points[$i]['lng'],
                    'search_radius' => $zone_params['search_radius'],
                    'zone_type' => $zone_params['zone_type'],
                    'distance_along_trail' => $current_distance
                );
                $last_sampled_distance = $current_distance;
            }
        }
        return $optimized_points;
    }
    
    /**
     * Determine if a point should be sampled based on zone optimization
     */
    private function should_sample_point($point, $zones, $current_distance, $last_sampled_distance, $base_interval) {
        // Find the closest zone to this point
        $closest_zone = $this->find_closest_zone($point, $zones);
        
        if (!$closest_zone) {
            // No zone data, use base interval
            return ($current_distance - $last_sampled_distance) >= $base_interval;
        }
        
        // Get adaptive interval based on zone type
        $adaptive_interval = $this->get_adaptive_interval_for_zone($closest_zone['zone_type'], $base_interval);
        
        return ($current_distance - $last_sampled_distance) >= $adaptive_interval;
    }
    
    /**
     * Get zone parameters for a point
     */
    private function get_zone_parameters($point, $zones, $base_search_radius, $base_interval) {
        $closest_zone = $this->find_closest_zone($point, $zones);
        
        if (!$closest_zone) {
            return array(
                'search_radius' => $base_search_radius,
                'zone_type' => 'warm'
            );
        }
        
        // Get adaptive parameters based on zone type
        $search_radius = $this->get_adaptive_radius_for_zone($closest_zone['zone_type'], $base_search_radius);
        
        return array(
            'search_radius' => $search_radius,
            'zone_type' => $closest_zone['zone_type']
        );
    }
    
    /**
     * Find the closest zone to a point
     */
    private function find_closest_zone($point, $zones) {
        $closest_zone = null;
        $min_distance = PHP_FLOAT_MAX;
        
        foreach ($zones as $zone) {
            $distance = $this->calculate_distance($point['lat'], $point['lng'], $zone['lat'], $zone['lng']);
            if ($distance < $min_distance) {
                $min_distance = $distance;
                $closest_zone = $zone;
            }
        }
        
        // Only return zone if it's within reasonable distance (500m)
        return ($min_distance <= 500) ? $closest_zone : null;
    }
    
    /**
     * Get adaptive interval based on zone type
     */
    private function get_adaptive_interval_for_zone($zone_type, $base_interval) {
        switch ($zone_type) {
            case 'hot':
                return $base_interval * 0.5; // More frequent sampling
            case 'warm':
                return $base_interval; // Standard sampling
            case 'cold':
                return $base_interval * 1.5; // Less frequent sampling
            default:
                return $base_interval;
        }
    }
    
    /**
     * Get adaptive radius based on zone type
     */
    private function get_adaptive_radius_for_zone($zone_type, $base_radius) {
        switch ($zone_type) {
            case 'hot':
                return intval($base_radius * 0.7); // Smaller radius, more focused
            case 'warm':
                return $base_radius; // Standard radius
            case 'cold':
                return intval($base_radius * 1.3); // Larger radius, broader search
            default:
                return $base_radius;
        }
    }
    
    /**
     * Get trail zones from the map preview system
     */
    private function get_trail_zones($trail_id) {
        // Try to get cached zones first
        $cached_zones = get_transient('tnpoi_trail_zones_' . $trail_id);
        if ($cached_zones !== false) {
            error_log('TNPOI Sync: Found ' . count($cached_zones) . ' cached zones for trail ' . $trail_id);
            return $cached_zones;
        }
        
        // If no cached zones, try to get from map preview system
        $map_preview = new TNPOI_Map_Preview();
        $cached_zones = $map_preview->get_cached_trail_zones($trail_id);
        if ($cached_zones !== false) {
            // Zone logging removed for clean log
            return $cached_zones;
        }
        
        error_log('TNPOI Sync: No zones found for trail ' . $trail_id . ', will use regular sampling');
        // If no cached zones, return empty array (will use regular sampling)
        return array();
    }
    
    /**
     * Save POI with trail information
     */
    private function save_trail_poi($place, $trail_id, $point) {
        // Get category mappings and assign categories
        $category_mappings = get_option('tnpoi_category_mappings', array());
        $category_ids = array();
        
        foreach ($place['types'] as $type) {
            if (isset($category_mappings[$type]) && $category_mappings[$type] !== 'IGNORE') {
                $category_ids[] = $category_mappings[$type];
            }
        }
        
        // Get trail name from config
        $trail_name = '';
        $trail_config = get_option('trail_navigator_config', array());
        if (!empty($trail_config['trails'])) {
            foreach ($trail_config['trails'] as $trail) {
                if ((string)$trail['routeId'] === (string)$trail_id) {
                    $trail_name = $trail['name'] ?? '';
                    break;
                }
            }
        }
        
        // Calculate initial distance along trail
        $distance_along_trail = 0;
        if (isset($point['distance_along_trail'])) {
            $distance_along_trail = $point['distance_along_trail'];
        }
        
        $poi_data = array(
            'place_id' => $place['place_id'],
            'name' => $place['name'],
            'address' => $place['vicinity'] ?? '',
            'latitude' => $place['geometry']['location']['lat'],
            'longitude' => $place['geometry']['location']['lng'],
            'types' => json_encode($place['types']), // Store as JSON
            'category_ids' => json_encode($category_ids), // Store mapped categories
            'rating' => $place['rating'] ?? 0,
            'user_ratings_total' => $place['user_ratings_total'] ?? 0,
            'price_level' => $place['price_level'] ?? 0,
            'search_term' => 'trail_' . $trail_id,
            'search_location' => $point['lat'] . ',' . $point['lng'],
            'trail_id' => $trail_id,
            'trail_name' => $trail_name,
            'distance_along_trail' => $distance_along_trail,
            'status' => 'new',
            'ignored' => 0 // Default to include in export
        );
        
        $result = $this->db->insert_or_update_poi($poi_data);
        
        // Log the save result for debugging
        if ($result === 'inserted') {
            error_log('TNPOI DEBUG: Inserted POI: ' . $poi_data['name'] . ' (' . $poi_data['place_id'] . ')');
        } elseif ($result === 'updated') {
            error_log('TNPOI DEBUG: Updated POI: ' . $poi_data['name'] . ' (' . $poi_data['place_id'] . ')');
        } elseif ($result === false) {
            error_log('TNPOI DEBUG: Failed to save POI: ' . $poi_data['name'] . ' (' . $poi_data['place_id'] . ')');
        } else {
            error_log('TNPOI DEBUG: Saved POI (unknown result): ' . $poi_data['name'] . ' (' . $poi_data['place_id'] . ') - Result: ' . $result);
        }
        
        return $result;
    }
    
    /**
     * Complete zone-based sync
     */
    private function complete_zone_sync() {
        $progress = array(
            'status' => 'completed',
            'current' => 0,
            'total' => 0,
            'message' => 'Zone-based trail sync completed successfully'
        );
        set_transient('tnpoi_zone_sync_progress', $progress, HOUR_IN_SECONDS);
        
        // Clear scheduled events
        wp_clear_scheduled_hook('tnpoi_process_zone_sync');
    }
    
    /**
     * Get trail data by ID
     */
    private function get_trail_data($trail_id) {
        $trail_config = get_option('trail_navigator_config', array());
        $trails = isset($trail_config['trails']) ? $trail_config['trails'] : array();
        foreach ($trails as $trail) {
            if ((string)$trail['routeId'] === (string)$trail_id) {
                // If trackPoints are missing, fetch them using Map Preview logic
                if (!isset($trail['trackPoints']) || empty($trail['trackPoints'])) {
                    $map_preview = new TNPOI_Map_Preview();
                    $trail = $map_preview->get_complete_trail_data($trail);
                }
                return $trail;
            }
        }
        return null;
    }
    
    /**
     * Sample trail points with regular intervals (fallback)
     */
    private function sample_trail_points($track_points, $interval) {
        $sampled_points = array();
        $current_distance = 0;
        $last_sampled_distance = -$interval;
        
        for ($i = 0; $i < count($track_points); $i++) {
            if ($i > 0) {
                $prev_point = $track_points[$i - 1];
                $curr_point = $track_points[$i];
                $current_distance += $this->calculate_distance($prev_point['lat'], $prev_point['lng'], $curr_point['lat'], $curr_point['lng']);
            }
            
            if ($current_distance - $last_sampled_distance >= $interval) {
                $sampled_points[] = array(
                    'lat' => $track_points[$i]['lat'],
                    'lng' => $track_points[$i]['lng'],
                    'search_radius' => 500,
                    'zone_type' => 'warm',
                    'distance_along_trail' => $current_distance
                );
                $last_sampled_distance = $current_distance;
            }
        }
        
        return $sampled_points;
    }
}

// Hook for background processing
add_action('tnpoi_process_sync', array('TNPOI_Sync', 'process_sync'), 10, 2);
add_action('tnpoi_process_zone_sync', array('TNPOI_Sync', 'process_zone_sync'), 10, 3); 