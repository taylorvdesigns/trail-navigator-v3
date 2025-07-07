<?php
/**
 * Map Preview Class
 * 
 * Handles map functionality and POI visualization using Leaflet.js
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

class TNPOI_Map_Preview {
    
    public function __construct() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_scripts'));
    }
    
    /**
     * Enqueue map scripts and styles
     */
    public function enqueue_scripts() {
        // Only enqueue on our plugin pages
        if (!$this->is_plugin_page()) {
            return;
        }
        
        // Enqueue Leaflet.js
        wp_enqueue_script(
            'leaflet-js',
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
            array(),
            '1.9.4',
            true
        );
        
        wp_enqueue_style(
            'leaflet-css',
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
            array(),
            '1.9.4'
        );
        
        // Enqueue our custom map script
        wp_enqueue_script(
            'tnpoi-map',
            TNPOI_PLUGIN_URL . 'assets/js/map.js',
            array('leaflet-js', 'jquery'),
            TNPOI_VERSION,
            true
        );
        
        // Localize script with AJAX URL and nonce
        wp_localize_script('tnpoi-map', 'tnpoi_map_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('tnpoi_map_nonce'),
            'plugin_url' => TNPOI_PLUGIN_URL
        ));
    }
    
    /**
     * Check if current page is a plugin page
     */
    private function is_plugin_page() {
        $screen = get_current_screen();
        if (!$screen) {
            return false;
        }
        
        $plugin_pages = array(
            'toplevel_page_tnpoi-dashboard',
            'trail-navigator_page_tnpoi-poi-manager',
            'trail-navigator_page_tnpoi-sync',
            'trail-navigator_page_tnpoi-map-preview',
            'trail-navigator_page_tnpoi-settings'
        );
        
        return in_array($screen->id, $plugin_pages);
    }
    
    /**
     * Get POIs for map display
     */
    public function get_pois_for_map($filters = array()) {
        $poi_db = new TNPOI_POI_DB();
        
        $search = isset($filters['search']) ? sanitize_text_field($filters['search']) : '';
        $category = isset($filters['category']) ? sanitize_text_field($filters['category']) : '';
        $trail = isset($filters['trail']) ? sanitize_text_field($filters['trail']) : '';
        $status = isset($filters['status']) ? sanitize_text_field($filters['status']) : '';
        
        $pois = $poi_db->get_pois(1, 1000, $search, $category, $trail, $status);
        
        $map_pois = array();
        foreach ($pois as $poi) {
            $map_pois[] = array(
                'id' => $poi->id,
                'name' => $poi->name,
                'category' => $poi->category ?: 'Uncategorized',
                'trail_name' => $poi->trail_name ?: 'Unknown Trail',
                'address' => $poi->address,
                'latitude' => floatval($poi->latitude),
                'longitude' => floatval($poi->longitude),
                'status' => $poi->status,
                'description' => $poi->description,
                'place_id' => $poi->place_id
            );
        }
        
        return $map_pois;
    }
    
    /**
     * Get map configuration
     */
    public function get_map_config() {
        $settings = get_option('tnpoi_settings', array());
        
        return array(
            'center_lat' => $settings['default_map_center_lat'] ?? 39.8283,
            'center_lng' => $settings['default_map_center_lng'] ?? -98.5795,
            'zoom' => $settings['default_map_zoom'] ?? 4,
            'tile_provider' => $settings['map_tile_provider'] ?? 'openstreetmap'
        );
    }
    
    /**
     * Get category colors for markers
     */
    public function get_category_colors() {
        return array(
            'restaurant' => '#e74c3c',
            'cafe' => '#f39c12',
            'lodging' => '#3498db',
            'park' => '#27ae60',
            'museum' => '#9b59b6',
            'library' => '#34495e',
            'pharmacy' => '#e67e22',
            'atm' => '#95a5a6',
            'bank' => '#16a085',
            'gas_station' => '#f1c40f',
            'store' => '#1abc9c',
            'tourist_attraction' => '#e91e63',
            'default' => '#7f8c8d'
        );
    }
    
    /**
     * AJAX handler for getting POIs
     */
    public function ajax_get_pois() {
        check_ajax_referer('tnpoi_map_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $filters = array();
        if (isset($_POST['filters'])) {
            $filters = array_map('sanitize_text_field', $_POST['filters']);
        }
        
        $pois = $this->get_pois_for_map($filters);
        
        wp_send_json_success($pois);
    }
    
    /**
     * AJAX handler for getting POI details
     */
    public function ajax_get_poi_details() {
        check_ajax_referer('tnpoi_map_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $poi_id = intval($_POST['poi_id']);
        
        $poi_db = new TNPOI_POI_DB();
        $poi = $poi_db->get_poi($poi_id);
        
        if (!$poi) {
            wp_send_json_error('POI not found');
        }
        
        $poi_data = array(
            'id' => $poi->id,
            'name' => $poi->name,
            'category' => $poi->category ?: 'Uncategorized',
            'trail_name' => $poi->trail_name ?: 'Unknown Trail',
            'address' => $poi->address,
            'latitude' => floatval($poi->latitude),
            'longitude' => floatval($poi->longitude),
            'status' => $poi->status,
            'description' => $poi->description,
            'place_id' => $poi->place_id,
            'created_at' => $poi->created_at,
            'updated_at' => $poi->updated_at
        );
        
        wp_send_json_success($poi_data);
    }
    
    /**
     * Get tile provider URL
     */
    public function get_tile_provider_url($provider) {
        $providers = array(
            'openstreetmap' => 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'cartodb' => 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            'esri' => 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            'stamen' => 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png'
        );
        
        return $providers[$provider] ?? $providers['openstreetmap'];
    }
    
    /**
     * Get tile provider attribution
     */
    public function get_tile_provider_attribution($provider) {
        $attributions = array(
            'openstreetmap' => '© OpenStreetMap contributors',
            'cartodb' => '© CartoDB',
            'esri' => '© Esri',
            'stamen' => '© Stamen Design'
        );
        
        return $attributions[$provider] ?? $attributions['openstreetmap'];
    }
}

// Initialize the class
new TNPOI_Map_Preview();

// Register AJAX handlers
add_action('wp_ajax_tnpoi_get_pois', array('TNPOI_Map_Preview', 'ajax_get_pois'));
add_action('wp_ajax_tnpoi_get_poi_details', array('TNPOI_Map_Preview', 'ajax_get_poi_details')); 