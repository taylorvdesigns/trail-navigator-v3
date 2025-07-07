<?php
/**
 * Admin Class
 * 
 * Handles admin interface, menus, and page rendering
 */

if (!defined('ABSPATH')) {
    exit;
}

class TNPOI_Admin {
    
    private $settings;
    private $sync;
    private $db;
    private $csv_export;
    
    public function __construct() {
        $this->settings = new TNPOI_Settings();
        $this->sync = new TNPOI_Sync();
        $this->db = new TNPOI_POI_DB();
        $this->csv_export = new TNPOI_CSV_Export();
        
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        add_action('wp_ajax_tnpoi_get_pois', array($this, 'ajax_get_pois'));
        add_action('wp_ajax_tnpoi_delete_poi', array($this, 'ajax_delete_poi'));
        add_action('wp_ajax_tnpoi_bulk_delete', array($this, 'ajax_bulk_delete'));
        add_action('wp_ajax_tnpoi_update_poi', array($this, 'ajax_update_poi'));
        add_action('wp_ajax_tnpoi_get_poi_details', array($this, 'ajax_get_poi_details'));
        add_action('wp_ajax_tnpoi_save_trail_selection', array($this, 'ajax_save_trail_selection'));
        add_action('wp_ajax_tnpoi_calculate_trail_positions', array($this, 'ajax_calculate_trail_positions'));
        add_action('wp_ajax_tnpoi_toggle_export_status', array($this, 'ajax_toggle_export_status'));
        add_action('wp_ajax_tnpoi_update_poi_categories', array($this, 'ajax_update_poi_categories'));
    }
    
    /**
     * Add admin menu pages
     */
    public function add_admin_menu() {
        add_menu_page(
            'Trail Navigator POI Finder',
            'Trail POI Finder',
            'manage_options',
            'trail-navigator-poi-finder',
            array($this, 'render_dashboard_page'),
            'dashicons-location',
            30
        );
        
        add_submenu_page(
            'trail-navigator-poi-finder',
            'Dashboard',
            'Dashboard',
            'manage_options',
            'trail-navigator-poi-finder',
            array($this, 'render_dashboard_page')
        );
        
        add_submenu_page(
            'trail-navigator-poi-finder',
            'POI Manager',
            'POI Manager',
            'manage_options',
            'tnpoi-poi-manager',
            array($this, 'render_poi_manager')
        );
        
        add_submenu_page(
            'trail-navigator-poi-finder',
            'Sync POIs',
            'Sync POIs',
            'manage_options',
            'tnpoi-sync',
            array($this, 'render_sync_page')
        );
        
        add_submenu_page(
            'trail-navigator-poi-finder',
            'Map Preview',
            'Map Preview',
            'manage_options',
            'tnpoi-map-preview',
            array($this, 'render_map_preview_page')
        );
        
        add_submenu_page(
            'trail-navigator-poi-finder',
            'Settings',
            'Settings',
            'manage_options',
            'tnpoi-settings',
            array($this, 'render_settings_page')
        );
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_scripts($hook) {
        if (strpos($hook, 'trail-navigator-poi-finder') === false && 
            strpos($hook, 'tnpoi-') === false) {
            return;
        }
        $nonce = wp_create_nonce('tnpoi_admin_nonce');
        error_log('TNPOI DEBUG: Localizing tnpoi_ajax.nonce for admin.js: ' . $nonce . ' (hook: ' . $hook . ')');
        wp_enqueue_style(
            'tnpoi-admin',
            plugin_dir_url(__FILE__) . '../assets/css/admin.css',
            array(),
            '1.0.0'
        );
        wp_enqueue_script(
            'tnpoi-admin',
            plugin_dir_url(__FILE__) . '../assets/js/admin.js',
            array('jquery'),
            '1.0.0',
            true
        );
        wp_localize_script('tnpoi-admin', 'tnpoi_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => $nonce,
            'sync_nonce' => wp_create_nonce('tnpoi_sync_nonce')
        ));
    }
    
    /**
     * Render dashboard page
     */
    public function render_dashboard_page() {
        $stats = $this->sync->get_sync_stats();
        $recent_pois = $this->db->get_recent_pois(10);
        
        include plugin_dir_path(__FILE__) . '../templates/dashboard.php';
    }
    
    /**
     * Render POI manager page
     */
    public function render_poi_manager() {
        // Get available trails for filtering
        $trails = $this->db->get_unique_trails();
        
        // Get available place types for filtering
        $place_types = $this->get_available_place_types();
        
        // Get available search terms for filtering
        $search_terms = $this->db->get_unique_search_terms();
        
        // Get all GeoDirectory categories
        $settings = new TNPOI_Settings();
        $geodir_categories = $settings->get_geodirectory_categories();
        
        // Pass categories to JS
        echo '<script>window.tnpoiGeodirCategories = ' . json_encode($geodir_categories) . ';</script>';
        
        include plugin_dir_path(__FILE__) . '../templates/poi-manager.php';
    }
    
