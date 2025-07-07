<?php
class TCGP2_CSV_Export {
    
    /**
     * Export POIs to GeoDirectory-compatible CSV
     */
    public function export_to_csv($poi_ids = null) {
        try {
            // Get POIs to export (excluding ignored ones)
            if ($poi_ids) {
                $pois = TCGP2_POI_DB::get_pois_by_ids($poi_ids);
                error_log("TCGP2: Got POIs by IDs: " . json_encode($pois));
            } else {
                $pois_data = TCGP2_POI_DB::get_all_pois(array('ignored' => 0));
                error_log("TCGP2: Got all POIs data structure: " . json_encode($pois_data));
                $pois = $pois_data['pois'] ?? [];
                error_log("TCGP2: Extracted POIs array: " . json_encode($pois));
            }
            
            if (empty($pois)) {
                error_log("TCGP2: No POIs found to export");
                return new WP_Error('no_pois', 'No POIs found to export');
            }
            
            error_log("TCGP2: Found " . count($pois) . " POIs to export");
            
            // Get max POIs setting to control API usage
            $max_pois = get_option('tcgp2_max_pois_per_sync', 20);
            $pois_to_process = array_slice($pois, 0, $max_pois);
            
            error_log("TCGP2: Processing " . count($pois_to_process) . " POIs for export");
            
            // Generate CSV content with Place Details API calls
            $csv_content = $this->generate_csv_content($pois_to_process);
            
            if (empty($csv_content)) {
                error_log("TCGP2: Generated CSV content is empty");
                return new WP_Error('empty_csv', 'Generated CSV content is empty');
            }
            
            // Set headers for download
            $filename = 'geodirectory_pois_export_' . date('Ymd_His') . '.csv';
            if (ob_get_level()) {
                ob_end_clean();
            }
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Pragma: no-cache');
            header('Expires: 0');

            // Add UTF-8 BOM
            $bom = chr(239) . chr(187) . chr(191);
            // Force UTF-8 encoding for all content
            $csv_content = mb_convert_encoding($csv_content, 'UTF-8', 'UTF-8');
            // Output
            echo $bom . $csv_content;
            exit;
            
        } catch (Exception $e) {
            error_log("TCGP2: CSV export error: " . $e->getMessage());
            return new WP_Error('export_error', 'CSV export failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Generate CSV content in GeoDirectory format
     */
    private function generate_csv_content($pois) {
        // GeoDirectory CSV headers - exact match to template format
        $headers = array(
            'ID',
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
        );
        
        error_log("TCGP2: CSV headers count: " . count($headers));
        error_log("TCGP2: CSV headers: " . json_encode($headers));
        
        $csv_content = '';
        
        // Add headers
        $csv_content .= $this->array_to_csv_line($headers);
        
        // Add POI data with Place Details API calls
        foreach ($pois as $poi) {
            $csv_line = $this->prepare_poi_for_csv($poi);
            
            // Ensure the CSV line has the same number of elements as headers
            if (count($csv_line) !== count($headers)) {
                error_log("TCGP2: WARNING - CSV line count (" . count($csv_line) . ") doesn't match headers count (" . count($headers) . ")");
                error_log("TCGP2: CSV line keys: " . json_encode(array_keys($csv_line)));
                error_log("TCGP2: CSV line values: " . json_encode(array_values($csv_line)));
                
                // Pad or truncate the array to match headers
                $csv_line = array_pad(array_slice($csv_line, 0, count($headers)), count($headers), '');
            }
            
            $csv_content .= $this->array_to_csv_line($csv_line);
        }
        
        error_log("TCGP2: Final CSV content length: " . strlen($csv_content));
        error_log("TCGP2: Final CSV content preview: " . substr($csv_content, 0, 500));
        
        return $csv_content;
    }
    
    /**
     * Prepare POI data for CSV export with Place Details API
     */
    private function prepare_poi_for_csv($poi) {
        // Convert object to array if needed
        $poi_array = is_object($poi) ? (array) $poi : $poi;
        error_log("TCGP2: Processing POI for CSV - Original data: " . json_encode($poi_array));

        // Use cached POI data from sync (no additional Place Details API call)
        $enhanced_poi = $poi_array;
        error_log("TCGP2: Using cached POI data for export: " . json_encode($enhanced_poi));

        // Get GeoDirectory categories using mapping
        $categories = $this->get_geodirectory_categories($enhanced_poi['types'] ?? '');
        error_log("TCGP2: Mapped categories: " . $categories);

        // Use address fields from DB row if present, else parse from raw_data
        $street = $enhanced_poi['street'] ?? '';
        $street2 = $enhanced_poi['street2'] ?? '';
        $city = $enhanced_poi['city'] ?? '';
        $region = $enhanced_poi['region'] ?? '';
        $country = $enhanced_poi['country'] ?? '';
        $zip = $enhanced_poi['zip'] ?? '';

        // If any address field is missing, try to parse from raw_data
        if (empty($street) || empty($city) || empty($region) || empty($country) || empty($zip)) {
            $raw_data = isset($enhanced_poi['raw_data']) ? json_decode($enhanced_poi['raw_data'], true) : [];
            if (!empty($raw_data['address_components'])) {
                $parsed = $this->parse_address_components($raw_data['address_components']);
                if (empty($street) && !empty($parsed['street'])) $street = $parsed['street'];
                if (empty($street2) && !empty($parsed['street2'])) $street2 = $parsed['street2'];
                if (empty($city) && !empty($parsed['city'])) $city = $parsed['city'];
                if (empty($region) && !empty($parsed['region'])) $region = $parsed['region'];
                if (empty($country) && !empty($parsed['country'])) $country = $parsed['country'];
                if (empty($zip) && !empty($parsed['zip'])) $zip = $parsed['zip'];
            }
        }

        // Get current date in proper format for GeoDirectory
        $current_date = current_time('Y-m-d H:i:s');

        // For default_category, use only the first non-empty category ID
        error_log("TCGP2: post_category string before default_category: " . $categories);
        $category_array = array_filter(explode(',', $categories)); // removes empty elements
        error_log("TCGP2: category_array for default_category: " . json_encode($category_array));
        $default_category = !empty($category_array) ? reset($category_array) : '';
        error_log("TCGP2: default_category value: " . $default_category);

        $csv_data = array(
            'ID' => '',
            'post_title' => $enhanced_poi['name'] ?? '',
            'post_content' => '',
            'post_status' => 'publish',
            'post_author' => '1',
            'post_type' => 'gd_place',
            'post_date' => $current_date,
            'post_modified' => $current_date,
            'post_tags' => '',
            'post_category' => $categories,
            'default_category' => $default_category,
            'featured' => '0',
            'street' => $street,
            'street2' => $street2,
            'city' => $city,
            'region' => $region,
            'country' => $country ?: 'USA',
            'zip' => $zip,
            'latitude' => $enhanced_poi['latitude'] ?? '',
            'longitude' => $enhanced_poi['longitude'] ?? '',
            'google_places_id' => $poi_array['place_id'] ?? '',
            'post_images' => ''
        );
        error_log("TCGP2: Final CSV data: " . json_encode($csv_data));
        error_log("TCGP2: Final CSV data count: " . count($csv_data));
        return $csv_data;
    }
    
    /**
     * Get Place Details from Google Places API
     */
    private function get_place_details($poi) {
        $api_key = get_option('tcgp2_google_places_api_key');
        if (empty($api_key)) {
            error_log("TCGP2: No API key available for Place Details");
            return $poi; // Return original data if no API key
        }
        
        $place_id = $poi['place_id'] ?? '';
        if (empty($place_id)) {
            error_log("TCGP2: No place_id available for Place Details");
            return $poi; // Return original data if no place_id
        }
        
        error_log("TCGP2: Making Place Details API call for place_id: " . $place_id);
        
        // Add editorial_summary to the fields parameter
        $url = "https://maps.googleapis.com/maps/api/place/details/json?place_id={$place_id}&fields=name,formatted_address,address_components,types,geometry,editorial_summary&key={$api_key}";
        
        $response = wp_remote_get($url);
        
        if (is_wp_error($response)) {
            error_log("TCGP2: Place Details API error for {$place_id}: " . $response->get_error_message());
            return $poi; // Return original data on error
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        error_log("TCGP2: Place Details API response for {$place_id}: " . json_encode($data));
        
        if (isset($data['status']) && $data['status'] !== 'OK') {
            error_log("TCGP2: Place Details API returned status: " . $data['status'] . " for " . $place_id);
            return $poi; // Return original data on API error
        }
        
        $result = $data['result'] ?? [];
        
        // Merge enhanced data with original POI data
        $enhanced_poi = array_merge($poi, array(
            'name' => $result['name'] ?? $poi['name'] ?? '',
            'formatted_address' => $result['formatted_address'] ?? $poi['formatted_address'] ?? '',
            'address_components' => $result['address_components'] ?? [],
            'types' => $result['types'] ?? json_decode($poi['types'] ?? '[]', true) ?? [],
            'latitude' => $result['geometry']['location']['lat'] ?? $poi['latitude'] ?? '',
            'longitude' => $result['geometry']['location']['lng'] ?? $poi['longitude'] ?? '',
            'editorial_summary' => $result['editorial_summary']['text'] ?? ''
        ));
        
        return $enhanced_poi;
    }
    
    /**
     * Convert array to CSV line
     */
    private function array_to_csv_line($array) {
        $line = '';
        $values = array_values($array); // Ensure we use values in order
        // Ensure we have exactly 22 values (matching headers)
        while (count($values) < 22) {
            $values[] = '';
        }
        if (count($values) > 22) {
            $values = array_slice($values, 0, 22);
        }
        foreach ($values as $value) {
            $value = $value ?? '';
            $value = str_replace('"', '""', $value);
            $line .= '"' . $value . '",'; // Always quote every field
        }
        // Do NOT trim the trailing comma; always end with a comma and CRLF
        $line .= "\r\n";
        return $line;
    }
    
    /**
     * Get GeoDirectory categories from Google Places types using mapping
     */
    private function get_geodirectory_categories($types_input) {
        error_log("TCGP2: Getting GeoDirectory categories for types: " . json_encode($types_input));
        
        if (empty($types_input)) {
            error_log("TCGP2: No types input provided");
            return '';
        }
        
        $types = [];
        
        // Handle both JSON strings and arrays
        if (is_string($types_input)) {
            $types = json_decode($types_input, true);
        } elseif (is_array($types_input)) {
            $types = $types_input;
        } else {
            error_log("TCGP2: Invalid types input format");
            return '';
        }
        
        if (empty($types) || !is_array($types)) {
            error_log("TCGP2: Failed to decode types or not an array");
            return '';
        }
        
        error_log("TCGP2: Decoded types: " . json_encode($types));
        
        // Get the category mapping
        $mapping = get_option('tcgp2_geodirectory_mapping', []);
        error_log("TCGP2: Category mapping: " . json_encode($mapping));
        
        $category_ids = [];
        
        foreach ($types as $type) {
            if (isset($mapping[$type]) && !empty($mapping[$type]['category_id']) && $mapping[$type]['category_id'] != 0) {
                $category_id = $mapping[$type]['category_id'];
                // Only add if not already in the array
                if (!in_array($category_id, $category_ids)) {
                    $category_ids[] = $category_id;
                    error_log("TCGP2: Mapped type '{$type}' to category ID '{$category_id}'");
                }
            } else {
                error_log("TCGP2: No mapping found for type '{$type}' or category_id is 0");
            }
        }
        
        $result = implode(',', $category_ids);
        $result = trim($result, ',');
        // Add leading and trailing commas for GeoDirectory import
        if ($result !== '') {
            $result = ',' . $result . ',';
        }
        error_log("TCGP2: Final category IDs: " . $result);
        
        return $result;
    }
    
    /**
     * Parse address components from Place Details API
     */
    private function parse_address_components($address_components) {
        error_log("TCGP2: Parsing address components: " . json_encode($address_components));
        
        if (empty($address_components) || !is_array($address_components)) {
            error_log("TCGP2: No address components to parse");
            return [];
        }
        
        $components = [];
        
        foreach ($address_components as $component) {
            $types = $component['types'] ?? [];
            $long_name = $component['long_name'] ?? '';
            $short_name = $component['short_name'] ?? '';
            
            error_log("TCGP2: Processing address component - types: " . json_encode($types) . ", long_name: {$long_name}, short_name: {$short_name}");
            
            if (in_array('street_number', $types)) {
                $components['street_number'] = $long_name;
                error_log("TCGP2: Found street number: {$long_name}");
            } elseif (in_array('route', $types)) {
                $components['route'] = $long_name;
                error_log("TCGP2: Found route: {$long_name}");
            } elseif (in_array('locality', $types)) {
                $components['city'] = $long_name;
                error_log("TCGP2: Found city: {$long_name}");
            } elseif (in_array('administrative_area_level_1', $types)) {
                // Use full state name (long_name) instead of abbreviation (short_name)
                $components['region'] = $long_name;
                error_log("TCGP2: Found region (full name): {$long_name}");
            } elseif (in_array('postal_code', $types)) {
                $components['zip'] = $long_name;
                error_log("TCGP2: Found zip: {$long_name}");
            } elseif (in_array('country', $types)) {
                $components['country'] = $long_name;
                error_log("TCGP2: Found country: {$long_name}");
            } elseif (in_array('subpremise', $types)) {
                $components['street2'] = $long_name;
                error_log("TCGP2: Found subpremise (street2): {$long_name}");
            }
        }
        
        // Combine street number and route
        if (!empty($components['street_number']) && !empty($components['route'])) {
            $components['street'] = $components['street_number'] . ' ' . $components['route'];
            error_log("TCGP2: Combined street: {$components['street']}");
        } elseif (!empty($components['route'])) {
            $components['street'] = $components['route'];
            error_log("TCGP2: Using route as street: {$components['street']}");
        }
        
        error_log("TCGP2: Final parsed address components: " . json_encode($components));
        
        return $components;
    }
    
    /**
     * Generate POI content with enhanced data
     */
    private function generate_poi_content($poi) {
        // Leave post_content blank as requested
        return '';
    }
    
    /**
     * Export selected POIs to CSV (REST API endpoint)
     */
    public function handle_export_request($request) {
        $poi_ids = $request->get_param('poi_ids');
        
        if ($poi_ids) {
            $poi_ids = json_decode($poi_ids, true);
        }
        
        return $this->export_to_csv($poi_ids);
    }
    
    /**
     * Get export statistics
     */
    public function get_export_stats() {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp2_pois';
        
        $stats = array(
            'total_pois' => $wpdb->get_var("SELECT COUNT(*) FROM $table"),
            'pois_with_categories' => $wpdb->get_var("SELECT COUNT(*) FROM $table WHERE category_ids IS NOT NULL AND category_ids != '' AND category_ids != '[]'"),
            'pois_without_categories' => $wpdb->get_var("SELECT COUNT(*) FROM $table WHERE category_ids IS NULL OR category_ids = '' OR category_ids = '[]'"),
            'new_pois' => $wpdb->get_var("SELECT COUNT(*) FROM $table WHERE status = 'new'"),
            'active_pois' => $wpdb->get_var("SELECT COUNT(*) FROM $table WHERE status = 'active'")
        );
        
        return $stats;
    }
} 