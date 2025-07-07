<?php
/*
Plugin Name: Trail Navigator POI Finder v3
Description: Import, curate, and export POIs for trail systems using RideWithGPS and Google Places, with GeoDirectory export compatibility. Enhanced with coordinate thinning, map preview, and AJAX progress.
Version: 3.0.0
Author: Your Name
License: GPL2
*/

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Define plugin constants
define('TNPOI_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('TNPOI_PLUGIN_URL', plugin_dir_url(__FILE__));
define('TNPOI_VERSION', '3.0.4');

/**
 * Autoload plugin includes
 */
function tnpoi_autoload_includes() {
    $files = [
        'class-poi-db.php',
        'class-poi-sync.php',
        'class-csv-export.php',
        'class-settings.php',
        'class-admin.php',
        'class-map-preview.php',
        'class-rest-api.php'
    ];
    
    foreach ($files as $file) {
        $path = TNPOI_PLUGIN_DIR . 'includes/' . $file;
        if (file_exists($path)) {
            require_once $path;
        }
    }
}

/**
 * Plugin activation hook
 */
register_activation_hook(__FILE__, 'tnpoi_activate_plugin');

function tnpoi_activate_plugin() {
    // Load the database class first
    require_once TNPOI_PLUGIN_DIR . 'includes/class-poi-db.php';
    
    // Create the database table
    TNPOI_POI_DB::create_table();
    
    // Set default options
    $default_settings = array(
        'google_places_api_key' => '',
        'ridewithgps_api_key' => '',
        'sync_radius' => 100,
        'sync_interval' => 300,
        'max_pois_per_sync' => 1000,
        'auto_assign_categories' => true,
        'place_types' => array('restaurant', 'cafe', 'lodging', 'park', 'museum', 'library', 'pharmacy', 'atm', 'bank', 'gas_station', 'store', 'tourist_attraction'),
        'category_mapping' => array()
    );
    
    add_option('tnpoi_settings', $default_settings);
}

/**
 * Plugin deactivation hook
 */
register_deactivation_hook(__FILE__, 'tnpoi_deactivate_plugin');

function tnpoi_deactivate_plugin() {
    // Clean up any scheduled events
    wp_clear_scheduled_hook('tnpoi_auto_sync');
}

// Load includes
tnpoi_autoload_includes();

// Initialize admin functionality
add_action('init', function() {
    if (is_admin()) {
        new TNPOI_Admin();
    }
});

// Register REST API endpoints
add_action('rest_api_init', function() {
    if (class_exists('TNPOI_REST_API')) {
        (new TNPOI_REST_API())->register_routes();
    }
});

// Add settings link to plugins page
add_filter('plugin_action_links_' . plugin_basename(__FILE__), function($links) {
    $settings_link = '<a href="' . admin_url('admin.php?page=tnpoi-settings') . '">Settings</a>';
    array_unshift($links, $settings_link);
    return $links;
}); 