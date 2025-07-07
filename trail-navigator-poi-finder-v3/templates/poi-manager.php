<?php
// Get current page and filters
$current_page = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
$search = isset($_GET['search']) ? sanitize_text_field($_GET['search']) : '';
$category_filter = isset($_GET['category']) ? sanitize_text_field($_GET['category']) : '';
$trail_filter = isset($_GET['trail']) ? sanitize_text_field($_GET['trail']) : '';
$status_filter = isset($_GET['status']) ? sanitize_text_field($_GET['status']) : '';

// Get POIs with pagination and filters
$poi_db = new TNPOI_POI_DB();
$pois = $poi_db->get_pois($current_page, 20, $search, $category_filter, $trail_filter, $status_filter);
$total_pois = $poi_db->get_total_pois($search, $category_filter, $trail_filter, $status_filter);
$total_pages = ceil($total_pois / 20);

// Get available categories and trails for filters
$categories = $poi_db->get_categories();
$trails = $poi_db->get_trails();
?>

<div class="wrap tnpoi-poi-manager">
    <h1>POI Manager</h1>
    
    <!-- Filters -->
    <div class="tnpoi-filters">
        <form method="get" action="">
            <input type="hidden" name="page" value="tnpoi-poi-manager">
            
            <div class="filter-row">
                <div class="filter-group">
                    <label for="search">Search:</label>
                    <input type="text" id="search" name="search" value="<?php echo esc_attr($search); ?>" placeholder="Search POIs...">
                </div>
                
                <div class="filter-group">
                    <label for="category">Category:</label>
                    <select id="category" name="category">
                        <option value="">All Categories</option>
                        <?php foreach ($categories as $cat): ?>
                            <option value="<?php echo esc_attr($cat); ?>" <?php selected($category_filter, $cat); ?>>
                                <?php echo esc_html($cat); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="trail">Trail:</label>
                    <select id="trail" name="trail">
                        <option value="">All Trails</option>
                        <?php foreach ($trails as $trail): ?>
                            <option value="<?php echo esc_attr($trail); ?>" <?php selected($trail_filter, $trail); ?>>
                                <?php echo esc_html($trail); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="status">Status:</label>
                    <select id="status" name="status">
                        <option value="">All Status</option>
                        <option value="active" <?php selected($status_filter, 'active'); ?>>Active</option>
                        <option value="ignored" <?php selected($status_filter, 'ignored'); ?>>Ignored</option>
                    </select>
                </div>
                
                <div class="filter-actions">
                    <button type="submit" class="button">Filter</button>
                    <a href="<?php echo admin_url('admin.php?page=tnpoi-poi-manager'); ?>" class="button">Clear</a>
                </div>
            </div>
        </form>
    </div>
    
    <!-- Bulk Actions -->
    <div class="tnpoi-bulk-actions">
        <form method="post" action="" id="bulk-actions-form">
            <?php wp_nonce_field('tnpoi_bulk_actions', 'tnpoi_nonce'); ?>
            
            <div class="bulk-actions-row">
                <select name="bulk_action" id="bulk-action-selector">
                    <option value="">Bulk Actions</option>
                    <option value="delete">Delete</option>
                    <option value="activate">Activate</option>
                    <option value="ignore">Ignore</option>
                    <option value="export">Export Selected</option>
                </select>
                
                <button type="submit" class="button action" id="doaction">Apply</button>
                
                <span class="poi-count">
                    Showing <?php echo number_format($pois ? count($pois) : 0); ?> of <?php echo number_format($total_pois); ?> POIs
                </span>
            </div>
        </form>
    </div>
    
    <!-- POI Table -->
    <div class="tnpoi-table-container">
        <table class="wp-list-table widefat fixed striped tnpoi-poi-table">
            <thead>
                <tr>
                    <td class="manage-column column-cb check-column">
                        <input type="checkbox" id="cb-select-all-1">
                    </td>
                    <th class="manage-column column-name">Name</th>
                    <th class="manage-column column-category">Category</th>
                    <th class="manage-column column-trail">Trail</th>
                    <th class="manage-column column-address">Address</th>
                    <th class="manage-column column-coordinates">Coordinates</th>
                    <th class="manage-column column-status">Status</th>
                    <th class="manage-column column-actions">Actions</th>
                </tr>
            </thead>
            
            <tbody>
                <?php if (!empty($pois)): ?>
                    <?php foreach ($pois as $poi): ?>
                        <tr data-poi-id="<?php echo esc_attr($poi->id); ?>">
                            <th scope="row" class="check-column">
                                <input type="checkbox" name="poi_ids[]" value="<?php echo esc_attr($poi->id); ?>">
                            </th>
                            <td class="column-name">
                                <strong class="poi-name" data-poi-id="<?php echo esc_attr($poi->id); ?>">
                                    <?php echo esc_html($poi->name); ?>
                                </strong>
                                <div class="row-actions">
                                    <span class="edit">
                                        <a href="#" class="edit-poi" data-poi-id="<?php echo esc_attr($poi->id); ?>">Edit</a> |
                                    </span>
                                    <span class="view">
                                        <a href="#" class="view-poi" data-poi-id="<?php echo esc_attr($poi->id); ?>">View</a> |
                                    </span>
                                    <span class="delete">
                                        <a href="#" class="delete-poi" data-poi-id="<?php echo esc_attr($poi->id); ?>">Delete</a>
                                    </span>
                                </div>
                            </td>
                            <td class="column-category">
                                <span class="poi-category" data-poi-id="<?php echo esc_attr($poi->id); ?>">
                                    <?php echo esc_html($poi->category ?: 'Uncategorized'); ?>
                                </span>
                            </td>
                            <td class="column-trail">
                                <span class="poi-trail" data-poi-id="<?php echo esc_attr($poi->id); ?>">
                                    <?php echo esc_html($poi->trail_name ?: 'Unknown Trail'); ?>
                                </span>
                            </td>
                            <td class="column-address">
                                <span class="poi-address" data-poi-id="<?php echo esc_attr($poi->id); ?>">
                                    <?php echo esc_html($poi->address); ?>
                                </span>
                            </td>
                            <td class="column-coordinates">
                                <span class="poi-coordinates" data-poi-id="<?php echo esc_attr($poi->id); ?>">
                                    <?php echo esc_html($poi->latitude . ', ' . $poi->longitude); ?>
                                </span>
                            </td>
                            <td class="column-status">
                                <span class="poi-status poi-status-<?php echo esc_attr($poi->status); ?>" data-poi-id="<?php echo esc_attr($poi->id); ?>">
                                    <?php echo esc_html(ucfirst($poi->status)); ?>
                                </span>
                            </td>
                            <td class="column-actions">
                                <div class="row-actions">
                                    <span class="edit">
                                        <a href="#" class="edit-poi" data-poi-id="<?php echo esc_attr($poi->id); ?>">Edit</a> |
                                    </span>
                                    <span class="view">
                                        <a href="#" class="view-poi" data-poi-id="<?php echo esc_attr($poi->id); ?>">View</a> |
                                    </span>
                                    <span class="delete">
                                        <a href="#" class="delete-poi" data-poi-id="<?php echo esc_attr($poi->id); ?>">Delete</a>
                                    </span>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="7" class="no-pois">
                            <p>No POIs found. <a href="<?php echo admin_url('admin.php?page=tnpoi-sync'); ?>">Import some POIs</a> to get started.</p>
                        </td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
    
    <!-- Pagination -->
    <?php if ($total_pages > 1): ?>
        <div class="tablenav-pages">
            <span class="displaying-num"><?php echo number_format($total_pois); ?> items</span>
            
            <?php
            $page_links = paginate_links(array(
                'base' => add_query_arg('paged', '%#%'),
                'format' => '',
                'prev_text' => __('&laquo;'),
                'next_text' => __('&raquo;'),
                'total' => $total_pages,
                'current' => $current_page,
                'type' => 'array'
            ));
            
            if ($page_links) {
                echo '<span class="pagination-links">' . join("\n", $page_links) . '</span>';
            }
            ?>
        </div>
    <?php endif; ?>
