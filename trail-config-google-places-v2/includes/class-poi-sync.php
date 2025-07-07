<?php
class TCGP2_POI_Sync {
    private $api_key;
    private $max_pois_per_sync;
    
    public function __construct() {
        $this->api_key = get_option('tcgp2_google_places_api_key', '');
        $this->max_pois_per_sync = get_option('tcgp2_max_pois_per_sync', 100);
    }
    
    /**
     * Test sync to preview eligible POIs without fetching detailed information
     */
    public function test_sync_trail($trail_id, $radius = 50, $place_types = []) {
        if (empty($this->api_key)) {
            return new WP_Error('no_api_key', 'Google Places API key not configured');
        }

        // Handle 'all' trails
        if ($trail_id === 'all') {
            $trail_config = get_option('trail_navigator_config', array());
            if (empty($trail_config['trails'])) {
                return new WP_Error('no_trail_data', 'No trails configured');
            }
            $all_results = array();
            $total_places = 0;
            $all_places_by_type = array();
            $trail_progress = array();
            foreach ($trail_config['trails'] as $i => $trail) {
                $single_result = $this->test_sync_trail($trail['routeId'], $radius, $place_types);
                if (is_wp_error($single_result)) {
                    $trail_progress[] = array(
                        'trail_id' => $trail['routeId'],
                        'trail_name' => $trail['name'],
                        'error' => $single_result->get_error_message(),
                        'total_places' => 0,
                        'places_by_type' => array(),
                        'trail_coordinates_count' => 0
                    );
                    continue;
                }
                $trail_progress[] = array(
                    'trail_id' => $trail['routeId'],
                    'trail_name' => $trail['name'],
                    'total_places' => $single_result['total_places'],
                    'places_by_type' => $single_result['places_by_type'],
                    'trail_coordinates_count' => $single_result['trail_coordinates_count']
                );
                $total_places += $single_result['total_places'];
                // Merge places_by_type
                foreach ($single_result['places_by_type'] as $type => $places) {
                    if (!isset($all_places_by_type[$type])) {
                        $all_places_by_type[$type] = array();
                    }
                    $all_places_by_type[$type] = array_merge($all_places_by_type[$type], $places);
                }
            }
            return array(
                'total_places' => $total_places,
                'places_by_type' => $all_places_by_type,
                'trail_progress' => $trail_progress,
                'all_trails' => true
            );
        }

        // Single trail logic (existing)
        $trail_coordinates = $this->get_trail_coordinates($trail_id);
        if (empty($trail_coordinates)) {
            return new WP_Error('no_trail_data', 'No trail coordinates found');
        }
        // Search for POIs along the trail (preview mode)
        $places = $this->search_places_along_trail($trail_coordinates, $radius, $place_types, true);
        if (is_wp_error($places)) {
            return $places;
        }
        // Group places by type for better preview
        $places_by_type = array();
        foreach ($places as $place) {
            $primary_type = $place['types'][0] ?? 'unknown';
            if (!isset($places_by_type[$primary_type])) {
                $places_by_type[$primary_type] = array();
            }
            $places_by_type[$primary_type][] = $place;
        }
        return array(
            'total_places' => count($places),
            'places_by_type' => $places_by_type,
            'sample_places' => array_slice($places, 0, 10), // Show first 10 as sample
            'trail_coordinates_count' => count($trail_coordinates)
        );
    }
    
    /**
     * Sync POIs for a specific trail
     */
    public function sync_trail($trail_id, $radius = 50, $place_types = [], $preview_mode = false) {
        if (empty($this->api_key)) {
            return new WP_Error('no_api_key', 'Google Places API key not configured');
        }
        
        // Get trail coordinates
        $trail_coordinates = $this->get_trail_coordinates($trail_id);
        if (empty($trail_coordinates)) {
            return new WP_Error('no_trail_data', 'No trail coordinates found');
        }
        
        // Search for POIs along the trail
        $places = $this->search_places_along_trail($trail_coordinates, $radius, $place_types, $preview_mode);
        if (is_wp_error($places)) {
            return $places;
        }
        
        // If in preview mode, return preview data
        if ($preview_mode) {
            return $this->test_sync_trail($trail_id, $radius, $place_types);
        }
        
        // Process and save POIs
        $results = $this->process_places($places, $trail_id);
        
        return $results;
    }
    
