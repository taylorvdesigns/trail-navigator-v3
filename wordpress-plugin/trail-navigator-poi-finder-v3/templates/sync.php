<?php
/**
 * Sync Template
 * 
 * Manage search terms and sync POIs from Google Places
 */

if (!defined('ABSPATH')) {
    exit;
}

// Get available trails from Trail Navigator config
$trail_config = get_option('trail_navigator_config', array());
$available_trails = isset($trail_config['trails']) ? $trail_config['trails'] : array();

// Get selected trails for sync
$selected_trails = get_option('tnpoi_selected_trails', array());
?>

<div class="wrap tnpoi-sync">
    <h1 class="wp-heading-inline">Sync POIs</h1>
    <a href="<?php echo admin_url('admin.php?page=tnpoi-settings'); ?>" class="page-title-action">Settings</a>
    
    <div class="tnpoi-sync-content">
        <div class="tnpoi-sync-main">
            <!-- Trail Selection -->
            <div class="tnpoi-card">
                <h2>Trail Selection</h2>
                <p>Select the trails you want to sync POIs for. POIs will be searched along the trail coordinates.</p>
                
                <?php if (empty($available_trails)): ?>
                    <div class="tnpoi-notice tnpoi-notice-warning">
                        <p><strong>No trails found!</strong> Please configure trails in the Trail Navigator Configuration plugin first.</p>
                        <p>You can still use search terms below for manual location-based syncing.</p>
                    </div>
                <?php else: ?>
                    <div class="tnpoi-trail-selection">
                        <div class="tnpoi-trail-list">
                            <?php foreach ($available_trails as $trail): ?>
                                <div class="tnpoi-trail-item">
                                    <label class="tnpoi-trail-checkbox">
                                        <input type="checkbox" 
                                               name="selected_trails[]" 
                                               value="<?php echo esc_attr($trail['routeId']); ?>"
                                               <?php checked(in_array($trail['routeId'], $selected_trails)); ?>>
                                        <span class="tnpoi-trail-info">
                                            <strong><?php echo esc_html($trail['name']); ?></strong>
                                            <span class="tnpoi-trail-details">
                                                Route ID: <?php echo esc_html($trail['routeId']); ?> | 
                                                Points: <?php echo count($trail['trackPoints'] ?? array()); ?>
                                            </span>
                                        </span>
                                    </label>
                                </div>
                            <?php endforeach; ?>
                        </div>
                        
                        <div class="tnpoi-trail-actions">
                            <button type="button" id="select-all-trails" class="button button-secondary">Select All</button>
                            <button type="button" id="deselect-all-trails" class="button button-secondary">Deselect All</button>
                            <button type="button" id="save-trail-selection" class="button button-primary">Save Trail Selection</button>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
            
            <!-- Search Terms Management -->
            <div class="tnpoi-card">
                <h2>Search Terms (Optional)</h2>
                <p>Configure additional locations and place types to search for POIs. These will be used in addition to trail-based syncing.</p>
                
                <div class="tnpoi-search-terms">
                    <div id="search-terms-list">
                        <?php if (!empty($search_terms)): ?>
                            <?php foreach ($search_terms as $index => $term): ?>
                                <div class="tnpoi-search-term" data-index="<?php echo $index; ?>">
                                    <div class="tnpoi-term-header">
                                        <h4><?php echo esc_html($term['name']); ?></h4>
                                        <div class="tnpoi-term-actions">
                                            <button type="button" class="button button-small edit-term">Edit</button>
                                            <button type="button" class="button button-small button-link-delete delete-term">Delete</button>
                                        </div>
                                    </div>
                                    <div class="tnpoi-term-details">
                                        <span class="tnpoi-term-location">📍 <?php echo esc_html($term['location']); ?></span>
                                        <span class="tnpoi-term-radius">🔍 <?php echo esc_html($term['radius']); ?>m radius</span>
                                        <span class="tnpoi-term-types">🏷️ <?php echo esc_html($term['types']); ?></span>
                                        <span class="tnpoi-term-distance">📏 Min distance: <?php echo esc_html($term['min_distance'] ?? 100); ?>m</span>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <p class="tnpoi-no-terms">No search terms configured. Add additional search terms below if needed.</p>
                        <?php endif; ?>
                    </div>
                    
                    <button type="button" id="add-search-term" class="button button-secondary">
                        ➕ Add Search Term
                    </button>
                </div>
            </div>
            
            <!-- Sync Controls -->
            <div class="tnpoi-card">
                <h2>Sync Controls</h2>
                
                <div class="tnpoi-sync-status">
                    <div class="tnpoi-status-indicator">
                        <span class="tnpoi-status-dot" id="sync-status-dot"></span>
                        <span class="tnpoi-status-text" id="sync-status-text">Ready to sync</span>
                    </div>
                </div>
                
                <div class="tnpoi-sync-progress" id="sync-progress" style="display: none;">
                    <div class="tnpoi-progress-bar">
                        <div class="tnpoi-progress-fill" id="progress-fill"></div>
                    </div>
                    <div class="tnpoi-progress-text" id="progress-text">0%</div>
                </div>
                
                <div class="tnpoi-sync-actions">
                    <button type="button" id="start-sync" class="button button-primary button-large">
                        🔄 Start Sync
                    </button>
                    <button type="button" id="stop-sync" class="button button-secondary button-large" style="display: none;">
                        ⏹️ Stop Sync
                    </button>
                    <button type="button" id="test-sync" class="button button-secondary button-large">
                        🧪 Test Sync
                    </button>
                </div>
                
                <div class="tnpoi-sync-info">
                    <h4>Sync Information</h4>
                    <ul>
                        <li><strong>API Key:</strong> <?php echo !empty($api_key) ? '✅ Configured' : '❌ Missing'; ?></li>
                        <li><strong>Selected Trails:</strong> <?php echo count($selected_trails); ?> of <?php echo count($available_trails); ?> available</li>
                        <li><strong>Search Terms:</strong> <?php echo count($search_terms); ?> configured</li>
                        <li><strong>Last Sync:</strong> <span id="last-sync-time"><?php echo get_option('tnpoi_last_sync', 'Never'); ?></span></li>
                        <li><strong>Rate Limit:</strong> Respects Google Places API limits (2 second delays)</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <div class="tnpoi-sync-sidebar">
            <!-- Quick Stats -->
            <div class="tnpoi-card">
                <h3>Quick Stats</h3>
                <div class="tnpoi-stats-list">
                    <div class="tnpoi-stat-item">
                        <span class="tnpoi-stat-label">Total POIs:</span>
                        <span class="tnpoi-stat-value" id="total-pois-count">-</span>
                    </div>
                    <div class="tnpoi-stat-item">
                        <span class="tnpoi-stat-label">Recent POIs:</span>
                        <span class="tnpoi-stat-value" id="recent-pois-count">-</span>
                    </div>
                    <div class="tnpoi-stat-item">
                        <span class="tnpoi-stat-label">Search Terms:</span>
                        <span class="tnpoi-stat-value" id="search-terms-count">-</span>
                    </div>
                </div>
            </div>
            
            <!-- Help -->
            <div class="tnpoi-card">
                <h3>Help & Tips</h3>
                <div class="tnpoi-help-content">
                    <h4>Getting Started</h4>
                    <ol>
                        <li>Configure your Google Places API key in Settings</li>
                        <li>Select the trails you want to sync POIs for</li>
                        <li>Optionally add search terms for additional locations</li>
                        <li>Click "Start Sync" to import POIs along trails</li>
                        <li>Monitor progress and manage POIs in POI Manager</li>
                    </ol>
                    
                    <h4>Trail-Based Syncing</h4>
                    <ul>
                        <li>POIs are automatically searched along trail coordinates</li>
                        <li>Coordinate thinning prevents duplicate POIs</li>
                        <li>Each trail point becomes a search location</li>
                        <li>POIs are tagged with the trail they belong to</li>
                    </ul>
                    
                    <h4>Best Practices</h4>
                    <ul>
                        <li>Select trails that have good POI coverage</li>
                        <li>Use search terms for areas not covered by trails</li>
                        <li>Choose relevant place types for your trail system</li>
                        <li>Set appropriate radius (500m-5000m recommended)</li>
                        <li>Use coordinate thinning to avoid duplicates</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Search Term Modal -->