</div>

<!-- POI Edit Modal -->
<div id="poi-edit-modal" class="tnpoi-modal" style="display: none;">
    <div class="tnpoi-modal-content">
        <div class="tnpoi-modal-header">
            <h2>Edit POI</h2>
            <span class="tnpoi-modal-close">&times;</span>
        </div>
        <div class="tnpoi-modal-body">
            <form id="poi-edit-form">
                <?php wp_nonce_field('tnpoi_edit_poi', 'tnpoi_edit_nonce'); ?>
                <input type="hidden" id="edit-poi-id" name="poi_id">
                
                <div class="form-row">
                    <label for="edit-poi-name">Name:</label>
                    <input type="text" id="edit-poi-name" name="name" required>
                </div>
                
                <div class="form-row">
                    <label for="edit-poi-category">Category:</label>
                    <select id="edit-poi-category" name="category">
                        <option value="">Select Category</option>
                        <?php foreach ($categories as $cat): ?>
                            <option value="<?php echo esc_attr($cat); ?>"><?php echo esc_html($cat); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div class="form-row">
                    <label for="edit-poi-trail">Trail:</label>
                    <input type="text" id="edit-poi-trail" name="trail_name">
                </div>
                
                <div class="form-row">
                    <label for="edit-poi-address">Address:</label>
                    <input type="text" id="edit-poi-address" name="address">
                </div>
                
                <div class="form-row">
                    <label for="edit-poi-latitude">Latitude:</label>
                    <input type="number" id="edit-poi-latitude" name="latitude" step="any">
                </div>
                
                <div class="form-row">
                    <label for="edit-poi-longitude">Longitude:</label>
                    <input type="number" id="edit-poi-longitude" name="longitude" step="any">
                </div>
                
                <div class="form-row">
                    <label for="edit-poi-status">Status:</label>
                    <select id="edit-poi-status" name="status">
                        <option value="active">Active</option>
                        <option value="ignored">Ignored</option>
                    </select>
                </div>
                
                <div class="form-row">
                    <label for="edit-poi-description">Description:</label>
                    <textarea id="edit-poi-description" name="description" rows="3"></textarea>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="button button-primary">Save Changes</button>
                    <button type="button" class="button tnpoi-modal-cancel">Cancel</button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- POI View Modal -->
<div id="poi-view-modal" class="tnpoi-modal" style="display: none;">
    <div class="tnpoi-modal-content">
        <div class="tnpoi-modal-header">
            <h2>POI Details</h2>
            <span class="tnpoi-modal-close">&times;</span>
        </div>
        <div class="tnpoi-modal-body">
            <div id="poi-details"></div>
        </div>
    </div>
</div> 