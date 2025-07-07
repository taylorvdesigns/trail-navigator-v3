<?php
/*
Plugin Name: Trail Config Google Places Integration v2
Description: Import POIs from Google Places along trails, curate, and export to GeoDirectory CSV. Simple WordPress admin UI.
Version: 2.0.0
Author: Your Name
*/

if (!defined('ABSPATH')) exit;

define('TCGP2_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('TCGP2_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Autoload plugin includes
 */
function autoload_includes() {
    $files = [
        'class-poi-db.php',
        'class-rest-api.php', 
        'class-poi-sync.php',
        'class-csv-export.php',
        'class-settings.php',
        'class-admin.php'
    ];
    
    foreach ($files as $file) {
        $path = TCGP2_PLUGIN_DIR . 'includes/' . $file;
        if (file_exists($path)) {
            require_once $path;
        }
    }
}

/**
 * Plugin activation hook
 */
register_activation_hook(__FILE__, 'tcgp2_activate_plugin');

function tcgp2_activate_plugin() {
    require_once TCGP2_PLUGIN_DIR . 'includes/class-poi-db.php';
    TCGP2_POI_DB::create_table();
}

// Load includes
autoload_includes();

// Initialize admin functionality
add_action('init', function() {
    if (is_admin()) {
        new TCGP2_Admin();
    }
});

// Register REST API endpoints
add_action('rest_api_init', function() {
    if (class_exists('TCGP2_REST_API')) {
        (new TCGP2_REST_API())->register_routes();
    }
}); 