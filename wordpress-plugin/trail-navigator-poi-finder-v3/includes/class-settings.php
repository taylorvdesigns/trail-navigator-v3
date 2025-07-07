<?php
/**
 * Settings management for Trail Navigator POI Finder v3
 */
class TNPOI_Settings {
    
    private $option_name = 'tnpoi_settings';
    private $settings;
    
    /**
     * Initialize settings
     */
    public function __construct() {
        $this->load_settings();
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_ajax_tnpoi_test_google_places_key', array($this, 'ajax_test_google_places_key'));
    }
    
    /**
     * Load settings from database
     */
    private function load_settings() {
        $saved_settings = get_option($this->option_name, array());
        $default_settings = $this->get_default_settings();
        
        // Merge saved settings with defaults, but preserve saved values
        $this->settings = array_merge($default_settings, $saved_settings);
        
        // Load API keys from individual encrypted options
        $this->settings['google_places_api_key'] = $this->get_encrypted_option('tnpoi_google_places_api_key', '');
        $this->settings['ridewithgps_api_key'] = $this->get_encrypted_option('tnpoi_ridewithgps_api_key', '');
        
        // Settings logging removed for clean log
    }
    
    /**
     * Get default settings
     */
    public function get_default_settings() {
        return array(
            'google_places_api_key' => '',
            'ridewithgps_api_key' => '',
            'max_pois_per_sync' => 1000,
            'auto_assign_categories' => true,
            'place_types' => array(
                'restaurant', 'cafe', 'lodging', 'park', 'museum', 
                'library', 'pharmacy', 'atm', 'bank', 'gas_station', 
                'store', 'tourist_attraction', 'hospital', 'police', 
                'fire_station', 'post_office', 'school', 'university'
            ),
            'category_mapping' => array(),
            'export_format' => 'geodirectory',
            'export_fields' => array(
                'name', 'street', 'city', 'region', 'country', 'zip',
                'lat', 'lng', 'cat_id', 'rating', 'website', 'phone'
            )
        );
    }
    
    /**
     * Get all settings
     */
    public function get_settings() {
        return $this->settings;
    }
    
    /**
     * Get a specific setting
     */
    public function get_setting($key, $default = null) {
        return isset($this->settings[$key]) ? $this->settings[$key] : $default;
    }
    
    /**
     * Update a setting
     */
    public function update_setting($key, $value) {
        $this->settings[$key] = $value;
        
        // Handle API keys separately with encryption
        if ($key === 'google_places_api_key' || $key === 'ridewithgps_api_key') {
            $option_name = 'tnpoi_' . $key;
            return $this->update_encrypted_option($option_name, $value);
        }
        
        return update_option($this->option_name, $this->settings);
    }
    
    /**
     * Update multiple settings
     */
    public function update_settings($settings) {
        $this->settings = array_merge($this->settings, $settings);
        
        // Handle API keys separately
        if (isset($settings['google_places_api_key'])) {
            $this->update_encrypted_option('tnpoi_google_places_api_key', $settings['google_places_api_key']);
        }
        
        if (isset($settings['ridewithgps_api_key'])) {
            $this->update_encrypted_option('tnpoi_ridewithgps_api_key', $settings['ridewithgps_api_key']);
        }
        
        // Remove API keys from settings before saving to avoid duplication
        $settings_to_save = $this->settings;
        unset($settings_to_save['google_places_api_key']);
        unset($settings_to_save['ridewithgps_api_key']);
        
        return update_option($this->option_name, $settings_to_save);
    }
    
    /**
     * Store encrypted option
     */
    private function update_encrypted_option($option_name, $value) {
        if (empty($value)) {
            return delete_option($option_name);
        }
        
        $encrypted = $this->encrypt_value($value);
        return update_option($option_name, $encrypted);
    }
    
    /**
     * Get encrypted option
     */
    private function get_encrypted_option($option_name, $default = '') {
        $encrypted = get_option($option_name, '');
        
        if (empty($encrypted)) {
            return $default;
        }
        
        return $this->decrypt_value($encrypted);
    }
    
    /**
     * Encrypt a value using WordPress salts
     */
    private function encrypt_value($value) {
        if (empty($value)) {
            return '';
        }
        
        $key = wp_salt('auth');
        $method = 'AES-256-CBC';
        $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length($method));
        
        $encrypted = openssl_encrypt($value, $method, $key, 0, $iv);
        
        if ($encrypted === false) {
            return '';
        }
        