    /**
     * Sync POIs from form submission
     */
    public function sync_pois() {
        $trail_id = sanitize_text_field($_POST['trail_id']);
        $radius = intval($_POST['radius']);
        $place_types = isset($_POST['place_types']) ? array_map('sanitize_text_field', $_POST['place_types']) : [];
        
        if (empty($trail_id)) {
            return array('success' => false, 'error' => 'No trail selected');
        }
        
        $result = $this->sync_trail($trail_id, $radius, $place_types);
        
        if (is_wp_error($result)) {
            return array('success' => false, 'error' => $result->get_error_message());
        }
        
        return array(
            'success' => true,
            'new' => $result['new'],
            'updated' => $result['updated']
        );
    }
    
    /**
     * Get trail coordinates from RideWithGPS API using the stored routeId (route, not trip)
     */
    private function get_trail_coordinates($trail_id) {
        // Get trail configuration from the existing Trail Navigator Configuration plugin
        $trail_config = get_option('trail_navigator_config', array());
        if (empty($trail_config['trails'])) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP2] No trails found in trail_navigator_config');
            }
            return array();
        }
        $route_id = null;
        foreach ($trail_config['trails'] as $trail) {
            if ($trail['routeId'] === $trail_id) {
                $route_id = $trail['routeId'];
                break;
            }
        }
        if (!$route_id) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP2] No route_id found for trail_id ' . $trail_id);
            }
            return array();
        }
        $api_key = get_option('tcgp2_ridewithgps_api_key', '');
        if (empty($api_key)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP2] RideWithGPS API key not configured');
            }
            return array();
        }
        $json_url = "https://ridewithgps.com/routes/{$route_id}.json?apikey={$api_key}";
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP2] Fetching RideWithGPS JSON from: ' . $json_url);
        }
        $response = wp_remote_get($json_url, array(
            'timeout' => 30,
            'headers' => array('User-Agent' => 'TrailNavigator/2.0')
        ));
        if (is_wp_error($response)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP2] RideWithGPS JSON error: ' . $response->get_error_message());
            }
            return array();
        }
        $body = wp_remote_retrieve_body($response);
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP2] RideWithGPS JSON response (first 500 chars): ' . substr($body, 0, 500));
        }
        $data = json_decode($body, true);
        if (empty($data['route']['track_points'])) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP2] No track_points found in RideWithGPS JSON for routeId ' . $route_id);
            }
            return array();
        }
        $coordinates = array();
        foreach ($data['route']['track_points'] as $point) {
            $coordinates[] = array(
                'lat' => $point['y'],
                'lng' => $point['x']
            );
        }
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP2] Parsed ' . count($coordinates) . ' coordinates from RideWithGPS JSON for routeId ' . $route_id);
        }
        return $coordinates;
    }
    
    /**
     * Search for places along a trail using Google Places API
     */
    private function search_places_along_trail($coordinates, $radius, $place_types = [], $preview_mode = false) {
        $places = array();
        $count = 0;
        
        // Get allowed types from category mapping (exclude those mapped to IGNORE)
        $category_mappings = get_option('tcgp2_category_mappings', array());
        $allowed_types = array();
        foreach ($category_mappings as $google_type => $mapped) {
            if ($mapped && $mapped !== 'IGNORE') {
                $allowed_types[] = $google_type;
            }
        }
        // If $place_types is provided, intersect with allowed_types
        if (!empty($place_types)) {
            $filtered_types = array_intersect($place_types, $allowed_types);
        } else {
            $filtered_types = $allowed_types;
        }
        // If no allowed types, default to establishment (to avoid empty API calls)
        if (empty($filtered_types)) {
            $filtered_types = array('establishment');
        }
        // Sample coordinates along the trail (every 1000m to avoid too many API calls)
        $sample_points = $this->sample_trail_points($coordinates, 1000);
        foreach ($sample_points as $point) {
            if ($count >= $this->max_pois_per_sync) {
                break;
            }
            // Make a separate API call for each allowed type
            foreach ($filtered_types as $type) {
                $nearby_places = $this->search_nearby_places($point['lat'], $point['lng'], $radius, array($type));
                if (is_wp_error($nearby_places)) {
                    continue;
                }
                foreach ($nearby_places as $place) {
                    // Avoid duplicates
                    if (!isset($places[$place['place_id']])) {
                        $places[$place['place_id']] = $place;
                        $count++;
                        if ($count >= $this->max_pois_per_sync) {
                            break 3;
                        }
                    }
                }
            }
        }
        return array_values($places);
    }
    
    /**
     * Sample trail points to reduce API calls
     */
    private function sample_trail_points($coordinates, $interval_meters) {
        $sample_points = array();
        $total_distance = 0;
        
        for ($i = 0; $i < count($coordinates) - 1; $i++) {
            $point1 = $coordinates[$i];
            $point2 = $coordinates[$i + 1];
            
            $distance = $this->calculate_distance($point1['lat'], $point1['lng'], $point2['lat'], $point2['lng']);
            $total_distance += $distance;
            
            // Add sample point every interval_meters
            if ($total_distance >= $interval_meters) {
                $sample_points[] = $point1;
                $total_distance = 0;
            }
        }
        
        // Always include the last point
        if (!empty($coordinates)) {
            $sample_points[] = end($coordinates);
        }
        
        return $sample_points;
    }
    
    /**
     * Calculate distance between two points in meters
     */
    private function calculate_distance($lat1, $lng1, $lat2, $lng2) {
        $earth_radius = 6371000; // Earth's radius in meters
        
        $lat1_rad = deg2rad($lat1);
        $lng1_rad = deg2rad($lng1);
        $lat2_rad = deg2rad($lat2);
        $lng2_rad = deg2rad($lng2);
        
        $delta_lat = $lat2_rad - $lat1_rad;
        $delta_lng = $lng2_rad - $lng1_rad;
        
        $a = sin($delta_lat / 2) * sin($delta_lat / 2) +
             cos($lat1_rad) * cos($lat2_rad) *
             sin($delta_lng / 2) * sin($delta_lng / 2);
        
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        
        return $earth_radius * $c;
    }
    
    /**
     * Search for nearby places using Google Places API
     */
    private function search_nearby_places($lat, $lng, $radius, $place_types = []) {
        $url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
        $params = array(
            'location' => $lat . ',' . $lng,
            'radius' => $radius,
            'key' => $this->api_key
        );
        
        // Add place type filter if specified
        if (!empty($place_types)) {
            // For multiple types, we need to make separate calls or use a different approach
            // For now, we'll use the first type and filter results
            $params['type'] = $place_types[0];
        } else {
            // Default to establishment if no types specified
            $params['type'] = 'establishment';
        }
        
        $url .= '?' . http_build_query($params);
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP2] Google Places API URL: ' . $url);
        }
        
        $response = wp_remote_get($url, array(
            'timeout' => 30,
            'headers' => array('User-Agent' => 'TrailNavigator/2.0')
        ));
        
        if (is_wp_error($response)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP2] Google Places API error: ' . $response->get_error_message());
            }
            return new WP_Error('api_error', 'Failed to fetch places from Google Places API');
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (empty($data['results'])) {
            return array();
        }
        
        $places = array();
        foreach ($data['results'] as $place) {
            // Filter by place types if specified
            if (!empty($place_types)) {
                $place_has_valid_type = false;
                if (isset($place['types']) && is_array($place['types'])) {
                    foreach ($place['types'] as $place_type) {
                        if (in_array($place_type, $place_types)) {
                            $place_has_valid_type = true;
                            break;
                        }
                    }
                }
                if (!$place_has_valid_type) {
                    continue; // Skip this place if it doesn't match any selected types
                }
            }
            
            $places[] = array(
                'place_id' => $place['place_id'],
                'name' => $place['name'],
                'formatted_address' => $place['vicinity'],
                'types' => $place['types'],
                'geometry' => $place['geometry']
            );
        }
        
        return $places;
    }
    
    /**
     * Process and save places to database
     */
    private function process_places($places, $trail_id) {
        $results = array(
            'new' => 0,
            'updated' => 0,
            'errors' => array()
        );
        
        foreach ($places as $place) {
            $poi_data = $this->prepare_poi_data($place, $trail_id);
            
            // Check if POI already exists
            $existing_poi = TCGP2_POI_DB::get_poi_by_place_id($place['place_id']);
            
            if ($existing_poi) {
                // Update existing POI
                $updated = TCGP2_POI_DB::update_poi($existing_poi['id'], $poi_data);
                if ($updated) {
                    $results['updated']++;
                } else {
                    $results['errors'][] = "Failed to update POI: {$place['name']}";
                }
            } else {
                // Insert new POI
                $new_id = TCGP2_POI_DB::insert_poi($poi_data);
                if ($new_id) {
                    $results['new']++;
                } else {
                    $results['errors'][] = "Failed to insert POI: {$place['name']}";
                }
            }
        }
        
        return $results;
    }
    
    /**
     * Prepare POI data for database storage with Place Details API
     */
    private function prepare_poi_data($place, $trail_id) {
        // Get enhanced data from Place Details API
        $enhanced_place = $this->get_place_details($place['place_id']);
        
        // If Place Details API failed, use original place data
        if ($enhanced_place === null) {
            $enhanced_place = $place;
        }
        
        // Parse address components from Place Details or fallback to original
        $address_components = $this->parse_address_components($enhanced_place);
        
        // Debug logging for address components
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP2] POI ' . ($enhanced_place['name'] ?? $place['name']) . ' address_components: ' . json_encode($enhanced_place['address_components'] ?? []));
            error_log('[TCGP2] POI ' . ($enhanced_place['name'] ?? $place['name']) . ' parsed address fields: ' . json_encode($address_components));
        }
        
        // Auto-assign categories based on Google types
        $category_ids = $this->auto_assign_categories($enhanced_place['types'] ?? []);

        // Look up trail name from config
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
        
        return array(
            'place_id' => $place['place_id'],
            'name' => $enhanced_place['name'] ?? $place['name'],
            'latitude' => $enhanced_place['geometry']['location']['lat'] ?? $place['geometry']['location']['lat'],
            'longitude' => $enhanced_place['geometry']['location']['lng'] ?? $place['geometry']['location']['lng'],
            'formatted_address' => $enhanced_place['formatted_address'] ?? ($place['vicinity'] ?? ''),
            'street' => $address_components['street'] ?? '',
            'street2' => $address_components['street2'] ?? '',
            'city' => $address_components['city'] ?? '',
            'region' => $address_components['region'] ?? '',
            'country' => $address_components['country'] ?? 'USA',
            'zip' => $address_components['zip'] ?? '',
            'types' => json_encode($enhanced_place['types'] ?? $place['types']),
            'category_ids' => json_encode($category_ids),
            'tag_ids' => json_encode(array()),
            'status' => 'new',
            'raw_data' => json_encode($enhanced_place), // Save full Place Details response
            'date_synced' => current_time('mysql'),
            'trail_id' => $trail_id,
            'trail_name' => $trail_name
        );
    }
    
    /**
     * Get Place Details from Google Places API
     */
    private function get_place_details($place_id) {
        if (empty($this->api_key)) {
            return null; // Return null if no API key
        }
        
        // Request all needed fields, but remove generativeSummary (not supported)
        $url = "https://maps.googleapis.com/maps/api/place/details/json?place_id={$place_id}&fields=name,formatted_address,address_components,types,geometry&key={$this->api_key}";
        
        $response = wp_remote_get($url, array(
            'timeout' => 30,
            'headers' => array('User-Agent' => 'TrailNavigator/2.0')
        ));
        
        if (is_wp_error($response)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP2] Place Details API error for ' . $place_id . ': ' . $response->get_error_message());
            }
            return null; // Return null on error
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP2] Place Details API response for ' . $place_id . ': ' . substr($body, 0, 500));
        }
        
        if (empty($data) || $data['status'] !== 'OK') {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP2] Place Details API returned status: ' . ($data['status'] ?? 'unknown') . ' for ' . $place_id);
            }
            return null; // Return null on API error
        }
        
        return $data['result'];
    }
    
    /**
     * Parse address components from Place Details API
     */
    private function parse_address_components($place) {
        $components = array(
            'street' => '',
            'street2' => '',
            'city' => '',
            'region' => '',
            'country' => '',
            'zip' => ''
        );
        
        // Use formatted_address as fallback
        if (!empty($place['formatted_address'])) {
            $components['street'] = $place['formatted_address'];
        }
        
        // Parse address_components if available
        if (!empty($place['address_components']) && is_array($place['address_components'])) {
            foreach ($place['address_components'] as $component) {
                $types = $component['types'] ?? [];
                $long_name = $component['long_name'] ?? '';
                $short_name = $component['short_name'] ?? '';
                
                if (in_array('street_number', $types)) {
                    $components['street_number'] = $long_name;
                } elseif (in_array('route', $types)) {
                    $components['route'] = $long_name;
                } elseif (in_array('locality', $types)) {
                    $components['city'] = $long_name;
                } elseif (in_array('administrative_area_level_1', $types)) {
                    $components['region'] = $long_name;
                } elseif (in_array('postal_code', $types)) {
                    $components['zip'] = $long_name;
                } elseif (in_array('country', $types)) {
                    $components['country'] = $long_name;
                }
            }
            
            // Combine street number and route
            if (!empty($components['street_number']) && !empty($components['route'])) {
                $components['street'] = $components['street_number'] . ' ' . $components['route'];
            } elseif (!empty($components['route'])) {
                $components['street'] = $components['route'];
            }
        } else {
            // Fallback to parsing formatted_address if no address_components
            if (!empty($place['formatted_address'])) {
                $components = array_merge($components, $this->parse_formatted_address($place['formatted_address']));
            } elseif (!empty($place['vicinity'])) {
                $components['street'] = $place['vicinity'];
            }
        }
        
        return $components;
    }
    
    /**
     * Parse formatted address into components (fallback method)
     */
    private function parse_formatted_address($formatted_address) {
        $components = array();
        
        // Simple parsing - split by commas
        $parts = array_map('trim', explode(',', $formatted_address));
        
        if (count($parts) >= 1) {
            $components['street'] = $parts[0];
        }
        
        if (count($parts) >= 2) {
            $components['city'] = $parts[1];
        }
        
        if (count($parts) >= 3) {
            $components['region'] = $parts[2];
        }
        
        if (count($parts) >= 4) {
            $components['country'] = $parts[3];
        }
        
        return $components;
    }
    
    /**
     * Auto-assign categories based on Google Places types
     */
    private function auto_assign_categories($types) {
        $category_mapping = array(
            'restaurant' => 'restaurants',
            'food' => 'restaurants',
            'cafe' => 'restaurants',
            'bar' => 'restaurants',
            'lodging' => 'accommodation',
            'hotel' => 'accommodation',
            'gas_station' => 'services',
            'convenience_store' => 'shopping',
            'store' => 'shopping',
            'shopping_mall' => 'shopping',
            'park' => 'recreation',
            'tourist_attraction' => 'attractions',
            'museum' => 'attractions',
            'hospital' => 'health',
            'pharmacy' => 'health',
            'school' => 'education',
            'university' => 'education',
            'bank' => 'services',
            'atm' => 'services',
            'post_office' => 'services'
        );
        
        $assigned_categories = array();
        
        foreach ($types as $type) {
            if (isset($category_mapping[$type])) {
                $assigned_categories[] = $category_mapping[$type];
            }
        }
        
        // Remove duplicates
        return array_unique($assigned_categories);
    }
    
    /**
     * Auto-assign categories to existing POIs that don't have categories
     */
    public function auto_assign_categories_to_existing() {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp2_pois';
        
        // Get POIs without categories
        $pois_without_categories = $wpdb->get_results(
            "SELECT id, types FROM $table WHERE (category_ids IS NULL OR category_ids = '' OR category_ids = '[]') AND types IS NOT NULL"
        );
        
        $updated_count = 0;
        
        foreach ($pois_without_categories as $poi) {
            $types = json_decode($poi->types, true);
            if (!empty($types)) {
                $category_ids = $this->auto_assign_categories($types);
                if (!empty($category_ids)) {
                    $updated = TCGP2_POI_DB::update_poi($poi->id, array(
                        'category_ids' => json_encode($category_ids)
                    ));
                    if ($updated) {
                        $updated_count++;
                    }
                }
            }
        }
        
        return $updated_count;
    }
} 