<div id="search-term-modal" class="tnpoi-modal" style="display: none;">
    <div class="tnpoi-modal-content">
        <div class="tnpoi-modal-header">
            <h2 id="modal-title">Add Search Term</h2>
            <button type="button" class="tnpoi-modal-close">&times;</button>
        </div>
        <div class="tnpoi-modal-body">
            <form id="search-term-form">
                <input type="hidden" id="term-index" value="">
                
                <div class="tnpoi-form-row">
                    <div class="tnpoi-form-group">
                        <label for="term-name">Name:</label>
                        <input type="text" id="term-name" class="regular-text" placeholder="e.g., Downtown Restaurants" required>
                        <p class="description">A descriptive name for this search term</p>
                    </div>
                </div>
                
                <div class="tnpoi-form-row">
                    <div class="tnpoi-form-group">
                        <label for="term-location">Location:</label>
                        <input type="text" id="term-location" class="regular-text" placeholder="e.g., 40.7128,-74.0060 or Downtown NYC" required>
                        <p class="description">Coordinates (lat,lng) or address</p>
                    </div>
                </div>
                
                <div class="tnpoi-form-row">
                    <div class="tnpoi-form-group">
                        <label for="term-radius">Search Radius (meters):</label>
                        <input type="number" id="term-radius" min="100" max="50000" value="1000" class="regular-text" required>
                        <p class="description">Distance to search from location (100-50000m)</p>
                    </div>
                    <div class="tnpoi-form-group">
                        <label for="term-min-distance">Minimum Distance (meters):</label>
                        <input type="number" id="term-min-distance" min="10" max="1000" value="100" class="regular-text" required>
                        <p class="description">Minimum distance between POIs (coordinate thinning)</p>
                    </div>
                </div>
                
                <div class="tnpoi-form-row">
                    <div class="tnpoi-form-group">
                        <label for="term-types">Place Types:</label>
                        <select id="term-types" multiple class="regular-text" required>
                            <option value="restaurant">Restaurant</option>
                            <option value="cafe">Cafe</option>
                            <option value="bar">Bar</option>
                            <option value="lodging">Lodging</option>
                            <option value="gas_station">Gas Station</option>
                            <option value="convenience_store">Convenience Store</option>
                            <option value="pharmacy">Pharmacy</option>
                            <option value="hospital">Hospital</option>
                            <option value="police">Police</option>
                            <option value="fire_station">Fire Station</option>
                            <option value="park">Park</option>
                            <option value="museum">Museum</option>
                            <option value="tourist_attraction">Tourist Attraction</option>
                            <option value="campground">Campground</option>
                            <option value="rv_park">RV Park</option>
                            <option value="bicycle_store">Bicycle Store</option>
                            <option value="bicycle_repair_station">Bicycle Repair Station</option>
                            <option value="parking">Parking</option>
                            <option value="bus_station">Bus Station</option>
                            <option value="train_station">Train Station</option>
                            <option value="subway_station">Subway Station</option>
                        </select>
                        <p class="description">Hold Ctrl/Cmd to select multiple types</p>
                    </div>
                </div>
            </form>
        </div>
        <div class="tnpoi-modal-footer">
            <button type="button" id="save-search-term" class="button button-primary">Save Search Term</button>
            <button type="button" class="tnpoi-modal-close button button-secondary">Cancel</button>
        </div>
    </div>
