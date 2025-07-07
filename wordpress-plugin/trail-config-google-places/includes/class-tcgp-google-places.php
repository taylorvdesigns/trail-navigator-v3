<?php
/**
 * Google Places API integration
 */
class TCGP_Google_Places {
    
    private $api_key;
    
    public function __construct() {
        $this->api_key = get_option('tcgp_google_places_api_key', '');
    }
    
    /**
     * Search for places along a trail
     */
    public function search_places_along_trail($trail_geometry, $radius = 50, $types = array()) {
        if (empty($this->api_key)) {
            return new WP_Error('no_api_key', 'Google Places API key not configured');
        }
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] search_places_along_trail called with radius: ' . $radius);
        }
        
        if (empty($trail_geometry) || !isset($trail_geometry['track_points'])) {
            return new WP_Error('invalid_geometry', 'Invalid trail geometry');
        }
        
        $track_points = $trail_geometry['track_points'];
        $all_places = array();
        $seen_place_ids = array();
        
        // Sample points along the trail (use radius as sampling interval, but cap at 200m to avoid too many API calls)
        $sampling_interval = min($radius * 2, 200);
        $sampled_points = $this->sample_trail_points($track_points, $sampling_interval);
        
        foreach ($sampled_points as $point) {
            $lat = $point['lat'];
            $lng = $point['lng'];
            
            // Search for places near this point
            $places = $this->nearby_search($lat, $lng, $radius, $types);
            
            if (is_wp_error($places)) {
                continue; // Skip this point if search fails
            }
            
            // Add places that we haven't seen before
            foreach ($places as $place) {
                if (!in_array($place['place_id'], $seen_place_ids)) {
                    $all_places[] = $place;
                    $seen_place_ids[] = $place['place_id'];
                }
            }
        }
        
        return $all_places;
    }
    
    /**
     * Sample points along a trail at regular intervals
     */
    private function sample_trail_points($track_points, $interval_meters = 200) {
        if (count($track_points) < 2) {
            return $track_points;
        }
        
        $sampled = array();
        $total_distance = 0;
        $last_point = null;
        
        foreach ($track_points as $point) {
            if ($last_point) {
                $distance = $this->calculate_distance($last_point, $point);
                $total_distance += $distance;
                
                // Add point if we've traveled enough distance
                if ($total_distance >= $interval_meters) {
                    $sampled[] = $point;
                    $total_distance = 0;
                }
            } else {
                // Always include the first point
                $sampled[] = $point;
            }
            
            $last_point = $point;
        }
        
        // Always include the last point
        if ($last_point && !in_array($last_point, $sampled)) {
            $sampled[] = $last_point;
        }
        
        return $sampled;
    }
    
    /**
     * Calculate distance between two points in meters
     */
    private function calculate_distance($point1, $point2) {
        $lat1 = deg2rad($point1['lat']);
        $lng1 = deg2rad($point1['lng']);
        $lat2 = deg2rad($point2['lat']);
        $lng2 = deg2rad($point2['lng']);
        
        $dlat = $lat2 - $lat1;
        $dlng = $lng2 - $lng1;
        
        $a = sin($dlat/2) * sin($dlat/2) + cos($lat1) * cos($lat2) * sin($dlng/2) * sin($dlng/2);
        $c = 2 * atan2(sqrt($a), sqrt(1-$a));
        
        return 6371000 * $c; // Earth radius in meters
    }
    
    /**
     * Perform nearby search
     */
    private function nearby_search($lat, $lng, $radius, $types = array()) {
        $url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
        
        // Google Places API minimum radius is 1 meter, maximum is 50000 meters
        $api_radius = max(1, min($radius, 50000));
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] nearby_search called with radius: ' . $radius . ', api_radius: ' . $api_radius);
        }
        
        $params = array(
            'location' => $lat . ',' . $lng,
            'radius' => $api_radius,
            'key' => $this->api_key
        );
        
        // Only add type filter if types is not empty
        if (!empty($types)) {
            $params['type'] = $types[0]; // Google Places API only supports one type per request
        }
        
        $url = add_query_arg($params, $url);
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TCGP DEBUG] Google Places API URL: ' . $url);
        }
        
        $response = wp_remote_get($url);
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (empty($data) || $data['status'] !== 'OK') {
            return new WP_Error('api_error', 'Google Places API error: ' . ($data['status'] ?? 'Unknown error'));
        }
        
        // If the requested radius was smaller than the API minimum, filter results
        if ($radius < $api_radius) {
            $filtered_results = array();
            foreach ($data['results'] as $place) {
                $place_lat = $place['geometry']['location']['lat'];
                $place_lng = $place['geometry']['location']['lng'];
                $distance = $this->calculate_distance(
                    array('lat' => $lat, 'lng' => $lng),
                    array('lat' => $place_lat, 'lng' => $place_lng)
                );
                
                if ($distance <= $radius) {
                    $filtered_results[] = $place;
                }
            }
            return $filtered_results;
        }
        
        return $data['results'];
    }
    
    /**
     * Get essential place data for a place ID
     */
    public function get_essential_place_data($place_id) {
        if (empty($this->api_key)) {
            return new WP_Error('no_api_key', 'Google Places API key not configured');
        }
        
        $url = 'https://maps.googleapis.com/maps/api/place/details/json';
        
        $params = array(
            'place_id' => $place_id,
            'fields' => 'place_id,name,vicinity,formatted_address,geometry,types,generativeSummary,editorialSummary',
            'key' => $this->api_key
        );
        
        $url = add_query_arg($params, $url);
        
        $response = wp_remote_get($url);
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (empty($data) || $data['status'] !== 'OK') {
            return new WP_Error('api_error', 'Google Places API error: ' . ($data['status'] ?? 'Unknown error'));
        }
        
        $place = $data['result'];
        
        // Map Google place types to trail categories
        $category = $this->map_place_types_to_category($place['types']);
        
        // Create short description from generativeSummary if available, fallback to editorialSummary, then vicinity
        $short_description = '';
        if (isset($place['generativeSummary']) && !empty($place['generativeSummary'])) {
            $short_description = $place['generativeSummary'];
        } elseif (isset($place['editorialSummary']) && !empty($place['editorialSummary'])) {
            $short_description = $place['editorialSummary'];
        } elseif (isset($place['vicinity'])) {
            $short_description = $place['vicinity'];
        }
        
        return array(
            'place_id' => $place['place_id'],
            'name' => $place['name'],
            'latitude' => $place['geometry']['location']['lat'],
            'longitude' => $place['geometry']['location']['lng'],
            'category' => $category,
            'short_description' => $short_description,
            'formatted_address' => isset($place['formatted_address']) ? $place['formatted_address'] : '',
            'vicinity' => isset($place['vicinity']) ? $place['vicinity'] : ''
        );
    }
    
    /**
     * Map Google Places types to trail categories
     */
    private function map_place_types_to_category($google_types) {
        if (empty($google_types)) {
            return 'other';
        }
        
        // Define mapping of Google place types to trail categories
        $type_mapping = array(
            // Food & Drink
            'restaurant' => 'food',
            'food' => 'food',
            'cafe' => 'food',
            'bar' => 'food',
            'bakery' => 'food',
            'meal_takeaway' => 'food',
            'meal_delivery' => 'food',
            
            // Restrooms & Facilities
            'toilet' => 'restroom',
            'restroom' => 'restroom',
            
            // Parking
            'parking' => 'parking',
            
            // Water & Refreshment
            'drinking_water' => 'water',
            'water' => 'water',
            
            // Emergency & Safety
            'hospital' => 'emergency',
            'police' => 'emergency',
            'fire_station' => 'emergency',
            
            // Information & Services
            'tourist_information' => 'information',
            'information' => 'information',
            
            // Recreation
            'park' => 'recreation',
            'playground' => 'recreation',
            'gym' => 'recreation',
            'sports_complex' => 'recreation',
            
            // Shopping
            'store' => 'shopping',
            'convenience_store' => 'shopping',
            'gas_station' => 'shopping',
            
            // Accommodation
            'lodging' => 'lodging',
            'hotel' => 'lodging',
            'campground' => 'lodging',
            
            // Transportation
            'transit_station' => 'transportation',
            'bus_station' => 'transportation',
            'train_station' => 'transportation',
            'subway_station' => 'transportation'
        );
        
        // Check each Google type against our mapping
        foreach ($google_types as $type) {
            if (isset($type_mapping[$type])) {
                return $type_mapping[$type];
            }
        }
        
        // If no match found, return 'other'
        return 'other';
    }
    
    /**
     * Get detailed information about a place (for on-demand use)
     */
    public function get_place_details($place_id) {
        if (empty($this->api_key)) {
            return new WP_Error('no_api_key', 'Google Places API key not configured');
        }
        
        $url = 'https://maps.googleapis.com/maps/api/place/details/json';
        
        $params = array(
            'place_id' => $place_id,
            'fields' => 'place_id,name,vicinity,formatted_address,geometry,types,rating,user_ratings_total,price_level,opening_hours,website,formatted_phone_number,photos,reviews',
            'key' => $this->api_key
        );
        
        $url = add_query_arg($params, $url);
        
        $response = wp_remote_get($url);
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (empty($data) || $data['status'] !== 'OK') {
            return new WP_Error('api_error', 'Google Places API error: ' . ($data['status'] ?? 'Unknown error'));
        }
        
        return $data['result'];
    }
    
    /**
     * Test API key
     */
    public function test_api_key() {
        if (empty($this->api_key)) {
            return new WP_Error('no_api_key', 'No API key configured');
        }
        
        // Try a simple nearby search
        $url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
        
        $params = array(
            'location' => '40.7128,-74.0060', // New York City
            'radius' => 100, // Use smaller radius for testing
            'key' => $this->api_key
        );
        
        $url = add_query_arg($params, $url);
        
        $response = wp_remote_get($url);
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (empty($data)) {
            return new WP_Error('invalid_response', 'Invalid response from Google Places API');
        }
        
        if ($data['status'] === 'REQUEST_DENIED') {
            return new WP_Error('api_denied', 'API key is invalid or has insufficient permissions');
        }
        
        if ($data['status'] !== 'OK' && $data['status'] !== 'ZERO_RESULTS') {
            return new WP_Error('api_error', 'Google Places API error: ' . $data['status']);
        }
        
        return true;
    }
    
    /**
     * Get available place types for settings
     */
    public function get_available_place_types() {
        return array(
            'restaurant' => 'Restaurant',
            'cafe' => 'Cafe',
            'bar' => 'Bar',
            'bakery' => 'Bakery',
            'food' => 'Food',
            'park' => 'Park',
            'playground' => 'Playground',
            'landmark' => 'Landmark',
            'tourist_attraction' => 'Tourist Attraction',
            'museum' => 'Museum',
            'lodging' => 'Lodging',
            'hotel' => 'Hotel',
            'campground' => 'Campground',
            'parking' => 'Parking',
            'transit_station' => 'Transit Station',
            'bus_station' => 'Bus Station',
            'train_station' => 'Train Station',
            'subway_station' => 'Subway Station',
            'hospital' => 'Hospital',
            'police' => 'Police',
            'fire_station' => 'Fire Station',
            'pharmacy' => 'Pharmacy',
            'store' => 'Store',
            'convenience_store' => 'Convenience Store',
            'gas_station' => 'Gas Station',
            'bank' => 'Bank',
            'atm' => 'ATM',
            'post_office' => 'Post Office',
            'library' => 'Library',
            'school' => 'School',
            'university' => 'University',
            'gym' => 'Gym',
            'sports_complex' => 'Sports Complex',
            'stadium' => 'Stadium',
            'movie_theater' => 'Movie Theater',
            'church' => 'Church',
            'synagogue' => 'Synagogue',
            'mosque' => 'Mosque',
            'cemetery' => 'Cemetery',
            'funeral_home' => 'Funeral Home',
            'car_rental' => 'Car Rental',
            'car_repair' => 'Car Repair',
            'car_wash' => 'Car Wash',
            'beauty_salon' => 'Beauty Salon',
            'hair_care' => 'Hair Care',
            'spa' => 'Spa',
            'dentist' => 'Dentist',
            'doctor' => 'Doctor',
            'veterinary_care' => 'Veterinary Care',
            'pet_store' => 'Pet Store',
            'hardware_store' => 'Hardware Store',
            'electronics_store' => 'Electronics Store',
            'clothing_store' => 'Clothing Store',
            'shoe_store' => 'Shoe Store',
            'jewelry_store' => 'Jewelry Store',
            'book_store' => 'Book Store',
            'department_store' => 'Department Store',
            'shopping_mall' => 'Shopping Mall',
            'supermarket' => 'Supermarket',
            'grocery_or_supermarket' => 'Grocery Store',
            'liquor_store' => 'Liquor Store',
            'night_club' => 'Night Club',
            'casino' => 'Casino',
            'amusement_park' => 'Amusement Park',
            'aquarium' => 'Aquarium',
            'art_gallery' => 'Art Gallery',
            'bowling_alley' => 'Bowling Alley',
            'movie_rental' => 'Movie Rental',
            'music_store' => 'Music Store',
            'park' => 'Park',
            'zoo' => 'Zoo'
        );
    }
} 