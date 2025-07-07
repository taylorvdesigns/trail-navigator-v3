<?php
class TCGP2_Settings {
    
    /**
     * Get all plugin settings
     */
    public function get_settings() {
        return array(
            'google_places_api_key' => get_option('tcgp2_google_places_api_key', ''),
            'ridewithgps_api_key' => get_option('tcgp2_ridewithgps_api_key', ''),
            'search_radius' => get_option('tcgp2_search_radius', 50),
            'max_pois_per_sync' => get_option('tcgp2_max_pois_per_sync', 100),
            'relevant_types' => get_option('tcgp2_relevant_types', array()),
            'ignored_types' => get_option('tcgp2_ignored_types', array()),
            'auto_assign_categories' => get_option('tcgp2_auto_assign_categories', true)
        );
    }
    
    /**
     * Update plugin settings
     */
    public function update_settings($settings) {
        $updated = array();
        
        if (isset($settings['google_places_api_key'])) {
            update_option('tcgp2_google_places_api_key', sanitize_text_field($settings['google_places_api_key']));
            $updated['google_places_api_key'] = true;
        }
        
        if (isset($settings['ridewithgps_api_key'])) {
            update_option('tcgp2_ridewithgps_api_key', sanitize_text_field($settings['ridewithgps_api_key']));
            $updated['ridewithgps_api_key'] = true;
        }
        
        if (isset($settings['search_radius'])) {
            $radius = intval($settings['search_radius']);
            if ($radius > 0 && $radius <= 10000) {
                update_option('tcgp2_search_radius', $radius);
                $updated['search_radius'] = true;
            }
        }
        
        if (isset($settings['max_pois_per_sync'])) {
            $max_pois = intval($settings['max_pois_per_sync']);
            if ($max_pois > 0 && $max_pois <= 1000) {
                update_option('tcgp2_max_pois_per_sync', $max_pois);
                $updated['max_pois_per_sync'] = true;
            }
        }
        
        if (isset($settings['relevant_types'])) {
            $types = is_array($settings['relevant_types']) ? array_map('sanitize_text_field', $settings['relevant_types']) : array();
            update_option('tcgp2_relevant_types', $types);
            $updated['relevant_types'] = true;
        }
        
        if (isset($settings['auto_assign_categories'])) {
            update_option('tcgp2_auto_assign_categories', (bool) $settings['auto_assign_categories']);
            $updated['auto_assign_categories'] = true;
        }
        
        if (isset($settings['ignored_types'])) {
            $types = is_array($settings['ignored_types']) ? array_map('sanitize_text_field', $settings['ignored_types']) : array();
            update_option('tcgp2_ignored_types', $types);
            $updated['ignored_types'] = true;
        }
        
        return $updated;
    }
    
