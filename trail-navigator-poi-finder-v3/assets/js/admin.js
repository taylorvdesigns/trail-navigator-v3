/**
 * Trail Navigator POI Finder v3 Admin JavaScript
 */
(function($) {
    'use strict';
    
    // Initialize when document is ready
    $(document).ready(function() {
        TNPOIAdmin.init();
    });
    
    // Main admin object
    var TNPOIAdmin = {
        
        /**
         * Initialize admin functionality
         */
        init: function() {
            this.bindEvents();
            this.initTooltips();
        },
        
        /**
         * Bind event handlers
         */
        bindEvents: function() {
            // Settings page events
            $('.tnpoi-settings').on('change', 'select[name*="category_mapping"]', this.handleCategoryMappingChange);
            $('.tnpoi-settings').on('change', 'input[name*="place_types"]', this.handlePlaceTypesChange);
            
            // Export functionality
            $('.tnpoi-export-btn').on('click', this.handleExport);
            
            // Bulk actions
            $('.tnpoi-bulk-action').on('click', this.handleBulkAction);
            
            // Search functionality
            $('.tnpoi-search-input').on('input', this.handleSearch);
        },
        
        /**
         * Initialize tooltips
         */
        initTooltips: function() {
            $('[data-tooltip]').each(function() {
                var $element = $(this);
                var tooltipText = $element.data('tooltip');
                
                $element.on('mouseenter', function() {
                    TNPOIAdmin.showTooltip($element, tooltipText);
                }).on('mouseleave', function() {
                    TNPOIAdmin.hideTooltip();
                });
            });
        },
        
        /**
         * Show tooltip
         */
        showTooltip: function($element, text) {
            var $tooltip = $('<div class="tnpoi-tooltip">' + text + '</div>');
            $('body').append($tooltip);
            
            var offset = $element.offset();
            $tooltip.css({
                position: 'absolute',
                top: offset.top - $tooltip.outerHeight() - 5,
                left: offset.left + ($element.outerWidth() / 2) - ($tooltip.outerWidth() / 2),
                zIndex: 9999
            });
        },
        
        /**
         * Hide tooltip
         */
        hideTooltip: function() {
            $('.tnpoi-tooltip').remove();
        },
        
        /**
         * Handle category mapping changes
         */
        handleCategoryMappingChange: function() {
            var $select = $(this);
            var placeType = $select.attr('name').match(/\[([^\]]+)\]/)[1];
            var categoryId = $select.val();
            
            // You can add AJAX call here to save the mapping immediately
            console.log('Category mapping changed:', placeType, '->', categoryId);
        },
        
        /**
         * Handle place types changes
         */
        handlePlaceTypesChange: function() {
            var $checkbox = $(this);
            var placeType = $checkbox.val();
            var isChecked = $checkbox.is(':checked');
            
            // You can add AJAX call here to save the selection immediately
            console.log('Place type changed:', placeType, 'checked:', isChecked);
        },
        
        /**
         * Handle export button click
         */
        handleExport: function(e) {
            e.preventDefault();
            
            var $button = $(this);
            var format = $button.data('format') || 'geodirectory';
            var filters = TNPOIAdmin.getCurrentFilters();
            
            $button.addClass('tnpoi-loading').text('Exporting...');
            
            $.ajax({
                url: tnpoi_ajax.ajaxurl,
                type: 'POST',
                data: {
                    action: 'tnpoi_export_csv',
                    nonce: tnpoi_ajax.nonce,
                    format: format,
                    filters: filters
                },
                success: function(response) {
                    if (response.success) {
                        TNPOIAdmin.downloadCSV(response.data.content, response.data.filename);
                        TNPOIAdmin.showNotice('Export completed successfully!', 'success');
                    } else {
                        TNPOIAdmin.showNotice('Export failed: ' + response.data, 'error');
                    }
                },
                error: function() {
                    TNPOIAdmin.showNotice('Export failed. Please try again.', 'error');
                },
                complete: function() {
                    $button.removeClass('tnpoi-loading').text('Export CSV');
                }
            });
        },
        
        /**
         * Handle bulk actions
         */
        handleBulkAction: function(e) {
            e.preventDefault();
            
            var $button = $(this);
            var action = $button.data('action');
            var selectedIds = TNPOIAdmin.getSelectedPOIs();
            
            if (selectedIds.length === 0) {
                TNPOIAdmin.showNotice('Please select POIs to perform bulk actions.', 'warning');
                return;
            }
            
            if (!confirm('Are you sure you want to perform this action on ' + selectedIds.length + ' POI(s)?')) {
                return;
            }
            
            $button.addClass('tnpoi-loading');
            
            $.ajax({
                url: tnpoi_ajax.ajaxurl,
                type: 'POST',
                data: {
                    action: 'tnpoi_bulk_action',
                    nonce: tnpoi_ajax.nonce,
                    bulk_action: action,
                    poi_ids: selectedIds
                },
                success: function(response) {
                    if (response.success) {
                        TNPOIAdmin.showNotice('Bulk action completed successfully!', 'success');
                        // Reload the page or update the table
                        location.reload();
                    } else {
                        TNPOIAdmin.showNotice('Bulk action failed: ' + response.data, 'error');
                    }
                },
                error: function() {
                    TNPOIAdmin.showNotice('Bulk action failed. Please try again.', 'error');
                },
                complete: function() {
                    $button.removeClass('tnpoi-loading');
                }
            });
        },
        
        /**
         * Handle search input
         */
        handleSearch: function() {
            var query = $(this).val();
            var $table = $('.tnpoi-pois-table');
            
            if (query.length < 2) {
                $table.find('tr').show();
                return;
            }
            
            $table.find('tr').each(function() {
                var $row = $(this);
                var text = $row.text().toLowerCase();
                
                if (text.indexOf(query.toLowerCase()) !== -1) {
                    $row.show();
                } else {
                    $row.hide();
                }
            });
        },
        
        /**
         * Get current filters
         */
        getCurrentFilters: function() {
            var filters = {};
            
            $('.tnpoi-filter').each(function() {
                var $filter = $(this);
                var name = $filter.attr('name');
                var value = $filter.val();
                
                if (value && value !== '') {
                    filters[name] = value;
                }
            });
            
            return filters;
        },
        
        /**
         * Get selected POI IDs
         */
        getSelectedPOIs: function() {
            var selectedIds = [];
            
            $('.tnpoi-poi-checkbox:checked').each(function() {
                selectedIds.push($(this).val());
            });
            
            return selectedIds;
        },
        
        /**
         * Download CSV file
         */
        downloadCSV: function(content, filename) {
            var blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
            var link = document.createElement('a');
            
            if (link.download !== undefined) {
                var url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        },
        
        /**
         * Show notice message
         */
        showNotice: function(message, type) {
            var $notice = $('<div class="tnpoi-notice ' + type + '">' + message + '</div>');
            
            $('.wrap').prepend($notice);
            
            setTimeout(function() {
                $notice.fadeOut(function() {
                    $(this).remove();
                });
            }, 5000);
        },
        
        /**
         * Format number with commas
         */
        formatNumber: function(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        },
        
        /**
         * Format date
         */
        formatDate: function(dateString) {
            var date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }
    };
    
})(jQuery); 