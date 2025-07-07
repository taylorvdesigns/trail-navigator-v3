<?php
/**
 * POI Manager Template
 * 
 * Manage and edit POIs with filtering and bulk operations
 */

if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="wrap tnpoi-poi-manager">
    <h1 class="wp-heading-inline">POI Manager</h1>
    <a href="<?php echo admin_url('admin.php?page=tnpoi-sync'); ?>" class="page-title-action">Sync New POIs</a>
    
    <div class="tnpoi-export-bar" style="margin-bottom: 20px;">
        <!-- Removed Export All button as per user request -->
    </div>
    
    <div class="tnpoi-filters">
        <div class="tnpoi-filter-row">
            <div class="tnpoi-filter-group">
                <label for="poi-search">Search:</label>
                <input type="text" id="poi-search" placeholder="Search POIs..." class="regular-text">
            </div>
            
            <div class="tnpoi-filter-group">
                <label for="poi-trail-filter">Trail:</label>
                <select id="poi-trail-filter">
                    <option value="">All Trails</option>
                    <?php foreach ($trails as $trail): ?>
                        <option value="<?php echo esc_attr($trail->trail_id); ?>"><?php echo esc_html($trail->trail_name); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            
            <div class="tnpoi-filter-group">
                <label for="poi-type-filter">Type:</label>
                <select id="poi-type-filter">
                    <option value="">All Types</option>
                    <?php foreach ($place_types as $type => $label): ?>
                        <option value="<?php echo esc_attr($type); ?>"><?php echo esc_html($label); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            
            <div class="tnpoi-filter-group">
                <label for="poi-term-filter">Search Term:</label>
                <select id="poi-term-filter">
                    <option value="">All Terms</option>
                    <?php foreach ($search_terms as $term): ?>
                        <option value="<?php echo esc_attr($term); ?>"><?php echo esc_html($term); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            
            <div class="tnpoi-filter-group">
                <label for="poi-status-filter">Status:</label>
                <select id="poi-status-filter">
                    <option value="">All Statuses</option>
                    <option value="new">New</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>
            
            <div class="tnpoi-filter-group">
                <label for="poi-export-filter">Export:</label>
                <select id="poi-export-filter">
                    <option value="">All POIs</option>
                    <option value="0">Include in Export</option>
                    <option value="1">Ignored</option>
                </select>
            </div>
            
            <div class="tnpoi-filter-group">
                <label for="poi-sort-by">Sort By:</label>
                <select id="poi-sort-by">
                    <option value="created_at">Date Created</option>
                    <option value="name">Name</option>
                    <option value="rating">Rating</option>
                    <option value="trail_position">Trail Position</option>
                    <option value="distance_along_trail">Distance from Start</option>
                    <option value="trail_name">Trail Name</option>
                    <option value="status">Status</option>
                </select>
            </div>
            
            <div class="tnpoi-filter-group">
                <label for="poi-sort-order">Order:</label>
                <select id="poi-sort-order">
                    <option value="DESC">Descending</option>
                    <option value="ASC">Ascending</option>
                </select>
            </div>
            
            <div class="tnpoi-filter-group">
                <label for="poi-per-page">Per Page:</label>
                <select id="poi-per-page">
                    <option value="10">10</option>
                    <option value="20" selected>20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                </select>
            </div>
            
            <div class="tnpoi-filter-actions">
                <button type="button" id="apply-filters" class="button">Apply Filters</button>
                <button type="button" id="clear-filters" class="button button-secondary">Clear</button>
                <button type="button" id="calculate-positions" class="button button-secondary">Calculate Trail Positions</button>
            </div>
        </div>
    </div>
    
    <div class="tnpoi-bulk-actions">
        <div class="tnpoi-bulk-controls">
            <button type="button" id="bulk-export" class="button button-primary">
                Export Selected for GeoDirectory
            </button>
        </div>
    </div>
    
    <div class="tnpoi-poi-table-container">
        <table class="wp-list-table widefat fixed striped tnpoi-poi-table">
            <thead>
                <tr>
                    <th class="manage-column column-status">Status</th>
                    <th class="manage-column column-export">Export? <input type="checkbox" id="export-all-pois"></th>
                    <th class="manage-column column-name">Name</th>
                    <th class="manage-column column-trail">Trail</th>
                    <th class="manage-column column-address">Address</th>
                    <th class="manage-column column-position">Position</th>
                    <th class="manage-column column-google-types">Google Types</th>
                    <th class="manage-column column-geodir-categories">GeoDirectory Categories</th>
                    <th class="manage-column column-created">Created</th>
                    <th class="manage-column column-actions">Actions</th>
                </tr>
            </thead>
            <tbody id="poi-table-body">
