<?php
/**
 * Plugin Name: Trail Config Google Places Integration
 * Plugin URI: https://github.com/your-username/trail-config-google-places
 * Description: Import Points of Interest from Google Places API for Trail Navigator trails
 * Version: 1.0.0
 * Author: Your Name
 * License: GPL v2 or later
 * Text Domain: trail-config-google-places
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('TCGP_PLUGIN_VERSION', '1.0.0');
define('TCGP_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('TCGP_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main plugin class
 */
class Trail_Config_Google_Places {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->init();
    }
    
    /**
     * Initialize the plugin
     */
    private function init() {
        // Load required files
        $this->load_dependencies();
        
        // Initialize plugin
        add_action('plugins_loaded', array($this, 'init_plugin'));
        
        // Register activation and deactivation hooks
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    /**
     * Load plugin dependencies
     */
    private function load_dependencies() {
        require_once TCGP_PLUGIN_PATH . 'includes/class-tcgp-plugin.php';
        require_once TCGP_PLUGIN_PATH . 'includes/class-tcgp-admin.php';
        require_once TCGP_PLUGIN_PATH . 'includes/class-tcgp-google-places.php';
    }
    
    /**
     * Initialize plugin after WordPress loads
     */
    public function init_plugin() {
        // Check if Trail Navigator Configuration plugin is active
        if (!$this->check_trail_config_dependency()) {
            add_action('admin_notices', array($this, 'show_dependency_notice'));
            return;
        }
        
        // Initialize main plugin class
        new TCGP_Plugin();
    }
    
    /**
     * Check if Trail Navigator Configuration plugin is active
     */
    private function check_trail_config_dependency() {
        // Check if the trail configuration option exists
        $trail_config = get_option('trail_navigator_config', array());
        return !empty($trail_config);
    }
    
    /**
     * Show dependency notice
     */
    public function show_dependency_notice() {
        ?>
        <div class="notice notice-warning is-dismissible">
            <p>
                <strong>Trail Config Google Places Integration</strong> requires the 
                <strong>Trail Navigator Configuration</strong> plugin to be installed and configured.
                Please install and configure the Trail Navigator Configuration plugin first.
            </p>
        </div>
        <?php
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        // Create database tables
        $plugin = new TCGP_Plugin();
        $plugin->create_tables();
        $plugin->create_master_poi_table();
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Clear any scheduled cron jobs
        wp_clear_scheduled_hook('tcgp_sync_cron');
    }
}

// Initialize the plugin
Trail_Config_Google_Places::get_instance(); 