    /**
     * Test Google Places API key
     */
    public function test_google_places_api_key($api_key = null) {
        if (!$api_key) {
            $api_key = get_option('tcgp2_google_places_api_key', '');
        }
        
        if (empty($api_key)) {
            return array('success' => false, 'message' => 'No API key provided');
        }
        
        // Test with a simple nearby search
        $url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
        $params = array(
            'location' => '40.7128,-74.0060', // New York City
            'radius' => 100,
            'key' => $api_key,
            'type' => 'establishment'
        );
        
        $response = wp_remote_get($url . '?' . http_build_query($params));
        
        if (is_wp_error($response)) {
            return array('success' => false, 'message' => 'Network error: ' . $response->get_error_message());
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (empty($data)) {
            return array('success' => false, 'message' => 'Invalid response from Google Places API');
        }
        
        if ($data['status'] === 'OK') {
            return array('success' => true, 'message' => 'API key is valid', 'results_count' => count($data['results']));
        } elseif ($data['status'] === 'REQUEST_DENIED') {
            return array('success' => false, 'message' => 'API key is invalid or has insufficient permissions');
        } else {
            return array('success' => false, 'message' => 'API error: ' . $data['status']);
        }
    }
    
    /**
     * Get available trail configurations
     */
    public function get_available_trails() {
        $trail_config = get_option('trail_navigator_config', array());
        
        if (empty($trail_config['trails'])) {
            return array();
        }
        
        $trails = array();
        foreach ($trail_config['trails'] as $trail) {
            $trails[] = array(
                'routeId' => $trail['routeId'],
                'name' => $trail['name'],
                'description' => $trail['description'] ?? '',
                'trackPoints' => count($trail['trackPoints'] ?? array())
            );
        }
        
        return $trails;
    }
    
    /**
     * Get GeoDirectory categories
     */
    public function get_geodirectory_categories() {
        $categories = get_terms(array(
            'taxonomy' => 'gd_placecategory',
            'hide_empty' => false
        ));
        
        if (is_wp_error($categories)) {
            return array();
        }
        
        $category_list = array();
        foreach ($categories as $category) {
            $category_list[$category->term_id] = $category->name;
        }
        
        return $category_list;
    }
    
    /**
     * Get GeoDirectory tags
     */
    public function get_geodirectory_tags() {
        $tags = get_terms(array(
            'taxonomy' => 'gd_place_tags',
            'hide_empty' => false
        ));
        
        if (is_wp_error($tags)) {
            return array();
        }
        
        $tag_list = array();
        foreach ($tags as $tag) {
            $tag_list[$tag->term_id] = $tag->name;
        }
        
        return $tag_list;
    }
    
    /**
     * Get comprehensive list of Google Places types organized by category
     */
    public function get_all_place_types() {
        return array(
            'Food & Dining' => array(
                'restaurant' => 'Restaurant',
                'cafe' => 'Cafe',
                'bar' => 'Bar',
                'bakery' => 'Bakery',
                'food' => 'Food',
                'meal_takeaway' => 'Takeout',
                'meal_delivery' => 'Food Delivery',
                'liquor_store' => 'Liquor Store',
                'convenience_store' => 'Convenience Store',
                'grocery_or_supermarket' => 'Grocery Store',
                'supermarket' => 'Supermarket'
            ),
            'Accommodation' => array(
                'lodging' => 'Lodging',
                'hotel' => 'Hotel',
                'motel' => 'Motel',
                'campground' => 'Campground',
                'rv_park' => 'RV Park',
                'hostel' => 'Hostel'
            ),
            'Transportation' => array(
                'gas_station' => 'Gas Station',
                'car_rental' => 'Car Rental',
                'car_repair' => 'Car Repair',
                'car_wash' => 'Car Wash',
                'parking' => 'Parking',
                'subway_station' => 'Subway Station',
                'train_station' => 'Train Station',
                'bus_station' => 'Bus Station',
                'airport' => 'Airport',
                'taxi_stand' => 'Taxi Stand'
            ),
            'Shopping & Retail' => array(
                'store' => 'Store',
                'clothing_store' => 'Clothing Store',
                'shoe_store' => 'Shoe Store',
                'jewelry_store' => 'Jewelry Store',
                'book_store' => 'Book Store',
                'electronics_store' => 'Electronics Store',
                'hardware_store' => 'Hardware Store',
                'furniture_store' => 'Furniture Store',
                'department_store' => 'Department Store',
                'shopping_mall' => 'Shopping Mall',
                'pharmacy' => 'Pharmacy',
                'drugstore' => 'Drugstore'
            ),
            'Health & Medical' => array(
                'hospital' => 'Hospital',
                'doctor' => 'Doctor',
                'dentist' => 'Dentist',
                'veterinary_care' => 'Veterinary Care',
                'physiotherapist' => 'Physiotherapist',
                'health' => 'Health'
            ),
            'Financial Services' => array(
                'bank' => 'Bank',
                'atm' => 'ATM',
                'finance' => 'Finance',
                'insurance_agency' => 'Insurance Agency',
                'accounting' => 'Accounting'
            ),
            'Government & Services' => array(
                'post_office' => 'Post Office',
                'police' => 'Police',
                'fire_station' => 'Fire Station',
                'courthouse' => 'Courthouse',
                'city_hall' => 'City Hall',
                'embassy' => 'Embassy',
                'local_government_office' => 'Local Government Office'
            ),
            'Recreation & Entertainment' => array(
                'park' => 'Park',
                'amusement_park' => 'Amusement Park',
                'aquarium' => 'Aquarium',
                'art_gallery' => 'Art Gallery',
                'bowling_alley' => 'Bowling Alley',
                'casino' => 'Casino',
                'movie_theater' => 'Movie Theater',
                'museum' => 'Museum',
                'night_club' => 'Night Club',
                'stadium' => 'Stadium',
                'tourist_attraction' => 'Tourist Attraction',
                'zoo' => 'Zoo'
            ),
            'Education & Culture' => array(
                'library' => 'Library',
                'school' => 'School',
                'university' => 'University',
                'church' => 'Church',
                'synagogue' => 'Synagogue',
                'mosque' => 'Mosque',
                'hindu_temple' => 'Hindu Temple',
                'cemetery' => 'Cemetery'
            ),
            'Sports & Fitness' => array(
                'gym' => 'Gym',
                'fitness_center' => 'Fitness Center',
                'spa' => 'Spa',
                'beauty_salon' => 'Beauty Salon',
                'hair_care' => 'Hair Care',
                'tanning_salon' => 'Tanning Salon'
            ),
            'Professional Services' => array(
                'lawyer' => 'Lawyer',
                'real_estate_agency' => 'Real Estate Agency',
                'travel_agency' => 'Travel Agency',
                'moving_company' => 'Moving Company',
                'plumber' => 'Plumber',
                'electrician' => 'Electrician',
                'roofing_contractor' => 'Roofing Contractor',
                'painter' => 'Painter',
                'locksmith' => 'Locksmith'
            ),
            'General' => array(
                'establishment' => 'Establishment',
                'point_of_interest' => 'Point of Interest',
                'premise' => 'Premise',
                'subpremise' => 'Subpremise',
                'neighborhood' => 'Neighborhood',
                'colloquial_area' => 'Colloquial Area',
                'locality' => 'Locality',
                'sublocality' => 'Sublocality',
                'administrative_area_level_1' => 'State/Province',
                'administrative_area_level_2' => 'County',
                'administrative_area_level_3' => 'District',
                'administrative_area_level_4' => 'Sub-district',
                'administrative_area_level_5' => 'Sub-sub-district',
                'country' => 'Country',
                'street_address' => 'Street Address',
                'route' => 'Route',
                'intersection' => 'Intersection',
                'street_number' => 'Street Number',
                'floor' => 'Floor',
                'room' => 'Room'
            )
        );
    }
    
    /**
     * Handle settings request (REST API endpoint)
     */
    public function handle_settings_request($request) {
        if ($request->get_method() === 'GET') {
            return new WP_REST_Response($this->get_settings(), 200);
        } elseif ($request->get_method() === 'POST') {
            $data = $request->get_json_params();
            $updated = $this->update_settings($data);
            return new WP_REST_Response(array('updated' => $updated), 200);
        }
        
        return new WP_REST_Response(array('message' => 'Method not allowed'), 405);
    }
    
    /**
     * Handle API key test request
     */
    public function handle_test_api_key_request($request) {
        $data = $request->get_json_params();
        $api_key = $data['api_key'] ?? null;
        
        $result = $this->test_google_places_api_key($api_key);
        return new WP_REST_Response($result, $result['success'] ? 200 : 400);
    }
    
    /**
     * Handle trails request
     */
    public function handle_trails_request($request) {
        $trails = $this->get_available_trails();
        return new WP_REST_Response(array('trails' => $trails), 200);
    }
    
    /**
     * Handle categories request
     */
    public function handle_categories_request($request) {
        $categories = $this->get_geodirectory_categories();
        return new WP_REST_Response(array('categories' => $categories), 200);
    }
    
    /**
     * Handle tags request
     */
    public function handle_tags_request($request) {
        $tags = $this->get_geodirectory_tags();
        return new WP_REST_Response(array('tags' => $tags), 200);
    }
    
    /**
     * Handle place types request
     */
    public function handle_place_types_request($request) {
        $types = $this->get_all_place_types();
        return new WP_REST_Response(array('types' => $types), 200);
    }
} 