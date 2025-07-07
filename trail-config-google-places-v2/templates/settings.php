<?php
/**
 * Settings template for Trail Config Google Places v2
 */
?>

<div class="tcgp2-tabs">
    <a href="#" class="tcgp2-tab active" data-target="general-settings">General Settings</a>
    <a href="#" class="tcgp2-tab" data-target="api-keys">API Keys</a>
    <a href="#" class="tcgp2-tab" data-target="category-mapping">Category Mapping</a>
</div>

<div id="general-settings" class="tcgp2-tab-content active">
    <div class="tcgp2-form-card">
        <h3>General Configuration</h3>
        <p>Configure basic settings for the plugin operation.</p>
        
                    <form method="post" action="">
                <?php wp_nonce_field('tcgp2_settings', 'tcgp2_nonce'); ?>
                <input type="hidden" name="action" value="save_settings">
            
            <div class="tcgp2-form-row">
                <label for="search_radius">Default Search Radius:</label>
                <div class="tcgp2-input-group">
                    <input type="number" name="search_radius" id="search_radius" value="<?php echo esc_attr($current_settings['search_radius']); ?>" min="10" max="50000" required>
                    <span class="tcgp2-input-suffix">meters</span>
                </div>
                <div class="tcgp2-help-text">Default distance from trail coordinates to search for POIs</div>
            </div>
            
            <div class="tcgp2-form-row">
                <label for="max_pois_per_sync">Maximum POIs per Sync:</label>
                <div class="tcgp2-input-group">
                    <input type="number" name="max_pois_per_sync" id="max_pois_per_sync" value="<?php echo esc_attr($current_settings['max_pois_per_sync']); ?>" min="1" max="1000" required>
                    <span class="tcgp2-input-suffix">POIs</span>
                </div>
                <div class="tcgp2-help-text">Limit the number of POIs imported in a single sync operation</div>
            </div>
            
            <div class="tcgp2-form-row">
                <label>
                    <input type="checkbox" name="auto_assign_categories" value="1" <?php checked($current_settings['auto_assign_categories'], true); ?>>
                    Automatically assign categories to POIs
                </label>
                <div class="tcgp2-help-text">Use category mappings to automatically assign GeoDirectory categories to POIs based on Google Place types</div>
            </div>
            
            <div class="tcgp2-form-row">
                <button type="submit" class="button button-primary">Save General Settings</button>
            </div>
        </form>
    </div>
</div>

<div id="api-keys" class="tcgp2-tab-content">
    <div class="tcgp2-form-card">
        <h3>API Configuration</h3>
        <p>Configure API keys for Google Places and RideWithGPS services.</p>
        
        <form method="post" action="">
            <?php wp_nonce_field('tcgp2_settings', 'tcgp2_nonce'); ?>
            <input type="hidden" name="action" value="save_settings">
            
            <div class="tcgp2-settings-section">
                <h3>Google Places API</h3>
                <p>Required for searching and retrieving POI data from Google Places.</p>
                
                <div class="tcgp2-form-row">
                    <label for="google_places_api_key">Google Places API Key:</label>
                    <div class="tcgp2-api-key-field">
                        <input type="password" name="google_places_api_key" id="google_places_api_key" value="<?php echo esc_attr($current_settings['google_places_api_key']); ?>" autocomplete="off">
                        <button type="button" class="tcgp2-toggle-password">
                            <span class="dashicons dashicons-visibility"></span>
                        </button>
                    </div>
                    <div class="tcgp2-help-text">
                        Get your API key from the <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a>. 
                        Enable the Places API and set up billing.
                    </div>
                </div>
                
                <!-- Dummy fields to prevent autofill -->
                <input type="text" style="display:none;" autocomplete="username">
                <input type="password" style="display:none;" autocomplete="current-password">
            </div>
            
            <div class="tcgp2-settings-section">
                <h3>RideWithGPS API</h3>
                <p>Required for fetching trail coordinates and route data.</p>
                
                <div class="tcgp2-form-row">
                    <label for="ridewithgps_api_key">RideWithGPS API Key:</label>
                    <div class="tcgp2-api-key-field">
                        <input type="password" name="ridewithgps_api_key" id="ridewithgps_api_key" value="<?php echo esc_attr($current_settings['ridewithgps_api_key']); ?>" autocomplete="off">
                        <button type="button" class="tcgp2-toggle-password">
                            <span class="dashicons dashicons-visibility"></span>
                        </button>
                    </div>
                    <div class="tcgp2-help-text">
                        Get your API key from your <a href="https://ridewithgps.com/users/edit" target="_blank">RideWithGPS account settings</a>.
                    </div>
                </div>
            </div>
            
            <div class="tcgp2-form-row">
                <button type="submit" class="button button-primary">Save API Settings</button>
                <button type="button" class="button button-secondary" onclick="testGooglePlacesAPI()">Test Google Places API</button>
            </div>
        </form>
    </div>
