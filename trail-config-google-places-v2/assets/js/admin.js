/**
 * Trail Config Google Places v2 - Admin JavaScript
 */

(function($) {
    'use strict';

    // Initialize admin functionality when DOM is ready
    $(document).ready(function() {
        initTabs();
        initPasswordToggles();
        initFormEnhancements();
        initProgressBars();
        initFilterHandlers();
        initTestSync();
        initFullSync();
    });

    /**
     * Initialize tab functionality
     */
    function initTabs() {
        $('.tcgp2-tab').on('click', function(e) {
            e.preventDefault();
            
            const target = $(this).data('target');
            if (!target) return;
            
            // Update active tab
            $('.tcgp2-tab').removeClass('active');
            $(this).addClass('active');
            
            // Show target content
            $('.tcgp2-tab-content').removeClass('active');
            $('#' + target).addClass('active');
        });
    }

    /**
     * Initialize password field toggles
     */
    function initPasswordToggles() {
        $('.tcgp2-toggle-password').on('click', function(e) {
            e.preventDefault();
            
            const $field = $(this).siblings('input');
            const $icon = $(this).find('.dashicons');
            
            if ($field.attr('type') === 'password') {
                $field.attr('type', 'text');
                $icon.removeClass('dashicons-visibility').addClass('dashicons-hidden');
            } else {
                $field.attr('type', 'password');
                $icon.removeClass('dashicons-hidden').addClass('dashicons-visibility');
            }
        });
    }

    /**
     * Initialize form enhancements
     */
    function initFormEnhancements() {
        // Auto-save category mappings
        $('.tcgp2-category-mapping select').on('change', function() {
            const $row = $(this).closest('.tcgp2-category-row');
            const googleType = $row.find('.google-type').text();
            const categoryId = $(this).val();
            // Get the admin nonce from the form
            const adminNonce = $(this).closest('form').find('input[name="tcgp2_admin_nonce"]').val();
            // Save mapping via AJAX
            $.post(ajaxurl, {
                action: 'tcgp2_save_category_mapping',
                google_type: googleType,
                category_id: categoryId,
                nonce: adminNonce
            }, function(response) {
                if (response.success) {
                    showNotice('Category mapping saved successfully!', 'success');
                } else {
                    showNotice('Failed to save category mapping.', 'error');
                }
            });
        });

        // Confirm delete actions
        $('.tcgp2-delete-btn').on('click', function(e) {
            if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
                e.preventDefault();
            }
        });

        // Auto-submit forms on certain changes
        $('.tcgp2-auto-submit').on('change', function() {
            $(this).closest('form').submit();
        });
    }

    /**
     * Initialize progress bars
     */
    function initProgressBars() {
        $('.tcgp2-progress-bar').each(function() {
            const $bar = $(this);
            const $fill = $bar.find('.tcgp2-progress-fill');
            const progress = $bar.data('progress') || 0;
            
            $fill.css('width', progress + '%');
        });
    }

    /**
     * Initialize filter handlers
     */
    function initFilterHandlers() {
        // Real-time search
        let searchTimeout;
        $('.tcgp2-search-input').on('input', function() {
            clearTimeout(searchTimeout);
            const query = $(this).val();
            
            searchTimeout = setTimeout(function() {
                filterPOIs(query);
            }, 300);
        });

        // Filter by status
        $('.tcgp2-status-filter').on('change', function() {
            const status = $(this).val();
            filterPOIs(null, status);
        });

        // Filter by trail
        $('.tcgp2-trail-filter').on('change', function() {
            const trail = $(this).val();
            filterPOIs(null, null, trail);
        });
    }

    /**
     * Filter POIs based on criteria
     */
    function filterPOIs(search, status, trail) {
        const $table = $('.tcgp2-pois-table');
        const $rows = $table.find('tbody tr');
        
        $rows.each(function() {
            const $row = $(this);
            let show = true;
            
            // Search filter
            if (search) {
                const text = $row.text().toLowerCase();
                if (text.indexOf(search.toLowerCase()) === -1) {
                    show = false;
                }
            }
            
            // Status filter
            if (status && status !== 'all') {
                const rowStatus = $row.data('status');
                if (rowStatus !== status) {
                    show = false;
                }
            }
            
            // Trail filter
            if (trail && trail !== 'all') {
                const rowTrail = $row.data('trail');
                if (rowTrail !== trail) {
                    show = false;
                }
            }
            
            $row.toggle(show);
        });
        
        // Update count
        const visibleCount = $rows.filter(':visible').length;
        $('.tcgp2-poi-count').text(visibleCount);
    }

    /**
     * Show notice message
     */
    function showNotice(message, type) {
        const $notice = $('<div class="tcgp2-notice tcgp2-notice-' + type + '">' + message + '</div>');
        
        // Insert after the first h1 or at the top of the page
        const $target = $('h1').first();
        if ($target.length) {
            $target.after($notice);
        } else {
            $('.wrap').prepend($notice);
        }
        
        // Auto-remove after 5 seconds
        setTimeout(function() {
            $notice.fadeOut(function() {
                $(this).remove();
            });
        }, 5000);
    }

    /**
     * Initialize sync progress updates
     */
    function initSyncProgress() {
        if ($('.tcgp2-sync-progress').length) {
            updateSyncProgress();
        }
    }

    /**
     * Update sync progress
     */
    function updateSyncProgress() {
        $.post(ajaxurl, {
            action: 'tcgp2_get_sync_progress',
            nonce: tcgp2_ajax.nonce
        }, function(response) {
            if (response.success) {
                const progress = response.data.progress;
                const $bar = $('.tcgp2-progress-fill');
                const $text = $('.tcgp2-progress-text');
                
                $bar.css('width', progress + '%');
                $text.text(progress + '%');
                
                if (progress < 100) {
                    setTimeout(updateSyncProgress, 2000);
                } else {
                    showNotice('Sync completed successfully!', 'success');
                    setTimeout(function() {
                        location.reload();
                    }, 2000);
                }
            }
        });
    }

    /**
     * Initialize bulk actions
     */
    function initBulkActions() {
        // Select all checkbox
        $('.tcgp2-select-all').on('change', function() {
            const checked = $(this).is(':checked');
            $('.tcgp2-poi-checkbox').prop('checked', checked);
            updateBulkActionButton();
        });

        // Individual checkboxes
        $('.tcgp2-poi-checkbox').on('change', function() {
            updateBulkActionButton();
            
            // Update select all checkbox
            const totalCheckboxes = $('.tcgp2-poi-checkbox').length;
            const checkedCheckboxes = $('.tcgp2-poi-checkbox:checked').length;
            
            if (checkedCheckboxes === 0) {
                $('.tcgp2-select-all').prop('indeterminate', false).prop('checked', false);
            } else if (checkedCheckboxes === totalCheckboxes) {
                $('.tcgp2-select-all').prop('indeterminate', false).prop('checked', true);
            } else {
                $('.tcgp2-select-all').prop('indeterminate', true);
            }
        });

        // Bulk action button
        $('.tcgp2-bulk-action').on('click', function(e) {
            e.preventDefault();
            
            const action = $('.tcgp2-bulk-action-select').val();
            const selectedIds = $('.tcgp2-poi-checkbox:checked').map(function() {
                return $(this).val();
            }).get();
            
            if (selectedIds.length === 0) {
                showNotice('Please select at least one POI.', 'warning');
                return;
            }
            
            if (!action) {
                showNotice('Please select an action.', 'warning');
                return;
            }
            
            if (confirm('Are you sure you want to perform this action on ' + selectedIds.length + ' POI(s)?')) {
                performBulkAction(action, selectedIds);
            }
        });
    }

    /**
     * Update bulk action button state
     */
    function updateBulkActionButton() {
        const checkedCount = $('.tcgp2-poi-checkbox:checked').length;
        const $button = $('.tcgp2-bulk-action');
        
        if (checkedCount > 0) {
            $button.prop('disabled', false).text('Apply to ' + checkedCount + ' selected');
        } else {
            $button.prop('disabled', true).text('Apply to selected');
        }
    }

    /**
     * Perform bulk action
     */
    function performBulkAction(action, ids) {
        $.post(ajaxurl, {
            action: 'tcgp2_bulk_action',
            bulk_action: action,
            poi_ids: ids,
            nonce: tcgp2_ajax.nonce
        }, function(response) {
            if (response.success) {
                showNotice(response.data.message, 'success');
                setTimeout(function() {
                    location.reload();
                }, 1500);
            } else {
                showNotice(response.data.message || 'Bulk action failed.', 'error');
            }
        });
    }

    /**
     * Initialize test sync functionality
     */
    function initTestSync() {
        $('#test-sync-btn').on('click', function(e) {
            e.preventDefault();
            
            const $btn = $(this);
            const $form = $btn.closest('form');
            const $results = $('#test-sync-results');
            const $content = $('#test-sync-content');
            
            // Get form data
            const formData = new FormData($form[0]);
            formData.append('action', 'tcgp2_test_sync');
            formData.append('nonce', tcgp2_ajax.nonce);
            const selectedTrail = $form.find('[name="trail_id"]').val();
            
            // Show loading state
            $btn.prop('disabled', true).text('Testing...');
            $content.html('<div style="text-align: center; padding: 20px;"><span class="dashicons dashicons-update" style="animation: spin 1s linear infinite; font-size: 2em; color: #0073aa;"></span><p>Searching for eligible POIs...</p></div>');
            $results.show();
            
            if (selectedTrail === 'all') {
                // Fetch the list of trails from a hidden field or via AJAX
                $.post(tcgp2_ajax.ajaxurl, {
                    action: 'tcgp2_get_trails',
                    nonce: tcgp2_ajax.nonce
                }, function(response) {
                    if (response.success && Array.isArray(response.data.trails)) {
                        runTestSyncAllTrails(response.data.trails, formData, $btn, $content);
                    } else {
                        $content.html('<div class="tcgp2-notice tcgp2-notice-error">Could not fetch trails list.</div>');
                        $btn.prop('disabled', false).html('<span class="dashicons dashicons-search" style="margin-right: 5px;"></span>Test Sync (Preview)');
                    }
                });
            } else {
                // Single trail (existing logic)
                $.ajax({
                    url: tcgp2_ajax.ajaxurl,
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function(response) {
                        if (response.success) {
                            displayTestResults(response.data);
                        } else {
                            $content.html('<div class="tcgp2-notice tcgp2-notice-error">' + (response.data.message || 'Test sync failed.') + '</div>');
                        }
                    },
                    error: function() {
                        $content.html('<div class="tcgp2-notice tcgp2-notice-error">Network error occurred. Please try again.</div>');
                    },
                    complete: function() {
                        $btn.prop('disabled', false).html('<span class="dashicons dashicons-search" style="margin-right: 5px;"></span>Test Sync (Preview)');
                    }
                });
            }
        });
    }
    
    function runTestSyncAllTrails(trails, formData, $btn, $content) {
        let current = 0;
        let total = trails.length;
        let allResults = [];
        let totalPOIs = 0;
        let allPlacesByType = {};
        let progressHtml = '';
        $content.html('<div id="tcgp2-test-progress-bar" style="margin-bottom: 16px;"></div><div id="tcgp2-test-stepper"></div><div id="tcgp2-test-summary"></div>');
        updateTestSyncProgressBar(current, total);
        updateTestSyncStepper(trails, allResults, current);
        function next() {
            if (current >= total) {
                // All done, show summary
                displayTestSyncAllSummary(allResults, $content, totalPOIs, allPlacesByType);
                $btn.prop('disabled', false).html('<span class="dashicons dashicons-search" style="margin-right: 5px;"></span>Test Sync (Preview)');
                return;
            }
            // Prepare form data for this trail
            let fd = new FormData();
            for (let pair of formData.entries()) {
                if (pair[0] !== 'trail_id') {
                    fd.append(pair[0], pair[1]);
                }
            }
            fd.append('action', 'tcgp2_test_sync');
            fd.append('nonce', tcgp2_ajax.nonce);
            fd.append('trail_id', trails[current].routeId);
            // AJAX for this trail
            $.ajax({
                url: tcgp2_ajax.ajaxurl,
                type: 'POST',
                data: fd,
                processData: false,
                contentType: false,
                success: function(response) {
                    let result = {
                        trail: trails[current],
                        data: response.success ? response.data : null,
                        error: response.success ? null : (response.data && response.data.message ? response.data.message : 'Error')
                    };
                    allResults.push(result);
                    if (response.success && response.data) {
                        totalPOIs += response.data.total_places;
                        // Merge places_by_type
                        for (let type in response.data.places_by_type) {
                            if (!allPlacesByType[type]) allPlacesByType[type] = [];
                            allPlacesByType[type] = allPlacesByType[type].concat(response.data.places_by_type[type]);
                        }
                    }
                    current++;
                    updateTestSyncProgressBar(current, total);
                    updateTestSyncStepper(trails, allResults, current);
                    next();
                },
                error: function() {
                    allResults.push({ trail: trails[current], data: null, error: 'Network error' });
                    current++;
                    updateTestSyncProgressBar(current, total);
                    updateTestSyncStepper(trails, allResults, current);
                    next();
                }
            });
        }
        next();
    }

    function updateTestSyncProgressBar(current, total) {
        let percent = Math.round((current / total) * 100);
        $('#tcgp2-test-progress-bar').html('<div style="background:#e9ecef; border-radius:6px; height:18px; overflow:hidden;"><div style="background:#0073aa; width:' + percent + '%; height:18px; transition:width 0.3s;"></div></div><div style="text-align:right; font-size:12px; color:#666; margin-top:2px;">' + current + ' of ' + total + ' trails complete</div>');
    }

    function updateTestSyncStepper(trails, allResults, current) {
        let html = '<ol style="list-style:none; padding:0; margin:0;">';
        for (let i = 0; i < trails.length; i++) {
            let status = '';
            let result = allResults[i];
            if (i < current) {
                if (result && result.data) {
                    status = '<span style="color:#28a745;">✔</span>';
                } else {
                    status = '<span style="color:#dc3545;">✖</span>';
                }
            } else if (i === current) {
                status = '<span class="dashicons dashicons-update" style="animation: spin 1s linear infinite; color:#0073aa;"></span>';
            }
            html += '<li style="margin-bottom:6px;">' + status + ' <strong>' + trails[i].name + '</strong>';
            if (result && result.data) {
                html += ' — <span style="color:#0073aa;">' + result.data.total_places + ' POIs</span>';
            } else if (result && result.error) {
                html += ' — <span style="color:#dc3545;">' + result.error + '</span>';
            }
            html += '</li>';
        }
        html += '</ol>';
        $('#tcgp2-test-stepper').html(html);
    }

    function displayTestSyncAllSummary(allResults, $content, totalPOIs, allPlacesByType) {
        let html = '<div class="tcgp2-test-summary">';
        html += '<div class="tcgp2-test-stat">';
        html += '<div class="tcgp2-test-stat-number">' + totalPOIs + '</div>';
        html += '<div class="tcgp2-test-stat-label">Total POIs Found</div>';
        html += '</div>';
        html += '<div class="tcgp2-test-stat">';
        html += '<div class="tcgp2-test-stat-number">' + Object.keys(allPlacesByType).length + '</div>';
        html += '<div class="tcgp2-test-stat-label">Place Types</div>';
        html += '</div>';
        html += '</div>';
        if (totalPOIs > 0) {
            html += '<div class="tcgp2-test-places-by-type">';
            html += '<h5>POIs by Type (Sample)</h5>';
            Object.keys(allPlacesByType).forEach(function(type) {
                const places = allPlacesByType[type];
                html += '<div class="tcgp2-test-type-group">';
                html += '<div class="tcgp2-test-type-header">';
                html += '<span>' + type + '</span>';
                html += '<span class="tcgp2-test-type-count">' + places.length + '</span>';
                html += '</div>';
                html += '<div class="tcgp2-test-places-list">';
                places.slice(0, 5).forEach(function(place) {
                    html += '<div class="tcgp2-test-place-item">';
                    html += '<div>';
                    html += '<div class="tcgp2-test-place-name">' + place.name + '</div>';
                    html += '<div class="tcgp2-test-place-address">' + (place.formatted_address || 'No address') + '</div>';
                    html += '</div>';
                    html += '<div class="tcgp2-test-place-types">' + (place.types ? place.types.slice(0, 3).join(', ') : 'No types') + '</div>';
                    html += '</div>';
                });
                if (places.length > 5) {
                    html += '<div style="text-align: center; padding: 10px; color: #6c757d; font-style: italic;">... and ' + (places.length - 5) + ' more</div>';
                }
                html += '</div>';
                html += '</div>';
            });
            html += '</div>';
            html += '<div class="tcgp2-test-sample-note">';
            html += '<strong>Note:</strong> This preview shows basic information only. The full sync will fetch detailed address information and assign categories.';
            html += '</div>';
        } else {
            html += '<div class="tcgp2-notice tcgp2-notice-warning">';
            html += '<p>No POIs found with the current search criteria. Try adjusting the search radius or place types in Settings.</p>';
            html += '</div>';
        }
        $('#tcgp2-test-summary').html(html);
    }

    /**
     * Initialize full sync functionality
     */
    function initFullSync() {
        // Intercept sync form submit
        $('.tcgp2-form-card form').on('submit', function(e) {
            const $form = $(this);
            const selectedTrail = $form.find('[name="trail_id"]').val();
            if (selectedTrail === 'all') {
                e.preventDefault();
                const $btn = $form.find('button[type="submit"]');
                const $results = $('#test-sync-results');
                let $content = $('#test-sync-content');
                if ($content.length === 0) {
                    $results.append('<div id="test-sync-content"></div>');
                    $content = $('#test-sync-content');
                }
                $results.show();
                $btn.prop('disabled', true).text('Syncing...');
                // Fetch trails
                $.post(tcgp2_ajax.ajaxurl, {
                    action: 'tcgp2_get_trails',
                    nonce: tcgp2_ajax.nonce
                }, function(response) {
                    if (response.success && Array.isArray(response.data.trails)) {
                        runFullSyncAllTrails(response.data.trails, $form, $btn, $content);
                    } else {
                        $content.html('<div class="tcgp2-notice tcgp2-notice-error">Could not fetch trails list.</div>');
                        $btn.prop('disabled', false).html('<span class="dashicons dashicons-update" style="margin-right: 5px;"></span>Start Sync');
                    }
                });
            }
        });
    }

    function runFullSyncAllTrails(trails, $form, $btn, $content) {
        let current = 0;
        let total = trails.length;
        let allResults = [];
        let totalNew = 0;
        let totalUpdated = 0;
        $content.html('<div id="tcgp2-sync-progress-bar" style="margin-bottom: 16px;"></div><div id="tcgp2-sync-stepper"></div><div id="tcgp2-sync-summary"></div>');
        updateSyncProgressBar(current, total);
        updateSyncStepper(trails, allResults, current);
        function next() {
            if (current >= total) {
                // All done, show summary
                displaySyncAllSummary(allResults, $content, totalNew, totalUpdated);
                $btn.prop('disabled', false).html('<span class="dashicons dashicons-update" style="margin-right: 5px;"></span>Start Sync');
                return;
            }
            // Prepare form data for this trail
            let fd = new FormData($form[0]);
            fd.set('trail_id', trails[current].routeId);
            fd.set('action', 'sync_pois');
            fd.set('nonce', tcgp2_ajax.nonce);
            $.ajax({
                url: tcgp2_ajax.ajaxurl,
                type: 'POST',
                data: fd,
                processData: false,
                contentType: false,
                success: function(response) {
                    let result = {
                        trail: trails[current],
                        data: response.success ? response : null,
                        error: response.success ? null : (response.error || 'Error')
                    };
                    allResults.push(result);
                    if (response.success && response.new) totalNew += response.new;
                    if (response.success && response.updated) totalUpdated += response.updated;
                    current++;
                    updateSyncProgressBar(current, total);
                    updateSyncStepper(trails, allResults, current);
                    next();
                },
                error: function() {
                    allResults.push({ trail: trails[current], data: null, error: 'Network error' });
                    current++;
                    updateSyncProgressBar(current, total);
                    updateSyncStepper(trails, allResults, current);
                    next();
                }
            });
        }
        next();
    }

    function updateSyncProgressBar(current, total) {
        let percent = Math.round((current / total) * 100);
        $('#tcgp2-sync-progress-bar').html('<div style="background:#e9ecef; border-radius:6px; height:18px; overflow:hidden;"><div style="background:#0073aa; width:' + percent + '%; height:18px; transition:width 0.3s;"></div></div><div style="text-align:right; font-size:12px; color:#666; margin-top:2px;">' + current + ' of ' + total + ' trails complete</div>');
    }

    function updateSyncStepper(trails, allResults, current) {
        let html = '<ol style="list-style:none; padding:0; margin:0;">';
        for (let i = 0; i < trails.length; i++) {
            let status = '';
            let result = allResults[i];
            if (i < current) {
                if (result && result.data && result.data.success) {
                    status = '<span style="color:#28a745;">✔</span>';
                } else {
                    status = '<span style="color:#dc3545;">✖</span>';
                }
            } else if (i === current) {
                status = '<span class="dashicons dashicons-update" style="animation: spin 1s linear infinite; color:#0073aa;"></span>';
            }
            html += '<li style="margin-bottom:6px;">' + status + ' <strong>' + trails[i].name + '</strong>';
            if (result && result.data && result.data.success) {
                html += ' — <span style="color:#0073aa;">' + (result.data.new || 0) + ' new, ' + (result.data.updated || 0) + ' updated</span>';
            } else if (result && result.error) {
                html += ' — <span style="color:#dc3545;">' + result.error + '</span>';
            }
            html += '</li>';
        }
        html += '</ol>';
        $('#tcgp2-sync-stepper').html(html);
    }

    function displaySyncAllSummary(allResults, $content, totalNew, totalUpdated) {
        let html = '<div class="tcgp2-test-summary">';
        html += '<div class="tcgp2-test-stat">';
        html += '<div class="tcgp2-test-stat-number">' + totalNew + '</div>';
        html += '<div class="tcgp2-test-stat-label">Total New POIs</div>';
        html += '</div>';
        html += '<div class="tcgp2-test-stat">';
        html += '<div class="tcgp2-test-stat-number">' + totalUpdated + '</div>';
        html += '<div class="tcgp2-test-stat-label">Total Updated POIs</div>';
        html += '</div>';
        html += '</div>';
        html += '<div class="tcgp2-test-sample-note">';
        html += '<strong>Sync complete!</strong> You may now view or export your POIs.';
        html += '</div>';
        $('#tcgp2-sync-summary').html(html);
    }

    // Expose functions globally for AJAX callbacks
    window.TCGP2Admin = {
        showNotice: showNotice,
        updateSyncProgress: updateSyncProgress,
        filterPOIs: filterPOIs
    };

})(jQuery); 