<?php
// PHP fallback: render first page of POIs if available
if (isset($pois) && is_array($pois) && count($pois) > 0):
    foreach ($pois as $poi):
        // Format status badge
        $statusClass = $poi->status === 'new' ? 'tnpoi-status-new' : ($poi->status === 'active' ? 'tnpoi-status-active' : ($poi->status === 'inactive' ? 'tnpoi-status-inactive' : 'tnpoi-status-new'));
        $statusDisplay = $poi->status ? ucfirst($poi->status) : 'New';
        $isExported = !$poi->ignored;
        $trailPosition = $poi->trail_position ? ('#' . $poi->trail_position) : '';
        $distanceDisplay = $poi->distance_along_trail ? (round($poi->distance_along_trail) . 'm') : '';
        $positionDisplay = $trailPosition . ($distanceDisplay ? " ({$distanceDisplay})" : '');
        $createdDate = $poi->created_at ? date('n/j/Y', strtotime($poi->created_at)) : '';
        // Google Types as badges
        $types = $poi->types ? explode(',', $poi->types) : [];
        $typeBadges = '';
        foreach ($types as $type) {
            $typeBadges .= '<span class="tnpoi-type-badge">' . esc_html(trim($type)) . '</span>';
        }
        // GeoDirectory Categories as badges
        $categoryIds = [];
        if (!empty($poi->category_ids)) {
            if (trim($poi->category_ids)[0] === '[') {
                $categoryIds = json_decode($poi->category_ids, true);
            } else {
                $categoryIds = array_map('trim', explode(',', $poi->category_ids));
            }
        }
        $categoryNames = [];
        if (!empty($categoryIds) && isset($geodir_categories)) {
            foreach ($categoryIds as $catId) {
                if (isset($geodir_categories[$catId])) {
                    $categoryNames[] = $geodir_categories[$catId];
                }
            }
        }
        $categoryBadges = '';
        if (!empty($categoryNames)) {
            foreach ($categoryNames as $catName) {
                $categoryBadges .= '<span class="tnpoi-category-badge">' . esc_html($catName) . '</span>';
            }
        } else {
            $categoryBadges = '<span class="tnpoi-category-badge tnpoi-category-unmapped">No categories mapped</span>';
        }
        echo '<tr>';
        echo '<td><span class="tnpoi-status-badge ' . esc_attr($statusClass) . '">' . esc_html($statusDisplay) . '</span></td>';
        echo '<td><input type="checkbox" class="tnpoi-export-toggle" data-poi-id="' . esc_attr($poi->id) . '"' . ($isExported ? ' checked' : '') . '></td>';
        echo '<td><div class="tnpoi-poi-name">' . esc_html($poi->name) . '</div><div class="tnpoi-poi-trail-id">' . esc_html($poi->trail_id ?? '') . '</div></td>';
        echo '<td><div class="tnpoi-poi-trail">' . esc_html($poi->trail_name ?? 'Unknown Trail') . '</div></td>';
        echo '<td><span class="tnpoi-poi-address">' . esc_html($poi->address ?? '') . '</span></td>';
        echo '<td><div class="tnpoi-poi-position">' . esc_html($positionDisplay) . '</div></td>';
        echo '<td><div class="tnpoi-google-types">' . $typeBadges . '</div></td>';
        echo '<td><div class="tnpoi-categories-display">' . $categoryBadges . '</div></td>';
        echo '<td>' . esc_html($createdDate) . '</td>';
        echo '<td class="tnpoi-poi-actions">';
        echo '<button type="button" class="button button-small edit-poi" data-poi-id="' . esc_attr($poi->id) . '">Edit</button> ';
        echo '<button type="button" class="button button-small button-link-delete delete-poi" data-poi-id="' . esc_attr($poi->id) . '">Delete</button>';
        echo '</td>';
        echo '</tr>';
    endforeach;
else:
    echo '<tr><td colspan="11" class="tnpoi-loading">Loading POIs...</td></tr>';
