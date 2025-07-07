<?php
// Get POIs for map display
$poi_db = new TNPOI_POI_DB();
$pois = $poi_db->get_pois(1, 1000); // Get up to 1000 POIs for map
$categories = $poi_db->get_categories();
$trails = $poi_db->get_trails();

// Convert POIs to JSON for JavaScript
$pois_json = array();
foreach ($pois as $poi) {
    $pois_json[] = array(
        'id' => $poi->id,
        'name' => $poi->name,
        'category' => $poi->category ?: 'Uncategorized',
        'trail_name' => $poi->trail_name ?: 'Unknown Trail',
        'address' => $poi->address,
        'latitude' => floatval($poi->latitude),
        'longitude' => floatval($poi->longitude),
        'status' => $poi->status,
        'description' => $poi->description
    );
}
?>

<div class="wrap tnpoi-map-preview">
    <h1>Map Preview</h1>
    
    <div class="map-controls">
        <div class="control-group">
            <label for="category-filter">Filter by Category:</label>
            <select id="category-filter">
                <option value="">All Categories</option>
                <?php foreach ($categories as $cat): ?>
                    <option value="<?php echo esc_attr($cat); ?>"><?php echo esc_html($cat); ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        
        <div class="control-group">
            <label for="trail-filter">Filter by Trail:</label>
            <select id="trail-filter">
                <option value="">All Trails</option>
                <?php foreach ($trails as $trail): ?>
                    <option value="<?php echo esc_attr($trail); ?>"><?php echo esc_html($trail); ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        
        <div class="control-group">
            <label for="status-filter">Filter by Status:</label>
            <select id="status-filter">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="ignored">Ignored</option>
            </select>
        </div>
        
        <div class="control-group">
            <button type="button" id="reset-filters" class="button">Reset Filters</button>
            <button type="button" id="fit-bounds" class="button">Fit All POIs</button>
        </div>
    </div>
    
    <div class="map-stats">
        <span class="stat">Total POIs: <strong id="total-pois"><?php echo count($pois); ?></strong></span>
        <span class="stat">Visible POIs: <strong id="visible-pois"><?php echo count($pois); ?></strong></span>
        <span class="stat">Categories: <strong><?php echo count($categories); ?></strong></span>
        <span class="stat">Trails: <strong><?php echo count($trails); ?></strong></span>
    </div>
    
    <div class="map-container">
        <div id="poi-map"></div>
    </div>
    
    <div class="map-legend">
        <h3>Legend</h3>
        <div class="legend-items">
            <div class="legend-item">
                <span class="legend-marker active"></span>
                <span class="legend-label">Active POIs</span>
            </div>
            <div class="legend-item">
                <span class="legend-marker ignored"></span>
                <span class="legend-label">Ignored POIs</span>
            </div>
            <div class="legend-item">
                <span class="legend-marker restaurant"></span>
                <span class="legend-label">Restaurants</span>
            </div>
            <div class="legend-item">
                <span class="legend-marker cafe"></span>
                <span class="legend-label">Cafes</span>
            </div>
            <div class="legend-item">
                <span class="legend-marker lodging"></span>
                <span class="legend-label">Lodging</span>
            </div>
            <div class="legend-item">
                <span class="legend-marker park"></span>
                <span class="legend-label">Parks</span>
            </div>
            <div class="legend-item">
                <span class="legend-marker other"></span>
                <span class="legend-label">Other</span>
            </div>
        </div>
    </div>
</div>

<!-- POI Details Modal -->
<div id="poi-details-modal" class="tnpoi-modal" style="display: none;">
    <div class="tnpoi-modal-content">
        <div class="tnpoi-modal-header">
            <h2>POI Details</h2>
            <span class="tnpoi-modal-close">&times;</span>
        </div>
        <div class="tnpoi-modal-body">
            <div id="poi-details-content"></div>
            <div class="poi-actions">
                <button type="button" class="button edit-poi-btn">Edit POI</button>
                <button type="button" class="button view-on-map-btn">View on Map</button>
                <button type="button" class="button close-modal-btn">Close</button>
            </div>
        </div>
    </div>
</div>

<script>
// Initialize map data
var poiData = <?php echo json_encode($pois_json); ?>;
var mapMarkers = [];
var currentMarkers = [];

// Category colors for markers
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

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupFilters();
    setupEventListeners();
});

function initializeMap() {
    // Create map centered on a default location (you can adjust this)
    var map = L.map('poi-map').setView([39.8283, -98.5795], 4); // Center of USA
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Store map reference
    window.poiMap = map;
    
    // Add POI markers
    addPOIMarkers(map);
    
    // Fit bounds to show all POIs if any exist
    if (poiData.length > 0) {
        fitMapToPOIs(map);
    }
}

function addPOIMarkers(map) {
    poiData.forEach(function(poi) {
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
        mapMarkers.push(marker);
        currentMarkers.push(marker);
    });
}

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