        return base64_encode($iv . $encrypted);
    }
    
    /**
     * Decrypt a value using WordPress salts
     */
    private function decrypt_value($encrypted_value) {
        if (empty($encrypted_value)) {
            return '';
        }
        
        $key = wp_salt('auth');
        $method = 'AES-256-CBC';
        
        $data = base64_decode($encrypted_value);
        $iv_length = openssl_cipher_iv_length($method);
        $iv = substr($data, 0, $iv_length);
        $encrypted = substr($data, $iv_length);
        
        $decrypted = openssl_decrypt($encrypted, $method, $key, 0, $iv);
        
        if ($decrypted === false) {
            return '';
        }
        
        return $decrypted;
    }
    
    /**
     * Register WordPress settings
     */
    public function register_settings() {
        register_setting(
            'tnpoi_settings_group',
            $this->option_name,
            array($this, 'sanitize_settings')
        );
        
        // General Settings Section
        add_settings_section(
            'tnpoi_general_section',
            'General Settings',
            array($this, 'render_general_section'),
            'tnpoi_settings'
        );
        
        add_settings_field(
            'google_places_api_key',
            'Google Places API Key',
            array($this, 'render_api_key_field'),
            'tnpoi_settings',
            'tnpoi_general_section',
            array('key' => 'google_places_api_key')
        );
        
        add_settings_field(
            'ridewithgps_api_key',
            'RideWithGPS API Key',
            array($this, 'render_api_key_field'),
            'tnpoi_settings',
            'tnpoi_general_section',
            array('key' => 'ridewithgps_api_key')
        );
        
        // Sync Settings Section
        add_settings_section(
            'tnpoi_sync_section',
            'Sync Settings',
            array($this, 'render_sync_section'),
            'tnpoi_settings'
        );
        
        add_settings_field(
            'max_pois_per_sync',
            'Max POIs per Sync',
            array($this, 'render_number_field'),
            'tnpoi_settings',
            'tnpoi_sync_section',
            array('key' => 'max_pois_per_sync', 'min' => 100, 'max' => 10000)
        );
        

        

    }
    
    /**
     * Sanitize settings before saving
     */
    public function sanitize_settings($input) {
        error_log('TNPOI DEBUG: sanitize_settings called with input: ' . print_r($input, true));
        
        $sanitized = array();
        
        // API Keys - these will be handled separately with encryption
        if (isset($input['google_places_api_key'])) {
            $this->update_encrypted_option('tnpoi_google_places_api_key', sanitize_text_field($input['google_places_api_key']));
        }
        if (isset($input['ridewithgps_api_key'])) {
            $this->update_encrypted_option('tnpoi_ridewithgps_api_key', sanitize_text_field($input['ridewithgps_api_key']));
        }
        
        // Numeric fields
        $sanitized['max_pois_per_sync'] = intval($input['max_pois_per_sync'] ?? 1000);
        
        // Boolean fields
        $sanitized['auto_assign_categories'] = isset($input['auto_assign_categories']);
        

        
        $sanitized['export_fields'] = isset($input['export_fields']) ? array_map('sanitize_text_field', $input['export_fields']) : array();
        
        // Category mapping - handle both old format and new format
        if (isset($input['tnpoi_category_mappings']) && is_array($input['tnpoi_category_mappings'])) {
            // New format: direct mapping from form
            $mappings = array();
            foreach ($input['tnpoi_category_mappings'] as $google_type => $value) {
                if (!empty($value)) {
                    $mappings[sanitize_text_field($google_type)] = sanitize_text_field($value);
                }
            }
            update_option('tnpoi_category_mappings', $mappings);
        } elseif (isset($input['category_mapping']) && is_array($input['category_mapping'])) {
            // Old format: legacy support
            $sanitized['category_mapping'] = array();
            foreach ($input['category_mapping'] as $place_type => $category) {
                $sanitized['category_mapping'][sanitize_text_field($place_type)] = sanitize_text_field($category);
            }
        }
        
        // Export format
        $sanitized['export_format'] = sanitize_text_field($input['export_format'] ?? 'geodirectory');
        
        error_log('TNPOI DEBUG: Final sanitized settings: ' . print_r($sanitized, true));
        
        return $sanitized;
    }
    
    /**
     * Render section descriptions
     */
    public function render_general_section() {
        echo '<p>Configure your API keys and basic plugin settings.</p>';
    }
    
    public function render_sync_section() {
        echo '<p>Configure how POIs are synchronized from Google Places API.</p>';
    }
    

    
    /**
     * Render form fields
     */
    public function render_api_key_field($args) {
        $key = $args['key'];
        $value = $this->get_setting($key);
        $type = strpos($key, 'google') !== false ? 'password' : 'text';
        
        echo '<input type="' . $type . '" id="' . $key . '" name="' . $this->option_name . '[' . $key . ']" value="' . esc_attr($value) . '" class="regular-text" />';
        echo '<p class="description">Enter your API key for ' . ucwords(str_replace('_', ' ', $key)) . '.</p>';
    }
    
    public function render_number_field($args) {
        $key = $args['key'];
        $value = $this->get_setting($key);
        $min = isset($args['min']) ? $args['min'] : 0;
        $max = isset($args['max']) ? $args['max'] : 999999;
        
        echo '<input type="number" id="' . $key . '" name="' . $this->option_name . '[' . $key . ']" value="' . esc_attr($value) . '" min="' . $min . '" max="' . $max . '" class="small-text" />';
    }
    

    
    /**
     * Get available trails from Trail Navigator config
     */
    public function get_available_trails() {
        $trail_config = get_option('trail_navigator_config', array());
        return isset($trail_config['trails']) ? $trail_config['trails'] : array();
    }
    
    /**
     * Render the settings page
     */
    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            
            <form method="post" action="options.php">
                <?php
                settings_fields('tnpoi_settings_group');
                do_settings_sections('tnpoi_settings');
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }
    
    /**
     * AJAX: Test Google Places API Key
     */
    public function ajax_test_google_places_key() {
        check_ajax_referer('tnpoi_admin_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Unauthorized');
        }
        $api_key = $this->get_setting('google_places_api_key');
        if (empty($api_key)) {
            wp_send_json_error('No API key configured');
        }
        $url = add_query_arg(array(
            'location' => '40.7128,-74.0060', // NYC
            'radius' => 500,
            'type' => 'restaurant',
            'key' => $api_key
        ), 'https://maps.googleapis.com/maps/api/place/nearbysearch/json');
        $response = wp_remote_get($url);
        if (is_wp_error($response)) {
            wp_send_json_error('Request error: ' . $response->get_error_message());
        }
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        if (!$data || !isset($data['status'])) {
            wp_send_json_error('Malformed response from Google Places API');
        }
        if ($data['status'] === 'OK') {
            wp_send_json_success('API key is valid!');
        } else {
            $msg = 'Google Places API error: ' . $data['status'];
            if (!empty($data['error_message'])) {
                $msg .= ' - ' . $data['error_message'];
            }
            wp_send_json_error($msg);
        }
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
     * Render category mapping field
     */
    public function render_category_mapping_field() {
        $categories = $this->get_geodirectory_categories();
        $mappings = get_option('tnpoi_category_mappings', array());
        $all_types = $this->get_all_place_types();
        
        if (empty($categories)) {
            echo '<div class="notice notice-warning"><p>No GeoDirectory categories found. Make sure GeoDirectory is installed and you have created some categories.</p></div>';
            return;
        }
        
        echo '<div class="tnpoi-category-mapping">';
        echo '<h4>Google Place Types → GeoDirectory Categories</h4>';
        echo '<p>Map Google Place types to GeoDirectory categories for automatic assignment. You can also choose which place types to ignore during sync operations.</p>';
        
        foreach ($all_types as $category_name => $types) {
            echo '<div class="tnpoi-category-section">';
            echo '<h5 class="tnpoi-category-section-title">' . esc_html($category_name) . '</h5>';
            
            foreach ($types as $google_type => $display_name) {
                echo '<div class="tnpoi-category-row">';
                echo '<div class="tnpoi-type-info">';
                echo '<span class="google-type">' . esc_html($display_name) . '</span>';
                echo '<span class="google-type-code">(' . esc_html($google_type) . ')</span>';
                echo '</div>';
                echo '<span class="mapping-arrow">→</span>';
                echo '<select class="tnpoi-category-mapping-select" name="tnpoi_category_mappings[' . esc_attr($google_type) . ']" data-google-type="' . esc_attr($google_type) . '">';
                echo '<option value="">No mapping</option>';
                echo '<option value="IGNORE" ' . selected(isset($mappings[$google_type]) && $mappings[$google_type] === 'IGNORE', true, false) . '>Ignore this type</option>';
                foreach ($categories as $cat_id => $cat_name) {
                    $selected = (isset($mappings[$google_type]) && $mappings[$google_type] == $cat_id) ? 'selected' : '';
                    echo '<option value="' . esc_attr($cat_id) . '" ' . $selected . '>' . esc_html($cat_name) . '</option>';
                }
                echo '</select>';
                echo '</div>';
            }
            echo '</div>';
        }
        
        echo '</div>';
    }
} 