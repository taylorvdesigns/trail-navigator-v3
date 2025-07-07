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
    }
    
    /**
     * Load settings from database
     */
    private function load_settings() {
        $this->settings = get_option($this->option_name, array());
        $this->settings = $this->get_default_settings() + $this->settings;
    }
    
    /**
     * Get default settings
     */
    public function get_default_settings() {
        return array(
            'google_places_api_key' => '',
            'ridewithgps_api_key' => '',
            'sync_radius' => 100,
            'sync_interval' => 300,
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
        return update_option($this->option_name, $this->settings);
    }
    
    /**
     * Update multiple settings
     */
    public function update_settings($settings) {
        $this->settings = array_merge($this->settings, $settings);
        return update_option($this->option_name, $this->settings);
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
            'sync_radius',
            'Search Radius (meters)',
            array($this, 'render_number_field'),
            'tnpoi_settings',
            'tnpoi_sync_section',
            array('key' => 'sync_radius', 'min' => 50, 'max' => 5000)
        );
        
        add_settings_field(
            'sync_interval',
            'Coordinate Interval (meters)',
            array($this, 'render_number_field'),
            'tnpoi_settings',
            'tnpoi_sync_section',
            array('key' => 'sync_interval', 'min' => 50, 'max' => 1000)
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
        $sanitized = array();
        
        // API Keys
        $sanitized['google_places_api_key'] = sanitize_text_field($input['google_places_api_key']);
        $sanitized['ridewithgps_api_key'] = sanitize_text_field($input['ridewithgps_api_key']);
        
        // Numeric fields
        $sanitized['sync_radius'] = intval($input['sync_radius']);
        $sanitized['sync_interval'] = intval($input['sync_interval']);
        $sanitized['max_pois_per_sync'] = intval($input['max_pois_per_sync']);
        
        // Boolean fields
        $sanitized['auto_assign_categories'] = isset($input['auto_assign_categories']);
        
        // Array fields
        $sanitized['place_types'] = isset($input['place_types']) ? array_map('sanitize_text_field', $input['place_types']) : array();
        $sanitized['export_fields'] = isset($input['export_fields']) ? array_map('sanitize_text_field', $input['export_fields']) : array();
        
        // Category mapping
        $sanitized['category_mapping'] = array();
        if (isset($input['category_mapping']) && is_array($input['category_mapping'])) {
            foreach ($input['category_mapping'] as $place_type => $category) {
                $sanitized['category_mapping'][sanitize_text_field($place_type)] = sanitize_text_field($category);
            }
        }
        
        // Export format
        $sanitized['export_format'] = sanitize_text_field($input['export_format']);
        
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
} 