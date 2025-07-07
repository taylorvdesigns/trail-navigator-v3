/**
 * Trail Navigator POI Finder - Map JavaScript
 * 
 * Handles map functionality and POI visualization
 */

(function($) {
    'use strict';
    
    // Global variables
    var map;
    var markers = [];
    var currentMarkers = [];
    var categoryColors = {
        'restaurant': '#e74c3c',
        'cafe': '#f39c12',
        'lodging': '#3498db',
        'park': '#27ae60',
        'museum': '#9b59b6',
        'library': '#34495e',
        'pharmacy': '#e67e22',
        'atm': '#95a5a6',
        'bank': '#16a085',
        'gas_station': '#f1c40f',
        'store': '#1abc9c',
        'tourist_attraction': '#e91e63',
        'default': '#7f8c8d'
    };
    
    // Initialize when document is ready
    $(document).ready(function() {
        if ($('#poi-map').length) {
            initializeMap();
            setupEventListeners();
        }
    });
    
    /**
     * Initialize the map
     */
    function initializeMap() {
        // Create map centered on default location
        map = L.map('poi-map').setView([39.8283, -98.5795], 4);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        // Load POIs
        loadPOIs();
    }
    
    /**
     * Load POIs from server
     */
    function loadPOIs(filters) {
        $.ajax({
            url: tnpoi_map_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'tnpoi_get_pois',
                nonce: tnpoi_map_ajax.nonce,
                filters: filters || {}
            },
            success: function(response) {
                if (response.success) {
                    addPOIMarkers(response.data);
                } else {
                    console.error('Failed to load POIs:', response.data);
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX error:', error);
            }
        });
    }
    
    /**
     * Add POI markers to map
     */
    function addPOIMarkers(pois) {
        // Clear existing markers
        clearMarkers();
        
        pois.forEach(function(poi) {
            var markerColor = categoryColors[poi.category.toLowerCase()] || categoryColors['default'];
            var markerIcon = L.divIcon({
                className: 'poi-marker',
                html: '<div style="background-color: ' + markerColor + '; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });
            
            var marker = L.marker([poi.latitude, poi.longitude], {icon: markerIcon})
                .addTo(map)
                .bindPopup(createPopupContent(poi));
            
            // Store marker reference
            marker.poiData = poi;
            markers.push(marker);
            currentMarkers.push(marker);
        });
        
        // Update visible count
        updatePOICount();
        
        // Fit map to show all POIs
        if (currentMarkers.length > 0) {
            fitMapToPOIs();
        }
    }
    
    /**
     * Create popup content for POI
     */
    function createPopupContent(poi) {
        return '<div class="poi-popup">' +
               '<h3>' + poi.name + '</h3>' +
               '<p><strong>Category:</strong> ' + poi.category + '</p>' +
               '<p><strong>Trail:</strong> ' + poi.trail_name + '</p>' +
               '<p><strong>Address:</strong> ' + poi.address + '</p>' +
               '<p><strong>Status:</strong> ' + poi.status + '</p>' +
               '<button type="button" class="button view-details-btn" data-poi-id="' + poi.id + '">View Details</button>' +
               '</div>';
    }
    
    /**
     * Clear all markers from map
     */
    function clearMarkers() {
        currentMarkers.forEach(function(marker) {
            map.removeLayer(marker);
        });
        currentMarkers = [];
    }
    
    /**
     * Fit map to show all POIs
     */
    function fitMapToPOIs() {
        if (currentMarkers.length > 0) {
            var group = new L.featureGroup(currentMarkers);
            map.fitBounds(group.getBounds().pad(0.1));
        }
    }
    
    /**
     * Update POI count display
     */
    function updatePOICount() {
        $('#visible-pois').text(currentMarkers.length);
    }
    
    /**
     * Apply filters to POIs
     */
    function applyFilters() {
        var filters = {
            category: $('#category-filter').val(),
            trail: $('#trail-filter').val(),
            status: $('#status-filter').val()
        };
        
        // Filter markers
        clearMarkers();
        
        markers.forEach(function(marker) {
            var poi = marker.poiData;
            var show = true;
            
            if (filters.category && poi.category !== filters.category) {
                show = false;
            }
            
            if (filters.trail && poi.trail_name !== filters.trail) {
                show = false;
            }
            
            if (filters.status && poi.status !== filters.status) {
                show = false;
            }
            
            if (show) {
                map.addLayer(marker);
                currentMarkers.push(marker);
            }
        });
        
        updatePOICount();
        
        if (currentMarkers.length > 0) {
            fitMapToPOIs();
        }
    }
    
    /**
     * Show POI details in modal
     */
    function showPOIDetails(poiId) {
        $.ajax({
            url: tnpoi_map_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'tnpoi_get_poi_details',
                nonce: tnpoi_map_ajax.nonce,
                poi_id: poiId
            },
            success: function(response) {
                if (response.success) {
                    var poi = response.data;
                    var content = '<div class="poi-detail">' +
                                 '<h3>' + poi.name + '</h3>' +
                                 '<table class="poi-detail-table">' +
                                 '<tr><td><strong>Category:</strong></td><td>' + poi.category + '</td></tr>' +
                                 '<tr><td><strong>Trail:</strong></td><td>' + poi.trail_name + '</td></tr>' +
                                 '<tr><td><strong>Address:</strong></td><td>' + poi.address + '</td></tr>' +
                                 '<tr><td><strong>Coordinates:</strong></td><td>' + poi.latitude + ', ' + poi.longitude + '</td></tr>' +
                                 '<tr><td><strong>Status:</strong></td><td>' + poi.status + '</td></tr>' +
                                 '</table>';
                    
                    if (poi.description) {
                        content += '<div class="poi-description"><strong>Description:</strong><p>' + poi.description + '</p></div>';
                    }
                    
                    content += '</div>';
                    
                    $('#poi-details-content').html(content);
                    $('#poi-details-modal').show();
                } else {
                    alert('Failed to load POI details');
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX error:', error);
                alert('Error loading POI details');
            }
        });
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Filter change events
        $('#category-filter, #trail-filter, #status-filter').on('change', applyFilters);
        
        // Reset filters button
        $('#reset-filters').on('click', function() {
            $('#category-filter, #trail-filter, #status-filter').val('');
            applyFilters();
        });
        
        // Fit bounds button
        $('#fit-bounds').on('click', fitMapToPOIs);
        
        // View details button clicks (delegated)
        $(document).on('click', '.view-details-btn', function() {
            var poiId = $(this).data('poi-id');
            showPOIDetails(poiId);
        });
        
        // Modal close buttons
        $('.tnpoi-modal-close, .close-modal-btn').on('click', function() {
            $('#poi-details-modal').hide();
        });
        
        // Close modal when clicking outside
        $(window).on('click', function(e) {
            if ($(e.target).hasClass('tnpoi-modal')) {
                $('.tnpoi-modal').hide();
            }
        });
        
        // Edit POI button
        $(document).on('click', '.edit-poi-btn', function() {
            // Redirect to POI manager with edit mode
            var poiId = $('#poi-details-content').find('.poi-detail').data('poi-id');
            if (poiId) {
                window.location.href = 'admin.php?page=tnpoi-poi-manager&action=edit&poi_id=' + poiId;
            }
        });
        
        // View on map button
        $(document).on('click', '.view-on-map-btn', function() {
            var poiId = $('#poi-details-content').find('.poi-detail').data('poi-id');
            if (poiId) {
                // Find and highlight the marker
                var marker = markers.find(function(m) { return m.poiData.id == poiId; });
                if (marker) {
                    map.setView([marker.poiData.latitude, marker.poiData.longitude], 15);
                    marker.openPopup();
                }
            }
            $('#poi-details-modal').hide();
        });
    }
    
    // Export functions for global access
    window.TNPOIMap = {
        initializeMap: initializeMap,
        loadPOIs: loadPOIs,
        applyFilters: applyFilters,
        showPOIDetails: showPOIDetails,
        fitMapToPOIs: fitMapToPOIs
    };
    
})(jQuery); 