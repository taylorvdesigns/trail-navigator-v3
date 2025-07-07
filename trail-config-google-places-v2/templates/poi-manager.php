<?php
/**
 * POI Manager template for Trail Config Google Places v2
 */
?>

<div class="tcgp2-form-card">
    <div class="tcgp2-table-header">
        <h3>POI Management</h3>
        <p>Showing <?php echo esc_html($pois_data['total']); ?> POIs total</p>
    </div>
    
    <!-- Combined Filters and Actions Section -->
    <div class="tcgp2-filters-actions">
        <!-- Filters Row -->
        <div class="tcgp2-filters-row">
            <form method="get" action="" class="tcgp2-filters-form">
                <input type="hidden" name="page" value="tcgp2-pois">
                
                <div class="tcgp2-filter-group">
                    <label for="search">Search:</label>
                    <input type="text" id="search" name="search" value="<?php echo esc_attr($_GET['search'] ?? ''); ?>" placeholder="Search by name, address...">
                </div>
                
                <div class="tcgp2-filter-group">
                    <label for="status">Status:</label>
                    <select id="status" name="status">
                        <option value="all">All Statuses</option>
                        <option value="new" <?php selected($_GET['status'] ?? '', 'new'); ?>>New</option>
                        <option value="active" <?php selected($_GET['status'] ?? '', 'active'); ?>>Active</option>
                        <option value="inactive" <?php selected($_GET['status'] ?? '', 'inactive'); ?>>Inactive</option>
                    </select>
                </div>
                
                <div class="tcgp2-filter-group">
                    <label for="trail">Trail:</label>
                    <select id="trail" name="trail">
                        <option value="all">All Trails</option>
                        <?php foreach ($trails as $trail): ?>
                            <option value="<?php echo esc_attr($trail['routeId']); ?>" <?php selected($_GET['trail'] ?? '', $trail['routeId']); ?>>
                                <?php echo esc_html($trail['name']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div class="tcgp2-filter-group">
                    <label for="ignored">Export Status:</label>
                    <select id="ignored" name="ignored">
                        <option value="">All POIs</option>
                        <option value="0" <?php selected($_GET['ignored'] ?? '', '0'); ?>>Include in Export</option>
                        <option value="1" <?php selected($_GET['ignored'] ?? '', '1'); ?>>Ignored (Excluded)</option>
                    </select>
                </div>
                
                <div class="tcgp2-filter-group">
                    <label for="google_type">Google Type:</label>
                    <select id="google_type" name="google_type">
                        <option value="">All Types</option>
                        <?php 
                        $google_types = $this->get_available_google_types();
                        foreach ($google_types as $type): ?>
                            <option value="<?php echo esc_attr($type); ?>" <?php selected($_GET['google_type'] ?? '', $type); ?>>
                                <?php echo esc_html($type); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div class="tcgp2-filter-group">
                    <button type="submit" class="button button-primary">Apply Filters</button>
                    <a href="<?php echo esc_url(admin_url('admin.php?page=tcgp2-pois')); ?>" class="button button-secondary">Clear</a>
                </div>
            </form>
        </div>
        
        <!-- Bulk Actions Row -->
        <div class="tcgp2-bulk-actions-row">
            <form method="post" action="" class="tcgp2-bulk-form">
                <?php wp_nonce_field('tcgp2_poi_action', 'tcgp2_nonce'); ?>
                
                <div class="tcgp2-bulk-left">
                    <select name="bulk_action" class="tcgp2-bulk-action-select">
                        <option value="">Bulk Actions</option>
                        <option value="delete">Delete Selected</option>
                        <option value="activate">Activate Selected</option>
                        <option value="deactivate">Deactivate Selected</option>
                        <option value="ignore">Ignore Selected</option>
                        <option value="unignore">Include Selected</option>
                    </select>
                    <button type="submit" name="action" value="bulk_action" class="button tcgp2-bulk-action" disabled>Apply to selected</button>
                </div>
                
                <div class="tcgp2-bulk-right">
                    <button type="submit" name="action" value="export_csv" class="button button-primary">Export CSV</button>
                </div>
            </form>
        </div>
    </div>
    
    <!-- POIs Table -->
    <?php if (!empty($pois_data['pois'])): ?>
        <table class="wp-list-table widefat fixed striped tcgp2-pois-table">
            <thead>
                <tr>
                    <td class="manage-column column-cb check-column">
                        <input type="checkbox" class="tcgp2-select-all">
                    </td>
                    <th>Name</th>
                    <th>Trail</th>
                    <th>Address</th>
                    <th>Categories</th>
                    <th>Sync Date</th>
                    <th style="width: 80px;">Status</th>
                    <th style="width: 100px;">Export</th>
                    <th style="width: 90px;">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($pois_data['pois'] as $poi): ?>
                    <tr data-status="<?php echo esc_attr($poi['status']); ?>" data-trail="<?php echo esc_attr($poi['trail_id']); ?>" data-ignored="<?php echo esc_attr($poi['ignored'] ?? 0); ?>">
                        <th scope="row" class="check-column">
                            <input type="checkbox" name="poi_ids[]" value="<?php echo esc_attr($poi['id']); ?>" class="tcgp2-poi-checkbox">
                        </th>
                        <td>
                            <strong><?php echo esc_html($poi['name']); ?></strong>
                            <div class="row-actions">
                                <span class="view">
                                    <a href="https://maps.google.com/?q=<?php echo esc_attr($poi['latitude']); ?>,<?php echo esc_attr($poi['longitude']); ?>" target="_blank">View on Map</a>
                                </span>
                            </div>
                        </td>
                        <td><?php echo esc_html($poi['trail_name'] ?? 'Unknown'); ?></td>
                        <td>
                            <?php 
                            $address_parts = array_filter([
                                $poi['street'],
                                $poi['city'],
                                $poi['region']
                            ]);
                            echo esc_html(implode(', ', $address_parts));
                            ?>
                        </td>
                        <td>
                            <div class="tcgp2-categories-cell" data-poi-id="<?php echo esc_attr($poi['id']); ?>">
                                <!-- Google Places Categories -->
                                <div class="tcgp2-google-categories">
                                    <strong>Google:</strong>
                                    <?php 
                                    if (!empty($poi['types'])) {
                                        $google_types = json_decode($poi['types'], true);
                                        if (is_array($google_types)) {
                                            echo '<span class="tcgp2-google-types">' . esc_html(implode(', ', $google_types)) . '</span>';
                                        } else {
                                            echo '<span class="tcgp2-no-google-types">No Google types</span>';
                                        }
                                    } else {
                                        echo '<span class="tcgp2-no-google-types">No Google types</span>';
                                    }
                                    ?>
                                </div>
                                
                                <!-- GeoDirectory Categories -->
                                <div class="tcgp2-geodirectory-categories">
                                    <strong>GeoDirectory:</strong>
                                    <?php 
                                    if (!empty($poi['category_ids'])) {
                                        $category_ids = json_decode($poi['category_ids'], true);
                                        if (is_array($category_ids)) {
                                            $category_names = array();
                                            foreach ($category_ids as $cat_id) {
                                                if (isset($categories[$cat_id])) {
                                                    $category_names[] = $categories[$cat_id];
                                                }
                                            }
                                            echo '<span class="tcgp2-categories-display">' . esc_html(implode(', ', $category_names)) . '</span>';
                                        }
                                    } else {
                                        echo '<span class="tcgp2-categories-display tcgp2-no-categories">No categories</span>';
                                    }
                                    ?>
                                    <button type="button" class="tcgp2-edit-categories-btn button button-small">Edit</button>
                                    
                                    <?php 
                                    // Show warning if Google types exist but no GeoDirectory categories are mapped
                                    if (!empty($poi['types']) && empty($poi['category_ids'])) {
                                        $google_types = json_decode($poi['types'], true);
                                        if (is_array($google_types) && !empty($google_types)) {
                                            echo '<div class="tcgp2-mapping-warning">⚠️ No category mapping found</div>';
                                        }
                                    }
                                    ?>
                                </div>
                                
                                <div class="tcgp2-categories-edit" style="display: none;">
                                    <select class="tcgp2-categories-select" multiple>
                                        <?php foreach ($categories as $cat_id => $cat_name): ?>
                                            <option value="<?php echo esc_attr($cat_id); ?>" 
                                                    <?php echo (in_array($cat_id, $category_ids ?? array())) ? 'selected' : ''; ?>>
                                                <?php echo esc_html($cat_name); ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>
                                    <div class="tcgp2-categories-actions">
                                        <button type="button" class="tcgp2-save-categories-btn button button-small button-primary">Save</button>
                                        <button type="button" class="tcgp2-cancel-categories-btn button button-small">Cancel</button>
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td><?php echo $poi['date_synced'] ? esc_html(date('Y-m-d H:i', strtotime($poi['date_synced']))) : '--'; ?></td>
                        <td style="width: 80px;">
                            <span class="tcgp2-status-badge tcgp2-status-<?php echo esc_attr($poi['status']); ?>">
                                <?php echo esc_html(ucfirst($poi['status'])); ?>
                            </span>
                        </td>
                        <td style="width: 100px;">
                            <label class="tcgp2-toggle-switch">
                                <input type="checkbox" 
                                       class="tcgp2-ignored-toggle" 
                                       data-poi-id="<?php echo esc_attr($poi['id']); ?>"
                                       <?php checked($poi['ignored'] ?? 0, 1); ?>>
                                <span class="tcgp2-toggle-slider"></span>
                                <span class="tcgp2-toggle-label"><?php echo ($poi['ignored'] ?? 0) ? 'Ignored' : 'Include'; ?></span>
                            </label>
                        </td>
                        <td style="width: 90px;">
                            <button type="button" class="button button-small button-danger tcgp2-delete-btn" data-poi-id="<?php echo esc_attr($poi['id']); ?>">Delete</button>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php else: ?>
        <div class="tcgp2-notice tcgp2-notice-info">
            <p>No POIs found. <a href="<?php echo esc_url(admin_url('admin.php?page=tcgp2-sync')); ?>">Sync some POIs</a> to get started.</p>
        </div>
    <?php endif; ?>
    
    <!-- Pagination -->
    <?php if ($pois_data['total'] > $pois_data['per_page']): ?>
        <div class="tablenav bottom">
            <div class="tablenav-pages">
                <?php
                $total_pages = ceil($pois_data['total'] / $pois_data['per_page']);
                $current_page = $pois_data['page'];
                
                if ($total_pages > 1) {
                    echo '<span class="pagination-links">';
                    
                    // Previous page
                    if ($current_page > 1) {
                        $prev_url = add_query_arg('paged', $current_page - 1);
                        echo '<a class="prev-page" href="' . esc_url($prev_url) . '">‹</a>';
                    }
                    
                    // Page numbers
                    for ($i = 1; $i <= $total_pages; $i++) {
                        if ($i == $current_page) {
                            echo '<span class="paging-input"><span class="tablenav-paging-text">' . $i . ' of <span class="total-pages">' . $total_pages . '</span></span></span>';
                        } else {
                            $page_url = add_query_arg('paged', $i);
                            echo '<a class="paging-input" href="' . esc_url($page_url) . '">' . $i . '</a>';
                        }
                    }
                    
                    // Next page
                    if ($current_page < $total_pages) {
                        $next_url = add_query_arg('paged', $current_page + 1);
                        echo '<a class="next-page" href="' . esc_url($next_url) . '">›</a>';
                    }
                    
                    echo '</span>';
                }
                ?>
            </div>
        </div>
    <?php endif; ?>
</div>

<div class="tcgp2-form-card">
    <h3>Danger Zone</h3>
    <p>These actions cannot be undone. Use with caution.</p>
    
    <form method="post" action="" onsubmit="return confirm('Are you absolutely sure you want to delete ALL POIs? This action cannot be undone.');">
        <?php wp_nonce_field('tcgp2_delete_all_pois', 'tcgp2_nonce'); ?>
        <input type="hidden" name="action" value="delete_all_pois">
        <button type="submit" class="button button-secondary tcgp2-delete-btn">Delete All POIs</button>
    </form>
</div>

<script>
jQuery(document).ready(function($) {
    // Handle ignored toggle
    $('.tcgp2-ignored-toggle').on('change', function() {
        var poiId = $(this).data('poi-id');
        var ignored = $(this).is(':checked') ? 1 : 0;
        var $label = $(this).siblings('.tcgp2-toggle-label');
        
        $.ajax({
            url: tcgp2_ajax.ajaxurl,
            type: 'POST',
            data: {
                action: 'tcgp2_toggle_poi_ignored',
                poi_id: poiId,
                ignored: ignored,
                nonce: tcgp2_ajax.nonce
            },
            success: function(response) {
                if (response.success) {
                    $label.text(ignored ? 'Ignored' : 'Include');
                    // Update row data attribute
                    $(this).closest('tr').attr('data-ignored', ignored);
                } else {
                    alert('Error: ' + response.data);
                    // Revert checkbox
                    $(this).prop('checked', !ignored);
                }
            },
            error: function() {
                alert('Error updating ignored status');
                // Revert checkbox
                $(this).prop('checked', !ignored);
            }
        });
    });
    
    // Handle category editing
    $('.tcgp2-edit-categories-btn').on('click', function() {
        var $cell = $(this).closest('.tcgp2-categories-cell');
        $cell.find('.tcgp2-categories-display').hide();
        $cell.find('.tcgp2-edit-categories-btn').hide();
        $cell.find('.tcgp2-categories-edit').show();
    });
    
    $('.tcgp2-cancel-categories-btn').on('click', function() {
        var $cell = $(this).closest('.tcgp2-categories-cell');
        $cell.find('.tcgp2-categories-display').show();
        $cell.find('.tcgp2-edit-categories-btn').show();
        $cell.find('.tcgp2-categories-edit').hide();
    });
    
    $('.tcgp2-save-categories-btn').on('click', function() {
        var $cell = $(this).closest('.tcgp2-categories-cell');
        var poiId = $cell.data('poi-id');
        var categoryIds = $cell.find('.tcgp2-categories-select').val() || [];
        
        $.ajax({
            url: tcgp2_ajax.ajaxurl,
            type: 'POST',
            data: {
                action: 'tcgp2_update_poi_categories',
                poi_id: poiId,
                category_ids: categoryIds,
                nonce: tcgp2_ajax.nonce
            },
            success: function(response) {
                if (response.success) {
                    // Update display
                    var categoryNames = [];
                    $cell.find('.tcgp2-categories-select option:selected').each(function() {
                        categoryNames.push($(this).text());
                    });
                    
                    var $display = $cell.find('.tcgp2-categories-display');
                    if (categoryNames.length > 0) {
                        $display.text(categoryNames.join(', ')).removeClass('tcgp2-no-categories');
                    } else {
                        $display.text('No categories').addClass('tcgp2-no-categories');
                    }
                    
                    // Show display, hide edit
                    $cell.find('.tcgp2-categories-display').show();
                    $cell.find('.tcgp2-edit-categories-btn').show();
                    $cell.find('.tcgp2-categories-edit').hide();
                } else {
                    alert('Error: ' + response.data);
                }
            },
            error: function() {
                alert('Error updating categories');
            }
        });
    });
    
    // Handle bulk actions
    $('.tcgp2-bulk-action-select').on('change', function() {
        var $button = $('.tcgp2-bulk-action');
        if ($(this).val()) {
            $button.prop('disabled', false);
        } else {
            $button.prop('disabled', true);
        }
    });
    
    // Handle select all
    $('.tcgp2-select-all').on('change', function() {
        $('.tcgp2-poi-checkbox').prop('checked', $(this).is(':checked'));
    });
    
    // Update select all when individual checkboxes change
    $('.tcgp2-poi-checkbox').on('change', function() {
        var totalCheckboxes = $('.tcgp2-poi-checkbox').length;
        var checkedCheckboxes = $('.tcgp2-poi-checkbox:checked').length;
        
        if (checkedCheckboxes === 0) {
            $('.tcgp2-select-all').prop('indeterminate', false).prop('checked', false);
        } else if (checkedCheckboxes === totalCheckboxes) {
            $('.tcgp2-select-all').prop('indeterminate', false).prop('checked', true);
        } else {
            $('.tcgp2-select-all').prop('indeterminate', true);
        }
    });
});
</script> 