endif;
?>
            </tbody>
        </table>
    </div>
    
    <div class="tnpoi-pagination">
        <div class="tnpoi-pagination-info">
            Showing <span id="showing-start">0</span> to <span id="showing-end">0</span> of <span id="total-pois">0</span> POIs
        </div>
        <div class="tnpoi-pagination-controls">
            <button type="button" id="prev-page" class="button" disabled>Previous</button>
            <span class="tnpoi-page-info">Page <span id="current-page">1</span> of <span id="total-pages">1</span></span>
            <button type="button" id="next-page" class="button" disabled>Next</button>
        </div>
    </div>
</div>

<!-- POI Edit Modal -->
<div id="poi-edit-modal" class="tnpoi-modal" style="display: none;">
    <div class="tnpoi-modal-content">
        <div class="tnpoi-modal-header">
            <h2>Edit POI</h2>
            <button type="button" class="tnpoi-modal-close">&times;</button>
        </div>
        <div class="tnpoi-modal-body">
            <form id="poi-edit-form">
                <input type="hidden" id="edit-poi-id">
                
                <div class="tnpoi-form-row">
                    <div class="tnpoi-form-group">
                        <label for="edit-poi-name">Name:</label>
                        <input type="text" id="edit-poi-name" class="regular-text" required>
                    </div>
                </div>
                
                <div class="tnpoi-form-row">
                    <div class="tnpoi-form-group">
                        <label for="edit-poi-address">Address:</label>
                        <textarea id="edit-poi-address" rows="2" class="regular-text"></textarea>
                    </div>
                </div>
                
                <div class="tnpoi-form-row">
                    <div class="tnpoi-form-group">
                        <label for="edit-poi-latitude">Latitude:</label>
                        <input type="number" id="edit-poi-latitude" step="any" class="regular-text" required>
                    </div>
                    <div class="tnpoi-form-group">
                        <label for="edit-poi-longitude">Longitude:</label>
                        <input type="number" id="edit-poi-longitude" step="any" class="regular-text" required>
                    </div>
                </div>
                
                <div class="tnpoi-form-row">
                    <div class="tnpoi-form-group">
                        <label for="edit-poi-rating">Rating:</label>
                        <input type="number" id="edit-poi-rating" min="0" max="5" step="0.1" class="small-text">
                    </div>
                    <div class="tnpoi-form-group">
                        <label for="edit-poi-ratings-total">Total Ratings:</label>
                        <input type="number" id="edit-poi-ratings-total" min="0" class="small-text">
                    </div>
                    <div class="tnpoi-form-group">
                        <label for="edit-poi-price-level">Price Level:</label>
                        <select id="edit-poi-price-level">
                            <option value="0">Free</option>
                            <option value="1">Inexpensive</option>
                            <option value="2">Moderate</option>
                            <option value="3">Expensive</option>
                            <option value="4">Very Expensive</option>
                        </select>
                    </div>
                </div>
            </form>
        </div>
        <div class="tnpoi-modal-footer">
            <button type="button" id="save-poi" class="button button-primary">Save Changes</button>
            <button type="button" class="tnpoi-modal-close button button-secondary">Cancel</button>
        </div>
    </div>
</div>

<!-- Category Edit Modal -->
<div id="tnpoi-category-modal" class="tnpoi-modal" style="display: none;">
    <div class="tnpoi-modal-content">
        <div class="tnpoi-modal-header">
            <h2>Edit Categories</h2>
            <button type="button" class="tnpoi-modal-close">&times;</button>
        </div>
        <div class="tnpoi-modal-body">
            <input type="hidden" id="tnpoi-category-modal-poi-id">
            <div id="tnpoi-category-badge-list" class="tnpoi-category-badge-list"></div>
        </div>
        <div class="tnpoi-modal-footer">
            <button type="button" id="tnpoi-category-save" class="button button-primary">Save</button>
            <button type="button" class="tnpoi-modal-close button button-secondary">Cancel</button>
        </div>
    </div>
</div>

<style>
.tnpoi-poi-manager {
    margin: 20px 0;
}

