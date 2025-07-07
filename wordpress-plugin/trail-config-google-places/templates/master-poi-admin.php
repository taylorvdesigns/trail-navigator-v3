<?php
/**
 * Master POI Management Admin Page Template
 */
if (!defined('ABSPATH')) {
    exit;
}

$admin = new TCGP_Admin();
$available_trails = $admin->get_available_trails();
$master_stats = $admin->get_master_poi_stats();
$gd_categories = $admin->get_geodirectory_categories();
$gd_tags = $admin->get_geodirectory_tags();

// Handle saving Max POIs per Sync before any output
if (!empty($_POST['tcgp_max_pois_submitted']) && current_user_can('manage_options')) {
    $max_pois = isset($_POST['tcgp_max_pois']) ? intval($_POST['tcgp_max_pois']) : 100;
    update_option('tcgp_max_pois', $max_pois);
    // Redirect to avoid resubmission
    wp_redirect(add_query_arg('max_pois_saved', '1', $_SERVER['REQUEST_URI']));
    exit;
}

// Check if trails are configured
if (empty($available_trails)) {
    ?>
    <div class="wrap">
        <h1>Master POI Management</h1>
        
        <div class="notice notice-warning">
            <p><strong>No trails configured!</strong></p>
            <p>You need to configure your trails in the <strong>Trail Navigator Configuration</strong> plugin first.</p>
            <p><a href="<?php echo admin_url('admin.php?page=trail-navigator-config'); ?>" class="button button-primary">Configure Trails</a></p>
        </div>
    </div>
    <?php
    return;
}
?>

<?php if (isset($_GET['max_pois_saved'])): ?>
    <div class="updated notice"><p>Max POIs per sync updated.</p></div>
<?php endif; ?>