</div>

<style>
.tnpoi-sync {
    margin: 20px 0;
}

.tnpoi-sync-content {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 30px;
}

.tnpoi-card {
    background: #fff;
    border: 1px solid #ccd0d4;
    border-radius: 4px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 1px 1px rgba(0,0,0,.04);
}

.tnpoi-card h2 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #23282d;
    font-size: 1.3em;
}

.tnpoi-card h3 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #23282d;
    font-size: 1.1em;
}

.tnpoi-card h4 {
    margin-top: 0;
    margin-bottom: 10px;
    color: #23282d;
    font-size: 1em;
}

/* Trail Selection Styles */
.tnpoi-trail-selection {
    margin-top: 15px;
}

.tnpoi-trail-list {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 15px;
}

.tnpoi-trail-item {
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
}

.tnpoi-trail-item:last-child {
    border-bottom: none;
}

.tnpoi-trail-checkbox {
    display: flex;
    align-items: center;
    cursor: pointer;
    margin: 0;
}

.tnpoi-trail-checkbox input[type="checkbox"] {
    margin-right: 10px;
}

.tnpoi-trail-info {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.tnpoi-trail-info strong {
    color: #23282d;
    font-size: 14px;
}

.tnpoi-trail-details {
    color: #666;
    font-size: 12px;
    margin-top: 2px;
}

.tnpoi-trail-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.tnpoi-notice {
    padding: 12px;
    border-radius: 4px;
    margin: 15px 0;
}

.tnpoi-notice-warning {
    background-color: #fff3cd;
    border: 1px solid #ffeaa7;
    color: #856404;
}

/* Search Terms Styles */
.tnpoi-search-terms {
    margin-top: 20px;
}

.tnpoi-search-term {
    background: #f9f9f9;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 15px;
}

.tnpoi-term-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.tnpoi-term-header h4 {
    margin: 0;
    color: #2271b1;
}

.tnpoi-term-actions {
    display: flex;
    gap: 5px;
}

.tnpoi-term-details {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
    font-size: 0.9em;
    color: #666;
}

.tnpoi-term-location,
.tnpoi-term-radius,
.tnpoi-term-types,
.tnpoi-term-distance {
    display: flex;
    align-items: center;
    gap: 5px;
}

.tnpoi-no-terms {
    color: #666;
    font-style: italic;
    text-align: center;
    padding: 20px;
}

.tnpoi-sync-status {
    margin-bottom: 20px;
}

.tnpoi-status-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 500;
}

