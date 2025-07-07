<?php
// Get current settings
$settings = get_option('tnpoi_settings', array());

// Handle form submission
if (isset($_POST['submit']) && wp_verify_nonce($_POST['tnpoi_settings_nonce'], 'tnpoi_save_settings')) {
    $new_settings = array(
        'google_places_api_key' => sanitize_text_field($_POST['google_places_api_key']),
        'ridewithgps_api_key' => sanitize_text_field($_POST['ridewithgps_api_key']),
        'sync_radius' => intval($_POST['sync_radius']),
        'sync_interval' => intval($_POST['sync_interval']),
        'max_pois_per_sync' => intval($_POST['max_pois_per_sync']),
        'auto_assign_categories' => isset($_POST['auto_assign_categories']),
        'coordinate_thinning_distance' => intval($_POST['coordinate_thinning_distance']),
        'enable_auto_sync' => isset($_POST['enable_auto_sync']),
        'sync_notifications' => isset($_POST['sync_notifications']),
        'export_format' => sanitize_text_field($_POST['export_format']),
        'map_tile_provider' => sanitize_text_field($_POST['map_tile_provider']),
        'default_map_center_lat' => floatval($_POST['default_map_center_lat']),
        'default_map_center_lng' => floatval($_POST['default_map_center_lng']),
        'default_map_zoom' => intval($_POST['default_map_zoom'])
    );
    
    // Handle place types
    $place_types = isset($_POST['place_types']) ? $_POST['place_types'] : array();
    $new_settings['place_types'] = array_map('sanitize_text_field', $place_types);
    
    // Handle category mapping
    $category_mapping = array();
    if (isset($_POST['category_mapping']) && is_array($_POST['category_mapping'])) {
        foreach ($_POST['category_mapping'] as $google_type => $category) {
            if (!empty($google_type) && !empty($category)) {
                $category_mapping[sanitize_text_field($google_type)] = sanitize_text_field($category);
            }
        }
    }
    $new_settings['category_mapping'] = $category_mapping;
    
    // Update settings
    update_option('tnpoi_settings', $new_settings);
    $settings = $new_settings;
    
    // Show success message
    echo '<div class="notice notice-success"><p>Settings saved successfully!</p></div>';
}

// Available place types
$available_place_types = array(
    'restaurant' => 'Restaurant',
    'cafe' => 'Cafe',
    'lodging' => 'Lodging',
    'park' => 'Park',
    'museum' => 'Museum',
    'library' => 'Library',
    'pharmacy' => 'Pharmacy',
    'atm' => 'ATM',
    'bank' => 'Bank',
    'gas_station' => 'Gas Station',
    'store' => 'Store',
    'tourist_attraction' => 'Tourist Attraction',
    'hospital' => 'Hospital',
    'police' => 'Police Station',
    'fire_station' => 'Fire Station',
    'school' => 'School',
    'university' => 'University',
    'post_office' => 'Post Office',
    'bus_station' => 'Bus Station',
    'train_station' => 'Train Station',
    'airport' => 'Airport',
    'parking' => 'Parking',
    'campground' => 'Campground',
    'rv_park' => 'RV Park',
    'bicycle_store' => 'Bicycle Store',
    'hardware_store' => 'Hardware Store',
    'convenience_store' => 'Convenience Store',
    'grocery_or_supermarket' => 'Grocery Store',
    'liquor_store' => 'Liquor Store',
    'clothing_store' => 'Clothing Store',
    'shoe_store' => 'Shoe Store',
    'jewelry_store' => 'Jewelry Store',
    'book_store' => 'Book Store',
    'electronics_store' => 'Electronics Store',
    'furniture_store' => 'Furniture Store',
    'home_goods_store' => 'Home Goods Store',
    'department_store' => 'Department Store',
    'shopping_mall' => 'Shopping Mall'
);

// Map tile providers
$map_tile_providers = array(
    'openstreetmap' => 'OpenStreetMap',
    'cartodb' => 'CartoDB',
    'esri' => 'ESRI World Imagery',
    'stamen' => 'Stamen Terrain'
);

// Export formats
$export_formats = array(
    'csv' => 'CSV (Comma Separated Values)',
    'geojson' => 'GeoJSON',
    'kml' => 'KML (Google Earth)',
    'gpx' => 'GPX (GPS Exchange Format)'
);
?>

