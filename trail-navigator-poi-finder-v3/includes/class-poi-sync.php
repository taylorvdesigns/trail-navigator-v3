<?php
/**
 * POI synchronization functionality for Trail Navigator POI Finder v3
 */
class TNPOI_POI_Sync {
    
    private $settings;
    private $api_key;
    private $radius;
    private $interval;
    private $max_pois;
    private $place_types;
    private $category_mapping;
    
    /**
     * Initialize sync functionality
     */
    public function __construct() {
        $this->settings = new TNPOI_Settings();
        $this->load_settings();
        
        // Register AJAX handlers
        add_action('wp_ajax_tnpoi_get_sampled_points', array($this, 'ajax_get_sampled_points'));
        add_action('wp_ajax_tnpoi_sync_batch', array($this, 'ajax_sync_batch'));
        add_action('wp_ajax_tnpoi_test_sync', array($this, 'ajax_test_sync'));
    }
    
    /**
     * Load sync settings
     */
    private function load_settings() {
        $settings = $this->settings->get_settings();
        $this->api_key = $settings['google_places_api_key'];
        $this->radius = intval($settings['sync_radius']);
        $this->interval = intval($settings['sync_interval']);
        $this->max_pois = intval($settings['max_pois_per_sync']);
        $this->place_types = $settings['place_types'];
        $this->category_mapping = $settings['category_mapping'];
    }
    
    /**
     * Get sampled points for a trail (coordinate thinning)
     */
    public function get_sampled_points($trail_id) {
        $trail_config = get_option('trail_navigator_config', array());
        $trails = isset($trail_config['trails']) ? $trail_config['trails'] : array();
        
        $selected_trail = null;
        foreach ($trails as $trail) {
            if ((string)$trail['routeId'] === (string)$trail_id) {
                $selected_trail = $trail;
                break;
            }
        }
        
        if (!$selected_trail || empty($selected_trail['trackPoints'])) {
            return array();
        }
        
        $sampled_points = array();
        $last_point = null;
        
        foreach ($selected_trail['trackPoints'] as $pt) {
            if (!$last_point) {
                $sampled_points[] = $pt;
                $last_point = $pt;
            } else {
                $dist = $this->haversine_distance($last_point['lat'], $last_point['lng'], $pt['lat'], $pt['lng']);
                if ($dist >= $this->interval) {
                    $sampled_points[] = $pt;
                    $last_point = $pt;
                }
            }
        }
        
        return $sampled_points;
    }
    
    /**
     * Sync POIs for a trail
     */
    public function sync_trail($trail_id, $progress_callback = null) {
        $sampled_points = $this->get_sampled_points($trail_id);
        
        if (empty($sampled_points)) {
            return array(
                'success' => false,
                'message' => 'No trail points found or trail not configured'
            );
        }
        
        $total_points = count($sampled_points);
        $processed = 0;
        $pois_found = 0;
        $pois_saved = 0;
        $errors = array();
        $seen_place_ids = array();
        
        foreach ($sampled_points as $point) {
            $processed++;
            
            if ($progress_callback) {
                $progress_callback($processed, $total_points, "Processing point $processed of $total_points");
            }
            
            // Check if we've reached the max POIs limit
            if ($pois_saved >= $this->max_pois) {
                break;
            }
            
            $pois = $this->fetch_pois_for_point($point['lat'], $point['lng']);
            
            foreach ($pois as $poi) {
                if (isset($seen_place_ids[$poi['place_id']])) {
                    continue; // Skip duplicates
                }
                
                $seen_place_ids[$poi['place_id']] = true;
                $pois_found++;
                
                // Save POI to database
                $poi_id = TNPOI_POI_DB::save_poi($poi);
                if ($poi_id) {
                    $pois_saved++;
                }
            }
            
            // Rate limiting - pause between API calls
            usleep(100000); // 0.1 second delay
        }
        
        return array(
            'success' => true,
            'total_points' => $total_points,
            'pois_found' => $pois_found,
            'pois_saved' => $pois_saved,
            'errors' => $errors
        );
    }
    
