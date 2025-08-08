<?php
/**
 * Trail Config Google Places Admin
 *
 * Features:
 * - Stores essential POI data for future comparison (name, lat/lng, category, short description, Google Places ID, trail ID, status)
 * - Maps Google Places types to simplified categories (and optionally to GeoDirectory categories)
 * - Provides scheduled sync to detect new, updated, and deleted POIs
 * - Allows filtering/searching POIs by status in the admin UI
 * - Exports selected POIs as a GeoDirectory-compatible CSV for safe import
 */
class TCGP_Admin {
    
    public function __construct() {
        // AJAX handlers are already hooked in the main plugin class
    }
    
    /**
     * AJAX handler for searching places
     */
    public function ajax_search_places() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'tcgp_nonce')) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] AJAX nonce verification failed');
            }
            wp_die('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] AJAX permission check failed');
            }
            wp_die('Insufficient permissions');
        }
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] AJAX search_places called with POST data: ' . print_r($_POST, true));
        }
        
        $trail_id = sanitize_text_field($_POST['trail_id']);
        $radius = intval($_POST['radius']);
        $types = isset($_POST['types']) ? array_map('sanitize_text_field', $_POST['types']) : array();
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] ajax_search_places received radius: ' . $radius . ' from POST data');
            error_log('[TCGP DEBUG] Parsed parameters - trail_id: ' . $trail_id . ', radius: ' . $radius . ', types: ' . print_r($types, true));
        }
        
        // Get trail coordinates from the existing Trail Navigator Configuration plugin
        $trail_coordinates = $this->get_trail_coordinates($trail_id);
        
        if (empty($trail_coordinates)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] No trail coordinates found for trail_id: ' . $trail_id);
            }
            wp_send_json_error('No trail coordinates found for trail ID: ' . $trail_id);
        }
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] Found ' . count($trail_coordinates) . ' trail coordinates');
        }
        
        $google_places = new TCGP_Google_Places();
        
        // Convert coordinates to trail geometry format
        $trail_geometry = array('track_points' => $trail_coordinates);
        $places = $google_places->search_places_along_trail($trail_geometry, $radius, $types);
        
        if (is_wp_error($places)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] Google Places search error: ' . $places->get_error_message());
            }
            wp_send_json_error($places->get_error_message());
        }
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] Found ' . count($places) . ' places from Google Places API');
        }
        
        // Check which places are already imported
        $existing_places = $this->get_existing_place_ids($trail_id);
        
        foreach ($places as &$place) {
            $place['already_imported'] = in_array($place['place_id'], $existing_places);
        }
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] Sending JSON response with ' . count($places) . ' places');
        }
        
        // Provide stats (all zeros for now)
        $stats = [
            'new' => 0,
            'updated' => 0,
            'existing' => 0,
            'deleted' => 0
        ];
        
        wp_send_json_success([
            'places' => $places,
            'stats' => $stats
        ]);
    }
    
    /**
     * AJAX handler for importing places
     */
    public function ajax_import_places() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'tcgp_nonce')) {
            wp_die('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $place_ids = isset($_POST['place_ids']) ? array_map('sanitize_text_field', $_POST['place_ids']) : array();
        $trail_id = sanitize_text_field($_POST['trail_id']);
        
        if (empty($place_ids)) {
            wp_send_json_error('No places selected for import');
        }
        
        $google_places = new TCGP_Google_Places();
        $imported_count = 0;
        $errors = array();
        
        foreach ($place_ids as $place_id) {
            // Get essential place data only
            $place_data = $google_places->get_essential_place_data($place_id);
            
            if (is_wp_error($place_data)) {
                $errors[] = "Failed to get essential data for place $place_id: " . $place_data->get_error_message();
                continue;
            }
            
            // Add trail information
            $place_data['trail_id'] = $trail_id;
            $place_data['status'] = 'active';
            
            $result = $this->save_place($place_data);
            
            if (is_wp_error($result)) {
                $errors[] = "Failed to save place {$place_data['name']}: " . $result->get_error_message();
            } else {
                $imported_count++;
            }
        }
        
        $response = array(
            'imported_count' => $imported_count,
            'errors' => $errors
        );
        
        if ($imported_count > 0) {
            wp_send_json_success($response);
        } else {
            wp_send_json_error($response);
        }
    }
    
    /**
     * AJAX handler for getting sync status
     */
    public function ajax_get_sync_status() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'tcgp_nonce')) {
            wp_die('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp_sync_logs';
        
        $recent_logs = $wpdb->get_results(
            "SELECT * FROM $table ORDER BY sync_date DESC LIMIT 10"
        );
        
        $stats = array(
            'total_places' => $this->get_total_places_count(),
            'active_places' => $this->get_active_places_count(),
            'recent_syncs' => $recent_logs
        );
        
        wp_send_json_success($stats);
    }
    
    /**
     * Get trail coordinates from the existing Trail Navigator Configuration plugin
     */
    private function get_trail_coordinates($trail_id) {
        // Get trail configuration from the existing Trail Navigator Configuration plugin
        $trail_config = $this->get_trail_config($trail_id);
        
        if (!$trail_config) {
            return array();
        }
        
        // Fetch trail geometry from RideWithGPS API using the route ID
        $route_id = $trail_config['routeId'];
        $trail_geometry = $this->get_trail_geometry($route_id);
        
        if (empty($trail_geometry)) {
            return array();
        }
        
        // Convert trail geometry to coordinate format expected by Google Places API
        $coordinates = array();
        foreach ($trail_geometry as $point) {
            $coordinates[] = array(
                'lat' => $point['latitude'],
                'lng' => $point['longitude']
            );
        }
        
        return $coordinates;
    }
    
    /**
     * Get trail configuration from the Trail Navigator Configuration plugin
     */
    public function get_trail_config($trail_id) {
        $config = get_option('trail_navigator_config', array());
        if (!empty($config['trails'])) {
            foreach ($config['trails'] as $trail) {
                if ($trail['routeId'] === $trail_id) {
                    if (defined('WP_DEBUG') && WP_DEBUG) {
                        error_log('[TCGP DEBUG] Found trail config for routeId ' . $trail_id . ': ' . print_r($trail, true));
                    }
                    return $trail;
                }
            }
        }
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] No trail config found for routeId ' . $trail_id . '. Config: ' . print_r($config, true));
        }
        return null;
    }
    
    /**
     * Get all available trails from the Trail Navigator Configuration plugin
     */
    public function get_available_trails() {
        $trail_config = get_option('trail_navigator_config', array());
        
        if (empty($trail_config) || !isset($trail_config['trails'])) {
            return array();
        }
        
        return $trail_config['trails'];
    }
    
    /**
     * Get existing place IDs for a trail
     */
    private function get_existing_place_ids($trail_id) {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp_places';
        
        $place_ids = $wpdb->get_col($wpdb->prepare(
            "SELECT place_id FROM $table WHERE trail_id = %s AND status = 'active'",
            $trail_id
        ));
        
        return $place_ids;
    }
    
    /**
     * Save place to database
     */
    private function save_place($place_data) {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp_places';
        
        // Check if place already exists
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT id FROM $table WHERE place_id = %s",
            $place_data['place_id']
        ));
        
        if ($existing) {
            // Update existing place
            $result = $wpdb->update(
                $table,
                $place_data,
                array('place_id' => $place_data['place_id'])
            );
        } else {
            // Insert new place
            $result = $wpdb->insert($table, $place_data);
        }
        
        if ($result === false) {
            return new WP_Error('db_error', 'Failed to save place to database');
        }
        
        return $wpdb->insert_id ?: $existing->id;
    }
    
    /**
     * Get total places count
     */
    private function get_total_places_count() {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp_places';
        
        return $wpdb->get_var("SELECT COUNT(*) FROM $table");
    }
    
    /**
     * Get active places count
     */
    private function get_active_places_count() {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp_places';
        
        return $wpdb->get_var("SELECT COUNT(*) FROM $table WHERE status = 'active'");
    }
    
    /**
     * Get places for a specific trail
     */
    public function get_trail_places($trail_id) {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp_places';
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table WHERE trail_id = %s AND status = 'active' ORDER BY name ASC",
            $trail_id
        ));
    }
    
    /**
     * Delete a place
     */
    public function delete_place($place_id) {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp_places';
        
        return $wpdb->update(
            $table,
            array('status' => 'deleted'),
            array('place_id' => $place_id)
        );
    }
    
    /**
     * Search for places along all configured trails
     */
    public function search_all_trails($radius = null) {
        if ($radius === null) {
            $radius = get_option('tcgp_search_radius', 50);
        }
        error_log('[TCGP DEBUG] search_all_trails called with radius: ' . $radius);
        $trails = $this->get_available_trails();
        if (empty($trails)) {
            return new WP_Error('no_trails', 'No trails configured');
        }
        $google_places = new TCGP_Google_Places();
        $all_places = array();
        $stats = array('new' => 0, 'updated' => 0, 'existing' => 0, 'deleted' => 0);
        $existing_places = $this->get_existing_places_map();
        $max_pois = intval(get_option('tcgp_max_pois', 100));
        $global_poi_count = 0;
        $first_poi_logged = false;
        foreach ($trails as $trail) {
            if ($global_poi_count >= $max_pois) break;
            $route_id = $trail['routeId'];
            $trail_name = $trail['name'];
            $trail_geometry = $this->get_trail_geometry($route_id);
            if (empty($trail_geometry)) continue;
            $track_points = array();
            foreach ($trail_geometry as $point) {
                $track_points[] = array('lat' => $point['latitude'], 'lng' => $point['longitude']);
            }
            $geometry = array('track_points' => $track_points);
            $places = $google_places->search_places_along_trail($geometry, $radius);
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] search_all_trails: Searching trail ' . $trail_name . ' with radius: ' . $radius);
            }
            if (is_wp_error($places)) continue;
            foreach ($places as $place) {
                if ($global_poi_count >= $max_pois) break 2;
                $place['trail_id'] = $route_id;
                $place['trail_name'] = $trail_name;
                $place_id = $place['place_id'];
                if (isset($existing_places[$place_id])) {
                    $existing = $existing_places[$place_id];
                    if ($this->place_has_changed($place, $existing)) {
                        $place['status'] = 'updated';
                        $stats['updated']++;
                    } else {
                        $place['status'] = 'existing';
                        $stats['existing']++;
                    }
                } else {
                    $place['status'] = 'new';
                    $stats['new']++;
                }
                // Debug logging for only the first POI in the sync
                if (!$first_poi_logged && defined('WP_DEBUG') && WP_DEBUG) {
                    error_log('[TCGP DEBUG] Raw API response: ' . print_r($place, true));
                    $parsed = $this->parse_address_from_formatted_address($place);
                    error_log('[TCGP DEBUG] Parsed address fields: ' . print_r($parsed, true));
                    $first_poi_logged = true;
                }
                $this->upsert_master_poi($place, $route_id);
                $all_places[] = $place;
                $global_poi_count++;
            }
        }
        // Check for deleted places (places that exist in DB but not in search results)
        $found_place_ids = array_column($all_places, 'place_id');
        foreach ($existing_places as $place_id => $place) {
            if (!in_array($place_id, $found_place_ids)) {
                $place['status'] = 'deleted';
                $place['trail_name'] = $this->get_trail_name_by_id($place['trail_id']);
                $all_places[] = $place;
                $stats['deleted']++;
                $this->mark_master_pois_deleted(array($place_id), $place['trail_id']);
            }
        }
        // Return the actual number imported
        return array('places' => $all_places, 'stats' => $stats, 'imported_count' => $global_poi_count);
    }
    
    /**
     * Get existing places as a map for quick lookup
     */
    private function get_existing_places_map() {
        global $wpdb;
        
        $table = $wpdb->prefix . 'tcgp_places';
        $places = $wpdb->get_results("SELECT * FROM $table WHERE status = 'active'", ARRAY_A);
        
        $map = array();
        foreach ($places as $place) {
            $map[$place['place_id']] = $place;
        }
        
        return $map;
    }
    
    /**
     * Check if a place has changed compared to existing data
     */
    private function place_has_changed($new_place, $existing_place) {
        $fields_to_check = array('name', 'vicinity', 'formatted_address', 'latitude', 'longitude', 'rating', 'user_ratings_total', 'price_level');
        
        foreach ($fields_to_check as $field) {
            if (isset($new_place[$field]) && isset($existing_place[$field])) {
                if ($new_place[$field] != $existing_place[$field]) {
                    return true;
                }
            }
        }
        
        // Check types array
        if (isset($new_place['types']) && isset($existing_place['types'])) {
            $new_types = is_array($new_place['types']) ? $new_place['types'] : json_decode($new_place['types'], true);
            $existing_types = is_array($existing_place['types']) ? $existing_place['types'] : json_decode($existing_place['types'], true);
            
            if ($new_types != $existing_types) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get trail name by trail ID
     */
    private function get_trail_name_by_id($trail_id) {
        $trails = $this->get_available_trails();
        
        foreach ($trails as $trail) {
            if ($trail['routeId'] === $trail_id) {
                return $trail['name'];
            }
        }
        
        return 'Unknown Trail';
    }
    
    /**
     * Bulk import places
     */
    public function import_places_bulk($places_data) {
        global $wpdb;
        
        $table = $wpdb->prefix . 'tcgp_places';
        $imported_count = 0;
        $errors = array();
        
        $max_pois = intval(get_option('tcgp_max_pois', 100));
        $pois_fetched = 0;
        foreach ($places_data as $place) {
            if ($pois_fetched >= $max_pois) break;
            // Debug logging for only the first POI
            if ($pois_fetched === 0 && defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] Raw API response: ' . print_r($place, true));
                $parsed = $this->parse_address_from_formatted_address($place);
                error_log('[TCGP DEBUG] Parsed address fields: ' . print_r($parsed, true));
            }
            $place_id = $place['place_id'];
            $trail_id = $place['trail_id'];
            
            // Get place details from Google Places API
            $google_places = new TCGP_Google_Places();
            $place_details = $google_places->get_place_details($place_id);
            
            if (is_wp_error($place_details)) {
                $errors[] = "Failed to get details for place $place_id: " . $place_details->get_error_message();
                continue;
            }
            
            // Prepare data for database
            $data = array(
                'place_id' => $place_id,
                'name' => $place_details['name'],
                'vicinity' => isset($place_details['vicinity']) ? $place_details['vicinity'] : '',
                'formatted_address' => isset($place_details['formatted_address']) ? $place_details['formatted_address'] : '',
                'latitude' => $place_details['geometry']['location']['lat'],
                'longitude' => $place_details['geometry']['location']['lng'],
                'types' => isset($place_details['types']) ? json_encode($place_details['types']) : '',
                'rating' => isset($place_details['rating']) ? $place_details['rating'] : null,
                'user_ratings_total' => isset($place_details['user_ratings_total']) ? $place_details['user_ratings_total'] : null,
                'price_level' => isset($place_details['price_level']) ? $place_details['price_level'] : null,
                'opening_hours' => isset($place_details['opening_hours']) ? json_encode($place_details['opening_hours']) : '',
                'website' => isset($place_details['website']) ? $place_details['website'] : '',
                'phone' => isset($place_details['formatted_phone_number']) ? $place_details['formatted_phone_number'] : '',
                'photos' => isset($place_details['photos']) ? json_encode($place_details['photos']) : '',
                'trail_id' => $trail_id,
                'status' => 'active'
            );
            
            // Check if place already exists
            $existing = $wpdb->get_row($wpdb->prepare(
                "SELECT id FROM $table WHERE place_id = %s",
                $place_id
            ));
            
            if ($existing) {
                // Update existing place
                $result = $wpdb->update(
                    $table,
                    $data,
                    array('place_id' => $place_id)
                );
            } else {
                // Insert new place
                $result = $wpdb->insert($table, $data);
            }
            
            if ($result !== false) {
                $imported_count++;
            } else {
                $errors[] = "Failed to save place $place_id to database";
            }
            
            // Also upsert to master POI table
            $master_data = array(
                'place_id' => $place_id,
                'name' => $place_details['name'],
                'latitude' => $place_details['geometry']['location']['lat'],
                'longitude' => $place_details['geometry']['location']['lng'],
                'short_description' => isset($place_details['vicinity']) ? $place_details['vicinity'] : (isset($place_details['short_description']) ? $place_details['short_description'] : ''),
                'types' => isset($place_details['types']) ? $place_details['types'] : array()
            );
            $this->upsert_master_poi($master_data, $trail_id);
            $pois_fetched++;
        }
        
        return array(
            'imported_count' => $imported_count,
            'errors' => $errors
        );
    }
    
    /**
     * Get all places from the database
     */
    public function get_all_places() {
        global $wpdb;
        
        $table = $wpdb->prefix . 'tcgp_places';
        $places = $wpdb->get_results(
            "SELECT * FROM $table WHERE status = 'active' ORDER BY name ASC",
            ARRAY_A
        );
        
        // Add trail names
        $trails = $this->get_available_trails();
        $trail_names = array();
        foreach ($trails as $trail) {
            $trail_names[$trail['routeId']] = $trail['name'];
        }
        
        foreach ($places as &$place) {
            $place['trail_name'] = isset($trail_names[$place['trail_id']]) ? $trail_names[$place['trail_id']] : 'Unknown Trail';
            $place['types'] = !empty($place['types']) ? json_decode($place['types'], true) : array();
        }
        
        return $places;
    }
    
    /**
     * Get trail geometry from RideWithGPS API
     */
    public function get_trail_geometry($route_id) {
        $api_key = get_option('tcgp_ridewithgps_api_key', '');
        
        if (empty($api_key)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] RideWithGPS API key not configured for routeId ' . $route_id);
            }
            return array();
        }
        
        $json_url = "https://ridewithgps.com/routes/{$route_id}.json?apikey={$api_key}";
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] Fetching RideWithGPS JSON from: ' . $json_url);
        }
        $response = wp_remote_get($json_url, array(
            'timeout' => 30,
            'headers' => array(
                'User-Agent' => 'TrailNavigator/1.0'
            )
        ));
        if (is_wp_error($response)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] RideWithGPS JSON error: ' . $response->get_error_message());
            }
            return array();
        }
        $body = wp_remote_retrieve_body($response);
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] RideWithGPS JSON response (first 500 chars): ' . substr($body, 0, 500));
        }
        $data = json_decode($body, true);
        if (empty($data['route']['track_points'])) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] No track_points found in RideWithGPS JSON for routeId ' . $route_id);
            }
            return array();
        }
        $coordinates = array();
        foreach ($data['route']['track_points'] as $point) {
            $coordinates[] = array(
                'latitude' => $point['y'],
                'longitude' => $point['x']
            );
        }
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] Parsed ' . count($coordinates) . ' coordinates from RideWithGPS JSON for routeId ' . $route_id);
        }
        return $coordinates;
    }
    
    /**
     * Export selected POIs as GeoDirectory-compatible CSV
     */
    public function export_pois_csv($poi_ids) {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp_places';
        if (empty($poi_ids) || !is_array($poi_ids)) return;
        $ids_placeholder = implode(',', array_fill(0, count($poi_ids), '%s'));
        $query = $wpdb->prepare("SELECT * FROM $table WHERE place_id IN ($ids_placeholder)", $poi_ids);
        $pois = $wpdb->get_results($query, ARRAY_A);
        
        // GeoDirectory CSV header - matches the import template
        $header = [
            'post_title',
            'post_content',
            'post_status',
            'post_author',
            'post_type',
            'post_date',
            'post_modified',
            'post_tags',
            'post_category',
            'default_category',
            'featured',
            'street',
            'street2',
            'city',
            'region',
            'country',
            'zip',
            'latitude',
            'longitude',
            'google_places_id',
            'post_images'
        ];
        
        // Output CSV headers
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="geodirectory_pois_export_'.date('Ymd_His').'.csv"');
        $out = fopen('php://output', 'w');
        fputcsv($out, $header);
        
        foreach ($pois as $poi) {
            // Debug: Log the POI data being processed
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] Processing POI for CSV: ' . print_r($poi, true));
            }
            
            // Use assigned categories only (no auto-assignment) - ensure numeric IDs
            $category = '';
            if (!empty($poi['categories'])) {
                if (defined('WP_DEBUG') && WP_DEBUG) {
                    error_log('[TCGP DEBUG] Raw category value: "' . $poi['categories'] . '" (type: ' . gettype($poi['categories']) . ')');
                }
                
                // If it's already a numeric ID, use it directly
                if (is_numeric($poi['categories'])) {
                    $category = $poi['categories'];
                    if (defined('WP_DEBUG') && WP_DEBUG) {
                        error_log('[TCGP DEBUG] Using category as numeric ID: ' . $category);
                    }
                } else {
                    // If it's a slug, convert to ID
                    $category = $this->get_category_id_by_slug($poi['categories']);
                    if (defined('WP_DEBUG') && WP_DEBUG) {
                        error_log('[TCGP DEBUG] Converted category slug "' . $poi['categories'] . '" to ID: ' . $category);
                    }
                }
            }
            
            // Use assigned tags only (no auto-assignment) - ensure numeric IDs
            $tags = '';
            if (!empty($poi['tags'])) {
                if (defined('WP_DEBUG') && WP_DEBUG) {
                    error_log('[TCGP DEBUG] Raw tags value: "' . $poi['tags'] . '" (type: ' . gettype($poi['tags']) . ')');
                }
                
                // If it's already a numeric ID, use it directly
                if (is_numeric($poi['tags'])) {
                    $tags = $poi['tags'];
                    if (defined('WP_DEBUG') && WP_DEBUG) {
                        error_log('[TCGP DEBUG] Using tags as numeric ID: ' . $tags);
                    }
                } else {
                    // If it's a slug, convert to ID
                    $tags = $this->get_tag_id_by_slug($poi['tags']);
                    if (defined('WP_DEBUG') && WP_DEBUG) {
                        error_log('[TCGP DEBUG] Converted tags slug "' . $poi['tags'] . '" to ID: ' . $tags);
                    }
                }
            }
            
            // Get address components using offline parsing first (no API calls needed)
            $address_components = $this->parse_address_offline($poi);
            
            // Only try geocoding if we're missing key address components
            if (empty($address_components['city']) || empty($address_components['street']) || empty($address_components['region']) || empty($address_components['zip'])) {
                if (defined('WP_DEBUG') && WP_DEBUG) {
                    error_log('[TCGP DEBUG] Missing address components, trying geocoding API');
                }
                $geocoding_components = $this->get_address_components($poi['latitude'], $poi['longitude']);
                
                // Merge geocoding results with offline parsing, preferring geocoding
                foreach ($geocoding_components as $key => $value) {
                    if (!empty($value)) {
                        $address_components[$key] = $value;
                    }
                }
            }
            
            // Use generativeSummary for post_content, fallback to short_description, then vicinity, then name
            $post_content = '';
            if (!empty($poi['generativeSummary'])) {
                $post_content = $poi['generativeSummary'];
            } elseif (!empty($poi['short_description'])) {
                $post_content = $poi['short_description'];
            } elseif (!empty($poi['vicinity'])) {
                $post_content = $poi['vicinity'];
            } else {
                $post_content = $poi['name'];
            }
            
            // Debug: Log the final values being used
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] Final CSV values - Category: "' . $category . '", Tags: "' . $tags . '", Post Content: "' . $post_content . '"');
                error_log('[TCGP DEBUG] Address components: ' . print_r($address_components, true));
            }
            
            $row = [
                $poi['name'], // post_title
                $post_content, // post_content
                'publish', // post_status
                1, // post_author
                'gd_place', // post_type
                $poi['created_at'] ?: '', // post_date
                $poi['updated_at'] ?: '', // post_modified
                $tags, // post_tags
                $category, // post_category
                $category, // default_category
                0, // featured
                $address_components['street'], // street
                $address_components['street2'], // street2
                $address_components['city'], // city
                $address_components['region'], // region
                $address_components['country'], // country
                $address_components['zip'], // zip
                $poi['latitude'], // latitude
                $poi['longitude'], // longitude
                $poi['place_id'], // google_places_id
                '' // post_images
            ];
            fputcsv($out, $row);
        }
        fclose($out);
        exit;
    }

    /**
     * AJAX handler for exporting POIs as CSV
     */
    public function ajax_export_pois_csv() {
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        $poi_ids = isset($_POST['poi_ids']) ? json_decode(stripslashes($_POST['poi_ids']), true) : [];
        $this->export_pois_csv($poi_ids);
    }

    /**
     * Upsert POI into master POI table
     */
    private function upsert_master_poi($place_data, $trail_id) {
        global $wpdb;
        $master_table = $wpdb->prefix . 'tcgp_master_pois';
        $place_id = $place_data['place_id'];
        $current_time = current_time('mysql');

        // Robustly extract latitude/longitude
        if (isset($place_data['latitude']) && isset($place_data['longitude'])) {
            $latitude = $place_data['latitude'];
            $longitude = $place_data['longitude'];
        } elseif (isset($place_data['geometry']['location']['lat']) && isset($place_data['geometry']['location']['lng'])) {
            $latitude = $place_data['geometry']['location']['lat'];
            $longitude = $place_data['geometry']['location']['lng'];
        } else {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] Skipping POI with missing coordinates: ' . print_r($place_data, true));
            }
            return false;
        }

        // Check if POI already exists in master table
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT id, categories, tags, export_selected, date_first_seen, status FROM $master_table WHERE place_id = %s",
            $place_id
        ));

        if ($existing) {
            $update_data = array(
                'name' => $place_data['name'],
                'latitude' => $latitude,
                'longitude' => $longitude,
                'short_description' => isset($place_data['vicinity']) ? $place_data['vicinity'] : (isset($place_data['short_description']) ? $place_data['short_description'] : ''),
                'generativeSummary' => isset($place_data['generativeSummary']) ? $place_data['generativeSummary'] : '',
                'formatted_address' => isset($place_data['formatted_address']) ? $place_data['formatted_address'] : '',
                'vicinity' => isset($place_data['vicinity']) ? $place_data['vicinity'] : '',
                'types' => isset($place_data['types']) ? json_encode($place_data['types']) : '',
                'trail_id' => $trail_id,
                'status' => 'active',
                'date_last_seen' => $current_time,
                'date_last_updated' => $current_time,
                'raw_data' => json_encode($place_data)
            );
            if ($existing->categories) $update_data['categories'] = $existing->categories;
            if ($existing->tags) $update_data['tags'] = $existing->tags;
            if ($existing->export_selected) $update_data['export_selected'] = $existing->export_selected;
            $result = $wpdb->update($master_table, $update_data, array('place_id' => $place_id));
            return $result !== false ? 'updated' : false;
        } else {
            $insert_data = array(
                'place_id' => $place_id,
                'name' => $place_data['name'],
                'latitude' => $latitude,
                'longitude' => $longitude,
                'short_description' => isset($place_data['vicinity']) ? $place_data['vicinity'] : (isset($place_data['short_description']) ? $place_data['short_description'] : ''),
                'generativeSummary' => isset($place_data['generativeSummary']) ? $place_data['generativeSummary'] : '',
                'formatted_address' => isset($place_data['formatted_address']) ? $place_data['formatted_address'] : '',
                'vicinity' => isset($place_data['vicinity']) ? $place_data['vicinity'] : '',
                'types' => isset($place_data['types']) ? json_encode($place_data['types']) : '',
                'status' => 'new',
                'trail_id' => $trail_id,
                'categories' => '', // Leave empty for manual assignment
                'tags' => '',
                'export_selected' => 0,
                'date_first_seen' => $current_time,
                'date_last_seen' => $current_time,
                'date_last_updated' => $current_time,
                'raw_data' => json_encode($place_data)
            );
            $result = $wpdb->insert($master_table, $insert_data);
            return $result !== false ? 'inserted' : false;
        }
    }
    
    /**
     * Mark POIs as deleted in master table
     */
    private function mark_master_pois_deleted($place_ids, $trail_id) {
        global $wpdb;
        
        if (empty($place_ids)) {
            return 0;
        }
        
        $master_table = $wpdb->prefix . 'tcgp_master_pois';
        $place_ids_placeholder = implode(',', array_fill(0, count($place_ids), '%s'));
        
        $query = $wpdb->prepare(
            "UPDATE $master_table SET status = 'deleted', date_last_updated = %s WHERE place_id IN ($place_ids_placeholder) AND trail_id = %s",
            array_merge(array(current_time('mysql')), $place_ids, array($trail_id))
        );
        
        return $wpdb->query($query);
    }

    /**
     * Get master POI table statistics
     */
    public function get_master_poi_stats() {
        global $wpdb;
        
        $master_table = $wpdb->prefix . 'tcgp_master_pois';
        
        $stats = array(
            'total' => $wpdb->get_var("SELECT COUNT(*) FROM $master_table"),
            'new' => $wpdb->get_var("SELECT COUNT(*) FROM $master_table WHERE status = 'new'"),
            'active' => $wpdb->get_var("SELECT COUNT(*) FROM $master_table WHERE status = 'active'"),
            'deleted' => $wpdb->get_var("SELECT COUNT(*) FROM $master_table WHERE status = 'deleted'"),
            'export_selected' => $wpdb->get_var("SELECT COUNT(*) FROM $master_table WHERE export_selected = 1"),
            'with_categories' => $wpdb->get_var("SELECT COUNT(*) FROM $master_table WHERE categories != ''"),
            'with_tags' => $wpdb->get_var("SELECT COUNT(*) FROM $master_table WHERE tags != ''")
        );
        
        return $stats;
    }

    /**
     * AJAX handler for getting master POIs with filters
     */
    public function ajax_get_master_pois() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'tcgp_nonce')) {
            wp_die('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $filters = isset($_POST['filters']) ? $_POST['filters'] : array();
        $page = isset($_POST['page']) ? intval($_POST['page']) : 1;
        $per_page = 20;
        
        $result = $this->get_master_pois($filters, $page, $per_page);
        
        if (is_wp_error($result)) {
            wp_send_json_error($result->get_error_message());
        } else {
            wp_send_json_success($result);
        }
    }
    
    /**
     * AJAX handler for updating export selection
     */
    public function ajax_update_export_selection() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'tcgp_nonce')) {
            wp_die('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $place_id = sanitize_text_field($_POST['place_id']);
        $export_selected = intval($_POST['export_selected']);
        
        $result = $this->update_export_selection($place_id, $export_selected);
        
        if (is_wp_error($result)) {
            wp_send_json_error($result->get_error_message());
        } else {
            wp_send_json_success();
        }
    }
    
    /**
     * AJAX handler for exporting master POIs as CSV
     */
    public function ajax_export_master_csv() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'tcgp_nonce')) {
            wp_die('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $poi_ids = isset($_POST['poi_ids']) ? json_decode(stripslashes($_POST['poi_ids']), true) : array();
        
        if (empty($poi_ids)) {
            wp_die('No POIs selected for export');
        }
        
        $this->export_master_pois_csv($poi_ids);
    }
    
    /**
     * Get master POIs with filters and pagination
     */
    public function get_master_pois($filters = array(), $page = 1, $per_page = 20) {
        global $wpdb;
        $master_table = $wpdb->prefix . 'tcgp_master_pois';
        $offset = ($page - 1) * $per_page;
        $where_conditions = array();
        $where_values = array();
        // ... existing filters ...
        // Build the WHERE clause
        $where_clause = '';
        if (!empty($where_conditions)) {
            $where_clause = 'WHERE ' . implode(' AND ', $where_conditions);
        }
        // Get POIs with pagination
        $query = "SELECT * FROM $master_table $where_clause ORDER BY name ASC";
        if (!empty($where_values)) {
            $query = $wpdb->prepare($query, $where_values);
        }
        $pois = $wpdb->get_results($query, ARRAY_A);
        // Add trail names
        $trails = $this->get_available_trails();
        $trail_names = array();
        foreach ($trails as $trail) {
            $trail_names[$trail['routeId']] = $trail['name'];
        }
        foreach ($pois as &$poi) {
            $poi['trail_name'] = isset($trail_names[$poi['trail_id']]) ? $trail_names[$poi['trail_id']] : 'Unknown Trail';
        }
        // Filter by relevant types if requested
        if (!empty($filters['hide_irrelevant'])) {
            $relevant_types = $this->get_relevant_types();
            $pois = array_filter($pois, function($poi) use ($relevant_types) {
                if (empty($relevant_types)) return true; // If no relevant types set, show all
                $types = !empty($poi['types']) ? json_decode($poi['types'], true) : array();
                foreach ($types as $type) {
                    if (in_array($type, $relevant_types)) return true;
                }
                return false;
            });
            $pois = array_values($pois); // reindex
        }
        // Pagination after filtering
        $total = count($pois);
        $pois = array_slice($pois, $offset, $per_page);
        return array(
            'pois' => $pois,
            'total' => $total,
            'page' => $page,
            'per_page' => $per_page
        );
    }
    
    /**
     * Update export selection for a POI
     */
    public function update_export_selection($place_id, $export_selected) {
        global $wpdb;
        
        $master_table = $wpdb->prefix . 'tcgp_master_pois';
        
        $result = $wpdb->update(
            $master_table,
            array('export_selected' => $export_selected),
            array('place_id' => $place_id)
        );
        
        if ($result === false) {
            return new WP_Error('db_error', 'Failed to update export selection');
        }
        
        return true;
    }
    
    /**
     * Export master POIs as CSV in GeoDirectory format
     */
    public function export_master_pois_csv($poi_ids) {
        global $wpdb;
        
        $master_table = $wpdb->prefix . 'tcgp_master_pois';
        
        if (empty($poi_ids) || !is_array($poi_ids)) {
            wp_die('No POIs selected for export');
        }
        
        $ids_placeholder = implode(',', array_fill(0, count($poi_ids), '%s'));
        $query = $wpdb->prepare("SELECT * FROM $master_table WHERE place_id IN ($ids_placeholder)", $poi_ids);
        $pois = $wpdb->get_results($query, ARRAY_A);
        
        if (empty($pois)) {
            wp_die('No POIs found for export');
        }
        
        // GeoDirectory CSV header - matches the import template
        $header = [
            'post_title',
            'post_content',
            'post_status',
            'post_author',
            'post_type',
            'post_date',
            'post_modified',
            'post_tags',
            'post_category',
            'default_category',
            'featured',
            'street',
            'street2',
            'city',
            'region',
            'country',
            'zip',
            'latitude',
            'longitude',
            'google_places_id',
            'post_images'
        ];
        
        // Output CSV headers
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="geodirectory_pois_export_'.date('Ymd_His').'.csv"');
        $out = fopen('php://output', 'w');
        fputcsv($out, $header);
        
        foreach ($pois as $poi) {
            // Debug: Log the POI data being processed
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] Processing POI for CSV: ' . print_r($poi, true));
            }
            
            // Use assigned categories only (no auto-assignment) - ensure numeric IDs
            $category = '';
            if (!empty($poi['categories'])) {
                if (defined('WP_DEBUG') && WP_DEBUG) {
                    error_log('[TCGP DEBUG] Raw category value: "' . $poi['categories'] . '" (type: ' . gettype($poi['categories']) . ')');
                }
                
                // If it's already a numeric ID, use it directly
                if (is_numeric($poi['categories'])) {
                    $category = $poi['categories'];
                    if (defined('WP_DEBUG') && WP_DEBUG) {
                        error_log('[TCGP DEBUG] Using category as numeric ID: ' . $category);
                    }
                } else {
                    // If it's a slug, convert to ID
                    $category = $this->get_category_id_by_slug($poi['categories']);
                    if (defined('WP_DEBUG') && WP_DEBUG) {
                        error_log('[TCGP DEBUG] Converted category slug "' . $poi['categories'] . '" to ID: ' . $category);
                    }
                }
            }
            
            // Use assigned tags only (no auto-assignment) - ensure numeric IDs
            $tags = '';
            if (!empty($poi['tags'])) {
                if (defined('WP_DEBUG') && WP_DEBUG) {
                    error_log('[TCGP DEBUG] Raw tags value: "' . $poi['tags'] . '" (type: ' . gettype($poi['tags']) . ')');
                }
                
                // If it's already a numeric ID, use it directly
                if (is_numeric($poi['tags'])) {
                    $tags = $poi['tags'];
                    if (defined('WP_DEBUG') && WP_DEBUG) {
                        error_log('[TCGP DEBUG] Using tags as numeric ID: ' . $tags);
                    }
                } else {
                    // If it's a slug, convert to ID
                    $tags = $this->get_tag_id_by_slug($poi['tags']);
                    if (defined('WP_DEBUG') && WP_DEBUG) {
                        error_log('[TCGP DEBUG] Converted tags slug "' . $poi['tags'] . '" to ID: ' . $tags);
                    }
                }
            }
            
            // Get address components using offline parsing first (no API calls needed)
            $address_components = $this->parse_address_from_formatted_address($poi);
            
            // Use generativeSummary for post_content, fallback to short_description, then vicinity, then name
            $post_content = '';
            if (!empty($poi['generativeSummary'])) {
                $post_content = $poi['generativeSummary'];
            } elseif (!empty($poi['short_description'])) {
                $post_content = $poi['short_description'];
            } elseif (!empty($poi['vicinity'])) {
                $post_content = $poi['vicinity'];
            } else {
                $post_content = $poi['name'];
            }
            
            // Debug: Log the final values being used
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] Final CSV values - Category: "' . $category . '", Tags: "' . $tags . '", Post Content: "' . $post_content . '"');
                error_log('[TCGP DEBUG] Address components: ' . print_r($address_components, true));
            }
            
            $row = [
                $poi['name'], // post_title
                $post_content, // post_content
                'publish', // post_status
                1, // post_author
                'gd_place', // post_type
                $poi['date_first_seen'] ?: '', // post_date
                $poi['date_last_updated'] ?: '', // post_modified
                $tags, // post_tags
                $category, // post_category
                $category, // default_category
                0, // featured
                $address_components['street'], // street
                $address_components['street2'], // street2
                $address_components['city'], // city
                $address_components['region'], // region
                $address_components['country'], // country
                $address_components['zip'], // zip
                $poi['latitude'], // latitude
                $poi['longitude'], // longitude
                $poi['place_id'], // google_places_id
                '' // post_images
            ];
            fputcsv($out, $row);
        }
        fclose($out);
        exit;
    }
    
    /**
     * Parse address components from Google Places API formatted_address
     */
    private function parse_address_from_formatted_address($poi) {
        $formatted = isset($poi['formatted_address']) ? $poi['formatted_address'] : '';
        $result = [
            'street' => '',
            'street2' => '',
            'city' => '',
            'region' => '',
            'country' => '',
            'zip' => ''
        ];
        if (!$formatted) return $result;
        // Example: "123 Main St Unit D, Springfield, IL 62704, USA"
        $parts = explode(',', $formatted);
        if (count($parts) >= 3) {
            $result['street'] = trim($parts[0]);
            $city_region_zip = trim($parts[1]);
            $country = trim($parts[2]);
            $result['country'] = $country;
            // Try to split city, region, zip
            if (preg_match('/^(.*) ([A-Z]{2,}) (\d{5}(?:-\d{4})?)$/', $city_region_zip, $m)) {
                $result['city'] = trim($m[1]);
                $result['region'] = trim($m[2]);
                $result['zip'] = trim($m[3]);
            } elseif (preg_match('/^(.*) ([A-Z]{2,})$/', $city_region_zip, $m)) {
                $result['city'] = trim($m[1]);
                $result['region'] = trim($m[2]);
            } else {
                $result['city'] = $city_region_zip;
            }
            // Extract unit/apartment from street
            if (preg_match('/(.+?) (Unit|Apt|Suite) ([^,]+)/i', $result['street'], $m)) {
                $result['street'] = trim($m[1]);
                $result['street2'] = trim($m[2] . ' ' . $m[3]);
            }
        }
        return $result;
    }
    
    /**
     * Get address components using Google Geocoding API
     */
    private function get_address_components($latitude, $longitude) {
        $api_key = get_option('tcgp_google_places_api_key');
        
        if (empty($api_key)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] No API key available for geocoding');
            }
            return array(
                'street' => '',
                'street2' => '',
                'city' => '',
                'region' => '',
                'country' => '',
                'zip' => ''
            );
        }
        
        $url = 'https://maps.googleapis.com/maps/api/geocode/json';
        $params = array(
            'latlng' => $latitude . ',' . $longitude,
            'key' => $api_key
        );
        
        $url = add_query_arg($params, $url);
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] Calling Geocoding API: ' . $url);
        }
        
        $response = wp_remote_get($url);
        
        if (is_wp_error($response)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] Geocoding API error: ' . $response->get_error_message());
            }
            return array(
                'street' => '',
                'street2' => '',
                'city' => '',
                'region' => '',
                'country' => '',
                'zip' => ''
            );
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] Geocoding API response status: ' . ($data['status'] ?? 'Unknown'));
            error_log('[TCGP DEBUG] Geocoding API response: ' . print_r($data, true));
        }
        
        if (empty($data) || $data['status'] !== 'OK' || empty($data['results'])) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] Geocoding API returned: ' . ($data['status'] ?? 'Unknown error'));
            }
            return array(
                'street' => '',
                'street2' => '',
                'city' => '',
                'region' => '',
                'country' => '',
                'zip' => ''
            );
        }
        
        $result = $data['results'][0];
        $address_components = $result['address_components'];
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] Address components: ' . print_r($address_components, true));
        }
        
        $components = array(
            'street' => '',
            'street2' => '',
            'city' => '',
            'region' => '',
            'country' => '',
            'zip' => ''
        );
        
        // Build street address from street_number and route
        $street_number = '';
        $route = '';
        
        foreach ($address_components as $component) {
            $types = $component['types'];
            $value = $component['long_name'];
            
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] Processing component: ' . $value . ' with types: ' . print_r($types, true));
            }
            
            if (in_array('street_number', $types)) {
                $street_number = $value;
            } elseif (in_array('route', $types)) {
                $route = $value;
            } elseif (in_array('locality', $types) || in_array('sublocality', $types)) {
                $components['city'] = $value;
            } elseif (in_array('administrative_area_level_1', $types)) {
                $components['region'] = $value;
            } elseif (in_array('country', $types)) {
                $components['country'] = $value;
            } elseif (in_array('postal_code', $types)) {
                $components['zip'] = $value;
            }
            
            // Also check for alternative type names
            if (in_array('administrative_area_level_2', $types) && empty($components['region'])) {
                $components['region'] = $value;
            } elseif (in_array('administrative_area_level_3', $types) && empty($components['region'])) {
                $components['region'] = $value;
            }
        }
        
        // Combine street number and route
        if (!empty($street_number) && !empty($route)) {
            $components['street'] = $street_number . ' ' . $route;
        } elseif (!empty($route)) {
            $components['street'] = $route;
        } elseif (!empty($street_number)) {
            $components['street'] = $street_number;
        }
        
        // Clean up all components
        foreach ($components as $key => $value) {
            $components[$key] = trim($value);
        }
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] Final address components for ' . $latitude . ',' . $longitude . ': ' . print_r($components, true));
        }
        
        return $components;
    }
    
    /**
     * Parse address from vicinity field as fallback
     */
    private function parse_address_from_vicinity($vicinity) {
        if (empty($vicinity)) {
            return array(
                'street' => '',
                'street2' => '',
                'city' => '',
                'region' => '',
                'country' => '',
                'zip' => ''
            );
        }
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] Parsing vicinity: ' . $vicinity);
        }
        
        // First, try to extract zip code using regex pattern
        $zip_pattern = '/\b\d{5}(?:-\d{4})?\b/';
        $zip_match = null;
        if (preg_match($zip_pattern, $vicinity, $zip_match)) {
            $zip_code = $zip_match[0];
            // Remove the zip code from the vicinity for further parsing
            $vicinity = preg_replace($zip_pattern, '', $vicinity);
            $vicinity = str_replace(',,', ',', $vicinity); // Clean up double commas
            $vicinity = trim($vicinity, ', '); // Remove leading/trailing commas and spaces
        }
        
        // Split by commas and try to parse
        $parts = array_map('trim', explode(',', $vicinity));
        
        $components = array(
            'street' => '',
            'street2' => '',
            'city' => '',
            'region' => '',
            'country' => '',
            'zip' => $zip_match ? $zip_match[0] : ''
        );
        
        // Handle different address formats
        if (count($parts) >= 1) {
            $street_part = $parts[0];
            
            // Check if street part contains unit/apartment information
            $street_components = $this->parse_street_with_unit($street_part);
            $components['street'] = $street_components['street'];
            $components['street2'] = $street_components['street2'];
        }
        
        if (count($parts) >= 2) {
            $components['city'] = $parts[1];
        }
        
        if (count($parts) >= 3) {
            $part3 = $parts[2];
            
            // Check if this looks like a state abbreviation (2 letters)
            if (strlen($part3) == 2 && ctype_alpha($part3)) {
                $components['region'] = strtoupper($part3);
            }
            // Check if this looks like a zip code (5 digits) - fallback if regex didn't catch it
            elseif (strlen($part3) == 5 && is_numeric($part3) && empty($components['zip'])) {
                $components['zip'] = $part3;
            }
            // Check if this looks like a state name (longer text)
            elseif (strlen($part3) > 2 && ctype_alpha($part3)) {
                $components['region'] = $part3;
            }
            // Otherwise treat as country
            else {
                $components['country'] = $part3;
            }
        }
        
        if (count($parts) >= 4) {
            $part4 = $parts[3];
            
            // If we already have a region, this might be a zip code
            if (!empty($components['region']) && is_numeric($part4) && empty($components['zip'])) {
                $components['zip'] = $part4;
            }
            // If we already have a zip, this might be a region
            elseif (!empty($components['zip']) && ctype_alpha($part4)) {
                $components['region'] = $part4;
            }
            // Otherwise treat as country
            else {
                $components['country'] = $part4;
            }
        }
        
        // Set default region for common US states if we have a city but no region
        if (empty($components['region']) && !empty($components['city'])) {
            $city_to_state = array(
                'greenville' => 'SC',
                'spartanburg' => 'SC',
                'columbia' => 'SC',
                'charleston' => 'SC',
                'myrtle beach' => 'SC',
                'asheville' => 'NC',
                'charlotte' => 'NC',
                'raleigh' => 'NC',
                'atlanta' => 'GA',
                'savannah' => 'GA'
            );
            
            $city_lower = strtolower($components['city']);
            if (isset($city_to_state[$city_lower])) {
                $components['region'] = $city_to_state[$city_lower];
            }
        }
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] Parsed vicinity components: ' . print_r($components, true));
        }
        
        return $components;
    }
    
    /**
     * Parse street address and separate unit/apartment information
     */
    private function parse_street_with_unit($street_part) {
        $components = array(
            'street' => $street_part,
            'street2' => ''
        );
        
        // Common street type patterns to look for
        $street_types = array(
            'drive', 'dr', 'street', 'st', 'avenue', 'ave', 'road', 'rd', 
            'boulevard', 'blvd', 'lane', 'ln', 'court', 'ct', 'place', 'pl',
            'way', 'circle', 'cir', 'terrace', 'ter', 'trail', 'trl'
        );
        
        // Look for unit/apartment patterns after street types
        $unit_patterns = array(
            '/\b(unit|apt|apartment|suite|ste|#|number|no)\s*[a-z0-9\-]+/i',
            '/\b[a-z0-9\-]+\s*(unit|apt|apartment|suite|ste|#|number|no)\b/i'
        );
        
        // First, try to find a street type and see if there's unit info after it
        foreach ($street_types as $type) {
            $pattern = '/\b' . preg_quote($type, '/') . '\b/i';
            if (preg_match($pattern, $street_part, $matches, PREG_OFFSET_CAPTURE)) {
                $type_end = $matches[0][1] + strlen($matches[0][0]);
                $after_type = trim(substr($street_part, $type_end));
                
                // Check if there's unit information after the street type
                foreach ($unit_patterns as $unit_pattern) {
                    if (preg_match($unit_pattern, $after_type, $unit_match)) {
                        $components['street'] = trim(substr($street_part, 0, $type_end));
                        $components['street2'] = trim($unit_match[0]);
                        
                        if (defined('WP_DEBUG') && WP_DEBUG) {
                            error_log('[TCGP DEBUG] Separated street: "' . $components['street'] . '" and unit: "' . $components['street2'] . '"');
                        }
                        return $components;
                    }
                }
            }
        }
        
        // If no street type found, look for unit patterns anywhere in the string
        foreach ($unit_patterns as $unit_pattern) {
            if (preg_match($unit_pattern, $street_part, $unit_match)) {
                $unit_start = strpos($street_part, $unit_match[0]);
                $components['street'] = trim(substr($street_part, 0, $unit_start));
                $components['street2'] = trim($unit_match[0]);
                
                if (defined('WP_DEBUG') && WP_DEBUG) {
                    error_log('[TCGP DEBUG] Separated street: "' . $components['street'] . '" and unit: "' . $components['street2'] . '"');
                }
                return $components;
            }
        }
        
        return $components;
    }
    
    /**
     * Simple offline address parsing that doesn't require any API calls
     */
    private function parse_address_offline($poi) {
        $components = array(
            'street' => '',
            'street2' => '',
            'city' => '',
            'region' => '',
            'country' => '',
            'zip' => ''
        );
        
        // Try parsing from vicinity first (most reliable)
        if (!empty($poi['vicinity'])) {
            $vicinity_components = $this->parse_address_from_vicinity($poi['vicinity']);
            $components = array_merge($components, $vicinity_components);
        }
        
        // If we still don't have city, try short_description
        if (empty($components['city']) && !empty($poi['short_description'])) {
            $desc_components = $this->parse_address_from_vicinity($poi['short_description']);
            foreach ($desc_components as $key => $value) {
                if (empty($components[$key]) && !empty($value)) {
                    $components[$key] = $value;
                }
            }
        }
        
        // Set default country if not found
        if (empty($components['country'])) {
            $components['country'] = 'United States'; // Default for your area
        }
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] Offline parsed components: ' . print_r($components, true));
        }
        
        return $components;
    }
    
    /**
     * Map Google Places types to GeoDirectory category IDs
     */
    public function map_google_types_to_category($types) {
        // Get GeoDirectory categories
        $gd_categories = $this->get_geodirectory_categories();
        
        // Create a mapping from Google types to GeoDirectory category slugs
        $type_to_slug_mapping = array(
            'restaurant' => 'restaurants',
            'cafe' => 'cafes',
            'bar' => 'bars',
            'bakery' => 'bakeries',
            'food' => 'restaurants',
            'meal_takeaway' => 'takeout',
            'meal_delivery' => 'delivery',
            'toilet' => 'restrooms',
            'restroom' => 'restrooms',
            'parking' => 'parking',
            'drinking_water' => 'water-fountains',
            'hospital' => 'hospitals',
            'police' => 'police-stations',
            'fire_station' => 'fire-stations',
            'tourist_information' => 'information-centers',
            'park' => 'parks',
            'playground' => 'playgrounds',
            'gym' => 'gyms',
            'store' => 'stores',
            'convenience_store' => 'convenience-stores',
            'gas_station' => 'gas-stations',
            'hotel' => 'hotels',
            'campground' => 'campgrounds',
            'transit_station' => 'transit-stations',
            'bus_station' => 'bus-stations'
        );
        
        // Try to find a matching category
        foreach ($types as $type) {
            if (isset($type_to_slug_mapping[$type])) {
                $target_slug = $type_to_slug_mapping[$type];
                
                // Look for exact match first
                if (isset($gd_categories[$target_slug])) {
                    return $this->get_category_id_by_slug($target_slug);
                }
                
                // Look for partial matches
                foreach ($gd_categories as $slug => $name) {
                    if (strpos($slug, $target_slug) !== false || strpos($name, $target_slug) !== false) {
                        return $this->get_category_id_by_slug($slug);
                    }
                }
            }
        }
        
        // Default to first available category or empty
        if (!empty($gd_categories)) {
            $first_slug = array_keys($gd_categories)[0];
            return $this->get_category_id_by_slug($first_slug);
        }
        
        return ''; // Return empty if no categories available
    }
    
    /**
     * Get GeoDirectory category ID by slug
     */
    private function get_category_id_by_slug($slug) {
        global $wpdb;
        
        $term = $wpdb->get_row($wpdb->prepare(
            "SELECT t.term_id FROM {$wpdb->terms} t
            INNER JOIN {$wpdb->term_taxonomy} tt ON t.term_id = tt.term_id
            WHERE tt.taxonomy = 'gd_placecategory' AND t.slug = %s",
            $slug
        ));
        
        return $term ? $term->term_id : '';
    }
    
    /**
     * Map Google Places types to amenities array
     */
    public function map_google_types_to_amenities($types) {
        $amenity_mapping = array(
            'restaurant' => 'food',
            'cafe' => 'cafe',
            'bar' => 'drink',
            'bakery' => 'food',
            'toilet' => 'restroom',
            'restroom' => 'restroom',
            'parking' => 'parking',
            'drinking_water' => 'water',
            'hospital' => 'emergency',
            'police' => 'emergency',
            'fire_station' => 'emergency',
            'tourist_information' => 'information',
            'park' => 'park',
            'playground' => 'playground',
            'gym' => 'fitness',
            'store' => 'shopping',
            'convenience_store' => 'shopping',
            'gas_station' => 'fuel',
            'hotel' => 'lodging',
            'campground' => 'camping',
            'transit_station' => 'transit',
            'bus_station' => 'transit'
        );
        
        $amenities = array();
        foreach ($types as $type) {
            if (isset($amenity_mapping[$type])) {
                $amenities[] = $amenity_mapping[$type];
            }
        }
        
        return array_unique($amenities);
    }

    /**
     * Delete all POIs from the master table
     */
    public function delete_all_master_pois() {
        global $wpdb;
        $master_table = $wpdb->prefix . 'tcgp_master_pois';
        $result = $wpdb->query("TRUNCATE TABLE $master_table");
        if ($result === false) {
            return new WP_Error('db_error', 'Failed to delete all POIs');
        }
        return true;
    }

    /**
     * AJAX handler to delete all master POIs
     */
    public function ajax_delete_all_master_pois() {
        if (!wp_verify_nonce($_POST['nonce'], 'tcgp_nonce')) {
            wp_die('Security check failed');
        }
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        $result = $this->delete_all_master_pois();
        if (is_wp_error($result)) {
            wp_send_json_error($result->get_error_message());
        } else {
            wp_send_json_success();
        }
    }

    /**
     * Get all unique Google Place types from the master POI table
     */
    public function get_all_place_types() {
        global $wpdb;
        $master_table = $wpdb->prefix . 'tcgp_master_pois';
        $types = array();
        $results = $wpdb->get_col("SELECT types FROM $master_table WHERE types IS NOT NULL AND types != ''");
        foreach ($results as $json) {
            $arr = json_decode($json, true);
            if (is_array($arr)) {
                foreach ($arr as $type) {
                    $types[$type] = true;
                }
            }
        }
        $unique_types = array_keys($types);
        sort($unique_types);
        return $unique_types;
    }

    /**
     * Get the relevant Google Place types (from option)
     */
    public function get_relevant_types() {
        $types = get_option('tcgp_relevant_types', array());
        if (!is_array($types)) $types = array();
        return $types;
    }

    /**
     * Update the relevant Google Place types (from settings form)
     */
    public function update_relevant_types($types) {
        if (!is_array($types)) $types = array();
        update_option('tcgp_relevant_types', $types);
    }

    /**
     * Get all GeoDirectory categories (gd_place_category taxonomy)
     */
    public function get_geodirectory_categories() {
        global $wpdb;
        $tax = 'gd_placecategory';
        $results = $wpdb->get_results($wpdb->prepare(
            "SELECT t.slug, t.name FROM {$wpdb->terms} t
            INNER JOIN {$wpdb->term_taxonomy} tt ON t.term_id = tt.term_id
            WHERE tt.taxonomy = %s ORDER BY t.name ASC",
            $tax
        ));
        $cats = array();
        foreach ($results as $row) {
            $cats[$row->slug] = $row->name;
        }
        return $cats;
    }

    /**
     * Get all GeoDirectory tags (gd_place_tags taxonomy)
     */
    public function get_geodirectory_tags() {
        global $wpdb;
        $tax = 'gd_place_tags';
        $results = $wpdb->get_results($wpdb->prepare(
            "SELECT t.slug, t.name FROM {$wpdb->terms} t
            INNER JOIN {$wpdb->term_taxonomy} tt ON t.term_id = tt.term_id
            WHERE tt.taxonomy = %s ORDER BY t.name ASC",
            $tax
        ));
        $tags = array();
        foreach ($results as $row) {
            $tags[$row->slug] = $row->name;
        }
        return $tags;
    }

    /**
     * Bulk update categories/tags for selected POIs
     */
    public function bulk_edit_pois($poi_ids, $categories, $tags) {
        global $wpdb;
        $master_table = $wpdb->prefix . 'tcgp_master_pois';
        if (empty($poi_ids) || !is_array($poi_ids)) return new WP_Error('no_pois', 'No POIs selected');
        $cat_str = is_array($categories) ? implode(',', $categories) : '';
        $tag_str = is_array($tags) ? implode(',', $tags) : '';
        $ids_placeholder = implode(',', array_fill(0, count($poi_ids), '%s'));
        $query = $wpdb->prepare("UPDATE $master_table SET categories = %s, tags = %s WHERE place_id IN ($ids_placeholder)", array_merge(array($cat_str, $tag_str), $poi_ids));
        $result = $wpdb->query($query);
        if ($result === false) return new WP_Error('db_error', 'Failed to update POIs');
        return true;
    }

    /**
     * AJAX handler for bulk editing POIs
     */
    public function ajax_bulk_edit_pois() {
        if (!wp_verify_nonce($_POST['nonce'], 'tcgp_nonce')) {
            wp_die('Security check failed');
        }
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        $poi_ids = isset($_POST['poi_ids']) ? json_decode(stripslashes($_POST['poi_ids']), true) : array();
        $categories = isset($_POST['categories']) ? json_decode(stripslashes($_POST['categories']), true) : array();
        $tags = isset($_POST['tags']) ? json_decode(stripslashes($_POST['tags']), true) : array();
        $result = $this->bulk_edit_pois($poi_ids, $categories, $tags);
        if (is_wp_error($result)) {
            wp_send_json_error($result->get_error_message());
        } else {
            wp_send_json_success();
        }
    }

    /**
     * Update the search radius setting
     */
    public function update_search_radius($radius) {
        return update_option('tcgp_search_radius', intval($radius));
    }
    
    /**
     * Debug function to check radius setting
     */
    public function debug_radius_setting() {
        $current_radius = get_option('tcgp_search_radius', 50);
        error_log('[TCGP DEBUG] Current radius setting: ' . $current_radius);
        return $current_radius;
    }
    
    /**
     * Force reset radius to a specific value
     */
    public function force_reset_radius() {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] Force resetting radius...');
        }
        
        // Delete the option completely
        delete_option('tcgp_search_radius');
        
        // Set it to 50 meters
        $result = update_option('tcgp_search_radius', 50);
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] Radius reset result: ' . ($result ? 'success' : 'failed'));
            error_log('[TCGP DEBUG] New radius value: ' . get_option('tcgp_search_radius', 'not set'));
        }
        
        return $result;
    }
    
    /**
     * Force clear and set radius to a specific value
     */
    public function force_set_radius($new_radius) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] Force setting radius to: ' . $new_radius);
        }
        
        // Delete the option completely
        delete_option('tcgp_search_radius');
        
        // Set it to the new value
        $result = update_option('tcgp_search_radius', intval($new_radius));
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] Radius set result: ' . ($result ? 'success' : 'failed'));
            error_log('[TCGP DEBUG] New radius value: ' . get_option('tcgp_search_radius', 'not set'));
        }
        
        return $result;
    }

    /**
     * AJAX handler for force resetting radius
     */
    public function ajax_force_reset_radius() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'tcgp_nonce')) {
            wp_die('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $result = $this->force_reset_radius();
        
        if ($result) {
            wp_send_json_success('Radius force reset to 50 meters');
        } else {
            wp_send_json_error('Failed to force reset radius');
        }
    }
    
    /**
     * AJAX handler for force setting radius to a specific value
     */
    public function ajax_force_set_radius() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'tcgp_nonce')) {
            wp_die('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $new_radius = intval($_POST['new_radius']);
        
        if ($new_radius < 1 || $new_radius > 10000) {
            wp_send_json_error('Invalid radius value (1-10000)');
        }
        
        $result = $this->force_set_radius($new_radius);
        
        if ($result) {
            wp_send_json_success('Radius force set to ' . $new_radius . ' meters');
        } else {
            wp_send_json_error('Failed to force set radius');
        }
    }

    /**
     * Get tag ID by slug
     */
    private function get_tag_id_by_slug($slug) {
        global $wpdb;
        
        $term = $wpdb->get_row($wpdb->prepare(
            "SELECT t.term_id FROM {$wpdb->terms} t
            INNER JOIN {$wpdb->term_taxonomy} tt ON t.term_id = tt.term_id
            WHERE tt.taxonomy = 'gd_place_tags' AND t.slug = %s",
            $slug
        ));
        
        return $term ? $term->term_id : '';
    }
} 