<div class="wrap">
    <h1>Master POI Management</h1>
    
    <!-- Statistics Overview -->
    <div class="tcgp-stats-overview">
        <h2>POI Statistics</h2>
        <div class="tcgp-stats-grid">
            <div class="tcgp-stat-card">
                <div class="stat-number"><?php echo $master_stats['total']; ?></div>
                <div class="stat-label">Total POIs</div>
            </div>
            <div class="tcgp-stat-card">
                <div class="stat-number"><?php echo $master_stats['new']; ?></div>
                <div class="stat-label">New</div>
            </div>
            <div class="tcgp-stat-card">
                <div class="stat-number"><?php echo $master_stats['active']; ?></div>
                <div class="stat-label">Active</div>
            </div>
            <div class="tcgp-stat-card">
                <div class="stat-number"><?php echo $master_stats['deleted']; ?></div>
                <div class="stat-label">Deleted</div>
            </div>
            <div class="tcgp-stat-card">
                <div class="stat-number"><?php echo $master_stats['export_selected']; ?></div>
                <div class="stat-label">Export Selected</div>
            </div>
            <div class="tcgp-stat-card">
                <div class="stat-number"><?php echo $master_stats['with_categories']; ?></div>
                <div class="stat-label">With Categories</div>
            </div>
        </div>
    </div>
    
    <!-- API Settings Section -->
    <div class="tcgp-section">
        <h2>API Settings</h2>
        <form method="post" action="options.php">
            <?php settings_fields('tcgp_options'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="tcgp_google_places_api_key">Google Places API Key</label>
                    </th>
                    <td>
                        <input type="password" id="tcgp_google_places_api_key" name="tcgp_google_places_api_key" 
                               value="<?php echo esc_attr(get_option('tcgp_google_places_api_key', '')); ?>" 
                               class="regular-text" />
                        <button type="button" id="test_api_key" class="button button-secondary" style="margin-left: 10px;">Test API Key</button>
                        <span id="test_api_spinner" style="display: none; margin-left: 10px;"><span class="spinner is-active"></span></span>
                        <p class="description">Enter your Google Places API key. You can get one from the <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a>.</p>
                        <div id="test_api_result" style="margin-top: 10px;"></div>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="tcgp_ridewithgps_api_key">RideWithGPS API Key</label>
                    </th>
                    <td>
                        <input type="password" id="tcgp_ridewithgps_api_key" name="tcgp_ridewithgps_api_key" 
                               value="<?php echo esc_attr(get_option('tcgp_ridewithgps_api_key', '')); ?>" 
                               class="regular-text" />
                        <p class="description">Enter your RideWithGPS API key. You can get one from your RideWithGPS account settings.</p>
                    </td>
                </tr>
            </table>
            <?php submit_button('Save API Settings'); ?>
        </form>
    </div>
    
    <!-- Relevant Types Section -->
    <div class="tcgp-section">
        <h2>Relevant POI Types</h2>
        <p>Select which Google Place types are relevant for your trail system. Only POIs with these types will be considered relevant.</p>
        
        <?php
        // Get all available place types from existing POIs
        $all_types = $admin->get_all_place_types();
        $relevant_types = $admin->get_relevant_types();
        
        // Handle form submission for relevant types
        if (!empty($_POST['tcgp_relevant_types_submitted']) && current_user_can('manage_options')) {
            check_admin_referer('tcgp_options-options');
            $types = isset($_POST['tcgp_relevant_types']) ? array_map('sanitize_text_field', $_POST['tcgp_relevant_types']) : array();
            $admin->update_relevant_types($types);
            echo '<div class="updated notice"><p>Relevant types updated.</p></div>';
            $relevant_types = $types; // Refresh the list
        }
        ?>
        
        <form method="post" action="">
            <?php wp_nonce_field('tcgp_options-options'); ?>
            <input type="hidden" name="tcgp_relevant_types_submitted" value="1">
            
            <div style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 15px; background: #f9f9f9;">
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                    <?php foreach ($all_types as $type): ?>
                        <label style="display: flex; align-items: center; gap: 5px; padding: 5px; background: white; border-radius: 4px;">
                            <input type="checkbox" name="tcgp_relevant_types[]" value="<?php echo esc_attr($type); ?>" 
                                   <?php echo in_array($type, $relevant_types) ? 'checked' : ''; ?>>
                            <span><?php echo esc_html($type); ?></span>
                        </label>
                    <?php endforeach; ?>
                </div>
            </div>
            
            <p style="margin-top: 10px;">
                <strong>Selected:</strong> <?php echo count($relevant_types); ?> types | 
                <strong>Total Available:</strong> <?php echo count($all_types); ?> types
            </p>
            
            <?php submit_button('Save Relevant Types'); ?>
        </form>
    </div>
    
    <!-- Actions Section -->
    <div class="tcgp-section">
        <h2>Actions</h2>
        <div class="tcgp-actions">
            <button type="button" id="sync-all-trails" class="button button-primary">Sync All Trails</button>
            <button type="button" id="force-reset-radius" class="button button-secondary">Force Reset Radius to 50</button>
            <div style="display: flex; align-items: center; gap: 5px;">
                <input type="number" id="force-radius-input" placeholder="Radius" min="1" max="10000" style="width: 80px;">
                <button type="button" id="force-set-radius" class="button button-secondary">Force Set Radius</button>
            </div>
            <button type="button" id="export-selected-csv" class="button">Export Selected as GeoDirectory CSV</button>
            <button type="button" id="refresh-pois" class="button">Refresh POI List</button>
            <button type="button" id="delete-all-pois" class="button button-secondary">Delete All POIs</button>
        </div>
        <form method="post" action="">
            <label for="tcgp_max_pois"><strong>Max POIs per Sync:</strong></label>
            <input type="number" id="tcgp_max_pois" name="tcgp_max_pois" min="1" max="1000" value="<?php echo esc_attr(get_option('tcgp_max_pois', 100)); ?>" style="width: 80px;">
            <button type="submit" class="button">Save Limit</button>
            <span class="description">Limit the number of POIs fetched per sync to control API usage/costs.</span>
            <input type="hidden" name="tcgp_max_pois_submitted" value="1">
        </form>
    </div>
    
    <!-- Filters Section -->
    <div class="tcgp-section">
        <h2>Filters</h2>
        <div class="tcgp-filters">
            <div class="filter-group">
                <label><strong>Status:</strong></label>
                <label><input type="checkbox" class="filter-status" data-status="new" checked> New</label>
                <label><input type="checkbox" class="filter-status" data-status="active" checked> Active</label>
                <label><input type="checkbox" class="filter-status" data-status="deleted" checked> Deleted</label>
            </div>
            
            <div class="filter-group">
                <label><strong>Trail:</strong></label>
                <select id="trail-filter">
                    <option value="">All Trails</option>
                    <?php foreach ($available_trails as $trail): ?>
                        <option value="<?php echo esc_attr($trail['routeId']); ?>"><?php echo esc_html($trail['name']); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            
            <div class="filter-group">
                <label><strong>Export Selection:</strong></label>
                <label><input type="checkbox" class="filter-export" data-export="1"> Selected for Export</label>
                <label><input type="checkbox" class="filter-export" data-export="0" checked> Not Selected</label>
            </div>
            
            <div class="filter-group">
                <label><strong>Search:</strong></label>
                <input type="text" id="poi-search" placeholder="Search POI names...">
            </div>
            
            <div class="filter-group">
                <label><input type="checkbox" id="hide-irrelevant" checked> Hide Irrelevant</label>
            </div>
        </div>
    </div>
    
    <!-- POI List Section -->
    <div class="tcgp-section">
        <h2>POIs</h2>
        <div class="tcgp-poi-controls">
            <button type="button" id="select-all-pois" class="button">Select All</button>
            <button type="button" id="deselect-all-pois" class="button">Deselect All</button>
            <button type="button" id="toggle-export-selection" class="button">Toggle Export Selection</button>
            <button type="button" id="bulk-edit-pois" class="button button-primary" disabled>Bulk Edit</button>
        </div>
        
        <div id="poi-list-container">
            <p>Loading POIs...</p>
        </div>
        
        <div id="poi-pagination">
            <!-- Pagination controls will be added here -->
        </div>
    </div>

    <!-- Bulk Edit Modal -->
    <div id="bulk-edit-modal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); z-index:9999; align-items:center; justify-content:center;">
        <div style="background:#fff; padding:30px; border-radius:8px; max-width:500px; margin:60px auto; position:relative;">
            <h2>Bulk Edit POIs</h2>
            <form id="bulk-edit-form">
                <label><strong>Categories:</strong></label><br />
                <select id="bulk-categories" name="categories[]" multiple style="width:100%; max-width:100%; min-height:80px;">
                    <?php foreach ($gd_categories as $slug => $name): ?>
                        <option value="<?php echo esc_attr($slug); ?>"><?php echo esc_html($name); ?></option>
                    <?php endforeach; ?>
                </select>
                <br /><br />
                <label><strong>Tags:</strong></label><br />
                <select id="bulk-tags" name="tags[]" multiple style="width:100%; max-width:100%; min-height:80px;">
                    <?php foreach ($gd_tags as $slug => $name): ?>
                        <option value="<?php echo esc_attr($slug); ?>"><?php echo esc_html($name); ?></option>
                    <?php endforeach; ?>
                </select>
                <br /><br />
                <button type="submit" class="button button-primary">Apply to Selected</button>
                <button type="button" id="close-bulk-edit" class="button">Cancel</button>
            </form>
        </div>
    </div>
</div>

<style>
.tcgp-stats-overview {
    margin: 20px 0;
}

.tcgp-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
    margin: 15px 0;
}

