<?php
/**
 * Map Preview Template
 * 
 * Interactive map preview using Leaflet.js with trail visualization
 */

if (!defined('ABSPATH')) {
    exit;
}

// Manually enqueue scripts as fallback
wp_enqueue_style('leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
wp_enqueue_script('leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', array(), '1.9.4', true);
wp_enqueue_script('tnpoi-map', TNPOI_PLUGIN_URL . 'assets/js/map.js', array('leaflet', 'jquery'), TNPOI_VERSION, true);

// Localize script with AJAX URL and nonce
wp_localize_script('tnpoi-map', 'tnpoi_map_ajax', array(
    'ajax_url' => admin_url('admin-ajax.php'),
    'nonce' => wp_create_nonce('tnpoi_map_preview_nonce'),
    'sync_nonce' => wp_create_nonce('tnpoi_sync_nonce'),
    'plugin_url' => TNPOI_PLUGIN_URL
));

// Get available trails and selected trail
$trail_config = get_option('trail_navigator_config', array());
$available_trails = isset($trail_config['trails']) ? $trail_config['trails'] : array();
$selected_trail_id = $_GET['trail_id'] ?? '';
$selected_trail = null;

if ($selected_trail_id) {
    foreach ($available_trails as $trail) {
        if ($trail['routeId'] === $selected_trail_id) {
            $selected_trail = $trail;
            break;
        }
    }
    
    // Try to fetch complete trail data with coordinates if missing
    if ($selected_trail && (!isset($selected_trail['trackPoints']) || empty($selected_trail['trackPoints']))) {
        $map_preview = new TNPOI_Map_Preview();
        $selected_trail = $map_preview->get_complete_trail_data($selected_trail);
    }
}

// Debug: Log trail data structure
error_log('TNPOI Map Preview: Available trails count: ' . count($available_trails));
if ($selected_trail) {
    error_log('TNPOI Map Preview: Selected trail keys: ' . implode(', ', array_keys($selected_trail)));
    error_log('TNPOI Map Preview: Selected trail has trackPoints: ' . (isset($selected_trail['trackPoints']) ? 'yes' : 'no'));
    if (isset($selected_trail['trackPoints'])) {
        error_log('TNPOI Map Preview: Track points count: ' . count($selected_trail['trackPoints']));
    }
}

$map_preview = new TNPOI_Map_Preview();
$preview_settings = $map_preview->get_preview_settings();
wp_localize_script('tnpoi-map', 'tnpoi_map_preview_settings', $preview_settings);
?>

<div class="wrap tnpoi-map-preview">
    <h1 class="wp-heading-inline">Map Preview</h1>
    <a href="<?php echo admin_url('admin.php?page=tnpoi-poi-manager'); ?>" class="page-title-action">Manage POIs</a>
    
    <!-- Trail Selection -->
    <div class="tnpoi-trail-selection-panel">
        <h3>Select Trail for Preview</h3>
        <form method="get" action="" class="tnpoi-trail-form">
            <input type="hidden" name="page" value="tnpoi-map-preview">
            <select name="trail_id" id="trail-selector" onchange="this.form.submit()">
                <option value="">-- Select a trail --</option>
                <?php foreach ($available_trails as $trail): ?>
                    <option value="<?php echo esc_attr($trail['routeId']); ?>" 
                            <?php selected($selected_trail_id, $trail['routeId']); ?>>
                        <?php echo esc_html($trail['name']); ?> 
                        (<?php echo count($trail['trackPoints'] ?? array()); ?> points)
                    </option>
                <?php endforeach; ?>
            </select>
        </form>
        
        <?php if ($selected_trail): ?>
            <div class="tnpoi-trail-info">
                <h4><?php echo esc_html($selected_trail['name']); ?></h4>
                <p><strong>Route ID:</strong> <?php echo esc_html($selected_trail['routeId']); ?></p>
                <p><strong>Track Points:</strong> <?php echo count($selected_trail['trackPoints'] ?? array()); ?></p>
            </div>
        <?php endif; ?>
    </div>
    
    <?php if ($selected_trail): ?>
    <div class="tnpoi-map-controls">
        <!-- Mode Toggle -->
        <div class="tnpoi-mode-toggle">
            <label class="tnpoi-mode-option">
                <input type="radio" name="map-mode" value="trail-view" checked>
                <span>Trail View</span>
            </label>
            <label class="tnpoi-mode-option">
                <input type="radio" name="map-mode" value="sync-preview">
                <span>Sync Preview</span>
            </label>
        </div>
        
        <!-- Trail View Controls -->
        <div class="tnpoi-map-filters" id="trail-view-controls">
            <div class="tnpoi-filter-actions">
                <button type="button" id="fit-trail-bounds" class="button button-secondary">Fit Trail</button>
                <button type="button" id="load-pois" class="button">Load POIs</button>
            </div>
        </div>
        
        <!-- Sync Preview Controls -->
        <div class="tnpoi-map-filters" id="sync-preview-controls" style="display: none;">
            <div class="tnpoi-filter-group">
                <label for="search-radius">Search Radius (meters):</label>
                <input type="number" id="search-radius" value="<?php echo esc_attr($preview_settings['search_radius']); ?>" min="50" max="5000" step="50" class="small-text">
            </div>
            <div class="tnpoi-filter-group">
                <label for="osm-analysis-radius">OSM Analysis Radius (meters):</label>
                <input type="number" id="osm-analysis-radius" value="<?php echo esc_attr($preview_settings['osm_analysis_radius']); ?>" min="100" max="2000" step="50" class="small-text">
            </div>
            <div class="tnpoi-filter-group">
                <label for="coordinate-interval">Sampling Interval:</label>
                <select id="coordinate-interval">
                    <option value="160" <?php selected($preview_settings['coordinate_interval'], 160); ?>>0.1 mile (High Density)</option>
                    <option value="320" <?php selected($preview_settings['coordinate_interval'], 320); ?>>0.2 mile (Medium Density)</option>
                    <option value="480" <?php selected($preview_settings['coordinate_interval'], 480); ?>>0.3 mile (Low Density)</option>
                    <option value="800" <?php selected($preview_settings['coordinate_interval'], 800); ?>>0.5 mile (Very Low Density)</option>
                    <option value="1600" <?php selected($preview_settings['coordinate_interval'], 1600); ?>>1.0 mile (Sparse)</option>
                </select>
            </div>
            <div class="tnpoi-filter-group">
                <label>
                    <input type="checkbox" id="enable-adaptive-sampling" <?php checked(!empty($preview_settings['enable_adaptive_sampling'])); ?>>
                    Enable Zone Discovery (OSM-based)
                </label>
                <small>Discovers POI zones using OSM data and configurable weights</small>
            </div>
            <div class="tnpoi-filter-actions">
                <button type="button" id="update-sync-preview" class="button">Update Preview</button>
                <button type="button" id="start-sync-from-preview" class="button button-primary">Start Sync</button>
                <button type="button" id="save-map-preview-defaults" class="button button-secondary">Save as Default</button>
            </div>
        </div>
        
        <!-- Zone Discovery Controls -->
        <div class="tnpoi-zone-controls" id="zone-controls" style="display: none;">
            <h3>POI Category Weights</h3>
            <p>Configure the importance of different POI types for zone classification:</p>
            
            <div class="tnpoi-weight-sliders">
                <div class="tnpoi-weight-group">
                    <label for="food-dining-weight">Food & Dining (Restaurants, Cafes, Bars)</label>
                    <input type="range" id="food-dining-weight" min="0" max="10" value="<?php echo esc_attr($preview_settings['food_dining_weight']); ?>" class="weight-slider">
                    <span class="weight-value"><?php echo esc_html($preview_settings['food_dining_weight']); ?></span>
                </div>
                
                <div class="tnpoi-weight-group">
                    <label for="parks-recreation-weight">Parks & Recreation (Parks, Playgrounds, Attractions)</label>
                    <input type="range" id="parks-recreation-weight" min="0" max="10" value="<?php echo esc_attr($preview_settings['parks_recreation_weight']); ?>" class="weight-slider">
                    <span class="weight-value"><?php echo esc_html($preview_settings['parks_recreation_weight']); ?></span>
                </div>
                
                <div class="tnpoi-weight-group">
                    <label for="shopping-weight">Shopping & Retail (Shops, Stores)</label>
                    <input type="range" id="shopping-weight" min="0" max="10" value="<?php echo esc_attr($preview_settings['shopping_weight']); ?>" class="weight-slider">
                    <span class="weight-value"><?php echo esc_html($preview_settings['shopping_weight']); ?></span>
                </div>
                
                <div class="tnpoi-weight-group">
                    <label for="services-weight">Services (Banks, Offices, Professional)</label>
                    <input type="range" id="services-weight" min="0" max="10" value="<?php echo esc_attr($preview_settings['services_weight']); ?>" class="weight-slider">
                    <span class="weight-value"><?php echo esc_html($preview_settings['services_weight']); ?></span>
                </div>
            </div>
            
            <div class="tnpoi-zone-thresholds">
                <h4>Zone Classification Thresholds</h4>
                <div class="tnpoi-threshold-group">
                    <label for="hot-zone-threshold">Hot Zone Minimum Score:</label>
                    <input type="number" id="hot-zone-threshold" value="<?php echo esc_attr($preview_settings['hot_threshold']); ?>" min="10" max="100" class="small-text">
                </div>
                <div class="tnpoi-threshold-group">
                    <label for="warm-zone-threshold">Warm Zone Minimum Score:</label>
                    <input type="number" id="warm-zone-threshold" value="<?php echo esc_attr($preview_settings['warm_threshold']); ?>" min="5" max="50" class="small-text">
                </div>
            </div>
            
            <div class="tnpoi-zone-actions">
                <button type="button" id="discover-zones" class="button button-primary">Discover Zones</button>
                <button type="button" id="export-zone-data" class="button button-secondary">Export Zone Data</button>
            </div>
        </div>
        
        <div class="tnpoi-map-stats">
            <span class="tnpoi-stat">Trail Points: <span id="trail-points-display"><?php echo count($selected_trail['trackPoints'] ?? array()); ?></span></span>
            <span class="tnpoi-stat" id="poi-stats" style="display: none;">POIs: <span id="poi-count-display">0</span></span>
            <span class="tnpoi-stat" id="sync-preview-stats" style="display: none;">
                Sampled Points: <span id="sampled-points-display">-</span> | 
                API Calls: <span id="api-calls-display">-</span>
            </span>
        </div>
    </div>
    
    <div class="tnpoi-map-container">
        <div id="poi-map" style="height: 600px; width: 100%;"></div>
    </div>
    <?php else: ?>
    <div class="tnpoi-no-trail-selected">
        <p>Please select a trail above to view the map preview.</p>
    </div>
    <?php endif; ?>
</div>

<!-- Load the map JavaScript -->
<script>
// Pass PHP data to JavaScript
window.tnpoiMapData = {
    selectedTrail: <?php echo json_encode($selected_trail); ?>,
    availableTrails: <?php echo json_encode($available_trails); ?>
};

// AJAX configuration
window.tnpoi_map_ajax = {
    ajax_url: '<?php echo admin_url('admin-ajax.php'); ?>',
    nonce: '<?php echo wp_create_nonce('tnpoi_map_preview_nonce'); ?>'
};
</script>

<style>
.tnpoi-map-preview {
    margin: 20px 0;
}

.tnpoi-map-controls {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tnpoi-mode-toggle {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #eee;
}

.tnpoi-mode-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border: 2px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.tnpoi-mode-option:hover {
    border-color: #0073aa;
    background-color: #f0f8ff;
}

.tnpoi-mode-option input[type="radio"] {
    margin: 0;
}

.tnpoi-mode-option input[type="radio"]:checked + span {
    font-weight: 600;
    color: #0073aa;
}

.tnpoi-mode-option input[type="radio"]:checked ~ .tnpoi-mode-option {
    border-color: #0073aa;
    background-color: #e6f3ff;
}

.tnpoi-map-filters {
    display: flex;
    gap: 20px;
    align-items: end;
    flex-wrap: wrap;
    margin-bottom: 15px;
}

.tnpoi-filter-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.tnpoi-filter-group label {
    font-weight: 500;
    color: #1d2327;
}

.tnpoi-filter-actions {
    display: flex;
    gap: 10px;
    align-items: end;
}

.tnpoi-map-stats {
    display: flex;
    gap: 20px;
    padding-top: 15px;
    border-top: 1px solid #f0f0f0;
}

.tnpoi-stat {
    font-weight: 500;
    color: #666;
}

.tnpoi-stat span {
    color: #2271b1;
    font-weight: 600;
}

.tnpoi-map-container {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-bottom: 20px;
}

.tnpoi-map-sidebar {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Zone Discovery Controls */
.tnpoi-zone-controls {
    background: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    margin-top: 20px;
}

.tnpoi-zone-controls h3 {
    margin-top: 0;
    margin-bottom: 10px;
    color: #1d2327;
}

.tnpoi-zone-controls h4 {
    margin-top: 20px;
    margin-bottom: 10px;
    color: #1d2327;
}

.tnpoi-weight-sliders {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-bottom: 20px;
}

.tnpoi-weight-group {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 10px;
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
}

.tnpoi-weight-group label {
    flex: 1;
    font-weight: 500;
    color: #1d2327;
    margin: 0;
}

.weight-slider {
    width: 150px;
    margin: 0;
}

.weight-value {
    min-width: 30px;
    text-align: center;
    font-weight: 600;
    color: #0073aa;
    background: #e6f3ff;
    padding: 4px 8px;
    border-radius: 4px;
}

.tnpoi-zone-thresholds {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
}

.tnpoi-threshold-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.tnpoi-threshold-group label {
    font-weight: 500;
    color: #1d2327;
    margin: 0;
}

.tnpoi-zone-actions {
    display: flex;
    gap: 10px;
    padding-top: 15px;
    border-top: 1px solid #e0e0e0;
}

.tnpoi-poi-list h3 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #1d2327;
}

#poi-list-container {
    max-height: 400px;
    overflow-y: auto;
}

.tnpoi-poi-list-item {
    padding: 10px;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    margin-bottom: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.tnpoi-poi-list-item:hover {
    background: #f9f9f9;
    border-color: #2271b1;
}

.tnpoi-poi-list-item.selected {
    background: #e7f3ff;
    border-color: #2271b1;
}

.tnpoi-poi-list-item h4 {
    margin: 0 0 5px 0;
    color: #2271b1;
    font-size: 1em;
}

.tnpoi-poi-list-item p {
    margin: 0;
    color: #666;
    font-size: 0.9em;
}

.tnpoi-poi-meta {
    display: flex;
    gap: 10px;
    margin-top: 5px;
    font-size: 0.8em;
    color: #888;
}

.tnpoi-loading {
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 20px;
}

/* Leaflet customizations */
.leaflet-popup-content {
    margin: 10px;
    min-width: 200px;
}

.leaflet-popup-content h3 {
    margin: 0 0 10px 0;
    color: #2271b1;
}

.leaflet-popup-content p {
    margin: 5px 0;
    color: #666;
}

.leaflet-popup-content .poi-rating {
    color: #f39c12;
    font-weight: 500;
}

.leaflet-popup-content .poi-type {
    background: #f0f0f0;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8em;
    color: #666;
    display: inline-block;
    margin-top: 5px;
}

/* Modal Styles */
.tnpoi-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.tnpoi-modal-content {
    background: #fff;
    border-radius: 8px;
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.tnpoi-modal-header {
    padding: 20px;
    border-bottom: 1px solid #ddd;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.tnpoi-modal-header h2 {
    margin: 0;
}

.tnpoi-modal-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
}

.tnpoi-modal-close:hover {
    color: #000;
}

.tnpoi-modal-body {
    padding: 20px;
}

.tnpoi-modal-footer {
    padding: 20px;
    border-top: 1px solid #ddd;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
}

@media (max-width: 768px) {
    .tnpoi-map-filters {
        flex-direction: column;
        align-items: stretch;
    }
    
    .tnpoi-filter-actions {
        justify-content: center;
    }
    
    .tnpoi-map-stats {
        flex-direction: column;
        gap: 10px;
    }
    
    #poi-map {
        height: 400px;
    }
}
</style> 