    /**
     * Fetch POIs for a specific point
     */
    private function fetch_pois_for_point($lat, $lng) {
        if (empty($this->api_key)) {
            return array();
        }
        
        $pois = array();
        
        // Fetch POIs for each place type
        foreach ($this->place_types as $place_type) {
            $url = add_query_arg(array(
                'location' => $lat . ',' . $lng,
                'radius' => $this->radius,
                'type' => $place_type,
                'key' => $this->api_key
            ), 'https://maps.googleapis.com/maps/api/place/nearbysearch/json');
            
            $response = wp_remote_get($url, array(
                'timeout' => 15,
                'headers' => array('Accept' => 'application/json')
            ));
            
            if (is_wp_error($response)) {
                continue;
            }
            
            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);
            
            if (empty($data['results'])) {
                continue;
            }
            
            foreach ($data['results'] as $place) {
                $poi = $this->format_place_data($place, $place_type);
                if ($poi) {
                    $pois[] = $poi;
                }
            }
        }
        
        return $pois;
    }
    
    /**
     * Format Google Places data for storage
     */
    private function format_place_data($place, $place_type) {
        if (empty($place['place_id'])) {
            return false;
        }
        
        // Parse address components
        $address = $this->parse_address_components($place);
        
        // Determine category
        $cat_id = $this->determine_category($place['types'] ?? array(), $place_type);
        
        return array(
            'place_id' => $place['place_id'],
            'name' => $place['name'] ?? '',
            'types' => $place['types'] ?? array(),
            'lat' => $place['geometry']['location']['lat'] ?? 0,
            'lng' => $place['geometry']['location']['lng'] ?? 0,
            'trail_id' => '', // Will be set by caller
            'trail_name' => '', // Will be set by caller
            'street' => $address['street'],
            'city' => $address['city'],
            'region' => $address['region'],
            'country' => $address['country'],
            'zip' => $address['zip'],
            'cat_id' => $cat_id,
            'rating' => $place['rating'] ?? 0,
            'user_ratings_total' => $place['user_ratings_total'] ?? 0,
            'price_level' => $place['price_level'] ?? 0,
            'status' => 'active'
        );
    }
    
    /**
     * Parse address components from Google Places result
     */
    private function parse_address_components($place) {
        $result = array(
            'street' => '',
            'city' => '',
            'region' => '',
            'country' => '',
            'zip' => ''
        );
        
        if (!empty($place['vicinity'])) {
            $result['street'] = $place['vicinity'];
        }
        
        if (!empty($place['address_components'])) {
            foreach ($place['address_components'] as $component) {
                $types = $component['types'] ?? array();
                
                if (in_array('street_number', $types)) {
                    $result['street'] = $component['long_name'] . ' ' . $result['street'];
                }
                if (in_array('route', $types)) {
                    $result['street'] = trim(($result['street'] ? $result['street'] . ' ' : '') . $component['long_name']);
                }
                if (in_array('locality', $types)) {
                    $result['city'] = $component['long_name'];
                }
                if (in_array('administrative_area_level_1', $types)) {
                    $result['region'] = $component['long_name'];
                }
                if (in_array('country', $types)) {
                    $result['country'] = $component['long_name'];
                }
                if (in_array('postal_code', $types)) {
                    $result['zip'] = $component['long_name'];
                }
            }
        }
        
        return $result;
    }
    
    /**
     * Determine category based on place types
     */
    private function determine_category($types, $primary_type) {
        // Check category mapping
        foreach ($types as $type) {
            if (isset($this->category_mapping[$type]) && $this->category_mapping[$type]) {
                return $this->category_mapping[$type];
            }
        }
        
        // Check primary type
        if (isset($this->category_mapping[$primary_type]) && $this->category_mapping[$primary_type]) {
            return $this->category_mapping[$primary_type];
        }
        
        return '';
    }
    
    /**
     * Calculate distance between two points using Haversine formula
     */
    private function haversine_distance($lat1, $lon1, $lat2, $lon2) {
        $earth_radius = 6371000; // meters
        
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        
        $a = sin($dLat/2) * sin($dLat/2) + 
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * 
             sin($dLon/2) * sin($dLon/2);
        
        $c = 2 * atan2(sqrt($a), sqrt(1-$a));
        
        return $earth_radius * $c;
    }
    
    /**
     * AJAX: Get sampled points for sync
     */
    public function ajax_get_sampled_points() {
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Unauthorized');
        }
        
        if (!wp_verify_nonce($_GET['nonce'], 'tnpoi_sync_nonce')) {
            wp_send_json_error('Invalid nonce');
        }
        
        $trail_id = sanitize_text_field($_GET['trail_id']);
        $sampled_points = $this->get_sampled_points($trail_id);
        
        wp_send_json_success(array(
            'points' => $sampled_points,
            'count' => count($sampled_points)
        ));
    }
    
    /**
     * AJAX: Sync a batch of points
     */
    public function ajax_sync_batch() {
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Unauthorized');
        }
        
        if (!wp_verify_nonce($_POST['nonce'], 'tnpoi_sync_nonce')) {
            wp_send_json_error('Invalid nonce');
        }
        
        $trail_id = sanitize_text_field($_POST['trail_id']);
        $points = json_decode(stripslashes($_POST['points']), true);
        
        if (!is_array($points)) {
            wp_send_json_error('Invalid points data');
        }
        
        $pois_found = 0;
        $pois_saved = 0;
        $seen_place_ids = array();
        
        foreach ($points as $point) {
            $pois = $this->fetch_pois_for_point($point['lat'], $point['lng']);
            
            foreach ($pois as $poi) {
                if (isset($seen_place_ids[$poi['place_id']])) {
                    continue;
                }
                
                $seen_place_ids[$poi['place_id']] = true;
                $poi['trail_id'] = $trail_id;
                
                // Get trail name
                $trail_config = get_option('trail_navigator_config', array());
                foreach ($trail_config['trails'] ?? array() as $trail) {
                    if ((string)$trail['routeId'] === (string)$trail_id) {
                        $poi['trail_name'] = $trail['name'];
                        break;
                    }
                }
                
                $poi_id = TNPOI_POI_DB::save_poi($poi);
                if ($poi_id) {
                    $pois_saved++;
                }
                $pois_found++;
            }
        }
        
        wp_send_json_success(array(
            'pois_found' => $pois_found,
            'pois_saved' => $pois_saved
        ));
    }
    
    /**
     * AJAX: Test sync (preview without saving)
     */
    public function ajax_test_sync() {
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Unauthorized');
        }
        
        if (!wp_verify_nonce($_POST['nonce'], 'tnpoi_sync_nonce')) {
            wp_send_json_error('Invalid nonce');
        }
        
        $trail_id = sanitize_text_field($_POST['trail_id']);
        $sampled_points = $this->get_sampled_points($trail_id);
        
        if (empty($sampled_points)) {
            wp_send_json_error('No trail points found');
        }
        
        // Test with first few points only
        $test_points = array_slice($sampled_points, 0, 3);
        $pois_found = 0;
        $seen_place_ids = array();
        
        foreach ($test_points as $point) {
            $pois = $this->fetch_pois_for_point($point['lat'], $point['lng']);
            
            foreach ($pois as $poi) {
                if (!isset($seen_place_ids[$poi['place_id']])) {
                    $seen_place_ids[$poi['place_id']] = true;
                    $pois_found++;
                }
            }
        }
        
        wp_send_json_success(array(
            'test_points' => count($test_points),
            'total_points' => count($sampled_points),
            'pois_found' => $pois_found,
            'estimated_total' => round(($pois_found / count($test_points)) * count($sampled_points))
        ));
    }
} 