    /**
     * Render sync page
     */
    public function render_sync_page() {
        $search_terms = get_option('tnpoi_search_terms', array());
        $api_key = get_option('tnpoi_google_places_api_key', '');
        
        include plugin_dir_path(__FILE__) . '../templates/sync.php';
    }
    
    /**
     * Render map preview page
     */
    public function render_map_preview_page() {
        $pois = $this->db->get_all_pois();
        
        include plugin_dir_path(__FILE__) . '../templates/map-preview.php';
    }
    
    /**
     * Render settings page
     */
    public function render_settings_page() {
        // Handle category mapping form submission
        if (isset($_POST['tnpoi_save_category_mappings']) && wp_verify_nonce($_POST['tnpoi_category_mappings_nonce'], 'tnpoi_save_category_mappings')) {
            $this->save_category_mappings();
        }
        
        include plugin_dir_path(__FILE__) . '../templates/settings.php';
    }
    
    /**
     * Save category mappings from form submission
     */
    private function save_category_mappings() {
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $mappings = array();
        if (isset($_POST['tnpoi_category_mappings']) && is_array($_POST['tnpoi_category_mappings'])) {
            foreach ($_POST['tnpoi_category_mappings'] as $google_type => $value) {
                if (!empty($value)) {
                    $mappings[sanitize_text_field($google_type)] = sanitize_text_field($value);
                }
            }
        }
        
        if (update_option('tnpoi_category_mappings', $mappings)) {
            echo '<div class="notice notice-success"><p>Category mappings saved successfully!</p></div>';
        } else {
            echo '<div class="notice notice-error"><p>Failed to save category mappings.</p></div>';
        }
    }
    
