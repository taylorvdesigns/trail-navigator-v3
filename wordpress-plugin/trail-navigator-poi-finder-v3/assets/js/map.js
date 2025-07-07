/**
 * Trail Navigator POI Finder - Map JavaScript
 * 
 * Handles map functionality and trail visualization
 */

(function($) {
    'use strict';
    
    console.log('TNPOI Map JS: Script loaded');
    
    // Global variables
    var map;
    var trailLine = null;
    var markers = [];
    var searchAreaCircles = [];
    var syncPreviewData = null;
    
    // Initialize when document is ready
    $(document).ready(function() {
        console.log('TNPOI Map JS: Document ready');
        console.log('TNPOI Map JS: Map container exists:', $('#poi-map').length > 0);
        console.log('TNPOI Map JS: Leaflet available:', typeof L !== 'undefined');
        console.log('TNPOI Map JS: jQuery available:', typeof $ !== 'undefined');
        
        if ($('#poi-map').length) {
            if (typeof L === 'undefined') {
                console.error('TNPOI Map JS: Leaflet not loaded!');
                $('#poi-map').html('<div style="padding: 20px; text-align: center; color: red;">Error: Map library not loaded. Please refresh the page.</div>');
                return;
            }
            
            console.log('TNPOI Map JS: Initializing map');
            initializeMap();
            setupEventListeners();
        } else {
            console.log('TNPOI Map JS: No map container found');
        }
        
        // Initialize map preview controls from persistent settings
        if (window.tnpoi_map_preview_settings) {
            $('#search-radius').val(window.tnpoi_map_preview_settings.search_radius);
            $('#osm-analysis-radius').val(window.tnpoi_map_preview_settings.osm_analysis_radius);
            $('#coordinate-interval').val(window.tnpoi_map_preview_settings.coordinate_interval);
            $('#food-dining-weight').val(window.tnpoi_map_preview_settings.food_dining_weight).siblings('.weight-value').text(window.tnpoi_map_preview_settings.food_dining_weight);
            $('#parks-recreation-weight').val(window.tnpoi_map_preview_settings.parks_recreation_weight).siblings('.weight-value').text(window.tnpoi_map_preview_settings.parks_recreation_weight);
            $('#shopping-weight').val(window.tnpoi_map_preview_settings.shopping_weight).siblings('.weight-value').text(window.tnpoi_map_preview_settings.shopping_weight);
            $('#services-weight').val(window.tnpoi_map_preview_settings.services_weight).siblings('.weight-value').text(window.tnpoi_map_preview_settings.services_weight);
            $('#hot-zone-threshold').val(window.tnpoi_map_preview_settings.hot_threshold);
            $('#warm-zone-threshold').val(window.tnpoi_map_preview_settings.warm_threshold);
            if (window.tnpoi_map_preview_settings.enable_adaptive_sampling) {
                $('#enable-adaptive-sampling').prop('checked', true);
                $('#zone-controls').show();
            } else {
                $('#enable-adaptive-sampling').prop('checked', false);
                $('#zone-controls').hide();
            }
        }
    });
    
    /**
     * Initialize the map
     */
    function initializeMap() {
        console.log('TNPOI Map JS: initializeMap called');
        console.log('TNPOI Map JS: tnpoiMapData:', window.tnpoiMapData);
        
        // Get center from PHP data or use default
        var centerLat = 39.8283;
        var centerLng = -98.5795;
        var zoom = 4;
        
        if (window.tnpoiMapData && window.tnpoiMapData.selectedTrail) {
            console.log('TNPOI Map JS: Using trail data for center');
            console.log('TNPOI Map JS: Selected trail:', window.tnpoiMapData.selectedTrail);
            
            // Use trail center if available
            var trail = window.tnpoiMapData.selectedTrail;
            
            // Check different possible property names for track points
            var trackPoints = trail.trackPoints || trail.track_points || trail.points || trail.coordinates || [];
            console.log('TNPOI Map JS: Track points found:', trackPoints.length);
            
            if (trackPoints && trackPoints.length > 0) {
                var firstPoint = trackPoints[0];
                console.log('TNPOI Map JS: First point:', firstPoint);
                
                // Check different possible property names for lat/lng
                var lat = firstPoint.lat || firstPoint.latitude || firstPoint.lat;
                var lng = firstPoint.lng || firstPoint.longitude || firstPoint.lng;
                
                if (lat && lng) {
                    centerLat = parseFloat(lat);
                    centerLng = parseFloat(lng);
                    zoom = 10;
                    console.log('TNPOI Map JS: Trail center:', centerLat, centerLng, zoom);
                } else {
                    console.log('TNPOI Map JS: Could not parse lat/lng from first point');
                }
            } else {
                console.log('TNPOI Map JS: No track points found in trail data');
            }
        } else {
            console.log('TNPOI Map JS: Using default center');
        }
        
        // Create map centered on calculated location
        console.log('TNPOI Map JS: Creating map at:', centerLat, centerLng, zoom);
        map = L.map('poi-map').setView([centerLat, centerLng], zoom);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        console.log('TNPOI Map JS: Map created successfully');
        
        // Add trail line if trail data is available
        if (window.tnpoiMapData && window.tnpoiMapData.selectedTrail) {
            var trail = window.tnpoiMapData.selectedTrail;
            var trackPoints = trail.trackPoints || trail.track_points || trail.points || trail.coordinates || [];
            
            if (trackPoints && trackPoints.length > 0) {
                console.log('TNPOI Map JS: Adding trail line with', trackPoints.length, 'points');
                addTrailLine(trackPoints);
            } else {
                console.log('TNPOI Map JS: No track points available for trail line');
            }
        } else {
            console.log('TNPOI Map JS: No trail data available');
        }
    }
    
    /**
     * Add trail line to map
     */
    function addTrailLine(trackPoints) {
        if (!trackPoints || trackPoints.length < 2) {
            console.log('TNPOI Map JS: Not enough track points for trail line');
            return;
        }
        
        console.log('TNPOI Map JS: Processing', trackPoints.length, 'track points');
        
        var trailCoords = trackPoints.map(function(point, index) {
            // Check different possible property names for lat/lng
            var lat = point.lat || point.latitude || point.lat;
            var lng = point.lng || point.longitude || point.lng;
            
            if (!lat || !lng) {
                console.log('TNPOI Map JS: Invalid point at index', index, ':', point);
                return null;
            }
            
            return [parseFloat(lat), parseFloat(lng)];
        }).filter(function(coord) {
            return coord !== null;
        });
        
        console.log('TNPOI Map JS: Valid coordinates:', trailCoords.length);
        
        if (trailCoords.length < 2) {
            console.log('TNPOI Map JS: Not enough valid coordinates for trail line');
            return;
        }
        
        trailLine = L.polyline(trailCoords, {
            color: '#2271b1',
            weight: 4,
            opacity: 0.8
        }).addTo(map);
        
        console.log('TNPOI Map JS: Trail line added successfully');
        
        // Fit map to trail bounds
        map.fitBounds(trailLine.getBounds().pad(0.1));
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Mode switching
        $('input[name="map-mode"]').on('change', function() {
            var mode = $(this).val();
            switchMapMode(mode);
        });
        
        // Trail view controls
        $('#fit-trail-bounds').on('click', fitTrailBounds);
        $('#load-pois').on('click', loadPOIs);
        
        // Sync preview controls
        $('#update-sync-preview').on('click', updateSyncPreview);
        $('#start-sync-from-preview').on('click', startSyncFromPreview);
        
        // Zone discovery controls
        $('#enable-adaptive-sampling').on('change', function() {
            if ($(this).is(':checked')) {
                $('#zone-controls').show();
            } else {
                $('#zone-controls').hide();
                clearZoneMarkers();
            }
        });
        
        // Weight sliders
        $('.weight-slider').on('input', function() {
            var value = $(this).val();
            $(this).siblings('.weight-value').text(value);
        });
        
        // Zone discovery button
        $('#discover-zones').on('click', discoverZones);
        $('#export-zone-data').on('click', exportZoneData);
        
        // Save as Default button handler
        $('#save-map-preview-defaults').on('click', function() {
            var settings = {
                search_radius: parseInt($('#search-radius').val(), 10),
                osm_analysis_radius: parseInt($('#osm-analysis-radius').val(), 10),
                coordinate_interval: parseInt($('#coordinate-interval').val(), 10),
                food_dining_weight: parseInt($('#food-dining-weight').val(), 10),
                parks_recreation_weight: parseInt($('#parks-recreation-weight').val(), 10),
                shopping_weight: parseInt($('#shopping-weight').val(), 10),
                services_weight: parseInt($('#services-weight').val(), 10),
                hot_threshold: parseInt($('#hot-zone-threshold').val(), 10),
                warm_threshold: parseInt($('#warm-zone-threshold').val(), 10),
                enable_adaptive_sampling: $('#enable-adaptive-sampling').is(':checked') ? 1 : 0
            };
            $.ajax({
                url: tnpoi_map_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'tnpoi_save_map_preview_settings',
                    nonce: tnpoi_map_ajax.nonce,
                    settings: settings
                },
                success: function(response) {
                    if (response.success) {
                        alert('Map Preview settings saved as default!');
                    } else {
                        alert('Error saving settings: ' + (response.data || 'Unknown error'));
                    }
                },
                error: function(xhr, status, error) {
                    alert('AJAX error: ' + error);
                }
            });
        });
    }
    
    /**
     * Switch between trail view and sync preview modes
     */
    function switchMapMode(mode) {
        if (mode === 'trail-view') {
            $('#trail-view-controls').show();
            $('#sync-preview-controls').hide();
            $('#poi-stats').hide();
            $('#sync-preview-stats').hide();
            
            // Clear sync preview elements
            clearSearchAreas();
        } else if (mode === 'sync-preview') {
            $('#trail-view-controls').hide();
            $('#sync-preview-controls').show();
            $('#poi-stats').hide();
            $('#sync-preview-stats').show();
            
            // Load sync preview
            loadSyncPreview();
        }
    }
    
    /**
     * Fit map to trail bounds
     */
    function fitTrailBounds() {
        if (trailLine) {
            map.fitBounds(trailLine.getBounds().pad(0.1));
        }
    }
    
    /**
     * Load POIs for the selected trail
     */
    function loadPOIs() {
        if (!window.tnpoiMapData || !window.tnpoiMapData.selectedTrail) {
            alert('Please select a trail first');
            return;
        }
        
        var trailId = window.tnpoiMapData.selectedTrail.routeId;
        
        $.ajax({
            url: tnpoi_map_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'tnpoi_get_pois_map_preview',
                nonce: tnpoi_map_ajax.nonce,
                filters: {
                    trail: trailId
                }
            },
            success: function(response) {
                if (response.success) {
                    addPOIMarkers(response.data);
                    $('#poi-stats').show();
                    $('#poi-count-display').text(response.data.length);
                } else {
                    console.error('Failed to load POIs:', response.data);
                    $('#poi-stats').show();
                    $('#poi-count-display').text('0');
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX error:', error);
                $('#poi-stats').show();
                $('#poi-count-display').text('0');
            }
        });
    }
    
    /**
     * Add POI markers to map
     */
    function addPOIMarkers(pois) {
        // Clear existing markers
        clearMarkers();
        
        if (!pois || pois.length === 0) {
            console.log('No POIs to display');
            return;
        }
        
        pois.forEach(function(poi) {
            var markerIcon = L.divIcon({
                className: 'poi-marker',
                html: '<div style="background-color: #e74c3c; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });
            
            var marker = L.marker([parseFloat(poi.latitude), parseFloat(poi.longitude)], {icon: markerIcon})
                .addTo(map)
                .bindPopup('<div class="poi-popup"><h3>' + poi.name + '</h3><p>' + (poi.address || 'No address') + '</p></div>');
            
            markers.push(marker);
        });
    }
    
    /**
     * Clear all markers from map
     */
    function clearMarkers() {
        markers.forEach(function(marker) {
            map.removeLayer(marker);
        });
        markers = [];
    }
    
    /**
     * Load sync preview data
     */
    function loadSyncPreview() {
        if (!window.tnpoiMapData || !window.tnpoiMapData.selectedTrail) {
            alert('Please select a trail first');
            return;
        }
        
        var trailId = window.tnpoiMapData.selectedTrail.routeId;
        var searchRadius = $('#search-radius').val();
        var coordinateInterval = $('#coordinate-interval').val();
        var enableAdaptive = $('#enable-adaptive-sampling').is(':checked');
        
        // Convert meters to miles for display
        var intervalMiles = (coordinateInterval / 1609.34).toFixed(1);
        console.log('TNPOI Map JS: Loading sync preview with radius:', searchRadius + 'm', 'interval:', intervalMiles + ' miles (' + coordinateInterval + 'm)', 'adaptive:', enableAdaptive);
        console.log('TNPOI Map JS: Checkbox element exists:', $('#enable-adaptive-sampling').length > 0);
        console.log('TNPOI Map JS: Checkbox checked state:', $('#enable-adaptive-sampling').is(':checked'));
        
        var ajaxData = {
            action: 'tnpoi_get_sync_preview',
            nonce: tnpoi_map_ajax.nonce,
            trail_id: trailId,
            search_radius: searchRadius,
            osm_analysis_radius: $('#osm-analysis-radius').val(),
            coordinate_interval: coordinateInterval,
            enable_adaptive: enableAdaptive
        };
        
        console.log('TNPOI Map JS: AJAX data being sent:', ajaxData);
        
        $.ajax({
            url: tnpoi_map_ajax.ajax_url,
            type: 'POST',
            data: ajaxData,
            timeout: 300000, // 5 minutes timeout
            success: function(response) {
                console.log('TNPOI Map JS: AJAX response received:', response);
                if (response.success) {
                    syncPreviewData = response.data;
                    console.log('TNPOI Map JS: Sync preview loaded:', syncPreviewData);
                    console.log('TNPOI Map JS: Sampled points count:', syncPreviewData.sampled_points ? syncPreviewData.sampled_points.length : 0);
                    if (syncPreviewData.sampled_points && syncPreviewData.sampled_points.length > 0) {
                        console.log('TNPOI Map JS: First sampled point:', syncPreviewData.sampled_points[0]);
                    }
                    displaySyncPreview(syncPreviewData);
                } else {
                    console.error('Failed to load sync preview:', response.data);
                }
            },
            error: function(xhr, status, error) {
                console.error('TNPOI Map JS: AJAX error - Status:', status, 'Error:', error);
                console.error('TNPOI Map JS: XHR status:', xhr.status);
                console.error('TNPOI Map JS: XHR responseText:', xhr.responseText);
                if (status === 'timeout') {
                    console.error('TNPOI Map JS: Request timed out - adaptive sampling is taking too long');
                }
            },
            beforeSend: function() {
                console.log('TNPOI Map JS: Starting AJAX request...');
            },
            complete: function(xhr, status) {
                console.log('TNPOI Map JS: AJAX request completed with status:', status);
            }
        });
    }
    
    /**
     * Display sync preview on map
     */
    function displaySyncPreview(data) {
        console.log('TNPOI Map JS: displaySyncPreview called with data:', data);
        clearSearchAreas();
        
        if (!data || !data.sampled_points || !Array.isArray(data.sampled_points)) {
            console.error('TNPOI Map JS: Invalid data structure for sync preview');
            return;
        }
        
        console.log('TNPOI Map JS: Displaying sync preview with', data.sampled_points.length, 'hotspots');
        console.log('TNPOI Map JS: Adaptive sampling:', data.adaptive_sampling);
        if (data.sampled_points.length > 0) {
            console.log('TNPOI Map JS: Sample data:', data.sampled_points[0]); // Log first point for debugging
        }
        
        // Add sampled points as markers
        data.sampled_points.forEach(function(point, index) {
            // Determine marker size and color based on density
            var markerSize = 10;
            var markerColor = '#0073aa';
            var circleColor = '#0073aa';
            var circleOpacity = 0.15;
            
            console.log('TNPOI Map JS: Processing point', index, 'density_score:', point.density_score, 'search_radius:', point.search_radius);
            
            if (data.adaptive_sampling && point.density_score !== undefined) {
                console.log('TNPOI Map JS: Applying adaptive styling for point', index, 'density:', point.density_score);
                
                // Adjust marker size based on density
                if (point.density_score > 0.7) {
                    markerSize = 14;
                    markerColor = '#e74c3c'; // Red for high density
                    circleColor = '#e74c3c';
                    circleOpacity = 0.2;
                    console.log('TNPOI Map JS: High density styling applied');
                } else if (point.density_score > 0.4) {
                    markerSize = 12;
                    markerColor = '#f39c12'; // Orange for medium density
                    circleColor = '#f39c12';
                    circleOpacity = 0.18;
                    console.log('TNPOI Map JS: Medium density styling applied');
                } else if (point.density_score < 0.2) {
                    markerSize = 8;
                    markerColor = '#27ae60'; // Green for low density
                    circleColor = '#27ae60';
                    circleOpacity = 0.12;
                    console.log('TNPOI Map JS: Low density styling applied');
                }
            } else {
                console.log('TNPOI Map JS: Using default styling (no adaptive sampling or no density score)');
            }
            
            var markerIcon = L.divIcon({
                className: 'sampled-point-marker',
                html: '<div style="background-color: ' + markerColor + '; width: ' + markerSize + 'px; height: ' + markerSize + 'px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                iconSize: [markerSize, markerSize],
                iconAnchor: [markerSize/2, markerSize/2]
            });
            
            var popupContent = '<div class="hotspot-popup"><strong>Hotspot ' + (index + 1) + '</strong><br>Search Radius: ' + point.search_radius + 'm<br>Coordinates: ' + point.lat.toFixed(6) + ', ' + point.lng.toFixed(6);
            
            if (data.adaptive_sampling && point.density_score !== undefined) {
                var densityLabel = 'Low';
                if (point.density_score > 0.7) densityLabel = 'High';
                else if (point.density_score > 0.4) densityLabel = 'Medium';
                
                popupContent += '<br>Density: ' + densityLabel + ' (' + (point.density_score * 100).toFixed(0) + '%)';
            }
            
            popupContent += '</div>';
            
            var marker = L.marker([point.lat, point.lng], {icon: markerIcon})
                .addTo(map)
                .bindPopup(popupContent);
            
            // Add search radius circle
            console.log('TNPOI Map JS: Creating circle for point', index, 'with radius:', point.search_radius, 'm');
            console.log('TNPOI Map JS: Point data:', point);
            
            if (point.search_radius && point.search_radius > 0) {
                console.log('TNPOI Map JS: Creating circle with radius:', point.search_radius, 'color:', circleColor, 'opacity:', circleOpacity);
                var circle = L.circle([point.lat, point.lng], {
                    color: circleColor,
                    fillColor: circleColor,
                    fillOpacity: circleOpacity,
                    radius: point.search_radius,
                    weight: 2
                }).addTo(map);
                
                // Verify the circle was created with correct radius
                console.log('TNPOI Map JS: Circle created with radius:', circle.getRadius(), 'expected:', point.search_radius);
                
                searchAreaCircles.push(circle);
                console.log('TNPOI Map JS: Circle added successfully for point', index, 'circle object:', circle);
            } else {
                console.warn('TNPOI Map JS: No valid search radius for point', index, 'radius:', point.search_radius);
            }
        });
        
        // Update stats
        $('#sampled-points-display').text(data.total_points);
        $('#api-calls-display').text(data.estimated_api_calls);
        
        // Fit map to show all hotspots if there are any
        if (data.sampled_points.length > 0) {
            var bounds = L.latLngBounds(data.sampled_points.map(function(point) {
                return [point.lat, point.lng];
            }));
            map.fitBounds(bounds.pad(0.1));
        }
        
        console.log('TNPOI Map JS: Sync preview display complete');
    }
    
    /**
     * Clear search area circles
     */
    function clearSearchAreas() {
        searchAreaCircles.forEach(function(circle) {
            map.removeLayer(circle);
        });
        searchAreaCircles = [];
    }
    
    /**
     * Update sync preview with new parameters
     */
    function updateSyncPreview() {
        loadSyncPreview();
    }
    
    /**
     * Start sync from preview
     */
    function startSyncFromPreview() {
        if (!syncPreviewData) {
            alert('Please load sync preview first');
            return;
        }
        
        if (confirm('Start zone-based POI sync with current preview settings? This will use OSM zone data to optimize API calls.')) {
            // Start zone-based sync
            $.ajax({
                url: tnpoi_map_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'tnpoi_start_zone_sync',
                    nonce: tnpoi_map_ajax.sync_nonce,
                    trail_id: syncPreviewData.trail_id,
                    search_radius: $('#search-radius').val(),
                    coordinate_interval: $('#coordinate-interval').val()
                },
                success: function(response) {
                    if (response.success) {
                        alert('Zone-based sync started! Processing ' + response.data.total_points + ' points with ' + response.data.estimated_api_calls + ' estimated API calls.');
                        // Optionally start progress polling
                        startZoneSyncProgressPolling();
                    } else {
                        alert('Error starting zone-based sync: ' + response.data);
                    }
                },
                error: function(xhr, status, error) {
                    console.error('TNPOI Map JS: Zone sync error:', error);
                    alert('Error starting zone-based sync: ' + error);
                }
            });
        }
    }
    
    /**
     * Start polling for zone sync progress
     */
    function startZoneSyncProgressPolling() {
        // Show progress indicator
        $('#sync-preview-stats').append('<div id="zone-sync-progress" style="margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 4px;"><strong>Zone Sync Progress:</strong> <span id="zone-sync-status">Starting...</span></div>');
        
        // Poll for progress every 2 seconds
        var progressInterval = setInterval(function() {
            $.ajax({
                url: tnpoi_map_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'tnpoi_get_zone_sync_progress',
                    nonce: tnpoi_map_ajax.sync_nonce
                },
                success: function(response) {
                    if (response.success) {
                        var progress = response.data;
                        var statusText = progress.message;
                        
                        if (progress.status === 'running') {
                            var percent = Math.round((progress.current / progress.total) * 100);
                            statusText = progress.message + ' (' + percent + '%)';
                        } else if (progress.status === 'completed') {
                            statusText = 'Completed successfully!';
                            clearInterval(progressInterval);
                            setTimeout(function() {
                                $('#zone-sync-progress').fadeOut();
                            }, 3000);
                        } else if (progress.status === 'stopped') {
                            statusText = 'Stopped by user';
                            clearInterval(progressInterval);
                        }
                        
                        $('#zone-sync-status').text(statusText);
                    }
                }
            });
        }, 2000);
    }
    
    /**
     * Discover zones using OSM data
     */
    function discoverZones() {
        if (!window.tnpoiMapData || !window.tnpoiMapData.selectedTrail) {
            alert('Please select a trail first.');
            return;
        }
        var trailId = window.tnpoiMapData.selectedTrail.routeId;
        var weights = {
            food_dining_weight: $('#food-dining-weight').val(),
            parks_recreation_weight: $('#parks-recreation-weight').val(),
            shopping_weight: $('#shopping-weight').val(),
            services_weight: $('#services-weight').val()
        };
        var thresholds = {
            hot_threshold: $('#hot-zone-threshold').val(),
            warm_threshold: $('#warm-zone-threshold').val()
        };
        var batchSize = 10;
        var allZones = [];
        var startIndex = 0;
        var totalBatches = 1;
        var currentBatch = 0;
        var zoneCount = 0;
        // Show loading state and progress bar
        $('#discover-zones').prop('disabled', true).text('Discovering...');
        $('#zone-progress-container').show();
        $('#zone-progress-inner').css('width', '0');
        $('#zone-progress-label').text('Starting...');
        function fetchBatch() {
            $.ajax({
                url: tnpoi_map_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'tnpoi_discover_zones',
                    nonce: tnpoi_map_ajax.nonce,
                    trail_id: trailId,
                    food_dining_weight: weights.food_dining_weight,
                    parks_recreation_weight: weights.parks_recreation_weight,
                    shopping_weight: weights.shopping_weight,
                    services_weight: weights.services_weight,
                    hot_threshold: thresholds.hot_threshold,
                    warm_threshold: thresholds.warm_threshold,
                    search_radius: $('#search-radius').val(),
                    osm_analysis_radius: $('#osm-analysis-radius').val(),
                    start_index: startIndex,
                    batch_size: batchSize
                },
                success: function(response) {
                    if (response.success) {
                        var data = response.data;
                        if (data.zones && data.zones.length > 0) {
                            allZones = allZones.concat(data.zones);
                            displayZones(allZones); // Incremental update
                        }
                        totalBatches = data.total_batches || 1;
                        currentBatch = data.current_batch || 1;
                        zoneCount = data.zone_count || allZones.length;
                        // Update progress bar
                        var percent = Math.min(100, Math.round((currentBatch / totalBatches) * 100));
                        $('#zone-progress-inner').css('width', percent + '%');
                        $('#zone-progress-label').text('Batch ' + currentBatch + ' of ' + totalBatches + ' (' + allZones.length + ' zones)');
                        if (data.has_more) {
                            startIndex += batchSize;
                            setTimeout(fetchBatch, 200); // Small delay to avoid hammering server
                        } else {
                            $('#discover-zones').prop('disabled', false).text('Discover Zones');
                            $('#zone-progress-label').text('Complete! ' + allZones.length + ' zones discovered.');
                            setTimeout(function() { $('#zone-progress-container').fadeOut(); }, 2000);
                            updateZoneStats({ zones: allZones, zone_count: zoneCount });
                        }
                    } else {
                        alert('Error discovering zones: ' + (response.data || 'Unknown error'));
                        $('#discover-zones').prop('disabled', false).text('Discover Zones');
                        $('#zone-progress-container').hide();
                    }
                },
                error: function(xhr, status, error) {
                    console.error('TNPOI Map JS: Zone discovery error:', error);
                    alert('Error discovering zones: ' + error);
                    $('#discover-zones').prop('disabled', false).text('Discover Zones');
                    $('#zone-progress-container').hide();
                }
            });
        }
        fetchBatch();
    }
    
    /**
     * Display zones on the map
     */
    function displayZones(zones) {
        clearZoneMarkers();
        
        console.log('TNPOI Map JS: Displaying', zones.length, 'zones');
        
        zones.forEach(function(zone, index) {
            var color = getZoneColor(zone.zone_type);
            var radius = zone.search_radius;
            
            // Create circle for zone
            var circle = L.circle([zone.lat, zone.lng], {
                radius: radius,
                color: color,
                fillColor: color,
                fillOpacity: 0.2,
                weight: 2
            }).addTo(map);
            
            // Create marker with popup
            var marker = L.marker([zone.lat, zone.lng], {
                icon: L.divIcon({
                    className: 'zone-marker',
                    html: '<div style="background-color: ' + color + '; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                    iconSize: [12, 12]
                })
            }).addTo(map);
            
            // Add popup with zone info
            var popupContent = '<div class="zone-popup" style="max-height: 400px; overflow-y: auto; padding-right: 8px;">' +
                '<h4>' + zone.zone_type.toUpperCase() + ' ZONE</h4>' +
                '<p><strong>Score:</strong> ' + zone.score + '</p>' +
                '<p><strong>OSM POIs:</strong> ' + zone.osm_count + '</p>' +
                '<p><strong>Sampling:</strong> ' + (zone.sampling_interval / 160).toFixed(1) + ' miles</p>' +
                '<p><strong>Search Radius:</strong> ' + zone.search_radius + 'm</p>';
            // Add score breakdown if available
            if (zone.score_breakdown) {
                popupContent += '<hr><b>Score Breakdown:</b><ul style="margin:0; padding-left:18px">';
                for (const [cat, val] of Object.entries(zone.score_breakdown)) {
                    let label = cat.replace('_', ' ').replace('parks recreation', 'Parks/Recreation').replace('food dining', 'Food/Dining').replace('shopping', 'Shopping').replace('services', 'Services');
                    popupContent += `<li>${label}: ${val.toFixed(1)}</li>`;
                }
                popupContent += '</ul>';
            }
            if (zone.category_counts) {
                popupContent += '<b>POI Counts:</b><ul style="margin:0; padding-left:18px">';
                for (const [cat, val] of Object.entries(zone.category_counts)) {
                    let label = cat.replace('_', ' ').replace('parks recreation', 'Parks/Recreation').replace('food dining', 'Food/Dining').replace('shopping', 'Shopping').replace('services', 'Services');
                    popupContent += `<li>${label}: ${val}</li>`;
                }
                popupContent += '</ul>';
            }
            if (zone.poi_names) {
                popupContent += '<b>POI Names:</b>';
                for (const [cat, names] of Object.entries(zone.poi_names)) {
                    if (names && names.length > 0) {
                        let label = cat.replace('_', ' ').replace('parks recreation', 'Parks/Recreation').replace('food dining', 'Food/Dining').replace('shopping', 'Shopping').replace('services', 'Services');
                        popupContent += `<div style=\"margin-left:8px;\"><u>${label}:</u><ul style=\"margin:0; padding-left:18px\">`;
                        for (const n of names) {
                            popupContent += `<li>${n}</li>`;
                        }
                        popupContent += '</ul></div>';
                    }
                }
            }
            popupContent += '</div>';
            
            marker.bindPopup(popupContent);
            
            // Store references for later removal
            searchAreaCircles.push(circle);
            markers.push(marker);
        });
        
        console.log('TNPOI Map JS: Zones displayed successfully');
    }
    
    /**
     * Get color for zone type
     */
    function getZoneColor(zoneType) {
        switch (zoneType) {
            case 'hot':
                return '#ff4444'; // Red
            case 'warm':
                return '#ffaa00'; // Orange
            case 'cold':
                return '#44aa44'; // Green
            default:
                return '#888888'; // Gray
        }
    }
    
    /**
     * Update zone statistics
     */
    function updateZoneStats(data) {
        var zoneCounts = {
            hot: 0,
            warm: 0,
            cold: 0
        };
        
        data.zones.forEach(function(zone) {
            zoneCounts[zone.zone_type]++;
        });
        
        var statsHtml = 'Zones: ' + data.zone_count + ' total' +
            ' (Hot: ' + zoneCounts.hot + ', Warm: ' + zoneCounts.warm + ', Cold: ' + zoneCounts.cold + ')';
        
        $('#sync-preview-stats').html(statsHtml);
    }
    
    /**
     * Clear zone markers
     */
    function clearZoneMarkers() {
        // Clear existing circles and markers
        searchAreaCircles.forEach(function(circle) {
            map.removeLayer(circle);
        });
        searchAreaCircles = [];
        
        markers.forEach(function(marker) {
            map.removeLayer(marker);
        });
        markers = [];
    }
    
    /**
     * Export zone data
     */
    function exportZoneData() {
        // TODO: Implement zone data export
        alert('Zone data export will be implemented in a future version.');
    }
    
})(jQuery);