.tnpoi-status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #46b450;
}

.tnpoi-status-dot.syncing {
    background: #ffb900;
    animation: pulse 1.5s infinite;
}

.tnpoi-status-dot.error {
    background: #dc3232;
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}

.tnpoi-sync-progress {
    margin-bottom: 20px;
}

.tnpoi-progress-bar {
    width: 100%;
    height: 20px;
    background: #f0f0f0;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 10px;
}

.tnpoi-progress-fill {
    height: 100%;
    background: #2271b1;
    width: 0%;
    transition: width 0.3s ease;
}

.tnpoi-progress-text {
    text-align: center;
    font-weight: 500;
    color: #666;
}

.tnpoi-sync-actions {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}

.tnpoi-sync-info {
    background: #f9f9f9;
    border-radius: 6px;
    padding: 15px;
}

.tnpoi-sync-info h4 {
    margin-top: 0;
    margin-bottom: 10px;
    color: #1d2327;
}

.tnpoi-sync-info ul {
    margin: 0;
    padding-left: 20px;
}

.tnpoi-sync-info li {
    margin-bottom: 5px;
}

.tnpoi-stats-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.tnpoi-stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
}

.tnpoi-stat-item:last-child {
    border-bottom: none;
}

.tnpoi-stat-label {
    font-weight: 500;
    color: #666;
}

.tnpoi-stat-value {
    font-weight: 600;
    color: #2271b1;
}

.tnpoi-help-content h4 {
    margin-top: 0;
    margin-bottom: 10px;
    color: #1d2327;
}

.tnpoi-help-content ol,
.tnpoi-help-content ul {
    margin: 0;
    padding-left: 20px;
}

.tnpoi-help-content li {
    margin-bottom: 5px;
    color: #666;
}

/* Modal Styles (reused from POI manager) */
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

.tnpoi-form-row {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
}

.tnpoi-form-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.tnpoi-form-group label {
    font-weight: 500;
    color: #1d2327;
}

.tnpoi-form-group .description {
    font-size: 0.9em;
    color: #666;
    margin: 0;
}

@media (max-width: 768px) {
    .tnpoi-sync-content {
        grid-template-columns: 1fr;
    }
    
    .tnpoi-term-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }
    
    .tnpoi-term-details {
        flex-direction: column;
        gap: 5px;
    }
    
    .tnpoi-sync-actions {
        flex-direction: column;
    }
    
    .tnpoi-form-row {
        flex-direction: column;
    }
}
</style>