.tcgp-stat-card {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tcgp-stat-card .stat-number {
    font-size: 2em;
    font-weight: bold;
    color: #007cba;
    margin-bottom: 5px;
}

.tcgp-stat-card .stat-label {
    color: #666;
    font-size: 0.9em;
}

.tcgp-section {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tcgp-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.tcgp-filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    align-items: end;
}

.filter-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.filter-group label {
    margin: 0;
    cursor: pointer;
}

.filter-group input[type="checkbox"] {
    margin-right: 5px;
}

.tcgp-poi-controls {
    margin-bottom: 15px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.poi-card {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    margin: 10px 0;
    background: #fff;
    position: relative;
}

.poi-card.new {
    border-left: 4px solid #28a745;
    background: #f8fff9;
}

.poi-card.active {
    border-left: 4px solid #007cba;
    background: #f8fbff;
}

.poi-card.deleted {
    border-left: 4px solid #dc3545;
    background: #fff8f8;
    opacity: 0.7;
}

.poi-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
}

.poi-card-title {
    font-weight: bold;
    font-size: 1.1em;
    margin: 0;
}

.poi-card-status {
    font-size: 0.8em;
    font-weight: bold;
    padding: 2px 8px;
    border-radius: 12px;
    text-transform: uppercase;
}

.poi-card.new .poi-card-status {
    background: #28a745;
    color: white;
}

.poi-card.active .poi-card-status {
    background: #007cba;
    color: white;
}

.poi-card.deleted .poi-card-status {
    background: #dc3545;
    color: white;
}

.poi-card-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 15px;
}

