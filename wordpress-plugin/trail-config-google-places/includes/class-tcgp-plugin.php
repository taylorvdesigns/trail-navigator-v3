<?php
/**
 * Main plugin class
 */
class TCGP_Plugin {
    
    public function __construct() {
        $this->init_hooks();
    }
    
    /**
     * Initialize WordPress hooks
     */
    private function init_hooks() {
        // Admin hooks
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        
        // Master POI management AJAX hooks
        add_action('wp_ajax_tcgp_get_master_pois', array($this, 'ajax_get_master_pois'));
        add_action('wp_ajax_tcgp_update_export_selection', array($this, 'ajax_update_export_selection'));
        add_action('wp_ajax_tcgp_export_master_csv', array($this, 'ajax_export_master_csv'));
        add_action('wp_ajax_tcgp_delete_all_master_pois', array($this, 'ajax_delete_all_master_pois'));
        
        // Settings hooks - RESTORED for API keys only
        add_action('admin_init', array($this, 'register_api_settings'));
        
        // Cron hooks
        add_action('tcgp_sync_cron', array($this, 'run_sync'));
        
        // REST API hooks
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        
        add_action('wp_ajax_tcgp_bulk_edit_pois', array($this, 'ajax_bulk_edit_pois'));
        add_action('wp_ajax_tcgp_reset_radius', array($this, 'ajax_reset_radius'));
        add_action('wp_ajax_tcgp_test_api_key', array($this, 'ajax_test_api_key'));
        add_action('wp_ajax_tcgp_search_all_trails', array($this, 'ajax_search_all_trails'));
        add_action('wp_ajax_tcgp_force_reset_radius', array($this, 'ajax_force_reset_radius'));
        add_action('wp_ajax_tcgp_update_search_radius', array($this, 'ajax_update_search_radius'));
        add_action('wp_ajax_tcgp_force_set_radius', array($this, 'ajax_force_set_radius'));
        add_action('wp_ajax_tcgp_auto_assign_categories', array($this, 'ajax_auto_assign_categories'));
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_menu_page(
            'Master POI Management',
            'Master POIs',
            'manage_options',
            'trail-config-google-places-master',
            array($this, 'master_poi_page'),
            'dashicons-location',
            30
        );
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_scripts($hook) {
        if (strpos($hook, 'trail-config-google-places') === false) {
            return;
        }
        
        wp_enqueue_script('tcgp-admin', plugin_dir_url(__FILE__) . '../assets/js/admin.js', array('jquery'), '1.0.0', true);
        wp_enqueue_style('tcgp-admin', plugin_dir_url(__FILE__) . '../assets/css/admin.css', array(), '1.0.0');
        
        wp_localize_script('tcgp-admin', 'tcgp_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('tcgp_nonce')
        ));
    }
    
    /**
     * Master POI management page callback
     */
    public function master_poi_page() {
        require_once plugin_dir_path(__FILE__) . '../templates/master-poi-admin.php';
    }
    
    /**
     * Register API settings (Google Places and RideWithGPS API keys)
     */
    public function register_api_settings() {
        register_setting('tcgp_options', 'tcgp_google_places_api_key');
        register_setting('tcgp_options', 'tcgp_ridewithgps_api_key');
        register_setting('tcgp_options', 'tcgp_relevant_types');
        
        // Note: tcgp_search_radius is NOT registered here to avoid conflicts
        // It's handled separately in the Master POIs page
    }
    
    /**
     * Run sync (called by cron)
     */
    public function run_sync() {
        $sync = new TCGP_Sync();
        $sync->run_sync();
    }
    
    /**
     * Register REST API routes
     */
    public function register_rest_routes() {
        // Get essential POI data for a trail
        register_rest_route('tcgp/v1', '/trail/(?P<trail_id>[a-zA-Z0-9_-]+)/pois', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_trail_pois'),
            'permission_callback' => '__return_true',
            'args' => array(
                'trail_id' => array(
                    'validate_callback' => function($param) {
                        return !empty($param);
                    }
                )
            )
        ));
        
