/**
 * Trail Navigator POI Finder - Admin JavaScript
 * 
 * Handles AJAX requests, modals, and interactive features
 */

(function($) {
    'use strict';
    
    // Global variables
    let currentPage = 1;
    let totalPages = 1;
    let selectedPois = new Set();
    let syncInterval = null;
    let perPage = 20; // Configurable pagination
    
    // Initialize when document is ready
    $(document).ready(function() {
        initAdmin();
        
        // Add Test API Key button after the Google Places API Key field
        var $apiField = $('#google_places_api_key');
        if ($apiField.length && !$('#tnpoi-test-api-key').length) {
            var $btn = $('<button type="button" id="tnpoi-test-api-key" class="button">Test API Key</button>');
            var $msg = $('<div id="tnpoi-test-api-key-msg" style="margin-top:8px;"></div>');
            $apiField.after($btn).after($msg);
            $btn.on('click', function() {
                $msg.text('Testing API key...');
                $.ajax({
                    url: tnpoi_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'tnpoi_test_google_places_key',
                        nonce: tnpoi_ajax.nonce
                    },
                    success: function(resp) {
                        if (resp.success) {
                            $msg.html('<span style="color:green;">' + resp.data + '</span>');
                        } else {
                            $msg.html('<span style="color:red;">' + resp.data + '</span>');
                        }
                    },
                    error: function(xhr) {
                        $msg.html('<span style="color:red;">AJAX error: ' + xhr.statusText + '</span>');
                    }
                });
            });
        }
    });
    
    /**
     * Initialize admin functionality
     */
    function initAdmin() {
        // Initialize tooltips
        initTooltips();
        
        // Initialize modals
        initModals();
        
        // Initialize AJAX error handling
        initAjaxErrorHandling();
        
        // Initialize page-specific functionality
        initPageSpecific();
    }
    
    /**
     * Initialize tooltips
     */
    function initTooltips() {
        $('[data-tooltip]').each(function() {
            const $element = $(this);
            const tooltipText = $element.data('tooltip');
            
            $element.on('mouseenter', function() {
                showTooltip($element, tooltipText);
            }).on('mouseleave', function() {
                hideTooltip();
            });
        });
    }
    
    /**
     * Show tooltip
     */
    function showTooltip($element, text) {
        const tooltip = $('<div class="tnpoi-tooltip">' + text + '</div>');
        $('body').append(tooltip);
        
        const elementPos = $element.offset();
        const elementWidth = $element.outerWidth();
        const elementHeight = $element.outerHeight();
        
        tooltip.css({
            position: 'absolute',
            top: elementPos.top - tooltip.outerHeight() - 10,
            left: elementPos.left + (elementWidth / 2) - (tooltip.outerWidth() / 2),
            zIndex: 100000
        });
        
        tooltip.fadeIn(200);
    }
    
    /**
     * Hide tooltip
     */
    function hideTooltip() {
        $('.tnpoi-tooltip').fadeOut(200, function() {
            $(this).remove();
        });
    }
    
    /**
     * Initialize modals
     */
    function initModals() {
        // Close modal on background click
        $(document).on('click', '.tnpoi-modal', function(e) {
            if (e.target === this) {
                closeModal($(this));
            }
        });
        
        // Close modal on close button click
        $(document).on('click', '.tnpoi-modal-close', function() {
            closeModal($(this).closest('.tnpoi-modal'));
        });
        
        // Close modal on escape key
        $(document).on('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal($('.tnpoi-modal:visible'));
            }
        });
    }
    
    /**
     * Show modal
     */
    function showModal(modalId) {
        const $modal = $('#' + modalId);
        $modal.addClass('show').show();
        $('body').addClass('tnpoi-modal-open');
    }
    
    /**
     * Close modal
     */
    function closeModal($modal) {
        $modal.removeClass('show').hide();
        $('body').removeClass('tnpoi-modal-open');
    }
    
    /**
     * Initialize AJAX error handling
     */
    function initAjaxErrorHandling() {
        $(document).ajaxError(function(event, xhr, settings, error) {
            console.error('AJAX Error:', error);
            showNotification('An error occurred while processing your request.', 'error');
        });
    }
    
    /**
     * Initialize page-specific functionality
     */
    function initPageSpecific() {
        const currentPage = getCurrentPage();
        
        switch (currentPage) {
            case 'dashboard':
                initDashboard();
                break;
            case 'poi-manager':
                initPoiManager();
                break;
            case 'sync':
                initSync();
                break;
            case 'map-preview':
                initMapPreview();
                break;
            case 'settings':
                initSettings();
                break;
        }
    }
    
    /**
     * Get current page
     */
    function getCurrentPage() {
        const url = window.location.href;
        if (url.includes('tnpoi-poi-manager')) return 'poi-manager';
        if (url.includes('tnpoi-sync')) return 'sync';
        if (url.includes('tnpoi-map-preview')) return 'map-preview';
        if (url.includes('tnpoi-settings')) return 'settings';
        return 'dashboard';
    }
    
    /**
     * Initialize dashboard functionality
     */
    function initDashboard() {
        // Load stats
        loadDashboardStats();
        
        // Auto-refresh stats every 30 seconds
        setInterval(loadDashboardStats, 30000);
    }
    
    /**
     * Load dashboard stats
     */
    function loadDashboardStats() {
        $.ajax({
            url: tnpoi_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'tnpoi_get_stats',
                nonce: tnpoi_ajax.nonce
            },
            success: function(response) {
                if (response.success) {
                    updateDashboardStats(response.data);
                }
            }
        });
    }
    
    /**
     * Update dashboard stats
     */
    function updateDashboardStats(stats) {
        // Update stat cards
        $('.tnpoi-stat-card').each(function() {
            const $card = $(this);
            const statType = $card.data('stat');
            
            if (stats[statType] !== undefined) {
                $card.find('.tnpoi-stat-content h3').text(stats[statType]);
            }
        });
    }
    
    /**
     * Initialize POI manager functionality
     */
    function initPoiManager() {
        // Load POIs on page load
        loadPois();
        
        // Filter functionality
        $('#apply-filters').on('click', function() {
            currentPage = 1;
            loadPois();
        });
        
        $('#clear-filters').on('click', function() {
            clearFilters();
        });
        
        // Pagination selector
        $('#poi-per-page').on('change', function() {
            perPage = parseInt($(this).val());
            currentPage = 1; // Reset to first page when changing per page
            loadPois();
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
        
        // Master export checkbox logic
        $(document).on('change', '#export-all-pois', function() {
            const checked = $(this).is(':checked');
            $('.tnpoi-export-toggle').prop('checked', checked).trigger('change');
        });
        
        // Export button logic (already correct)
        $('#bulk-export').on('click', function() {
            // Export ALL POIs where ignored = 0 (checked for export) across the entire database
            // Don't send specific POI IDs - let the server query for all exportable POIs
            
            // Create a form to submit the export request
            const form = $('<form>', {
                method: 'POST',
                action: tnpoi_ajax.ajax_url,
                target: '_blank'
            });
            form.append($('<input>', {
                type: 'hidden',
                name: 'action',
                value: 'tnpoi_export_csv'
            }));
            form.append($('<input>', {
                type: 'hidden',
                name: 'nonce',
                value: tnpoi_ajax.nonce
            }));
            form.append($('<input>', {
                type: 'hidden',
                name: 'format',
                value: 'geodirectory'
            }));
            form.append($('<input>', {
                type: 'hidden',
                name: 'direct_download',
                value: '1'
            }));
            // Don't send poi_ids - this will make the server export ALL POIs where ignored = 0
            
            // Submit the form
            $('body').append(form);
            form.submit();
            form.remove();
            showNotification('Exporting all POIs checked for export...', 'info');
        });
        
        // Modal functionality
        $('#save-poi').on('click', function() {
            savePoi();
        });
    }
    
    /**
     * Load POIs
     */
    function loadPois() {
        const search = $('#poi-search').val();
        const trailId = $('#poi-trail-filter').val();
        const filterType = $('#poi-type-filter').val();
        const filterTerm = $('#poi-term-filter').val();
        const filterStatus = $('#poi-status-filter').val();
        const filterExport = $('#poi-export-filter').val();
        const sortBy = $('#poi-sort-by').val();
        const sortOrder = $('#poi-sort-order').val();
        
        $('#poi-table-body').html('<tr><td colspan="10" class="tnpoi-loading">Loading POIs...</td></tr>');
        
        $.ajax({
            url: tnpoi_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'tnpoi_get_pois',
                nonce: tnpoi_ajax.nonce,
                page: currentPage,
                per_page: perPage,
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
                    $('#poi-table-body').html('<tr><td colspan="10" class="tnpoi-loading">Error loading POIs</td></tr>');
                }
            }
        });
    }
    
    /**
     * Render POIs
     */
    function renderPois(data) {
        const tbody = $('#poi-table-body');
        tbody.empty();
        
        console.log('renderPois called, POIs:', data.pois);
        
        if (data.pois.length === 0) {
            tbody.html('<tr><td colspan="10" class="tnpoi-loading">No POIs found</td></tr>');
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
            const isExported = !parseInt(poi.ignored); // Convert to number to handle string "0"
            console.log('POI', poi.id, 'ignored:', poi.ignored, 'isExported:', isExported);
            
            // Format trail color circle
            const trailColor = getTrailColor(poi.trail_id);
            const trailCircle = poi.trail_id ? 
                `<div class="tnpoi-trail-circle" style="background-color: ${trailColor}" title="${poi.trail_name || 'Unknown Trail'}"></div>` : 
                '<div class="tnpoi-trail-circle tnpoi-trail-unknown" title="No trail assigned"></div>';
            
            // Format Google Types as badges
            const googleTypes = poi.types ? poi.types.split(',').map(type => 
                `<span class="tnpoi-type-badge">${type.trim()}</span>`
            ).join('') : '';
            
            // Format GeoDirectory Categories as editable badges
            let categoryIds = [];
            if (poi.category_ids) {
                if (poi.category_ids.trim().startsWith('[')) {
                    try {
                        categoryIds = JSON.parse(poi.category_ids).map(id => String(id).trim()).filter(Boolean);
                    } catch (e) {
                        categoryIds = [];
                    }
                } else {
                    categoryIds = poi.category_ids.split(',').map(id => id.trim()).filter(Boolean);
                }
            }
            const categoryNames = getCategoryNames(categoryIds);
            const categoryBadges = categoryNames.length > 0
                ? categoryNames.map(name => `<span class="tnpoi-category-badge">${name}</span>`).join('')
                : '';
            const unmappedClass = categoryIds.length === 0 ? 'tnpoi-category-unmapped' : '';
            
            // Only append columns (no row selection checkbox)
            row.append(`
                <td>
                    <span class="tnpoi-status-badge ${statusClass}">${statusDisplay}</span>
                </td>
                <td>
                    <input type="checkbox" class="tnpoi-export-toggle" data-poi-id="${poi.id}" ${isExported ? 'checked' : ''}>
                </td>
                <td>
                    <div class="tnpoi-poi-name">${poi.name}</div>
                    <div class="tnpoi-poi-place-id">${poi.place_id || ''}</div>
                </td>
                <td>
                    ${trailCircle}
                </td>
                <td><span class="tnpoi-poi-address">${poi.address || ''}</span></td>
                <td>
                    <div class="tnpoi-poi-position">${positionDisplay}</div>
                </td>
                <td>
                    <div class="tnpoi-google-types">${googleTypes}</div>
                </td>
                <td>
                    <div class="tnpoi-categories-container ${unmappedClass}" data-poi-id="${poi.id}">
                        <div class="tnpoi-categories-display">${categoryBadges}</div>
                        <button type="button" class="tnpoi-edit-categories button button-small">Edit</button>
                    </div>
                </td>
                <td>${new Date(poi.created_at).toLocaleDateString()}</td>
                <td class="tnpoi-poi-actions">
                    <button type="button" class="button button-small button-link-delete delete-poi" data-poi-id="${poi.id}">Delete</button>
                </td>
            `);
            tbody.append(row);
            console.log('Appended row HTML:', row.html());
        });
        
        // Update pagination
        totalPages = data.pages;
        updatePagination(data);
        
        // Bind events
        $('.tnpoi-export-toggle').on('change', function() {
            const poiId = $(this).data('poi-id');
            const ignored = $(this).is(':checked') ? 0 : 1; // checked = include in export (ignored = 0)
            console.log('Toggling export status for POI', poiId, 'to ignored =', ignored);
            toggleExportStatus(poiId, ignored);
        });
        
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
        
        // Bind category editing (delegated)
        $(document).on('click', '.tnpoi-edit-categories', function() {
            const poiId = $(this).closest('.tnpoi-categories-container').data('poi-id');
            console.log('Category Edit button clicked for POI:', poiId);
            showCategoryEditModal(poiId);
        });
    }
    
    /**
     * Update pagination
     */
    function updatePagination(data) {
        const start = (currentPage - 1) * perPage + 1;
        const end = Math.min(currentPage * perPage, data.total);
        
        $('#showing-start').text(start);
        $('#showing-end').text(end);
        $('#total-pois').text(data.total);
        $('#current-page').text(currentPage);
        $('#total-pages').text(totalPages);
        
        $('#prev-page').prop('disabled', currentPage <= 1);
        $('#next-page').prop('disabled', currentPage >= totalPages);
    }
    
    /**
     * Load POI for editing
     */
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
                    showModal('poi-edit-modal');
                }
            }
        });
    }
    
    /**
     * Save POI
     */
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
                    closeModal($('#poi-edit-modal'));
                    loadPois();
                    showNotification('POI updated successfully', 'success');
                } else {
                    showNotification('Error updating POI: ' + response.data, 'error');
                }
            }
        });
    }
    
    /**
     * Delete POI
     */
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
                    showNotification('POI deleted successfully', 'success');
                } else {
                    showNotification('Error deleting POI: ' + response.data, 'error');
                }
            }
        });
    }
    
    /**
     * Clear filters
     */
    function clearFilters() {
        $('#poi-search').val('');
        $('#poi-trail-filter').val('');
        $('#poi-type-filter').val('');
        $('#poi-term-filter').val('');
        $('#poi-status-filter').val('');
        $('#poi-export-filter').val('');
        $('#poi-sort-by').val('created_at');
        $('#poi-sort-order').val('DESC');
        $('#poi-per-page').val('20');
        perPage = 20;
        currentPage = 1;
        loadPois();
    }
    
    /**
     * Get trail color for trail ID
     */
    function getTrailColor(trailId) {
        // Default trail colors - can be made configurable later
        const trailColors = {
            'green': '#4CAF50',
            'blue': '#2196F3', 
            'red': '#F44336',
            'orange': '#FF9800',
            'purple': '#9C27B0',
            'yellow': '#FFEB3B',
            'brown': '#795548',
            'pink': '#E91E63'
        };
        
        if (!trailId) return '#999';
        
        // Try to match trail ID to color
        const trailName = trailId.toLowerCase();
        for (const [colorName, colorValue] of Object.entries(trailColors)) {
            if (trailName.includes(colorName)) {
                return colorValue;
            }
        }
        
        // Default color based on trail ID hash
        let hash = 0;
        for (let i = 0; i < trailId.length; i++) {
            hash = trailId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 70%, 50%)`;
    }
    
    /**
     * Get category names from category IDs
     */
    function getCategoryNames(categoryIds) {
        const categories = window.tnpoiGeodirCategories || {};
        return categoryIds
            .map(id => categories[id] ? categories[id] : null)
            .filter(name => !!name);
    }
    
    /**
     * Show category edit modal
     */
    function showCategoryEditModal(poiId) {
        console.log('showCategoryEditModal called for POI:', poiId);
        console.log('window.tnpoiGeodirCategories:', window.tnpoiGeodirCategories);
        
        const categories = window.tnpoiGeodirCategories || {};
        console.log('categories object:', categories);
        
        const $modal = $('#tnpoi-category-modal');
        console.log('Modal element found:', $modal.length > 0);
        console.log('Modal display style:', $modal.css('display'));
        
        const $badgeList = $('#tnpoi-category-badge-list');
        console.log('Badge list element found:', $badgeList.length > 0);
        
        const $poiRow = $(`.tnpoi-categories-container[data-poi-id="${poiId}"]`).closest('tr');
        console.log('POI row found:', $poiRow.length > 0);
        
        const currentIds = [];
        // Get current category IDs from the row
        $poiRow.find('.tnpoi-categories-display .tnpoi-category-badge').each(function() {
            const text = $(this).text().trim();
            console.log('Found category badge text:', text);
            for (const [id, name] of Object.entries(categories)) {
                if (name === text) currentIds.push(id);
            }
        });
        console.log('Current category IDs:', currentIds);
        
        $('#tnpoi-category-modal-poi-id').val(poiId);
        $badgeList.empty();
        
        console.log('Creating category badges...');
        let badgeCount = 0;
        Object.entries(categories).forEach(([id, name]) => {
            const badge = $(`<span class="tnpoi-category-badge-selectable" data-cat-id="${id}">${name}</span>`);
            if (currentIds.includes(id)) badge.addClass('selected');
            badge.on('click', function() {
                $(this).toggleClass('selected');
            });
            $badgeList.append(badge);
            badgeCount++;
        });
        console.log('Created', badgeCount, 'category badges');
        console.log('Badge list HTML length:', $badgeList.html().length);
        
        console.log('About to show modal...');
        $modal.show();
        console.log('Modal show() called. Current display style:', $modal.css('display'));
        console.log('Modal z-index:', $modal.css('z-index'));
        console.log('Modal position:', $modal.css('position'));
        console.log('Modal visibility:', $modal.css('visibility'));
        console.log('Modal opacity:', $modal.css('opacity'));
        
        // Force modal to be visible and on top
        $modal.css({
            'display': 'flex',
            'z-index': '999999',
            'visibility': 'visible',
            'opacity': '1'
        });
        console.log('Modal forced to show. Final display style:', $modal.css('display'));
        
        // Test if modal is actually visible
        setTimeout(() => {
            const modalVisible = $modal.is(':visible');
            console.log('Modal is visible after timeout:', modalVisible);
            if (!modalVisible) {
                alert('Modal is not visible! This might be a CSS issue.');
            }
        }, 100);
    }
    
    // Modal open/close logic
    $(document).on('click', '.tnpoi-modal-close', function() {
        $(this).closest('.tnpoi-modal').hide();
    });
    $(document).on('click', function(e) {
        if ($(e.target).hasClass('tnpoi-modal')) {
            $(e.target).hide();
        }
    });

    // Save categories via AJAX
    $('#tnpoi-category-save').on('click', function() {
        const poiId = $('#tnpoi-category-modal-poi-id').val();
        const selectedIds = [];
        $('#tnpoi-category-badge-list .tnpoi-category-badge-selectable.selected').each(function() {
            selectedIds.push($(this).data('cat-id'));
        });
        $.ajax({
            url: tnpoi_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'tnpoi_update_poi_categories',
                nonce: tnpoi_ajax.nonce,
                poi_id: poiId,
                category_ids: JSON.stringify(selectedIds)
            },
            success: function(response) {
                if (response.success) {
                    // Update the row display
                    const $container = $(`.tnpoi-categories-container[data-poi-id="${poiId}"]`);
                    const $display = $container.find('.tnpoi-categories-display');
                    $display.empty();
                    if (selectedIds.length === 0) {
                        $container.addClass('tnpoi-category-unmapped');
                    } else {
                        $container.removeClass('tnpoi-category-unmapped');
                        selectedIds.forEach(id => {
                            if (window.tnpoiGeodirCategories[id]) {
                                $display.append(`<span class="tnpoi-category-badge">${window.tnpoiGeodirCategories[id]}</span>`);
                            }
                        });
                    }
                    $('#tnpoi-category-modal').hide();
                } else {
                    console.error('AJAX error (success=false):', response);
                    alert('Error saving categories: ' + response.data);
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX error:', xhr, status, error);
                alert('Error saving categories.');
            }
        });
    });
    
    /**
     * Toggle export status
     */
    function toggleExportStatus(poiId, ignored) {
        console.log('AJAX: Sending export status for POI', poiId, 'ignored:', ignored);
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
                console.log('AJAX response for export status:', response);
                if (response.success) {
                    showNotification('Export status updated successfully', 'success');
                } else {
                    showNotification('Error updating export status: ' + response.data, 'error');
                    // Revert the checkbox
                    loadPois();
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX error updating export status:', status, error);
                showNotification('Error updating export status', 'error');
                // Revert the checkbox
                loadPois();
            }
        });
    }
    
    /**
     * Initialize sync functionality
     */
    function initSync() {
        // Load initial stats
        loadSyncStats();
        
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
        $('#save-search-term').on('click', function() {
            saveSearchTerm();
        });
    }
    
    /**
     * Load sync stats
     */
    function loadSyncStats() {
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
    
    /**
     * Show search term modal
     */
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
        showModal('search-term-modal');
    }
    
    /**
     * Save search term
     */
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
                    closeModal($('#search-term-modal'));
                    renderSearchTerms();
                    loadSyncStats();
                    showNotification('Search term saved successfully', 'success');
                } else {
                    showNotification('Error saving search term: ' + response.data, 'error');
                }
            }
        });
    }
    
    /**
     * Delete search term
     */
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
                    loadSyncStats();
                    showNotification('Search term deleted successfully', 'success');
                } else {
                    showNotification('Error deleting search term: ' + response.data, 'error');
                }
            }
        });
    }
    
    /**
     * Start sync
     */
    function startSync() {
        if (searchTerms.length === 0) {
            showNotification('Please add at least one search term before starting sync.', 'warning');
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
                    showNotification('Error starting sync: ' + response.data, 'error');
                    stopSync();
                }
            }
        });
    }
    
    /**
     * Stop sync
     */
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
    
    /**
     * Test sync
     */
    function testSync() {
        if (searchTerms.length === 0) {
            showNotification('Please add at least one search term before testing sync.', 'warning');
            return;
        }
        
        showNotification('Test sync would process the first search term only. This feature is coming soon.', 'info');
    }
    
    /**
     * Start progress polling
     */
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
                            loadSyncStats();
                            updateLastSyncTime();
                        }
                    }
                }
            });
        }, 2000);
    }
    
    /**
     * Update progress
     */
    function updateProgress(progress) {
        if (progress.total > 0) {
            const percentage = Math.round((progress.current / progress.total) * 100);
            $('#progress-fill').css('width', percentage + '%');
            $('#progress-text').text(percentage + '% - ' + progress.message);
        }
        
        updateSyncStatus(progress.status, progress.message);
    }
    
    /**
     * Update sync status
     */
    function updateSyncStatus(status, message) {
        const dot = $('#sync-status-dot');
        const text = $('#sync-status-text');
        
        dot.removeClass('syncing error').addClass(status);
        text.text(message);
    }
    
    /**
     * Update last sync time
     */
    function updateLastSyncTime() {
        $('#last-sync-time').text(new Date().toLocaleString());
    }
    
    /**
     * Initialize map preview functionality
     */
    function initMapPreview() {
        // Map functionality is handled by the template
        // This is a placeholder for future enhancements
    }
    
    /**
     * Initialize settings functionality
     */
    function initSettings() {
        // Cleanup old POIs
        $('#cleanup-old-pois').on('click', function() {
            if (confirm('Are you sure you want to cleanup old POIs? This action cannot be undone.')) {
                $.ajax({
                    url: tnpoi_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'tnpoi_cleanup_old_pois',
                        nonce: tnpoi_ajax.nonce
                    },
                    success: function(response) {
                        if (response.success) {
                            showNotification('Cleanup completed: ' + response.data + ' POIs removed', 'success');
                            location.reload();
                        } else {
                            showNotification('Error during cleanup: ' + response.data, 'error');
                        }
                    }
                });
            }
        });
        
        // Export all POIs
        $('#export-all-pois').on('click', function() {
            const format = $('#export_format').val();
            const url = tnpoi_ajax.ajax_url + '?action=tnpoi_export_' + format + '&nonce=' + tnpoi_ajax.nonce;
            window.open(url, '_blank');
        });
    }
    
    /**
     * Show notification
     */
    function showNotification(message, type = 'info') {
        const notification = $('<div class="tnpoi-notice tnpoi-notice-' + type + '">' + message + '</div>');
        $('body').append(notification);
        
        notification.css({
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 100001,
            maxWidth: '400px',
            padding: '15px 20px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            animation: 'slideInRight 0.3s ease'
        });
        
        // Auto-remove after 5 seconds
        setTimeout(function() {
            notification.fadeOut(300, function() {
                $(this).remove();
            });
        }, 5000);
        
        // Remove on click
        notification.on('click', function() {
            $(this).fadeOut(300, function() {
                $(this).remove();
            });
        });
    }
    
    /**
     * Utility function to format numbers
     */
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    
    /**
     * Utility function to format dates
     */
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }
    
    /**
     * Utility function to validate coordinates
     */
    function validateCoordinates(lat, lng) {
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        
        return !isNaN(latNum) && !isNaN(lngNum) && 
               latNum >= -90 && latNum <= 90 && 
               lngNum >= -180 && lngNum <= 180;
    }
    
    /**
     * Utility function to calculate distance between coordinates
     */
    function calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
})(jQuery); 