.poi-card-details {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.poi-card-details small {
    color: #666;
}

.poi-card-categories {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}

.poi-category-tag {
    background: #e9ecef;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8em;
}

.poi-card-actions {
    display: flex;
    gap: 10px;
    align-items: center;
}

.poi-card-actions input[type="checkbox"] {
    margin: 0;
}

.poi-card-actions label {
    margin: 0;
    cursor: pointer;
    font-size: 0.9em;
}

.poi-trail-badge {
    background: #6c757d;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8em;
}

@media (max-width: 768px) {
    .tcgp-filters {
        grid-template-columns: 1fr;
    }
    
    .poi-card-content {
        grid-template-columns: 1fr;
    }
}
</style>

<script>
jQuery(document).ready(function($) {
    console.log('[TCGP Master] JavaScript loaded');
    
    const nonce = '<?php echo wp_create_nonce('tcgp_nonce'); ?>';
    let currentPage = 1;
    let currentFilters = {
        status: ['new', 'active', 'deleted'],
        trail: '',
        export: [0, 1],
        search: '',
        hide_irrelevant: 0
    };
    
    // Load POIs on page load
    loadPOIs();
    
    // Sync all trails
    $('#sync-all-trails').click(function() {
        const button = $(this);
        const originalText = button.text();
        
        button.prop('disabled', true).text('Syncing...');
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'tcgp_search_all_trails',
                radius: <?php echo get_option('tcgp_search_radius', 50); ?>,
                nonce: nonce
            },
            success: function(response) {
                if (response.success) {
                    alert('Sync completed! Found ' + response.data.places.length + ' POIs.');
                    loadPOIs(); // Refresh the list
                } else {
                    alert('Sync failed: ' + response.data);
                }
            },
            error: function() {
                alert('An error occurred during sync.');
            },
            complete: function() {
                button.prop('disabled', false).text(originalText);
            }
        });
    });
    
    // Force reset radius
    $('#force-reset-radius').click(function() {
        if (confirm('This will force reset the search radius to 50 meters. Continue?')) {
            const button = $(this);
            const originalText = button.text();
            
            button.prop('disabled', true).text('Resetting...');
            
            $.ajax({
                url: ajaxurl,
                type: 'POST',
                data: {
                    action: 'tcgp_force_reset_radius',
                    nonce: nonce
                },
                success: function(response) {
                    if (response.success) {
                        alert('Radius force reset to 50 meters. Please refresh the page.');
                        location.reload();
                    } else {
                        alert('Failed to reset radius: ' + response.data);
                    }
                },
                error: function() {
                    alert('An error occurred while resetting radius.');
                },
                complete: function() {
                    button.prop('disabled', false).text(originalText);
                }
            });
        }
    });
    
    // Force set radius
    $('#force-set-radius').click(function() {
        const newRadius = $('#force-radius-input').val();
        
        if (!newRadius || newRadius < 1 || newRadius > 10000) {
            alert('Please enter a valid radius between 1 and 10000 meters.');
            return;
        }
        
        if (confirm('This will force set the search radius to ' + newRadius + ' meters. Continue?')) {
            const button = $(this);
            const originalText = button.text();
            
            button.prop('disabled', true).text('Setting...');
            
            $.ajax({
                url: ajaxurl,
                type: 'POST',
                data: {
                    action: 'tcgp_force_set_radius',
                    new_radius: newRadius,
                    nonce: nonce
                },
                success: function(response) {
                    if (response.success) {
                        alert('Radius force set to ' + newRadius + ' meters. Please refresh the page.');
                        location.reload();
                    } else {
                        alert('Failed to set radius: ' + response.data);
                    }
                },
                error: function() {
                    alert('An error occurred while setting radius.');
                },
                complete: function() {
                    button.prop('disabled', false).text(originalText);
                }
            });
        }
    });
    
    // Export selected as CSV
    $('#export-selected-csv').click(function() {
        const selectedPOIs = $('input[name="export_selected"]:checked').map(function() {
            return $(this).val();
        }).get();
        
        if (selectedPOIs.length === 0) {
            alert('Please select POIs for export first.');
            return;
        }
        
        // Create a form to submit the export request
        const form = $('<form>', {
            method: 'POST',
            action: ajaxurl,
            target: '_blank'
        });
        
        form.append($('<input>', {
            type: 'hidden',
            name: 'action',
            value: 'tcgp_export_master_csv'
        }));
        
        form.append($('<input>', {
            type: 'hidden',
            name: 'poi_ids',
            value: JSON.stringify(selectedPOIs)
        }));
        
        form.append($('<input>', {
            type: 'hidden',
            name: 'nonce',
            value: nonce
        }));
        
        $('body').append(form);
        form.submit();
        form.remove();
    });
    
    // Refresh POI list
    $('#refresh-pois').click(function() {
        loadPOIs();
    });
    
    // Filter handlers
    $('.filter-status').change(function() {
        updateFilters();
    });
    
    $('#trail-filter').change(function() {
        updateFilters();
    });
    
    $('.filter-export').change(function() {
        updateFilters();
    });
    
    $('#poi-search').on('input', function() {
        updateFilters();
    });
    
    // Hide Irrelevant toggle
    $('#hide-irrelevant').change(function() {
        updateFilters();
    });
    
    // Select all/deselect all
    $('#select-all-pois').click(function() {
        $('input[name="export_selected"]').prop('checked', true);
    });
    
    $('#deselect-all-pois').click(function() {
        $('input[name="export_selected"]').prop('checked', false);
    });
    
    // Toggle export selection
    $('#toggle-export-selection').click(function() {
        $('input[name="export_selected"]').each(function() {
            $(this).prop('checked', !$(this).prop('checked'));
        });
    });
    
    // Delete All POIs
    $('#delete-all-pois').click(function() {
        if (!confirm('Are you sure you want to delete ALL POIs from the master table? This cannot be undone.')) return;
        const button = $(this);
        const originalText = button.text();
        button.prop('disabled', true).text('Deleting...');
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'tcgp_delete_all_master_pois',
                nonce: nonce
            },
            success: function(response) {
                if (response.success) {
                    alert('All POIs deleted.');
                    loadPOIs();
                } else {
                    alert('Failed to delete POIs: ' + response.data);
                }
            },
            error: function() {
                alert('An error occurred while deleting POIs.');
            },
            complete: function() {
                button.prop('disabled', false).text(originalText);
            }
        });
    });
    
    function updateFilters() {
        currentFilters.status = $('.filter-status:checked').map(function() {
            return $(this).data('status');
        }).get();
        
        currentFilters.trail = $('#trail-filter').val();
        
        currentFilters.export = $('.filter-export:checked').map(function() {
            return parseInt($(this).data('export'));
        }).get();
        
        currentFilters.search = $('#poi-search').val();
        currentFilters.hide_irrelevant = $('#hide-irrelevant').is(':checked') ? 1 : 0;
        
        currentPage = 1;
        loadPOIs();
    }
    
    function loadPOIs() {
        const container = $('#poi-list-container');
        container.html('<p>Loading POIs...</p>');
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'tcgp_get_master_pois',
                filters: currentFilters,
                page: currentPage,
                nonce: nonce
            },
            success: function(response) {
                if (response.success) {
                    displayPOIs(response.data);
                } else {
                    container.html('<p>Error loading POIs: ' + response.data + '</p>');
                }
            },
            error: function() {
                container.html('<p>An error occurred while loading POIs.</p>');
            }
        });
    }
    
    function displayPOIs(data) {
        const container = $('#poi-list-container');
        const { pois, total, page, per_page } = data;
        
        if (pois.length === 0) {
            container.html('<p>No POIs found matching the current filters.</p>');
            return;
        }
        
        let html = '';
        
        pois.forEach(function(poi) {
            const statusClass = poi.status || 'new';
            const statusText = poi.status || 'New';
            const types = poi.types ? JSON.parse(poi.types) : [];
            
            html += '<div class="poi-card ' + statusClass + '">';
            html += '<div class="poi-card-header">';
            html += '<h3 class="poi-card-title">' + poi.name + '</h3>';
            html += '<span class="poi-card-status">' + statusText.toUpperCase() + '</span>';
            html += '</div>';
            
            html += '<div class="poi-card-content">';
            html += '<div class="poi-card-details">';
            html += '<small><strong>Location:</strong> ' + (poi.short_description || 'N/A') + '</small>';
            html += '<small><strong>Coordinates:</strong> ' + poi.latitude + ', ' + poi.longitude + '</small>';
            html += '<small><strong>Trail:</strong> <span class="poi-trail-badge">' + (poi.trail_name || 'Unknown') + '</span></small>';
            html += '<small><strong>First Seen:</strong> ' + (poi.date_first_seen || 'N/A') + '</small>';
            html += '<small><strong>Last Seen:</strong> ' + (poi.date_last_seen || 'N/A') + '</small>';
            html += '<small><strong>Street:</strong> ' + (poi.street || '') + '</small>';
            html += '<small><strong>Street 2:</strong> ' + (poi.street2 || '') + '</small>';
            html += '<small><strong>City:</strong> ' + (poi.city || '') + '</small>';
            html += '<small><strong>Region:</strong> ' + (poi.region || '') + '</small>';
            html += '<small><strong>Country:</strong> ' + (poi.country || '') + '</small>';
            html += '<small><strong>Zip:</strong> ' + (poi.zip || '') + '</small>';
            html += '<small><strong>Formatted Address:</strong> ' + (poi.formatted_address || '') + '</small>';
            html += '</div>';
            
            html += '<div class="poi-card-details">';
            html += '<small><strong>Categories:</strong></small>';
            html += '<div class="poi-card-categories">';
            if (poi.categories) {
                const categories = poi.categories.split(',').filter(c => c.trim());
                categories.forEach(function(cat) {
                    html += '<span class="poi-category-tag">' + cat.trim() + '</span>';
                });
            } else {
                html += '<small>None assigned</small>';
            }
            html += '</div>';
            
            html += '<small><strong>Tags:</strong></small>';
            html += '<div class="poi-card-categories">';
            if (poi.tags) {
                const tags = poi.tags.split(',').filter(t => t.trim());
                tags.forEach(function(tag) {
                    html += '<span class="poi-category-tag">' + tag.trim() + '</span>';
                });
            } else {
                html += '<small>None assigned</small>';
            }
            html += '</div>';
            
            html += '<small><strong>Google Types:</strong></small>';
            html += '<div class="poi-card-categories">';
            types.slice(0, 3).forEach(function(type) {
                html += '<span class="poi-category-tag">' + type.replace(/_/g, ' ') + '</span>';
            });
            if (types.length > 3) {
                html += '<span class="poi-category-tag">+' + (types.length - 3) + ' more</span>';
            }
            html += '</div>';
            html += '</div>';
            html += '</div>';
            
            html += '<div class="poi-card-actions">';
            html += '<label><input type="checkbox" name="export_selected" value="' + poi.place_id + '" ' + (poi.export_selected ? 'checked' : '') + '> Export Selected</label>';
            html += '<button type="button" class="button button-small edit-poi" data-poi-id="' + poi.place_id + '">Edit</button>';
            html += '</div>';
            html += '</div>';
        });
        
        container.html(html);
        
        // Add pagination if needed
        const totalPages = Math.ceil(total / per_page);
        if (totalPages > 1) {
            displayPagination(page, totalPages);
        }
        addPOICheckboxes();
        updateBulkEditButton();
    }
    
    function displayPagination(currentPage, totalPages) {
        const container = $('#poi-pagination');
        let html = '<div class="tablenav-pages">';
        html += '<span class="pagination-links">';
        
        if (currentPage > 1) {
            html += '<a class="prev-page" href="#" data-page="' + (currentPage - 1) + '">‹</a>';
        }
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                html += '<span class="current-page">' + i + '</span>';
            } else {
                html += '<a href="#" data-page="' + i + '">' + i + '</a>';
            }
        }
        
        if (currentPage < totalPages) {
            html += '<a class="next-page" href="#" data-page="' + (currentPage + 1) + '">›</a>';
        }
        
        html += '</span>';
        html += '</div>';
        
        container.html(html);
        
        // Handle pagination clicks
        container.find('a').click(function(e) {
            e.preventDefault();
            currentPage = parseInt($(this).data('page'));
            loadPOIs();
        });
    }
    
    // Handle export selection changes
    $(document).on('change', 'input[name="export_selected"]', function() {
        const placeId = $(this).val();
        const isSelected = $(this).prop('checked');
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'tcgp_update_export_selection',
                place_id: placeId,
                export_selected: isSelected ? 1 : 0,
                nonce: nonce
            },
            success: function(response) {
                if (!response.success) {
                    alert('Failed to update export selection: ' + response.data);
                }
            }
        });
    });
    
    // Handle edit POI clicks
    $(document).on('click', '.edit-poi', function() {
        const placeId = $(this).data('poi-id');
        // TODO: Open edit modal for POI
        alert('Edit functionality coming soon for POI: ' + placeId);
    });

    // Enable/disable Bulk Edit button
    $(document).on('change', 'input[name="export_selected"], input[type="checkbox"][name="poi_select"]', function() {
        updateBulkEditButton();
    });
    function updateBulkEditButton() {
        const selected = $('input[name="poi_select"]:checked').length;
        $('#bulk-edit-pois').prop('disabled', selected === 0);
    }
    // Add checkboxes to POI cards for selection
    function addPOICheckboxes() {
        $('.poi-card').each(function() {
            const placeId = $(this).find('input[name="export_selected"]').val();
            if ($(this).find('input[name="poi_select"]').length === 0) {
                $(this).prepend('<input type="checkbox" name="poi_select" value="' + placeId + '" style="position:absolute; left:10px; top:10px; z-index:2;" />');
            }
        });
    }
    // Bulk Edit button click
    $('#bulk-edit-pois').click(function() {
        $('#bulk-edit-modal').fadeIn(200);
    });
    // Close modal
    $('#close-bulk-edit').click(function() {
        $('#bulk-edit-modal').fadeOut(200);
    });
    // Bulk Edit form submit
    $('#bulk-edit-form').submit(function(e) {
        e.preventDefault();
        const selectedPOIs = $('input[name="poi_select"]:checked').map(function() {
            return $(this).val();
        }).get();
        const categories = $('#bulk-categories').val() || [];
        const tags = $('#bulk-tags').val() || [];
        if (selectedPOIs.length === 0) {
            alert('Please select at least one POI.');
            return;
        }
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'tcgp_bulk_edit_pois',
                nonce: nonce,
                poi_ids: JSON.stringify(selectedPOIs),
                categories: JSON.stringify(categories),
                tags: JSON.stringify(tags)
            },
            success: function(response) {
                if (response.success) {
                    alert('Bulk update successful!');
                    $('#bulk-edit-modal').fadeOut(200);
                    loadPOIs();
                } else {
                    alert('Bulk update failed: ' + response.data);
                }
            },
            error: function() {
                alert('An error occurred during bulk update.');
            }
        });
    });
});
</script> 