.tnpoi-filters {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tnpoi-filter-row {
    display: flex;
    gap: 20px;
    align-items: end;
    flex-wrap: wrap;
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

.tnpoi-bulk-actions {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tnpoi-bulk-controls {
    display: flex;
    gap: 15px;
    align-items: center;
}

.tnpoi-poi-table-container {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tnpoi-poi-table {
    margin: 0;
}

.tnpoi-poi-table th, .tnpoi-poi-table td {
    padding: 10px 14px;
    min-width: 90px;
    vertical-align: middle;
}
.tnpoi-poi-table th.column-name, .tnpoi-poi-table td.column-name {
    min-width: 160px;
}
.tnpoi-poi-table th.column-address, .tnpoi-poi-table td.column-address {
    min-width: 140px;
}
.tnpoi-poi-table th.column-google-types, .tnpoi-poi-table td.column-google-types {
    min-width: 120px;
}
.tnpoi-poi-table th.column-geodir-categories, .tnpoi-poi-table td.column-geodir-categories {
    min-width: 200px;
}
.tnpoi-poi-table th.column-actions, .tnpoi-poi-table td.column-actions {
    min-width: 80px;
    text-align: center;
}

.tnpoi-poi-table th {
    font-weight: 600;
    color: #1d2327;
}

.tnpoi-poi-table td {
    vertical-align: middle;
}

.tnpoi-poi-name {
    font-weight: 500;
    color: #2271b1;
}

.tnpoi-poi-place-id {
    color: #666;
    font-size: 0.8em;
    font-family: monospace;
    margin-top: 2px;
}

.tnpoi-poi-address {
    color: #666;
    font-size: 0.9em;
}

.tnpoi-poi-position {
    font-weight: 500;
    color: #2271b1;
    font-size: 0.9em;
}

.tnpoi-trail-circle {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: inline-block;
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    cursor: help;
}

.tnpoi-trail-unknown {
    background-color: #999;
    border: 2px dashed #ccc;
}

.tnpoi-google-types {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.tnpoi-type-badge {
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 0.75em;
    color: #666;
    white-space: nowrap;
}

.tnpoi-categories-container {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.tnpoi-categories-display {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    flex: 1;
}

.tnpoi-category-badge {
    background: #e3f2fd;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 0.75em;
    color: #1976d2;
    white-space: nowrap;
    border: 1px solid #bbdefb;
}

.tnpoi-category-unmapped .tnpoi-category-badge {
    background: #ffebee;
    color: #c62828;
    border-color: #ffcdd2;
}

.tnpoi-category-unmapped .tnpoi-categories-display:empty::after {
    content: "No categories mapped";
    color: #c62828;
    font-style: italic;
    font-size: 0.8em;
}

.tnpoi-edit-categories {
    margin-left: 8px;
    margin-top: 4px;
    white-space: nowrap;
}

.tnpoi-status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8em;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.tnpoi-status-new {
    background: #e3f2fd;
    color: #1976d2;
    border: 1px solid #bbdefb;
}

.tnpoi-status-active {
    background: #e8f5e8;
    color: #2e7d32;
    border: 1px solid #c8e6c9;
}

.tnpoi-status-inactive {
    background: #ffebee;
    color: #c62828;
    border: 1px solid #ffcdd2;
}

.tnpoi-export-toggle {
    width: 16px;
    height: 16px;
    cursor: pointer;
}

.tnpoi-poi-type {
    background: #f0f0f0;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8em;
    color: #666;
}

.tnpoi-poi-rating {
    color: #f39c12;
    font-weight: 500;
}

.tnpoi-poi-actions {
    display: flex;
    gap: 5px;
}

.tnpoi-loading {
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 40px;
}

.tnpoi-pagination {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px 20px;
    margin-top: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tnpoi-pagination-controls {
    display: flex;
    gap: 10px;
    align-items: center;
}

.tnpoi-page-info {
    font-weight: 500;
    color: #666;
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

.tnpoi-category-badge-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 10px 0;
}
.tnpoi-category-badge-selectable {
    background: #e3f2fd;
    color: #1976d2;
    border: 1px solid #bbdefb;
    border-radius: 10px;
    padding: 4px 10px;
    font-size: 0.95em;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
}
.tnpoi-category-badge-selectable.selected {
    background: #1976d2;
    color: #fff;
    border-color: #1976d2;
}

@media (max-width: 768px) {
    .tnpoi-filter-row {
        flex-direction: column;
        align-items: stretch;
    }
    
    .tnpoi-filter-actions {
        justify-content: center;
    }
    
    .tnpoi-bulk-controls {
        flex-direction: column;
        align-items: stretch;
    }
    
    .tnpoi-pagination {
        flex-direction: column;
        gap: 15px;
        text-align: center;
    }
    
    .tnpoi-form-row {
        flex-direction: column;
    }
}

@media (max-width: 900px) {
    .tnpoi-poi-table th.column-geodir-categories, .tnpoi-poi-table td.column-geodir-categories {
        min-width: 140px;
    }
    .tnpoi-edit-categories {
        margin-top: 8px;
        margin-left: 0;
        display: block;
    }
}
</style>

<script>
jQuery(document).ready(function($) {
    let currentPage = 1;
    let totalPages = 1;
    let selectedPois = new Set();
    
    // Load POIs on page load
    loadPois();
    
    // Filter functionality
    $('#apply-filters').on('click', function() {
        currentPage = 1;
        loadPois();
    });
    
    $('#clear-filters').on('click', function() {
        $('#poi-search').val('');
        $('#poi-trail-filter').val('');
        $('#poi-type-filter').val('');
        $('#poi-term-filter').val('');
        $('#poi-status-filter').val('');
        $('#poi-export-filter').val('');
        $('#poi-sort-by').val('created_at');
        $('#poi-sort-order').val('DESC');
        currentPage = 1;
        loadPois();
    });
    
    // Calculate trail positions
    $('#calculate-positions').on('click', function() {
        if (confirm('This will calculate trail positions for all POIs. This may take a moment. Continue?')) {
            calculateTrailPositions();
        }
    });
    
    // Pagination
    $('#prev-page').on('click', function() {
        if (currentPage > 1) {
            currentPage--;
            loadPois();
        }
    });
    
    $('#next-page').on('click', function() {
        if (currentPage < totalPages) {
            currentPage++;
            loadPois();
        }
    });
    
    // Bulk operations
    $('#select-all-pois').on('change', function() {
        const checked = $(this).is(':checked');
        $('.poi-checkbox').prop('checked', checked);
        updateSelectedCount();
    });
    
    $('#bulk-delete').on('click', function() {
        if (selectedPois.size === 0) return;
        
        if (confirm('Are you sure you want to delete ' + selectedPois.size + ' POI(s)?')) {
            bulkDeletePois();
        }
    });
    
    // Modal functionality
    $('.tnpoi-modal-close').on('click', function() {
        $('#poi-edit-modal').hide();
    });
    
    $('#save-poi').on('click', function() {
        savePoi();
    });
    
    function loadPois() {
        const search = $('#poi-search').val();
        const trailId = $('#poi-trail-filter').val();
        const filterType = $('#poi-type-filter').val();
        const filterTerm = $('#poi-term-filter').val();
        const filterStatus = $('#poi-status-filter').val();
        const filterExport = $('#poi-export-filter').val();
        const sortBy = $('#poi-sort-by').val();
        const sortOrder = $('#poi-sort-order').val();
        
        $('#poi-table-body').html('<tr><td colspan="11" class="tnpoi-loading">Loading POIs...</td></tr>');
        
        $.ajax({
            url: tnpoi_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'tnpoi_get_pois',
                nonce: tnpoi_ajax.nonce,
                page: currentPage,
                per_page: 20,
                search: search,
                filter_trail: trailId,
                filter_type: filterType,
                filter_search_term: filterTerm,
                filter_status: filterStatus,
                filter_export: filterExport,
                sort_by: sortBy,
                sort_order: sortOrder
            },
            success: function(response) {
                if (response.success) {
                    renderPois(response.data);
                } else {
                    $('#poi-table-body').html('<tr><td colspan="11" class="tnpoi-loading">Error loading POIs</td></tr>');
                }
            },
            error: function() {
                $('#poi-table-body').html('<tr><td colspan="11" class="tnpoi-loading">Error loading POIs</td></tr>');
            }
        });
    }
    
    function calculateTrailPositions() {
        $('#calculate-positions').prop('disabled', true).text('Calculating...');
        
        $.ajax({
            url: tnpoi_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'tnpoi_calculate_trail_positions',
                nonce: tnpoi_ajax.nonce
            },
            success: function(response) {
                if (response.success) {
                    alert('Trail positions calculated successfully!');
                    loadPois(); // Reload to show updated positions
                } else {
                    alert('Error calculating trail positions: ' + response.data);
                }
            },
            error: function() {
                alert('Error calculating trail positions');
            },
            complete: function() {
                $('#calculate-positions').prop('disabled', false).text('Calculate Trail Positions');
            }
        });
    }
    
    function renderPois(data) {
        const tbody = $('#poi-table-body');
        tbody.empty();
        
        if (data.pois.length === 0) {
            tbody.html('<tr><td colspan="11" class="tnpoi-loading">No POIs found</td></tr>');
            return;
        }
        
        data.pois.forEach(function(poi) {
            const row = $('<tr>');
            
            // Format trail position and distance
            const trailPosition = poi.trail_position ? `#${poi.trail_position}` : '';
            const distanceDisplay = poi.distance_along_trail ? `${Math.round(poi.distance_along_trail)}m` : '';
            const positionDisplay = trailPosition + (distanceDisplay ? ` (${distanceDisplay})` : '');
            
            // Format status badge
            const statusClass = poi.status === 'new' ? 'tnpoi-status-new' : 
                              poi.status === 'active' ? 'tnpoi-status-active' : 
                              poi.status === 'inactive' ? 'tnpoi-status-inactive' : 'tnpoi-status-new';
            const statusDisplay = poi.status ? poi.status.charAt(0).toUpperCase() + poi.status.slice(1) : 'New';
            
            // Format export checkbox
            const isExported = !poi.ignored; // ignored = 0 means include in export
            
            row.append(`
                <td>
                    <span class="tnpoi-status-badge ${statusClass}">${statusDisplay}</span>
                </td>
                <td>
                    <input type="checkbox" class="tnpoi-export-toggle" data-poi-id="${poi.id}" ${isExported ? 'checked' : ''}>
                </td>
                <td>
                    <div class="tnpoi-poi-name">${poi.name}</div>
                    <div class="tnpoi-poi-trail-id">${poi.trail_id || ''}</div>
                </td>
                <td>
                    <div class="tnpoi-poi-trail">${poi.trail_name || 'Unknown Trail'}</div>
                </td>
                <td><span class="tnpoi-poi-address">${poi.address || ''}</span></td>
                <td>
                    <div class="tnpoi-poi-position">${positionDisplay}</div>
                </td>
                <td><span class="tnpoi-poi-type">${poi.types || ''}</span></td>
                <td>${poi.geodir_categories || ''}</td>
                <td>${new Date(poi.created_at).toLocaleDateString()}</td>
                <td class="tnpoi-poi-actions">
                    <button type="button" class="button button-small edit-poi" data-poi-id="${poi.id}">Edit</button>
                    <button type="button" class="button button-small button-link-delete delete-poi" data-poi-id="${poi.id}">Delete</button>
                </td>
            `);
            tbody.append(row);
        });
        
        // Update pagination
        totalPages = data.pages;
        updatePagination(data);
        
        // Bind events
        $('.poi-checkbox').on('change', updateSelectedCount);
        $('.edit-poi').on('click', function() {
            const poiId = $(this).data('poi-id');
            loadPoiForEdit(poiId);
        });
        $('.delete-poi').on('click', function() {
            const poiId = $(this).data('poi-id');
            if (confirm('Are you sure you want to delete this POI?')) {
                deletePoi(poiId);
            }
        });
        
        // Bind export toggle events
        $('.tnpoi-export-toggle').on('change', function() {
            const poiId = $(this).data('poi-id');
            const ignored = $(this).is(':checked') ? 0 : 1; // checked = include in export (ignored = 0)
            toggleExportStatus(poiId, ignored);
        });
    }
    
    function updatePagination(data) {
        const start = (currentPage - 1) * 20 + 1;
        const end = Math.min(currentPage * 20, data.total);
        
        $('#showing-start').text(start);
        $('#showing-end').text(end);
        $('#total-pois').text(data.total);
        $('#current-page').text(currentPage);
        $('#total-pages').text(totalPages);
        
        $('#prev-page').prop('disabled', currentPage <= 1);
        $('#next-page').prop('disabled', currentPage >= totalPages);
    }
    
    function updateSelectedCount() {
        selectedPois.clear();
        $('.poi-checkbox:checked').each(function() {
            selectedPois.add($(this).val());
        });
        
        $('#selected-count').text(selectedPois.size);
        $('#bulk-delete, #bulk-export').prop('disabled', selectedPois.size === 0);
    }
    
    function loadPoiForEdit(poiId) {
        $.ajax({
            url: tnpoi_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'tnpoi_get_poi_details',
                nonce: tnpoi_ajax.nonce,
                poi_id: poiId
            },
            success: function(response) {
                if (response.success) {
                    const poi = response.data;
                    $('#edit-poi-id').val(poi.id);
                    $('#edit-poi-name').val(poi.name);
                    $('#edit-poi-address').val(poi.address);
                    $('#edit-poi-latitude').val(poi.latitude);
                    $('#edit-poi-longitude').val(poi.longitude);
                    $('#edit-poi-rating').val(poi.rating);
                    $('#edit-poi-ratings-total').val(poi.user_ratings_total);
                    $('#edit-poi-price-level').val(poi.price_level);
                    $('#poi-edit-modal').show();
                }
            }
        });
    }
    
    function savePoi() {
        const poiId = $('#edit-poi-id').val();
        const data = {
            name: $('#edit-poi-name').val(),
            address: $('#edit-poi-address').val(),
            latitude: $('#edit-poi-latitude').val(),
            longitude: $('#edit-poi-longitude').val(),
            rating: $('#edit-poi-rating').val(),
            user_ratings_total: $('#edit-poi-ratings-total').val(),
            price_level: $('#edit-poi-price-level').val()
        };
        
        $.ajax({
            url: tnpoi_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'tnpoi_update_poi',
                nonce: tnpoi_ajax.nonce,
                poi_id: poiId,
                ...data
            },
            success: function(response) {
                if (response.success) {
                    $('#poi-edit-modal').hide();
                    loadPois();
                    alert('POI updated successfully');
                } else {
                    alert('Error updating POI: ' + response.data);
                }
            }
        });
    }
    
    function deletePoi(poiId) {
        $.ajax({
            url: tnpoi_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'tnpoi_delete_poi',
                nonce: tnpoi_ajax.nonce,
                poi_id: poiId
            },
            success: function(response) {
                if (response.success) {
                    loadPois();
                    alert('POI deleted successfully');
                } else {
                    alert('Error deleting POI: ' + response.data);
                }
            }
        });
    }
    
    function bulkDeletePois() {
        $.ajax({
            url: tnpoi_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'tnpoi_bulk_delete',
                nonce: tnpoi_ajax.nonce,
                poi_ids: Array.from(selectedPois)
            },
            success: function(response) {
                if (response.success) {
                    selectedPois.clear();
                    loadPois();
                    alert(response.data);
                } else {
                    alert('Error deleting POIs: ' + response.data);
                }
            }
        });
    }
    
    function toggleExportStatus(poiId, ignored) {
        $.ajax({
            url: tnpoi_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'tnpoi_toggle_export_status',
                nonce: tnpoi_ajax.nonce,
                poi_id: poiId,
                ignored: ignored
            },
            success: function(response) {
                if (response.success) {
                    loadPois();
                    alert(response.data);
                } else {
                    alert('Error toggling export status: ' + response.data);
                }
            }
        });
    }

    document.getElementById('bulk-export').addEventListener('click', function() {
        // Gather selected POI IDs
        const selectedPois = Array.from(document.querySelectorAll('.tnpoi-export-toggle:checked')).map(cb => cb.getAttribute('data-poi-id'));
        if (selectedPois.length === 0) {
            alert('Please select at least one POI to export.');
            return;
        }
        // Get current filter values
        const status = document.getElementById('poi-status-filter') ? document.getElementById('poi-status-filter').value : '';
        const trail = document.getElementById('poi-trail-filter') ? document.getElementById('poi-trail-filter').value : '';
        // Prepare AJAX request
        const data = new FormData();
        data.append('action', 'tnpoi_export_csv');
        data.append('nonce', TNPOI.nonce);
        data.append('poi_ids', JSON.stringify(selectedPois));
        data.append('filters[status]', status);
        data.append('filters[trail_id]', trail);
        data.append('format', 'geodirectory');
        data.append('direct_download', '1');
        // Send AJAX request
        fetch(ajaxurl, {
            method: 'POST',
            body: data
        })
        .then(response => response.blob())
        .then(blob => {
            // Download the CSV file
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'pois_export_' + new Date().toISOString().replace(/[:.]/g, '-') + '.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        })
        .catch(err => {
            alert('Export failed: ' + err);
        });
    });
});
</script> 