    /**
     * AJAX: Get POIs
     */
    public function ajax_get_pois() {
        check_ajax_referer('tnpoi_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $page = intval($_POST['page'] ?? 1);
        $per_page = intval($_POST['per_page'] ?? 20);
        $search = sanitize_text_field($_POST['search'] ?? '');
        $filter_type = sanitize_text_field($_POST['filter_type'] ?? '');
        $filter_search_term = sanitize_text_field($_POST['filter_search_term'] ?? '');
        $filter_trail = sanitize_text_field($_POST['filter_trail'] ?? '');
        $filter_status = sanitize_text_field($_POST['filter_status'] ?? '');
        $filter_ignored = sanitize_text_field($_POST['filter_ignored'] ?? '');
        $sort_by = sanitize_text_field($_POST['sort_by'] ?? 'created_at');
        $sort_order = sanitize_text_field($_POST['sort_order'] ?? 'DESC');
        
        $result = $this->db->get_pois($page, $per_page, $search, $filter_type, $filter_search_term, $sort_by, $sort_order, $filter_trail, $filter_status, $filter_ignored);
        
        wp_send_json_success($result);
    }
    
    /**
     * AJAX: Delete single POI
     */
    public function ajax_delete_poi() {
        check_ajax_referer('tnpoi_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $poi_id = intval($_POST['poi_id']);
        
        if ($this->db->delete_poi($poi_id)) {
            wp_send_json_success('POI deleted successfully');
        } else {
            wp_send_json_error('Failed to delete POI');
        }
    }
    
    /**
     * AJAX: Bulk delete POIs
     */
    public function ajax_bulk_delete() {
        check_ajax_referer('tnpoi_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $poi_ids = array_map('intval', $_POST['poi_ids'] ?? array());
        
        if (empty($poi_ids)) {
            wp_send_json_error('No POIs selected');
        }
        
        $deleted = 0;
        foreach ($poi_ids as $poi_id) {
            if ($this->db->delete_poi($poi_id)) {
                $deleted++;
            }
        }
        
        wp_send_json_success("Deleted $deleted POIs successfully");
    }
    
    /**
     * AJAX: Update POI
     */
    public function ajax_update_poi() {
        check_ajax_referer('tnpoi_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $poi_id = intval($_POST['poi_id']);
        $data = array(
            'name' => sanitize_text_field($_POST['name'] ?? ''),
            'address' => sanitize_text_field($_POST['address'] ?? ''),
            'latitude' => floatval($_POST['latitude'] ?? 0),
            'longitude' => floatval($_POST['longitude'] ?? 0),
            'rating' => floatval($_POST['rating'] ?? 0),
            'user_ratings_total' => intval($_POST['user_ratings_total'] ?? 0),
            'price_level' => intval($_POST['price_level'] ?? 0),
            'updated_at' => current_time('mysql')
        );
        
        if ($this->db->update_poi($poi_id, $data)) {
            wp_send_json_success('POI updated successfully');
        } else {
            wp_send_json_error('Failed to update POI');
        }
    }
    
    /**
     * AJAX: Get POI details
     */
    public function ajax_get_poi_details() {
        check_ajax_referer('tnpoi_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $poi_id = intval($_POST['poi_id']);
        $poi = $this->db->get_poi($poi_id);
        
        if ($poi) {
            wp_send_json_success($poi);
        } else {
            wp_send_json_error('POI not found');
        }
    }
    
    /**
     * AJAX: Save trail selection
     */
    public function ajax_save_trail_selection() {
        check_ajax_referer('tnpoi_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $selected_trails = array_map('sanitize_text_field', $_POST['selected_trails'] ?? array());
        
        if (update_option('tnpoi_selected_trails', $selected_trails)) {
            wp_send_json_success('Trail selection saved successfully');
        } else {
            wp_send_json_error('Failed to save trail selection');
        }
    }
    
    /**
     * AJAX: Calculate trail positions
     */
    public function ajax_calculate_trail_positions() {
        check_ajax_referer('tnpoi_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $result = $this->db->calculate_trail_positions();
        
        if ($result) {
            wp_send_json_success('Trail positions calculated successfully');
        } else {
            wp_send_json_error('Failed to calculate trail positions');
        }
    }
    
    /**
     * AJAX: Toggle export status
     */
    public function ajax_toggle_export_status() {
        check_ajax_referer('tnpoi_admin_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        $poi_id = intval($_POST['poi_id']);
        $ignored = intval($_POST['ignored']);
        error_log('TNPOI DEBUG: toggle_export_status called for POI ' . $poi_id . ' with ignored=' . $ignored);
        if (!$poi_id) {
            wp_send_json_error('Invalid POI ID');
        }
        $result = $this->db->update_poi($poi_id, array('ignored' => $ignored));
        error_log('TNPOI DEBUG: update_poi result for POI ' . $poi_id . ': ' . var_export($result, true));
        if ($result) {
            $status_text = $ignored ? 'ignored' : 'included in export';
            wp_send_json_success("POI {$status_text} successfully");
        } else {
            wp_send_json_error('Failed to update export status');
        }
    }
    
    /**
     * AJAX: Update POI categories
     */
    public function ajax_update_poi_categories() {
        global $wpdb;
        check_ajax_referer('tnpoi_admin_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        $poi_id = intval($_POST['poi_id']);
        $category_ids_raw = $_POST['category_ids'] ?? '';
        error_log('TNPOI DEBUG: ajax_update_poi_categories called for POI ' . $poi_id . ' with category_ids_raw: ' . $category_ids_raw);
        $category_ids = '';
        if ($category_ids_raw) {
            $decoded = json_decode($category_ids_raw, true);
            if (is_array($decoded)) {
                $category_ids = implode(',', array_map('intval', $decoded));
            } else {
                $category_ids = sanitize_text_field($category_ids_raw);
            }
        }
        error_log('TNPOI DEBUG: Storing category_ids: ' . $category_ids);
        // Check if POI exists
        $table = $this->db->get_table_name();
        $exists = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table WHERE id = %d", $poi_id));
        error_log('TNPOI DEBUG: POI exists: ' . $exists);
        $result = $this->db->update_poi($poi_id, array('category_ids' => $category_ids));
        if ($result) {
            wp_send_json_success('Categories updated');
        } else {
            error_log('TNPOI DEBUG: Failed to update categories for POI ' . $poi_id);
            error_log('TNPOI DEBUG: Last DB error: ' . $wpdb->last_error);
            wp_send_json_error('Failed to update categories');
        }
    }
    
    /**
     * Get available place types from existing POIs
     */
    private function get_available_place_types() {
        global $wpdb;
        $table_name = $this->db->get_table_name();
        
        $types_data = $wpdb->get_col("SELECT types FROM $table_name WHERE types IS NOT NULL AND types != ''");
        
        $all_types = array();
        foreach ($types_data as $types_json) {
            $types = json_decode($types_json, true);
            if (is_array($types)) {
                $all_types = array_merge($all_types, $types);
            }
        }
        
        // Remove duplicates and sort
        $all_types = array_unique($all_types);
        sort($all_types);
        
        // Create a mapping of type to display name
        $type_labels = array();
        foreach ($all_types as $type) {
            $type_labels[$type] = ucwords(str_replace('_', ' ', $type));
        }
        
        return $type_labels;
    }
    

} 