<div class="wrap tnpoi-settings">
    <h1>Trail Navigator POI Finder Settings</h1>
    
    <form method="post" action="">
        <?php wp_nonce_field('tnpoi_save_settings', 'tnpoi_settings_nonce'); ?>
        
        <!-- API Configuration -->
        <div class="settings-section">
            <h2>API Configuration</h2>
            
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="google_places_api_key">Google Places API Key</label>
                    </th>
                    <td>
                        <input type="text" id="google_places_api_key" name="google_places_api_key" 
                               value="<?php echo esc_attr($settings['google_places_api_key'] ?? ''); ?>" 
                               class="regular-text" required>
                        <p class="description">
                            Enter your Google Places API key. <a href="https://developers.google.com/maps/documentation/places/web-service/get-api-key" target="_blank">Get API Key</a>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="ridewithgps_api_key">RideWithGPS API Key</label>
                    </th>
                    <td>
                        <input type="text" id="ridewithgps_api_key" name="ridewithgps_api_key" 
                               value="<?php echo esc_attr($settings['ridewithgps_api_key'] ?? ''); ?>" 
                               class="regular-text">
                        <p class="description">
                            Optional: Enter your RideWithGPS API key for trail data import.
                        </p>
                    </td>
                </tr>
            </table>
        </div>
        
        <!-- Sync Configuration -->
        <div class="settings-section">
            <h2>Sync Configuration</h2>
            
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="sync_radius">Default Search Radius (miles)</label>
                    </th>
                    <td>
                        <input type="number" id="sync_radius" name="sync_radius" 
                               value="<?php echo esc_attr($settings['sync_radius'] ?? 100); ?>" 
                               min="1" max="500" class="small-text">
                        <p class="description">
                            Default radius for searching POIs around trail locations.
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="sync_interval">Auto Sync Interval (minutes)</label>
                    </th>
                    <td>
                        <input type="number" id="sync_interval" name="sync_interval" 
                               value="<?php echo esc_attr($settings['sync_interval'] ?? 300); ?>" 
                               min="60" max="1440" class="small-text">
                        <p class="description">
                            How often to automatically sync POIs (minimum 60 minutes).
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="max_pois_per_sync">Max POIs per Sync</label>
                    </th>
                    <td>
                        <input type="number" id="max_pois_per_sync" name="max_pois_per_sync" 
                               value="<?php echo esc_attr($settings['max_pois_per_sync'] ?? 1000); ?>" 
                               min="100" max="10000" class="small-text">
                        <p class="description">
                            Maximum number of POIs to import in a single sync operation.
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="coordinate_thinning_distance">Coordinate Thinning Distance (meters)</label>
                    </th>
                    <td>
                        <input type="number" id="coordinate_thinning_distance" name="coordinate_thinning_distance" 
                               value="<?php echo esc_attr($settings['coordinate_thinning_distance'] ?? 100); ?>" 
                               min="10" max="1000" class="small-text">
                        <p class="description">
                            Distance within which nearby POIs will be consolidated.
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">Sync Options</th>
                    <td>
                        <fieldset>
                            <label>
                                <input type="checkbox" name="auto_assign_categories" value="1" 
                                       <?php checked($settings['auto_assign_categories'] ?? true); ?>>
                                Auto-assign categories based on Google Places types
                            </label>
                            <br>
                            <label>
                                <input type="checkbox" name="enable_auto_sync" value="1" 
                                       <?php checked($settings['enable_auto_sync'] ?? false); ?>>
                                Enable automatic sync
                            </label>
                            <br>
                            <label>
                                <input type="checkbox" name="sync_notifications" value="1" 
                                       <?php checked($settings['sync_notifications'] ?? true); ?>>
                                Send email notifications for sync results
                            </label>
                        </fieldset>
                    </td>
                </tr>
            </table>
        </div>
        
        <!-- Place Types -->
        <div class="settings-section">
            <h2>Place Types to Import</h2>
            <p>Select which types of places to import from Google Places API.</p>
            
            <div class="place-types-grid">
                <?php 
                $selected_types = $settings['place_types'] ?? array('restaurant', 'cafe', 'lodging', 'park', 'museum', 'library', 'pharmacy', 'atm', 'bank', 'gas_station', 'store', 'tourist_attraction');
                foreach ($available_place_types as $type => $label): 
                ?>
                    <label class="place-type-checkbox">
                        <input type="checkbox" name="place_types[]" value="<?php echo esc_attr($type); ?>" 
                               <?php checked(in_array($type, $selected_types)); ?>>
                        <?php echo esc_html($label); ?>
                    </label>
                <?php endforeach; ?>
            </div>
        </div>
        
        <!-- Category Mapping -->
        <div class="settings-section">
            <h2>Category Mapping</h2>
            <p>Map Google Places types to your custom categories.</p>
            
            <div class="category-mapping">
                <?php 
                $category_mapping = $settings['category_mapping'] ?? array();
                $mapping_count = max(5, count($category_mapping));
                
                for ($i = 0; $i < $mapping_count; $i++): 
                    $google_type = array_keys($category_mapping)[$i] ?? '';
                    $category = array_values($category_mapping)[$i] ?? '';
                ?>
                    <div class="mapping-row">
                        <input type="text" name="category_mapping[<?php echo $i; ?>][google_type]" 
                               value="<?php echo esc_attr($google_type); ?>" 
                               placeholder="Google Places type" class="regular-text">
                        <span class="mapping-arrow">→</span>
                        <input type="text" name="category_mapping[<?php echo $i; ?>][category]" 
                               value="<?php echo esc_attr($category); ?>" 
                               placeholder="Your category name" class="regular-text">
                    </div>
                <?php endfor; ?>
                
                <button type="button" class="button add-mapping-row">Add Another Mapping</button>
            </div>
        </div>
        
        <!-- Map Configuration -->
        <div class="settings-section">
            <h2>Map Configuration</h2>
            
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="map_tile_provider">Map Tile Provider</label>
                    </th>
                    <td>
                        <select id="map_tile_provider" name="map_tile_provider">
                            <?php foreach ($map_tile_providers as $provider => $label): ?>
                                <option value="<?php echo esc_attr($provider); ?>" 
                                        <?php selected($settings['map_tile_provider'] ?? 'openstreetmap', $provider); ?>>
                                    <?php echo esc_html($label); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <p class="description">
                            Choose the map tile provider for the map preview.
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="default_map_center_lat">Default Map Center (Latitude)</label>
                    </th>
                    <td>
                        <input type="number" id="default_map_center_lat" name="default_map_center_lat" 
                               value="<?php echo esc_attr($settings['default_map_center_lat'] ?? 39.8283); ?>" 
                               step="any" class="regular-text">
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="default_map_center_lng">Default Map Center (Longitude)</label>
                    </th>
                    <td>
                        <input type="number" id="default_map_center_lng" name="default_map_center_lng" 
                               value="<?php echo esc_attr($settings['default_map_center_lng'] ?? -98.5795); ?>" 
                               step="any" class="regular-text">
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="default_map_zoom">Default Map Zoom Level</label>
                    </th>
                    <td>
                        <input type="number" id="default_map_zoom" name="default_map_zoom" 
                               value="<?php echo esc_attr($settings['default_map_zoom'] ?? 4); ?>" 
                               min="1" max="18" class="small-text">
                        <p class="description">
                            Zoom level from 1 (world view) to 18 (street level).
                        </p>
                    </td>
                </tr>
            </table>
        </div>
        
        <!-- Export Configuration -->
        <div class="settings-section">
            <h2>Export Configuration</h2>
            
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="export_format">Default Export Format</label>
                    </th>
                    <td>
                        <select id="export_format" name="export_format">
                            <?php foreach ($export_formats as $format => $label): ?>
                                <option value="<?php echo esc_attr($format); ?>" 
                                        <?php selected($settings['export_format'] ?? 'csv', $format); ?>>
                                    <?php echo esc_html($label); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <p class="description">
                            Default format for POI exports.
                        </p>
                    </td>
                </tr>
            </table>
        </div>
        
        <!-- Submit Button -->
        <div class="settings-actions">
            <?php submit_button('Save Settings'); ?>
        </div>
    </form>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    // Add mapping row functionality
    document.querySelector('.add-mapping-row').addEventListener('click', function() {
        var mappingContainer = document.querySelector('.category-mapping');
        var mappingCount = document.querySelectorAll('.mapping-row').length;
        
        var newRow = document.createElement('div');
        newRow.className = 'mapping-row';
        newRow.innerHTML = 
            '<input type="text" name="category_mapping[' + mappingCount + '][google_type]" placeholder="Google Places type" class="regular-text">' +
            '<span class="mapping-arrow">→</span>' +
            '<input type="text" name="category_mapping[' + mappingCount + '][category]" placeholder="Your category name" class="regular-text">' +
            '<button type="button" class="button remove-mapping-row">Remove</button>';
        
        mappingContainer.insertBefore(newRow, this);
    });
    
    // Remove mapping row functionality
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-mapping-row')) {
            e.target.parentElement.remove();
        }
    });
});
</script>

<style>
.settings-section {
    margin-bottom: 30px;
    padding: 20px;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.settings-section h2 {
    margin-top: 0;
    color: #23282d;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
}

.place-types-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
    margin-top: 15px;
}

.place-type-checkbox {
    display: flex;
    align-items: center;
    padding: 8px;
    background: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 3px;
    cursor: pointer;
}

.place-type-checkbox:hover {
    background: #f0f0f0;
}

.place-type-checkbox input[type="checkbox"] {
    margin-right: 8px;
}

.category-mapping {
    margin-top: 15px;
}

.mapping-row {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    gap: 10px;
}

.mapping-arrow {
    font-weight: bold;
    color: #666;
}

.add-mapping-row {
    margin-top: 10px;
}

.remove-mapping-row {
    margin-left: 10px;
}

.settings-actions {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #ddd;
}
</style> 