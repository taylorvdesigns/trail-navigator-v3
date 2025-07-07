<?php
/**
 * Settings Template
 * 
 * Displays the plugin settings page with organized sections
 */

if (!defined('ABSPATH')) {
    exit;
}

$settings = new TNPOI_Settings();
?>

<div class="wrap tnpoi-admin">
    <h1>Trail Navigator POI Finder - Settings</h1>
    
    <!-- API Configuration -->
    <div class="tnpoi-card">
        <h2>API Configuration</h2>
        <p>Configure your API keys for Google Places and RideWithGPS integration.</p>
        
        <form method="post" action="options.php">
            <?php
            settings_fields('tnpoi_settings_group');
            do_settings_sections('tnpoi_settings');
            submit_button('Save API Settings');
            ?>
        </form>
    </div>
    
    <!-- Trail Selection -->
    <div class="tnpoi-card">
        <h2>Trail Selection</h2>
        <p>Select which trails to sync POIs for. Only selected trails will be processed during sync operations.</p>
        
        <?php
        $available_trails = $settings->get_available_trails();
        $selected_trails = get_option('tnpoi_selected_trails', array());
        ?>
        
        <div class="tnpoi-form-group">
            <label><strong>Available Trails:</strong></label>
            <div class="tnpoi-checkbox-group">
                <?php foreach ($available_trails as $trail_id => $trail_name): ?>
                    <label class="tnpoi-checkbox-item">
                        <input type="checkbox" 
                               name="tnpoi_selected_trails[]" 
                               value="<?php echo esc_attr($trail_id); ?>"
                               <?php checked(in_array($trail_id, $selected_trails)); ?>>
                        <?php echo esc_html($trail_name); ?>
                    </label>
                <?php endforeach; ?>
            </div>
        </div>
        
        <button type="button" class="button button-primary" onclick="saveTrailSelection()">
            Save Trail Selection
        </button>
    </div>
    
    <!-- Category Mapping -->
    <div class="tnpoi-card">
        <h2>Category Mapping</h2>
        <p>Map Google Places types to GeoDirectory categories for automatic assignment during sync operations. Types marked as "Ignore" will be excluded from Google Places API searches.</p>
        
        <form method="post" action="">
            <?php wp_nonce_field('tnpoi_save_category_mappings', 'tnpoi_category_mappings_nonce'); ?>
            <?php $settings->render_category_mapping_field(); ?>
            <div class="tnpoi-category-actions">
                <button type="submit" name="tnpoi_save_category_mappings" class="button button-primary">Save Category Mappings</button>
                <button type="button" class="button button-secondary" onclick="tnpoiResetAllMappings()">Reset All Mappings</button>
            </div>
        </form>
    </div>
</div>

<script>
function saveTrailSelection() {
    const checkboxes = document.querySelectorAll('input[name="tnpoi_selected_trails[]"]:checked');
    const selectedTrails = Array.from(checkboxes).map(cb => cb.value);
    
    jQuery.post(ajaxurl, {
        action: 'tnpoi_save_trail_selection',
        selected_trails: selectedTrails,
        nonce: tnpoi_ajax.nonce
    }, function(response) {
        if (response.success) {
            alert('Trail selection saved successfully!');
        } else {
            alert('Failed to save trail selection: ' + response.data);
        }
    });
}

function tnpoiResetAllMappings() {
    if (!confirm("This will reset all category mappings and ignore settings to their defaults. Continue?")) {
        return;
    }
    
    document.querySelectorAll(".tnpoi-category-mapping-select").forEach(select => {
        select.value = "";
    });
    
    // Submit the form to save the reset
    document.querySelector("form").submit();
}
</script>

<style>
.tnpoi-checkbox-group {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 10px;
    margin-top: 10px;
}

.tnpoi-checkbox-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.tnpoi-checkbox-item:hover {
    background-color: #f8f9fa;
}

.tnpoi-checkbox-item input[type="checkbox"] {
    margin: 0;
}
</style> 