<script>
jQuery(document).ready(function($) {
    let searchTerms = <?php echo json_encode($search_terms); ?>;
    let syncInterval = null;
    
    // Load initial stats
    loadStats();
    
    // Trail Selection Functionality
    $('#select-all-trails').on('click', function() {
        $('input[name="selected_trails[]"]').prop('checked', true);
    });
    
    $('#deselect-all-trails').on('click', function() {
        $('input[name="selected_trails[]"]').prop('checked', false);
    });
    
    $('#save-trail-selection').on('click', function() {
        const selectedTrails = [];
        $('input[name="selected_trails[]"]:checked').each(function() {
            selectedTrails.push($(this).val());
        });
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'tnpoi_save_trail_selection',
                nonce: tnpoi_ajax.nonce,
                selected_trails: selectedTrails
            },
            success: function(response) {
                if (response.success) {
                    alert('Trail selection saved successfully!');
                    updateTrailSelectionInfo();
                } else {
                    alert('Error saving trail selection: ' + response.data);
                }
            }
        });
    });
    
    function updateTrailSelectionInfo() {
        const selectedCount = $('input[name="selected_trails[]"]:checked').length;
        const totalCount = $('input[name="selected_trails[]"]').length;
        $('.tnpoi-sync-info ul li:nth-child(2)').html(`<strong>Selected Trails:</strong> ${selectedCount} of ${totalCount} available`);
    }
    
    // Search term management
    $('#add-search-term').on('click', function() {
        showSearchTermModal();
    });
    
    $(document).on('click', '.edit-term', function() {
        const index = $(this).closest('.tnpoi-search-term').data('index');
        showSearchTermModal(index);
    });
    
    $(document).on('click', '.delete-term', function() {
        const index = $(this).closest('.tnpoi-search-term').data('index');
        if (confirm('Are you sure you want to delete this search term?')) {
            deleteSearchTerm(index);
        }
    });
    
    // Sync controls
    $('#start-sync').on('click', function() {
        startSync();
    });
    
    $('#stop-sync').on('click', function() {
        stopSync();
    });
    
    $('#test-sync').on('click', function() {
        testSync();
    });
    
    // Modal functionality
    $('.tnpoi-modal-close').on('click', function() {
        $('#search-term-modal').hide();
    });
    
    $('#save-search-term').on('click', function() {
        saveSearchTerm();
    });
    
    function showSearchTermModal(index = null) {
        if (index !== null) {
            const term = searchTerms[index];
            $('#modal-title').text('Edit Search Term');
            $('#term-index').val(index);
            $('#term-name').val(term.name);
            $('#term-location').val(term.location);
            $('#term-radius').val(term.radius);
            $('#term-min-distance').val(term.min_distance || 100);
            $('#term-types').val(term.types.split(','));
        } else {
            $('#modal-title').text('Add Search Term');
            $('#term-index').val('');
            $('#search-term-form')[0].reset();
            $('#term-radius').val(1000);
            $('#term-min-distance').val(100);
        }
        $('#search-term-modal').show();
    }
    
    function saveSearchTerm() {
        const index = $('#term-index').val();
        const term = {
            name: $('#term-name').val(),
            location: $('#term-location').val(),
            radius: parseInt($('#term-radius').val()),
            min_distance: parseInt($('#term-min-distance').val()),
            types: $('#term-types').val().join(',')
        };
        
        if (index !== '') {
            searchTerms[index] = term;
        } else {
            searchTerms.push(term);
        }
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'tnpoi_save_search_terms',
                nonce: tnpoi_ajax.nonce,
                search_terms: searchTerms
            },
            success: function(response) {
                if (response.success) {
                    $('#search-term-modal').hide();
                    renderSearchTerms();
                    loadStats();
                } else {
                    alert('Error saving search term: ' + response.data);
                }
            }
        });
    }
    
    function deleteSearchTerm(index) {
        searchTerms.splice(index, 1);
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'tnpoi_save_search_terms',
                nonce: tnpoi_ajax.nonce,
                search_terms: searchTerms
            },
            success: function(response) {
                if (response.success) {
                    renderSearchTerms();
                    loadStats();
                } else {
                    alert('Error deleting search term: ' + response.data);
                }
            }
        });
    }
    
    function renderSearchTerms() {
        const container = $('#search-terms-list');
        container.empty();
        
        if (searchTerms.length === 0) {
            container.html('<p class="tnpoi-no-terms">No search terms configured. Add additional search terms below if needed.</p>');
            return;
        }
        
        searchTerms.forEach(function(term, index) {
            const termHtml = `
                <div class="tnpoi-search-term" data-index="${index}">
                    <div class="tnpoi-term-header">
                        <h4>${term.name}</h4>
                        <div class="tnpoi-term-actions">
                            <button type="button" class="button button-small edit-term">Edit</button>
                            <button type="button" class="button button-small button-link-delete delete-term">Delete</button>
                        </div>
                    </div>
                    <div class="tnpoi-term-details">
                        <span class="tnpoi-term-location">📍 ${term.location}</span>
                        <span class="tnpoi-term-radius">🔍 ${term.radius}m radius</span>
                        <span class="tnpoi-term-types">🏷️ ${term.types}</span>
                        <span class="tnpoi-term-distance">📏 Min distance: ${term.min_distance || 100}m</span>
                    </div>
                </div>
            `;
            container.append(termHtml);
        });
    }
    
    function startSync() {
        if (searchTerms.length === 0) {
            alert('Please add at least one search term before starting sync.');
            return;
        }
        
        $('#start-sync').hide();
        $('#stop-sync').show();
        $('#sync-progress').show();
        updateSyncStatus('syncing', 'Syncing POIs...');
        
        $.ajax({
            url: tnpoi_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'tnpoi_sync_pois',
                nonce: tnpoi_ajax.sync_nonce,
                action_type: 'start'
            },
            success: function(response) {
                if (response.success) {
                    startProgressPolling();
                } else {
                    alert('Error starting sync: ' + response.data);
                    stopSync();
                }
            }
        });
    }
    
    function stopSync() {
        $('#start-sync').show();
        $('#stop-sync').hide();
        $('#sync-progress').hide();
        updateSyncStatus('ready', 'Ready to sync');
        
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
        
        $.ajax({
            url: tnpoi_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'tnpoi_sync_pois',
                nonce: tnpoi_ajax.sync_nonce,
                action_type: 'stop'
            }
        });
    }
    
    function testSync() {
        if (searchTerms.length === 0) {
            alert('Please add at least one search term before testing sync.');
            return;
        }
        
        alert('Test sync would process the first search term only. This feature is coming soon.');
    }
    
    function startProgressPolling() {
        syncInterval = setInterval(function() {
            $.ajax({
                url: tnpoi_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'tnpoi_get_sync_progress',
                    nonce: tnpoi_ajax.sync_nonce
                },
                success: function(response) {
                    if (response.success) {
                        updateProgress(response.data);
                        
                        if (response.data.status === 'completed' || response.data.status === 'stopped') {
                            stopSync();
                            loadStats();
                            updateLastSyncTime();
                        }
                    }
                }
            });
        }, 2000);
    }
    
    function updateProgress(progress) {
        if (progress.total > 0) {
            const percentage = Math.round((progress.current / progress.total) * 100);
            $('#progress-fill').css('width', percentage + '%');
            $('#progress-text').text(percentage + '% - ' + progress.message);
        }
        
        updateSyncStatus(progress.status, progress.message);
    }
    
    function updateSyncStatus(status, message) {
        const dot = $('#sync-status-dot');
        const text = $('#sync-status-text');
        
        dot.removeClass('syncing error').addClass(status);
        text.text(message);
    }
    
    function loadStats() {
        $.ajax({
            url: tnpoi_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'tnpoi_get_stats',
                nonce: tnpoi_ajax.nonce
            },
            success: function(response) {
                if (response.success) {
                    const stats = response.data;
                    $('#total-pois-count').text(stats.total_pois);
                    $('#recent-pois-count').text(stats.recent_pois);
                    $('#search-terms-count').text(stats.search_terms);
                }
            }
        });
    }
    
    function updateLastSyncTime() {
        $('#last-sync-time').text(new Date().toLocaleString());
    }
});
</script> 