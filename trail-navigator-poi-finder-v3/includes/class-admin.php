<?php
/**
 * Admin functionality for Trail Navigator POI Finder v3
 */
class TNPOI_Admin {
    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
    }

    /**
     * Register admin menu and submenus
     */
    public function add_admin_menu() {
        add_menu_page(
            'Trail POIs',
            'Trail POIs',
            'manage_options',
            'tnpoi-dashboard',
            array($this, 'render_dashboard'),
            'dashicons-location',
            25
        );
        add_submenu_page(
            'tnpoi-dashboard',
            'Dashboard',
            'Dashboard',
            'manage_options',
            'tnpoi-dashboard',
            array($this, 'render_dashboard')
        );
        add_submenu_page(
            'tnpoi-dashboard',
            'POI Manager',
            'POI Manager',
            'manage_options',
            'tnpoi-pois',
            array($this, 'render_poi_manager')
        );
        add_submenu_page(
            'tnpoi-dashboard',
            'Sync',
            'Sync',
            'manage_options',
            'tnpoi-sync',
            array($this, 'render_sync')
        );
        add_submenu_page(
            'tnpoi-dashboard',
            'Map Preview',
            'Map Preview',
            'manage_options',
            'tnpoi-map-preview',
            array($this, 'render_map_preview')
        );
        add_submenu_page(
            'tnpoi-dashboard',
            'Settings',
            'Settings',
            'manage_options',
            'tnpoi-settings',
            array($this, 'render_settings')
        );
    }

    /**
     * Enqueue admin CSS/JS assets
     */
    public function enqueue_admin_assets($hook) {
        if (strpos($hook, 'tnpoi-') === false) {
            return;
        }
        wp_enqueue_style(
            'tnpoi-admin',
            TNPOI_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            TNPOI_VERSION
        );
        wp_enqueue_script(
            'tnpoi-admin',
            TNPOI_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery'),
            TNPOI_VERSION,
            true
        );
        wp_localize_script('tnpoi-admin', 'tnpoi_ajax', array(
            'nonce' => wp_create_nonce('tnpoi_admin_nonce'),
            'ajaxurl' => admin_url('admin-ajax.php')
        ));
    }

    /**
     * Render dashboard page
     */
    public function render_dashboard() {
        $stats = TNPOI_POI_DB::get_stats();
        include TNPOI_PLUGIN_DIR . 'templates/dashboard.php';
    }

    /**
     * Render POI manager page
     */
    public function render_poi_manager() {
        include TNPOI_PLUGIN_DIR . 'templates/poi-manager.php';
    }

    /**
     * Render sync page
     */
    public function render_sync() {
        include TNPOI_PLUGIN_DIR . 'templates/sync.php';
    }

    /**
     * Render map preview page
     */
    public function render_map_preview() {
        include TNPOI_PLUGIN_DIR . 'templates/map-preview.php';
    }

    /**
     * Render settings page
     */
    public function render_settings() {
        include TNPOI_PLUGIN_DIR . 'templates/settings.php';
    }
} 