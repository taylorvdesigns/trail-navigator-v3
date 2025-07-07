<?php
/**
 * Admin functionality for Trail Config Google Places v2
 */
class TCGP2_Admin {
    
    /**
     * Initialize admin functionality
     */
    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
        add_action('wp_ajax_tcgp2_save_category_mapping', array($this, 'handle_save_category_mapping'));
        add_action('wp_ajax_tcgp2_get_sync_progress', array($this, 'handle_get_sync_progress'));
        add_action('wp_ajax_tcgp2_bulk_action', array($this, 'handle_bulk_action'));
        add_action('wp_ajax_tcgp2_test_google_places_api', array($this, 'handle_test_google_places_api'));
        add_action('wp_ajax_tcgp2_save_all_category_mappings', array($this, 'handle_save_all_category_mappings'));
        add_action('wp_ajax_tcgp2_auto_assign_categories', array($this, 'handle_auto_assign_categories'));
        add_action('wp_ajax_tcgp2_update_poi_categories', array($this, 'handle_update_poi_categories'));
        add_action('wp_ajax_tcgp2_toggle_poi_ignored', array($this, 'handle_toggle_poi_ignored'));
        add_action('wp_ajax_tcgp2_test_sync', array($this, 'handle_test_sync'));
        add_action('wp_ajax_tcgp2_get_trails', array($this, 'handle_get_trails'));
    }
    
    /**
     * Add admin menu pages
     */
    public function add_admin_menu() {
        add_menu_page(
            'Trail POIs',
            'Trail POIs',
            'manage_options',
            'tcgp2-admin',
            array($this, 'render_dashboard'),
            'dashicons-location',
            25
        );
        
        add_submenu_page(
            'tcgp2-admin',
            'Dashboard',
            'Dashboard',
            'manage_options',
            'tcgp2-admin',
            array($this, 'render_dashboard')
        );
        
        add_submenu_page(
            'tcgp2-admin',
            'POI Manager',
            'POI Manager',
            'manage_options',
            'tcgp2-pois',
            array($this, 'render_poi_manager')
        );
        
        add_submenu_page(
            'tcgp2-admin',
            'Sync',
            'Sync',
            'manage_options',
            'tcgp2-sync',
            array($this, 'render_sync')
        );
        
        add_submenu_page(
            'tcgp2-admin',
            'Settings',
            'Settings',
            'manage_options',
            'tcgp2-settings',
            array($this, 'render_settings')
        );
    }
    
    /**
     * Enqueue admin assets
     */
    public function enqueue_admin_assets($hook) {
        // Only load on plugin pages
        if (strpos($hook, 'tcgp2-') === false) {
            return;
        }
        
        wp_enqueue_style(
            'tcgp2-admin',
            TCGP2_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            '2.0.0'
        );
        
        wp_enqueue_script(
            'tcgp2-admin',
            TCGP2_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery'),
            '2.0.0',
            true
        );
        
        wp_localize_script('tcgp2-admin', 'tcgp2_ajax', array(
            'nonce' => wp_create_nonce('tcgp2_admin_nonce'),
            'ajaxurl' => admin_url('admin-ajax.php')
        ));
    }
    
    /**
     * Render dashboard page
     */
    public function render_dashboard() {
        $this->render_header('Dashboard');
        
        // Get statistics
        $stats = TCGP2_POI_DB::get_stats();
        $trails_config = get_option('trail_navigator_config', array());
        $num_trails = isset($trails_config['trails']) ? count($trails_config['trails']) : 0;
        $last_sync = $this->get_last_sync_date();
        
        include TCGP2_PLUGIN_DIR . 'templates/dashboard.php';
    }
    
    /**
     * Render POI manager page
     */
    public function render_poi_manager() {
        $this->render_header('POI Manager');
        
        // Handle actions
        $this->handle_poi_actions();
        
        // Get POIs with pagination and filters
        $filters = $this->get_poi_filters();
        $page = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
        $per_page = 20;
        
        $pois_data = TCGP2_POI_DB::get_all_pois($filters, $page, $per_page);
        
        // Get available trails and categories for filters
        $trails = $this->get_available_trails();
        $categories = $this->get_available_categories();
        
        include TCGP2_PLUGIN_DIR . 'templates/poi-manager.php';
    }
    
    /**
     * Render sync page
     */
    public function render_sync() {
        $this->render_header('Sync POIs');
        
        // Handle sync action
        if (isset($_POST['action']) && $_POST['action'] === 'sync_pois') {
            $this->handle_sync_action();
        }
        
        // Get sync settings and available trails
        $settings = new TCGP2_Settings();
        $sync_settings = $settings->get_settings();
        $trails = $settings->get_available_trails();
        
        include TCGP2_PLUGIN_DIR . 'templates/sync.php';
    }
    
    /**
     * Render settings page
     */
    public function render_settings() {
        $this->render_header('Settings');
        
        // Handle settings save
        if (isset($_POST['action']) && $_POST['action'] === 'save_settings') {
            $this->handle_settings_save();
        }
        
        // Get current settings
        $settings = new TCGP2_Settings();
        $current_settings = $settings->get_settings();
        $trails = $settings->get_available_trails();
        $categories = $settings->get_geodirectory_categories();
        $place_types = $settings->get_all_place_types();
        
        include TCGP2_PLUGIN_DIR . 'templates/settings.php';
    }
    
    /**
     * Render page header
     */
    private function render_header($title) {
        ?>
        <div class="wrap tcgp2-dashboard">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 10px;">
                <div style="display: flex; align-items: center;">
                    <span class="dashicons dashicons-location" style="font-size: 2.5em; color: #0073aa; margin-right: 18px;"></span>
                    <div>
                        <h1 style="margin: 0; font-size: 2em;"><?php echo esc_html($title); ?></h1>
                        <div style="color: #666; font-size: 1.1em; margin-top: 2px;">Import, curate, and export POIs for your trail system.</div>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <a href="https://github.com/taylorv/trail-navigator-v3/tree/main/trail-config-google-places-v2" target="_blank" class="button-secondary">Docs</a>
                    <a href="mailto:support@example.com" class="button-secondary">Support</a>
                    <a href="https://github.com/taylorv/trail-navigator-v3/releases" target="_blank" class="button-secondary">Changelog</a>
                </div>
            </div>
        <?php
    }
    
    /**
     * Handle POI manager actions
     */
    private function handle_poi_actions() {
        if (!isset($_POST['action'])) {
            return;
        }
        
        if (!wp_verify_nonce($_POST['tcgp2_nonce'], 'tcgp2_poi_action')) {
            wp_die('Security check failed');
        }
        
        switch ($_POST['action']) {
            case 'export_csv':
                $this->handle_csv_export();
                break;
                
            case 'delete_poi':
                $this->handle_delete_poi();
                break;
                
            case 'delete_all_pois':
                $this->handle_delete_all_pois();
                break;
                
            case 'bulk_action':
                $this->handle_bulk_action();
                break;
        }
    }
    
    /**
     * Handle CSV export
     */
    private function handle_csv_export() {
        if (class_exists('TCGP2_CSV_Export')) {
            $exporter = new TCGP2_CSV_Export();
            $result = $exporter->export_to_csv();
            
            if (is_wp_error($result)) {
                $this->add_admin_notice('Export failed: ' . $result->get_error_message(), 'error');
            } else {
                $this->add_admin_notice('CSV export completed successfully!', 'success');
            }
        } else {
            $this->add_admin_notice('Export failed: CSV Export class not found.', 'error');
        }
    }
    
    /**
     * Handle delete POI
     */
    private function handle_delete_poi() {
        if (!isset($_POST['poi_id'])) {
            return;
        }
        
        $poi_id = intval($_POST['poi_id']);
        $result = TCGP2_POI_DB::delete_poi($poi_id);
        
        if ($result) {
            $this->add_admin_notice('POI deleted successfully!', 'success');
        } else {
            $this->add_admin_notice('Failed to delete POI.', 'error');
        }
    }
    
    /**
     * Handle delete all POIs
     */
    private function handle_delete_all_pois() {
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $result = TCGP2_POI_DB::delete_all_pois();
        
        if ($result) {
            $this->add_admin_notice('All POIs deleted successfully!', 'success');
        } else {
            $this->add_admin_notice('Failed to delete all POIs.', 'error');
        }
    }
    
    /**
     * Handle sync action
     */
    private function handle_sync_action() {
        if (!wp_verify_nonce($_POST['tcgp2_nonce'], 'tcgp2_sync')) {
            wp_die('Security check failed');
        }
        
        $trail_id = sanitize_text_field($_POST['trail_id']);
        
        if (empty($trail_id)) {
            $this->add_admin_notice('No trail selected', 'error');
            return;
        }
        
        // Get settings for radius and place types
        $settings = new TCGP2_Settings();
        $sync_settings = $settings->get_settings();
        $radius = $sync_settings['search_radius'];
        $place_types = $sync_settings['relevant_types'] ?? [];
        
        $sync = new TCGP2_POI_Sync();
        
        if ($trail_id === 'all') {
            // Sync all trails
            $trails = $this->get_available_trails();
            $total_new = 0;
            $total_updated = 0;
            
            foreach ($trails as $trail) {
                $result = $sync->sync_trail($trail['routeId'], $radius, $place_types);
                if (!is_wp_error($result)) {
                    $total_new += $result['new'];
                    $total_updated += $result['updated'];
                }
            }
            
            $message = sprintf(
                'Sync completed for all trails! %d new POIs, %d updated POIs.',
                $total_new,
                $total_updated
            );
            $this->add_admin_notice($message, 'success');
        } else {
            // Sync single trail
            $result = $sync->sync_trail($trail_id, $radius, $place_types);
            
            if (is_wp_error($result)) {
                $this->add_admin_notice('Sync failed: ' . $result->get_error_message(), 'error');
            } else {
                $message = sprintf(
                    'Sync completed! %d new POIs, %d updated POIs.',
                    $result['new'],
                    $result['updated']
                );
                $this->add_admin_notice($message, 'success');
            }
        }
    }
    
    /**
     * Handle settings save
     */
    private function handle_settings_save() {
        $nonce = $_POST['tcgp2_nonce'] ?? $_POST['tcgp2_admin_nonce'] ?? '';
        if (!wp_verify_nonce($nonce, 'tcgp2_settings')) {
            wp_die('Security check failed');
        }
        
        $settings = new TCGP2_Settings();
        $has_updates = false;
        
        // Handle category mappings separately
        if (isset($_POST['category_mappings'])) {
            $this->handle_category_mappings_save($_POST['category_mappings']);
            $has_updates = true;
        }
        
        $updated = $settings->update_settings($_POST);
        
        if (!empty($updated) || $has_updates) {
            $this->add_admin_notice('Settings saved successfully!', 'success');
        } else {
            $this->add_admin_notice('No settings were updated.', 'warning');
        }
    }
    
    /**
     * Handle category mappings save
     */
    private function handle_category_mappings_save($category_mappings) {
        $mappings = array();
        $ignored_types = array();
        
        foreach ($category_mappings as $google_type => $value) {
            if ($value === 'IGNORE') {
                $ignored_types[] = $google_type;
            } elseif (!empty($value)) {
                $mappings[$google_type] = intval($value);
            }
        }
        
        update_option('tcgp2_category_mappings', $mappings);
        update_option('tcgp2_ignored_types', $ignored_types);
    }
    
    /**
     * Handle AJAX category mapping save
     */
    public function handle_save_category_mapping() {
        check_ajax_referer('tcgp2_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $google_type = sanitize_text_field($_POST['google_type']);
        $category_id = intval($_POST['category_id']);
        
        $mappings = get_option('tcgp2_category_mappings', array());
        $mappings[$google_type] = $category_id;
        update_option('tcgp2_category_mappings', $mappings);
        
        wp_send_json_success('Category mapping saved');
    }
    
    /**
     * Handle AJAX sync progress
     */
    public function handle_get_sync_progress() {
        check_ajax_referer('tcgp2_admin_nonce', 'nonce');
        
        $progress = get_transient('tcgp2_sync_progress');
        if ($progress === false) {
            $progress = 0;
        }
        
        wp_send_json_success(array('progress' => $progress));
    }
    
    /**
     * Handle AJAX bulk action
     */
    public function handle_bulk_action() {
        check_ajax_referer('tcgp2_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
        }
        
        $action = sanitize_text_field($_POST['bulk_action']);
        $poi_ids = array_map('intval', $_POST['poi_ids']);
        
        if (empty($poi_ids)) {
            wp_send_json_error('No POIs selected');
        }
        
        switch ($action) {
            case 'delete':
                $deleted = 0;
                foreach ($poi_ids as $poi_id) {
                    if (TCGP2_POI_DB::delete_poi($poi_id)) {
                        $deleted++;
                    }
                }
                wp_send_json_success(array(
                    'message' => sprintf('%d POI(s) deleted successfully', $deleted)
                ));
                break;
                
            case 'activate':
                $result = TCGP2_POI_DB::bulk_update_pois($poi_ids, array('status' => 'active'));
                wp_send_json_success(array(
                    'message' => 'POIs activated successfully'
                ));
                break;
                
            case 'deactivate':
                $result = TCGP2_POI_DB::bulk_update_pois($poi_ids, array('status' => 'inactive'));
                wp_send_json_success(array(
                    'message' => 'POIs deactivated successfully'
                ));
                break;
                
            case 'ignore':
                $result = TCGP2_POI_DB::bulk_update_pois($poi_ids, array('ignored' => 1));
                wp_send_json_success(array(
                    'message' => 'POIs marked as ignored successfully'
                ));
                break;
                
            case 'unignore':
                $result = TCGP2_POI_DB::bulk_update_pois($poi_ids, array('ignored' => 0));
                wp_send_json_success(array(
                    'message' => 'POIs included in export successfully'
                ));
                break;
                
            default:
                wp_send_json_error('Invalid action');
        }
    }
    
    /**
     * Get POI filters from request
     */
    private function get_poi_filters() {
        $filters = array();
        
        if (!empty($_GET['search'])) {
            $filters['search'] = sanitize_text_field($_GET['search']);
        }
        
        if (!empty($_GET['status']) && $_GET['status'] !== 'all') {
            $filters['status'] = sanitize_text_field($_GET['status']);
        }
        
        if (!empty($_GET['trail']) && $_GET['trail'] !== 'all') {
            $filters['trail_id'] = sanitize_text_field($_GET['trail']);
        }
        
        if (isset($_GET['ignored'])) {
            $filters['ignored'] = intval($_GET['ignored']);
        }
        
        if (!empty($_GET['google_type'])) {
            $filters['google_type'] = sanitize_text_field($_GET['google_type']);
        }
        
        return $filters;
    }
    
    /**
     * Get available trails
     */
    private function get_available_trails() {
        $trail_config = get_option('trail_navigator_config', array());
        
        if (empty($trail_config['trails'])) {
            return array();
        }
        
        $trails = array();
        foreach ($trail_config['trails'] as $trail) {
            $trails[] = array(
                'routeId' => $trail['routeId'],
                'name' => $trail['name']
            );
        }
        
        return $trails;
    }
    
    /**
     * Get available categories
     */
    private function get_available_categories() {
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
     * Get available Google Places types from existing POIs
     */
    private function get_available_google_types() {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp2_pois';
        
        $types_data = $wpdb->get_col("SELECT types FROM $table WHERE types IS NOT NULL AND types != ''");
        
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
        
        return $all_types;
    }
    
    /**
     * Get last sync date
     */
    private function get_last_sync_date() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'tcgp2_pois';
        return $wpdb->get_var("SELECT MAX(date_synced) FROM $table_name");
    }
    
    /**
     * Add admin notice
     */
    private function add_admin_notice($message, $type = 'info') {
        $notice_class = 'tcgp2-notice tcgp2-notice-' . $type;
        echo '<div class="' . esc_attr($notice_class) . '">' . esc_html($message) . '</div>';
    }
    
    /**
     * Handle AJAX Google Places API test
     */
    public function handle_test_google_places_api() {
        check_ajax_referer('tcgp2_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
        }
        
        $api_key = sanitize_text_field($_POST['api_key']);
        
        $settings = new TCGP2_Settings();
        $result = $settings->test_google_places_api_key($api_key);
        
        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result);
        }
    }
    
    /**
     * Handle AJAX save all category mappings
     */
    public function handle_save_all_category_mappings() {
        check_ajax_referer('tcgp2_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
        }
        
        $mappings = $_POST['mappings'] ?? array();
        
        if (is_array($mappings)) {
            update_option('tcgp2_category_mappings', $mappings);
            wp_send_json_success('Category mappings saved successfully');
        } else {
            wp_send_json_error('Invalid mappings data');
        }
    }
    
    /**
     * Handle AJAX auto assign categories
     */
    public function handle_auto_assign_categories() {
        check_ajax_referer('tcgp2_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
        }
        
        $sync = new TCGP2_POI_Sync();
        $result = $sync->auto_assign_categories_to_existing();
        
        if (is_wp_error($result)) {
            wp_send_json_error(array('message' => $result->get_error_message()));
        } else {
            wp_send_json_success(array('updated' => $result));
        }
    }
    
    /**
     * Handle AJAX update POI categories
     */
    public function handle_update_poi_categories() {
        check_ajax_referer('tcgp2_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
        }
        
        $poi_id = intval($_POST['poi_id']);
        $category_ids = array_map('intval', $_POST['category_ids'] ?? array());
        
        if (!$poi_id) {
            wp_send_json_error('Invalid POI ID');
        }
        
        $result = TCGP2_POI_DB::update_poi($poi_id, array(
            'category_ids' => json_encode($category_ids)
        ));
        
        if ($result) {
            wp_send_json_success('Categories updated successfully');
        } else {
            wp_send_json_error('Failed to update categories');
        }
    }
    
    /**
     * Handle AJAX toggle POI ignored status
     */
    public function handle_toggle_poi_ignored() {
        check_ajax_referer('tcgp2_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
        }
        
        $poi_id = intval($_POST['poi_id']);
        $ignored = intval($_POST['ignored']);
        
        if (!$poi_id) {
            wp_send_json_error('Invalid POI ID');
        }
        
        $result = TCGP2_POI_DB::update_poi($poi_id, array(
            'ignored' => $ignored
        ));
        
        if ($result) {
            wp_send_json_success('Ignored status updated successfully');
        } else {
            wp_send_json_error('Failed to update ignored status');
        }
    }
    
    /**
     * Handle AJAX test sync
     */
    public function handle_test_sync() {
        check_ajax_referer('tcgp2_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
        }
        
        $trail_id = sanitize_text_field($_POST['trail_id']);
        $radius = intval($_POST['radius']);
        $place_types = isset($_POST['place_types']) ? array_map('sanitize_text_field', $_POST['place_types']) : [];
        
        if (empty($trail_id)) {
            wp_send_json_error('No trail selected');
        }
        
        $sync = new TCGP2_POI_Sync();
        $result = $sync->test_sync_trail($trail_id, $radius, $place_types);
        
        if (is_wp_error($result)) {
            wp_send_json_error(array('message' => $result->get_error_message()));
        } else {
            wp_send_json_success($result);
        }
    }
    
    /**
     * Handle AJAX get trails (for test sync all)
     */
    public function handle_get_trails() {
        check_ajax_referer('tcgp2_admin_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
        }
        $trails = $this->get_available_trails();
        wp_send_json_success(array('trails' => $trails));
    }
} 