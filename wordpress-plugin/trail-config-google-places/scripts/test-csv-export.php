<?php
/**
 * Test script for CSV export functionality
 * 
 * This script tests the CSV export functions to ensure they work correctly
 * and produce the expected GeoDirectory format.
 * 
 * Usage: Run this script from the WordPress admin or via CLI
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    // If running from CLI, we need to bootstrap WordPress
    if (php_sapi_name() === 'cli') {
        $wp_load_path = dirname(dirname(dirname(dirname(__FILE__)))) . '/wp-load.php';
        if (file_exists($wp_load_path)) {
            require_once($wp_load_path);
        } else {
            die("WordPress not found. Please run this script from within WordPress.\n");
        }
    } else {
        exit;
    }
}

// Test the CSV export functionality
function test_csv_export_functionality() {
    echo "=== Testing CSV Export Functionality ===\n\n";
    
    // Test address parsing
    echo "1. Testing Address Parsing:\n";
    $admin = new TCGP_Admin();
    
    // Test with a known location (New York City)
    $test_lat = 40.7128;
    $test_lng = -74.0060;
    
    $address_components = $admin->get_address_components($test_lat, $test_lng);
    
    echo "   Latitude: $test_lat, Longitude: $test_lng\n";
    echo "   Street: " . ($address_components['street'] ?: 'EMPTY') . "\n";
    echo "   City: " . ($address_components['city'] ?: 'EMPTY') . "\n";
    echo "   Region: " . ($address_components['region'] ?: 'EMPTY') . "\n";
    echo "   Country: " . ($address_components['country'] ?: 'EMPTY') . "\n";
    echo "   ZIP: " . ($address_components['zip'] ?: 'EMPTY') . "\n\n";
    
    // Test category mapping
    echo "2. Testing Category Mapping:\n";
    $test_types = array('restaurant', 'cafe', 'park');
    
    foreach ($test_types as $type) {
        $category_id = $admin->map_google_types_to_category(array($type));
        echo "   Google Type: $type -> Category ID: " . ($category_id ?: 'EMPTY') . "\n";
    }
    echo "\n";
    
    // Test GeoDirectory categories
    echo "3. Testing GeoDirectory Categories:\n";
    $gd_categories = $admin->get_geodirectory_categories();
    echo "   Found " . count($gd_categories) . " GeoDirectory categories\n";
    
    if (!empty($gd_categories)) {
        echo "   First 5 categories:\n";
        $count = 0;
        foreach ($gd_categories as $slug => $name) {
            if ($count >= 5) break;
            echo "     $slug: $name\n";
            $count++;
        }
    }
    echo "\n";
    
    // Test master POI stats
    echo "4. Testing Master POI Stats:\n";
    $stats = $admin->get_master_poi_stats();
    echo "   Total POIs: " . $stats['total'] . "\n";
    echo "   New POIs: " . $stats['new'] . "\n";
    echo "   Active POIs: " . $stats['active'] . "\n";
    echo "   POIs with categories: " . $stats['with_categories'] . "\n";
    echo "   POIs selected for export: " . $stats['export_selected'] . "\n\n";
    
    echo "=== Test Complete ===\n";
}

// Run the test if this script is executed directly
if (defined('ABSPATH')) {
    test_csv_export_functionality();
} else {
    echo "Running CSV Export Test...\n";
    test_csv_export_functionality();
} 