function fitMapToPOIs(map) {
    if (currentMarkers.length > 0) {
        var group = new L.featureGroup(currentMarkers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

function setupFilters() {
    var categoryFilter = document.getElementById('category-filter');
    var trailFilter = document.getElementById('trail-filter');
    var statusFilter = document.getElementById('status-filter');
    
    [categoryFilter, trailFilter, statusFilter].forEach(function(filter) {
        filter.addEventListener('change', applyFilters);
    });
}

function applyFilters() {
    var categoryFilter = document.getElementById('category-filter').value;
    var trailFilter = document.getElementById('trail-filter').value;
    var statusFilter = document.getElementById('status-filter').value;
    
    // Clear current markers
    currentMarkers.forEach(function(marker) {
        window.poiMap.removeLayer(marker);
    });
    currentMarkers = [];
    
    // Filter and add markers
    mapMarkers.forEach(function(marker) {
        var poi = marker.poiData;
        var show = true;
        
        if (categoryFilter && poi.category !== categoryFilter) {
            show = false;
        }
        
        if (trailFilter && poi.trail_name !== trailFilter) {
            show = false;
        }
        
        if (statusFilter && poi.status !== statusFilter) {
            show = false;
        }
        
        if (show) {
            window.poiMap.addLayer(marker);
            currentMarkers.push(marker);
        }
    });
    
    // Update visible count
    document.getElementById('visible-pois').textContent = currentMarkers.length;
    
    // Fit map to visible POIs
    if (currentMarkers.length > 0) {
        fitMapToPOIs(window.poiMap);
    }
}

function setupEventListeners() {
    // Reset filters button
    document.getElementById('reset-filters').addEventListener('click', function() {
        document.getElementById('category-filter').value = '';
        document.getElementById('trail-filter').value = '';
        document.getElementById('status-filter').value = '';
        applyFilters();
    });
    
    // Fit bounds button
    document.getElementById('fit-bounds').addEventListener('click', function() {
        fitMapToPOIs(window.poiMap);
    });
    
    // View details button clicks (delegated)
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('view-details-btn')) {
            var poiId = e.target.getAttribute('data-poi-id');
            showPOIDetails(poiId);
        }
    });
    
    // Modal close buttons
    document.querySelectorAll('.tnpoi-modal-close, .close-modal-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.getElementById('poi-details-modal').style.display = 'none';
        });
    });
}

function showPOIDetails(poiId) {
    var poi = poiData.find(function(p) { return p.id == poiId; });
    if (!poi) return;
    
    var content = document.getElementById('poi-details-content');
    content.innerHTML = '<div class="poi-detail">' +
                       '<h3>' + poi.name + '</h3>' +
                       '<table class="poi-detail-table">' +
                       '<tr><td><strong>Category:</strong></td><td>' + poi.category + '</td></tr>' +
                       '<tr><td><strong>Trail:</strong></td><td>' + poi.trail_name + '</td></tr>' +
                       '<tr><td><strong>Address:</strong></td><td>' + poi.address + '</td></tr>' +
                       '<tr><td><strong>Coordinates:</strong></td><td>' + poi.latitude + ', ' + poi.longitude + '</td></tr>' +
                       '<tr><td><strong>Status:</strong></td><td>' + poi.status + '</td></tr>' +
                       '</table>';
    
    if (poi.description) {
        content.innerHTML += '<div class="poi-description"><strong>Description:</strong><p>' + poi.description + '</p></div>';
    }
    
    content.innerHTML += '</div>';
    
    document.getElementById('poi-details-modal').style.display = 'block';
}
</script>

<style>
#poi-map {
    height: 600px;
    width: 100%;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.map-controls {
    margin-bottom: 20px;
    padding: 15px;
    background: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.control-group {
    display: inline-block;
    margin-right: 20px;
    margin-bottom: 10px;
}

.control-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
}

.map-stats {
    margin-bottom: 15px;
    padding: 10px;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.map-stats .stat {
    display: inline-block;
    margin-right: 20px;
}

.map-legend {
    margin-top: 20px;
    padding: 15px;
    background: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.legend-items {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
}

.legend-item {
    display: flex;
    align-items: center;
}

.legend-marker {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid white;
    margin-right: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.legend-marker.active { background-color: #27ae60; }
.legend-marker.ignored { background-color: #95a5a6; }
.legend-marker.restaurant { background-color: #e74c3c; }
.legend-marker.cafe { background-color: #f39c12; }
.legend-marker.lodging { background-color: #3498db; }
.legend-marker.park { background-color: #27ae60; }
.legend-marker.other { background-color: #7f8c8d; }

.poi-popup {
    max-width: 300px;
}

.poi-popup h3 {
    margin: 0 0 10px 0;
    color: #333;
}

.poi-popup p {
    margin: 5px 0;
    font-size: 12px;
}

.poi-detail-table {
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0;
}

.poi-detail-table td {
    padding: 8px;
    border-bottom: 1px solid #eee;
}

.poi-detail-table td:first-child {
    font-weight: bold;
    width: 30%;
}

.poi-description {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #eee;
}

.poi-actions {
    margin-top: 20px;
    text-align: right;
}

.poi-actions .button {
    margin-left: 10px;
}
</style> 