</div>

<div id="category-mapping" class="tcgp2-tab-content">
    <div class="tcgp2-form-card">
        <h3>Category Mapping</h3>
        <p>Map Google Place types to GeoDirectory categories for automatic assignment. You can also choose which place types to ignore during sync operations.</p>
        
        <?php if (empty($categories)): ?>
            <div class="tcgp2-notice tcgp2-notice-warning">
                <p>No GeoDirectory categories found. Make sure GeoDirectory is installed and you have created some categories.</p>
            </div>
        <?php else: ?>
            <form method="post" action="">
                <?php wp_nonce_field('tcgp2_settings', 'tcgp2_nonce'); ?>
                <input type="hidden" name="action" value="save_settings">
                
                <div class="tcgp2-category-mapping">
                    <h4>Google Place Types → GeoDirectory Categories</h4>
                    
                    <?php
                    $mappings = get_option('tcgp2_category_mappings', array());
                    $ignored_types = $current_settings['ignored_types'] ?? array();
                    $all_types = $settings->get_all_place_types();
                    
                    foreach ($all_types as $category_name => $types):
                    ?>
                        <div class="tcgp2-category-section">
                            <h5 class="tcgp2-category-section-title"><?php echo esc_html($category_name); ?></h5>
                            
                            <?php foreach ($types as $google_type => $display_name): ?>
                                <div class="tcgp2-category-row">
                                    <div class="tcgp2-type-info">
                                        <span class="google-type"><?php echo esc_html($display_name); ?></span>
                                        <span class="google-type-code">(<?php echo esc_html($google_type); ?>)</span>
                                    </div>
                                    <span class="mapping-arrow">→</span>
                                    <select class="tcgp2-category-mapping-select" name="category_mappings[<?php echo esc_attr($google_type); ?>]" data-google-type="<?php echo esc_attr($google_type); ?>">
                                        <option value="">No mapping</option>
                                        <option value="IGNORE" <?php selected(in_array($google_type, $ignored_types), true); ?>>Ignore this type</option>
                                        <?php foreach ($categories as $cat_id => $cat_name): ?>
                                            <option value="<?php echo esc_attr($cat_id); ?>" <?php selected($mappings[$google_type] ?? '', $cat_id); ?>>
                                                <?php echo esc_html($cat_name); ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    <?php endforeach; ?>
                    
                    <div class="tcgp2-category-actions">
                        <button type="submit" class="button button-primary">Save All Mappings & Ignore Settings</button>
                        <button type="button" class="button button-secondary" onclick="autoAssignCategories()">Auto-Assign Categories to Existing POIs</button>
                        <button type="button" class="button button-secondary" onclick="resetAllMappings()">Reset All Mappings</button>
                    </div>
                </div>
            </form>
        <?php endif; ?>
    </div>
</div>

<script>
function testGooglePlacesAPI() {
    const apiKey = document.getElementById('google_places_api_key').value;
    if (!apiKey) {
        alert('Please enter a Google Places API key first.');
        return;
    }
    
    // Show loading state
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Testing...';
    button.disabled = true;
    
    // Make AJAX request to test API
    jQuery.post(ajaxurl, {
        action: 'tcgp2_test_google_places_api',
        api_key: apiKey,
        nonce: tcgp2_ajax.nonce
    }, function(response) {
        if (response.success) {
            alert('API key is valid! Found ' + response.data.results_count + ' places in test search.');
        } else {
            alert('API test failed: ' + response.data.message);
        }
        
        // Restore button
        button.textContent = originalText;
        button.disabled = false;
    });
}

function resetAllMappings() {
    if (!confirm('This will reset all category mappings and ignore settings to their defaults. Continue?')) {
        return;
    }
    
    document.querySelectorAll('.tcgp2-category-mapping-select').forEach(select => {
        select.value = '';
    });
    
    // Submit the form to save the reset
    document.querySelector('form').submit();
}

function autoAssignCategories() {
    if (!confirm('This will attempt to assign categories to all existing POIs based on their Google Place types. Continue?')) {
        return;
    }
    
    jQuery.post(ajaxurl, {
        action: 'tcgp2_auto_assign_categories',
        nonce: tcgp2_ajax.nonce
    }, function(response) {
        if (response.success) {
            alert('Category assignment completed! ' + response.data.updated + ' POIs updated.');
            location.reload();
        } else {
            alert('Category assignment failed: ' + response.data.message);
        }
    });
}
</script> 