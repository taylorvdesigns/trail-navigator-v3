<?php
/**
 * Standalone script to create the master POI table
 * Run this in your WordPress environment to create the table manually
 */

// Load WordPress
require_once('../../../wp-load.php');

// Check if we're in admin
if (!current_user_can('manage_options')) {
    wp_die('Insufficient permissions');
}

global $wpdb;

// Create the master POI table
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

$result = dbDelta($sql);

echo "<h1>Master POI Table Creation</h1>";

if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") == $table_name) {
    echo "<p style='color: green;'>✅ Master POI table created successfully!</p>";
    echo "<p>Table name: <code>$table_name</code></p>";
    
    // Show table structure
    $columns = $wpdb->get_results("DESCRIBE $table_name");
    echo "<h3>Table Structure:</h3>";
    echo "<ul>";
    foreach ($columns as $column) {
        echo "<li><strong>{$column->Field}</strong> - {$column->Type}</li>";
    }
    echo "</ul>";
    
} else {
    echo "<p style='color: red;'>❌ Failed to create master POI table</p>";
    echo "<p>Error: " . $wpdb->last_error . "</p>";
}

echo "<p><a href='" . admin_url('admin.php?page=trail-config-google-places-master') . "'>Go to Master POI Management</a></p>";
?> 