        // Get detailed POI information on-demand
        register_rest_route('tcgp/v1', '/poi/(?P<place_id>[a-zA-Z0-9_-]+)/details', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_poi_details'),
            'permission_callback' => '__return_true',
            'args' => array(
                'place_id' => array(
                    'validate_callback' => function($param) {
                        return !empty($param);
                    }
                )
            )
        ));
    }
    
    /**
     * Get essential POI data for a trail
     */
    public function get_trail_pois($request) {
        global $wpdb;
        
        $trail_id = $request->get_param('trail_id');
        $table = $wpdb->prefix . 'tcgp_places';
        
        $pois = $wpdb->get_results($wpdb->prepare(
            "SELECT place_id, name, latitude, longitude, category, short_description 
             FROM $table 
             WHERE trail_id = %s AND status = 'active' 
             ORDER BY name ASC",
            $trail_id
        ), ARRAY_A);
        
        if (empty($pois)) {
            return new WP_REST_Response(array('pois' => array()), 200);
        }
        
        return new WP_REST_Response(array('pois' => $pois), 200);
    }
    
    /**
     * Get detailed POI information on-demand
     */
    public function get_poi_details($request) {
        $place_id = $request->get_param('place_id');
        
        // Verify the place exists in our database
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp_places';
        
        $poi = $wpdb->get_row($wpdb->prepare(
            "SELECT place_id, trail_id FROM $table WHERE place_id = %s AND status = 'active'",
            $place_id
        ));
        
        if (!$poi) {
            return new WP_Error('poi_not_found', 'POI not found in database', array('status' => 404));
        }
        
        // Get fresh details from Google Places API
        $google_places = new TCGP_Google_Places();
        $details = $google_places->get_place_details($place_id);
        
        if (is_wp_error($details)) {
            return new WP_Error('api_error', $details->get_error_message(), array('status' => 500));
        }
        
        return new WP_REST_Response($details, 200);
    }
    
    /**
     * Create database tables
     */
    public function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Places table - simplified to store only essential data
        $places_table = $wpdb->prefix . 'tcgp_places';
        $places_sql = "CREATE TABLE $places_table (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            place_id varchar(255) NOT NULL,
            name varchar(255) NOT NULL,
            latitude decimal(10,8) NOT NULL,
            longitude decimal(11,8) NOT NULL,
            category varchar(100) NOT NULL,
            short_description text,
            trail_id varchar(100) NOT NULL,
            status varchar(20) DEFAULT 'active',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY place_id (place_id),
            KEY trail_id (trail_id),
            KEY status (status),
            KEY category (category)
        ) $charset_collate;";
        
        // Sync logs table
        $logs_table = $wpdb->prefix . 'tcgp_sync_logs';
        $logs_sql = "CREATE TABLE $logs_table (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            trail_id varchar(100) NOT NULL,
            sync_type varchar(20) NOT NULL,
            places_found int(11) DEFAULT 0,
            places_imported int(11) DEFAULT 0,
            places_removed int(11) DEFAULT 0,
            places_updated int(11) DEFAULT 0,
            errors text,
            sync_date datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY trail_id (trail_id),
            KEY sync_date (sync_date)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($places_sql);
        dbDelta($logs_sql);
    }
    
    /**
     * AJAX handler for exporting POIs as CSV (proxy to admin)
     */
    public function ajax_export_pois_csv() {
        $admin = new TCGP_Admin();
        $admin->ajax_export_pois_csv();
    }
    
    /**
     * AJAX handler for getting master POIs (proxy to admin)
     */
    public function ajax_get_master_pois() {
        $admin = new TCGP_Admin();
        $admin->ajax_get_master_pois();
    }
    
    /**
     * AJAX handler for updating export selection (proxy to admin)
     */
    public function ajax_update_export_selection() {
        $admin = new TCGP_Admin();
        $admin->ajax_update_export_selection();
    }
    
    /**
     * AJAX handler for exporting master POIs as CSV (proxy to admin)
     */
    public function ajax_export_master_csv() {
        $admin = new TCGP_Admin();
        $admin->ajax_export_master_csv();
    }
    
    /**
     * AJAX handler for deleting all master POIs (proxy to admin)
     */
    public function ajax_delete_all_master_pois() {
        $admin = new TCGP_Admin();
        $admin->ajax_delete_all_master_pois();
    }
    
    /**
     * Create or update the master POI table for all Google Places POIs
     */
    public function create_master_poi_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'tcgp_master_pois';
        $charset_collate = $wpdb->get_charset_collate();
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        $sql = "CREATE TABLE $table_name (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            place_id VARCHAR(64) NOT NULL,
            name VARCHAR(255) NOT NULL,
            latitude DECIMAL(10,7) NOT NULL,
            longitude DECIMAL(10,7) NOT NULL,
            short_description TEXT,
            generativeSummary TEXT,
            formatted_address TEXT,
            vicinity TEXT,
            types TEXT,
            status VARCHAR(32) DEFAULT 'new',
            trail_id VARCHAR(64),
            categories TEXT,
            tags TEXT,
            export_selected TINYINT(1) DEFAULT 0,
            date_first_seen DATETIME,
            date_last_seen DATETIME,
            date_last_updated DATETIME,
            raw_data LONGTEXT,
            PRIMARY KEY  (id),
            UNIQUE KEY place_id (place_id),
            KEY status (status),
            KEY export_selected (export_selected),
            KEY trail_id (trail_id)
        ) $charset_collate;";
        dbDelta($sql);
    }

    // Call this in the plugin activation hook
    public static function activate() {
        $plugin = new self();
        $plugin->create_master_poi_table();
        $plugin->ensure_generative_summary_field();
        // ...existing activation logic...
    }

    /**
     * AJAX handler for bulk editing POIs (proxy to admin)
     */
    public function ajax_bulk_edit_pois() {
        $admin = new TCGP_Admin();
        $admin->ajax_bulk_edit_pois();
    }

    /**
     * AJAX handler for resetting the search radius to 50 meters
     */
    public function ajax_reset_radius() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'tcgp_nonce')) {
            wp_die('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $admin = new TCGP_Admin();
        $admin->update_search_radius(50);
        
        wp_send_json_success('Search radius reset to 50 meters');
    }

    /**
     * AJAX handler for testing API key
     */
    public function ajax_test_api_key() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'tcgp_nonce')) {
            wp_die('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $api_key = sanitize_text_field($_POST['api_key']);
        
        if (empty($api_key)) {
            wp_send_json_error('No API key provided');
        }
        
        // Test the API key with a simple nearby search
        $url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
        
        $params = array(
            'location' => '40.7128,-74.0060', // New York City
            'radius' => 100, // Use smaller radius for testing
            'key' => $api_key
        );
        
        $url = add_query_arg($params, $url);
        
        $response = wp_remote_get($url);
        
        if (is_wp_error($response)) {
            wp_send_json_error('Network error: ' . $response->get_error_message());
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (empty($data)) {
            wp_send_json_error('Invalid response from Google Places API');
        }
        
        if ($data['status'] === 'OK') {
            wp_send_json_success('API key is valid! Found ' . count($data['results']) . ' places in test search.');
        } else {
            $error_message = 'API key test failed: ' . $data['status'];
            if (isset($data['error_message'])) {
                $error_message .= ' - ' . $data['error_message'];
            }
            wp_send_json_error($error_message);
        }
    }

    /**
     * AJAX handler for searching all trails
     */
    public function ajax_search_all_trails() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'tcgp_nonce')) {
            wp_die('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $radius = intval($_POST['radius']);
        
        $admin = new TCGP_Admin();
        $result = $admin->search_all_trails($radius);
        
        if (is_wp_error($result)) {
            wp_send_json_error($result->get_error_message());
        } else {
            wp_send_json_success($result);
        }
    }

    /**
     * AJAX handler for force resetting the search radius
     */
    public function ajax_force_reset_radius() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'tcgp_nonce')) {
            wp_die('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $admin = new TCGP_Admin();
        $result = $admin->force_reset_radius();
        
        if ($result) {
            wp_send_json_success('Search radius force reset to 50 meters');
        } else {
            wp_send_json_error('Failed to reset search radius');
        }
    }

    /**
     * AJAX handler for updating the search radius
     */
    public function ajax_update_search_radius() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'tcgp_nonce')) {
            wp_die('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $new_radius = intval($_POST['new_radius']);
        
        if ($new_radius < 1 || $new_radius > 10000) {
            wp_send_json_error('Invalid search radius');
        }
        
        $admin = new TCGP_Admin();
        $result = $admin->update_search_radius($new_radius);
        
        if ($result) {
            wp_send_json_success('Search radius updated to ' . $new_radius . ' meters');
        } else {
            wp_send_json_error('Failed to update search radius');
        }
    }
    
    /**
     * AJAX handler for force setting radius to a specific value
     */
    public function ajax_force_set_radius() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'tcgp_nonce')) {
            wp_die('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $new_radius = intval($_POST['new_radius']);
        
        if ($new_radius < 1 || $new_radius > 10000) {
            wp_send_json_error('Invalid radius value (1-10000)');
        }
        
        $admin = new TCGP_Admin();
        $result = $admin->force_set_radius($new_radius);
        
        if ($result) {
            wp_send_json_success('Radius force set to ' . $new_radius . ' meters');
        } else {
            wp_send_json_error('Failed to force set radius');
        }
    }

    /**
     * Ensure the generativeSummary field exists in the master POI table
     */
    public function ensure_generative_summary_field() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'tcgp_master_pois';
        
        // Check if the generativeSummary column exists
        $column_exists = $wpdb->get_results($wpdb->prepare(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = 'generativeSummary'",
            DB_NAME, $table_name
        ));
        
        // If the column doesn't exist, add it
        if (empty($column_exists)) {
            $wpdb->query("ALTER TABLE $table_name ADD COLUMN generativeSummary TEXT AFTER short_description");
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] Added generativeSummary column to master POI table');
            }
        }
        
        // Check if the formatted_address column exists
        $formatted_address_exists = $wpdb->get_results($wpdb->prepare(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = 'formatted_address'",
            DB_NAME, $table_name
        ));
        
        // If the column doesn't exist, add it
        if (empty($formatted_address_exists)) {
            $wpdb->query("ALTER TABLE $table_name ADD COLUMN formatted_address TEXT AFTER generativeSummary");
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] Added formatted_address column to master POI table');
            }
        }
        
        // Check if the vicinity column exists (separate from short_description)
        $vicinity_exists = $wpdb->get_results($wpdb->prepare(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = 'vicinity'",
            DB_NAME, $table_name
        ));
        
        // If the column doesn't exist, add it
        if (empty($vicinity_exists)) {
            $wpdb->query("ALTER TABLE $table_name ADD COLUMN vicinity TEXT AFTER formatted_address");
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TCGP DEBUG] Added vicinity column to master POI table');
            }
        }
    }
} 