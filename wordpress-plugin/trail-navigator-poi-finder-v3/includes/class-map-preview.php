<?php
/**
 * Map Preview Class
 * 
 * Handles map functionality and POI visualization using Leaflet.js
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

class TNPOI_Map_Preview {
    private $preview_option_name = 'tnpoi_map_preview_settings';
    private $preview_defaults = array(
        'search_radius' => 500,
        'coordinate_interval' => 160,
        'osm_analysis_radius' => 500,
        'food_dining_weight' => 10,
        'parks_recreation_weight' => 10,
        'shopping_weight' => 4,
        'services_weight' => 1,
        'hot_threshold' => 25,
        'warm_threshold' => 10
    );
    private $preview_settings = null;
    
    public function __construct() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_scripts'));
    }
    
    /**
     * Enqueue map scripts and styles
     */
    public function enqueue_scripts() {
        // Only enqueue on our plugin pages
        if (!$this->is_plugin_page()) {
            return;
        }
        
        // Enqueue Leaflet.js
        wp_enqueue_script(
            'leaflet-js',
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
            array(),
            '1.9.4',
            true
        );
        
        wp_enqueue_style(
            'leaflet-css',
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
            array(),
            '1.9.4'
        );
        
        // Enqueue our custom map script
        wp_enqueue_script(
            'tnpoi-map',
            TNPOI_PLUGIN_URL . 'assets/js/map.js',
            array('leaflet-js', 'jquery'),
            TNPOI_VERSION,
            true
        );
        
        // Localize script with AJAX URL and nonce
        wp_localize_script('tnpoi-map', 'tnpoi_map_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('tnpoi_map_preview_nonce'),
            'sync_nonce' => wp_create_nonce('tnpoi_sync_nonce'),
            'plugin_url' => TNPOI_PLUGIN_URL
        ));
    }
    
    /**
     * Check if current page is a plugin page
     */
    private function is_plugin_page() {
        // Only check for plugin pages in admin area
        if (!is_admin()) {
            return false;
        }
        
        $screen = get_current_screen();
        if (!$screen) {
            return false;
        }
        
        // Debug: Log the current screen ID
        error_log('TNPOI Map Preview: Current screen ID: ' . $screen->id);
        
        $plugin_pages = array(
            'toplevel_page_tnpoi-dashboard',
            'trail-navigator_page_tnpoi-poi-manager',
            'trail-navigator_page_tnpoi-sync',
            'trail-navigator_page_tnpoi-map-preview',
            'trail-navigator_page_tnpoi-settings',
            // Add more generic patterns
            'tnpoi',
            'trail-navigator'
        );
        
        $is_plugin_page = false;
        foreach ($plugin_pages as $page) {
            if (strpos($screen->id, $page) !== false) {
                $is_plugin_page = true;
                break;
            }
        }
        
        error_log('TNPOI Map Preview: Is plugin page: ' . ($is_plugin_page ? 'true' : 'false'));
        return $is_plugin_page;
    }
    
    /**
     * Get POIs for map display
     */
    public function get_pois_for_map($filters = array()) {
        $poi_db = new TNPOI_POI_DB();
        
        $search = isset($filters['search']) ? sanitize_text_field($filters['search']) : '';
        $category = isset($filters['category']) ? sanitize_text_field($filters['category']) : '';
        $trail = isset($filters['trail']) ? sanitize_text_field($filters['trail']) : '';
        $status = isset($filters['status']) ? sanitize_text_field($filters['status']) : '';
        
        $pois = $poi_db->get_pois(1, 1000, $search, $category, $trail, $status);
        
        $map_pois = array();
        foreach ($pois as $poi) {
            $map_pois[] = array(
                'id' => $poi->id,
                'name' => $poi->name,
                'category' => $poi->category ?: 'Uncategorized',
                'trail_name' => $poi->trail_name ?: 'Unknown Trail',
                'address' => $poi->address,
                'latitude' => floatval($poi->latitude),
                'longitude' => floatval($poi->longitude),
                'status' => $poi->status,
                'description' => $poi->description,
                'place_id' => $poi->place_id
            );
        }
        
        return $map_pois;
    }
    
    /**
     * Get map configuration
     */
    public function get_map_config() {
        $settings = get_option('tnpoi_settings', array());
        
        return array(
            'center_lat' => $settings['default_map_center_lat'] ?? 39.8283,
            'center_lng' => $settings['default_map_center_lng'] ?? -98.5795,
            'zoom' => $settings['default_map_zoom'] ?? 4,
            'tile_provider' => $settings['map_tile_provider'] ?? 'openstreetmap'
        );
    }
    
    /**
     * Get category colors for markers
     */
    public function get_category_colors() {
        return array(
            'restaurant' => '#e74c3c',
            'cafe' => '#f39c12',
            'lodging' => '#3498db',
            'park' => '#27ae60',
            'museum' => '#9b59b6',
            'library' => '#34495e',
            'pharmacy' => '#e67e22',
            'atm' => '#95a5a6',
            'bank' => '#16a085',
            'gas_station' => '#f1c40f',
            'store' => '#1abc9c',
            'tourist_attraction' => '#e91e63',
            'default' => '#7f8c8d'
        );
    }
    
    /**
     * AJAX handler for getting POIs for map preview
     */
    public static function ajax_get_pois_map_preview() {
        check_ajax_referer('tnpoi_map_preview_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $filters = array();
        if (isset($_POST['filters'])) {
            $filters = array_map('sanitize_text_field', $_POST['filters']);
        }
        
        $instance = new self();
        $pois = $instance->get_pois_for_map($filters);
        
        wp_send_json_success($pois);
    }
    
    /**
     * AJAX handler for getting POI details
     */
    public static function ajax_get_poi_details() {
        check_ajax_referer('tnpoi_map_preview_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $poi_id = intval($_POST['poi_id']);
        
        $poi_db = new TNPOI_POI_DB();
        $poi = $poi_db->get_poi($poi_id);
        
        if (!$poi) {
            wp_send_json_error('POI not found');
        }
        
        $poi_data = array(
            'id' => $poi->id,
            'name' => $poi->name,
            'category' => $poi->category ?: 'Uncategorized',
            'trail_name' => $poi->trail_name ?: 'Unknown Trail',
            'address' => $poi->address,
            'latitude' => floatval($poi->latitude),
            'longitude' => floatval($poi->longitude),
            'status' => $poi->status,
            'description' => $poi->description,
            'place_id' => $poi->place_id,
            'created_at' => $poi->created_at,
            'updated_at' => $poi->updated_at
        );
        
        wp_send_json_success($poi_data);
    }
    
    /**
     * Get tile provider URL
     */
    public function get_tile_provider_url($provider) {
        $providers = array(
            'openstreetmap' => 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'cartodb' => 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            'esri' => 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            'stamen' => 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png'
        );
        
        return $providers[$provider] ?? $providers['openstreetmap'];
    }
    
    /**
     * Get tile provider attribution
     */
    public function get_tile_provider_attribution($provider) {
        $attributions = array(
            'openstreetmap' => '© OpenStreetMap contributors',
            'cartodb' => '© CartoDB',
            'esri' => '© Esri',
            'stamen' => '© Stamen Design'
        );
        
        return $attributions[$provider] ?? $attributions['openstreetmap'];
    }
    
    /**
     * Get sync preview data (sampled points and search areas)
     */
    public function get_sync_preview_data($trail_id, $search_radius = 500, $coordinate_interval = 200, $use_adaptive_sampling = false) {
        error_log('TNPOI Map Preview: Getting sync preview data for trail_id: ' . $trail_id);
        
        // Get the enhanced trail data that was already fetched
        $trail_config = get_option('trail_navigator_config', array());
        $trails = isset($trail_config['trails']) ? $trail_config['trails'] : array();
        
        $selected_trail = null;
        foreach ($trails as $trail) {
            if ((string)$trail['routeId'] === (string)$trail_id) {
                $selected_trail = $trail;
                break;
            }
        }
        
        // If no trail found or no track points, try to fetch them
        if (!$selected_trail || empty($selected_trail['trackPoints'])) {
            error_log('TNPOI Map Preview: No trail data found, fetching coordinates for trail_id: ' . $trail_id);
            $selected_trail = $this->get_complete_trail_data(array('routeId' => $trail_id));
        }
        
        if (!$selected_trail || empty($selected_trail['trackPoints'])) {
            error_log('TNPOI Map Preview: Failed to get trail data with coordinates for trail_id: ' . $trail_id);
            return array(
                'trail_id' => $trail_id,
                'search_radius' => $search_radius,
                'coordinate_interval' => $coordinate_interval,
                'sampled_points' => array(),
                'total_points' => 0,
                'estimated_api_calls' => 0
            );
        }
        
        error_log('TNPOI Map Preview: Found trail with ' . count($selected_trail['trackPoints']) . ' track points');
        
        // Use the adaptive sampling parameter passed to the method
        error_log('TNPOI Map Preview: Adaptive sampling enabled: ' . ($use_adaptive_sampling ? 'true' : 'false'));
        
        if ($use_adaptive_sampling) {
            error_log('TNPOI Map Preview: Using adaptive sampling based on POI density');
            $sampled_points = $this->sample_track_points_adaptive($selected_trail['trackPoints'], $coordinate_interval, $search_radius);
        } else {
            error_log('TNPOI Map Preview: Using uniform sampling');
            $sampled_points = $this->sample_track_points($selected_trail['trackPoints'], $coordinate_interval);
        }
        
        $preview_data = array(
            'trail_id' => $trail_id,
            'search_radius' => $search_radius,
            'coordinate_interval' => $coordinate_interval,
            'sampled_points' => array(),
            'total_points' => count($sampled_points),
            'estimated_api_calls' => count($sampled_points),
            'adaptive_sampling' => $use_adaptive_sampling
        );
        
        foreach ($sampled_points as $point) {
            // Ensure all points have required properties
            $point_lat = isset($point['lat']) ? floatval($point['lat']) : 0;
            $point_lng = isset($point['lng']) ? floatval($point['lng']) : 0;
            $point_search_radius = isset($point['search_radius']) ? intval($point['search_radius']) : $search_radius;
            $point_density_score = isset($point['density_score']) ? floatval($point['density_score']) : 0.5; // Default medium density
            
            // Validate search radius
            if ($point_search_radius <= 0) {
                $point_search_radius = $search_radius;
            }
            
            $preview_data['sampled_points'][] = array(
                'lat' => $point_lat,
                'lng' => $point_lng,
                'search_radius' => $point_search_radius,
                'density_score' => $point_density_score
            );
        }
        
        error_log('TNPOI Map Preview: Generated sync preview with ' . count($sampled_points) . ' sampled points, interval: ' . $coordinate_interval . 'm, radius: ' . $search_radius . 'm');
        
        return $preview_data;
    }
    
    /**
     * Sample track points with specified distance interval
     */
    private function sample_track_points($track_points, $interval) {
        if (empty($track_points) || count($track_points) < 2) {
            return array();
        }
        
        $sampled_points = array();
        $last_sampled_point = null;
        $cumulative_distance = 0;
        
        // Always add the first point
        $sampled_points[] = $track_points[0];
        $last_sampled_point = $track_points[0];
        error_log('TNPOI Map Preview: Added first point at index 0');
        
        // Calculate cumulative distance and sample at intervals
        for ($i = 1; $i < count($track_points); $i++) {
            $current_point = $track_points[$i];
            $segment_distance = $this->calculate_distance(
                $last_sampled_point['lat'], $last_sampled_point['lng'],
                $current_point['lat'], $current_point['lng']
            );
            
            $cumulative_distance += $segment_distance;
            
            if ($cumulative_distance >= $interval) {
                $sampled_points[] = $current_point;
                $last_sampled_point = $current_point;
                $cumulative_distance = 0; // Reset for next interval
                error_log('TNPOI Map Preview: Added point at index ' . $i . ' (cumulative distance: ' . round($cumulative_distance + $segment_distance) . 'm)');
            }
        }
        
        error_log('TNPOI Map Preview: Distance-based sampling complete. Sampled ' . count($sampled_points) . ' points from ' . count($track_points) . ' total points');
        return $sampled_points;
    }
    
    /**
     * Sample track points using two-pass adaptive POI discovery
     */
    private function sample_track_points_adaptive($track_points, $base_interval, $base_radius) {
        if (empty($track_points) || count($track_points) < 2) {
            return array();
        }
        
        error_log('TNPOI Map Preview: Starting two-pass adaptive POI discovery');
        
        // Phase 1: Discovery Pass - Uniform sampling to map POI distribution
        $discovery_points = $this->discovery_pass($track_points, $base_interval * 2, $base_radius * 1.5);
        error_log('TNPOI Map Preview: Discovery pass complete. Found ' . count($discovery_points) . ' initial points');
        
        // Phase 2: Optimization Pass - Adaptive sampling based on discovered patterns
        $optimized_points = $this->optimization_pass($track_points, $discovery_points, $base_interval, $base_radius);
        error_log('TNPOI Map Preview: Optimization pass complete. Generated ' . count($optimized_points) . ' optimized points');
        
        return $optimized_points;
    }
    
    /**
     * Phase 1: Discovery pass - Uniform sampling to identify POI patterns
     */
    private function discovery_pass($track_points, $interval, $radius) {
        $discovery_points = array();
        $last_point = null;
        $cumulative_distance = 0;
        $max_discovery_points = 20; // Limit discovery points to prevent timeouts
        
        // Add first point
        $discovery_points[] = array(
            'lat' => $track_points[0]['lat'],
            'lng' => $track_points[0]['lng'],
            'search_radius' => $radius,
            'density_score' => 0.5, // Default medium density
            'phase' => 'discovery'
        );
        $last_point = $track_points[0];
        
        // Sample at uniform intervals for discovery (limited to prevent timeouts)
        for ($i = 1; $i < count($track_points) && count($discovery_points) < $max_discovery_points; $i++) {
            $current_point = $track_points[$i];
            $segment_distance = $this->calculate_distance(
                $last_point['lat'], $last_point['lng'],
                $current_point['lat'], $current_point['lng']
            );
            
            $cumulative_distance += $segment_distance;
            
            if ($cumulative_distance >= $interval) {
                $discovery_points[] = array(
                    'lat' => $current_point['lat'],
                    'lng' => $current_point['lng'],
                    'search_radius' => $radius,
                    'density_score' => 0.5, // Will be updated in optimization pass
                    'phase' => 'discovery'
                );
                $last_point = $current_point;
                $cumulative_distance = 0;
            }
        }
        
        error_log('TNPOI Map Preview: Discovery pass generated ' . count($discovery_points) . ' points (limited to ' . $max_discovery_points . ')');
        return $discovery_points;
    }
    
    /**
     * Phase 2: Optimization pass - Adaptive sampling based on discovered patterns
     */
    private function optimization_pass($track_points, $discovery_points, $base_interval, $base_radius) {
        $optimized_points = array();
        $poi_clusters = array();
        $sparse_areas = array();
        
        // Analyze discovery results to identify clusters and sparse areas
        foreach ($discovery_points as $point) {
            // Simulate POI discovery (in real implementation, this would be actual Google Places API calls)
            $poi_count = $this->simulate_poi_discovery($point['lat'], $point['lng'], $point['search_radius']);
            
            if ($poi_count > 3) {
                // High POI density - mark as cluster
                $poi_clusters[] = array(
                    'lat' => $point['lat'],
                    'lng' => $point['lng'],
                    'poi_count' => $poi_count,
                    'radius' => $point['search_radius']
                );
                error_log('TNPOI Map Preview: Identified POI cluster at ' . $point['lat'] . ', ' . $point['lng'] . ' with ' . $poi_count . ' POIs');
            } elseif ($poi_count > 0) {
                // Medium POI density - individual POIs found
                $sparse_areas[] = array(
                    'lat' => $point['lat'],
                    'lng' => $point['lng'],
                    'poi_count' => $poi_count,
                    'radius' => $point['search_radius']
                );
                error_log('TNPOI Map Preview: Found individual POIs at ' . $point['lat'] . ', ' . $point['lng'] . ' (' . $poi_count . ' POIs)');
            }
        }
        
        // Generate optimized sampling points
        $last_sampled_point = null;
        $cumulative_distance = 0;
        
        // Always add first point
        $first_density = $this->calculate_point_density($track_points[0]['lat'], $track_points[0]['lng'], $poi_clusters, $sparse_areas);
        $first_radius = $this->get_optimized_radius($first_density, $base_radius);
        
        $optimized_points[] = array(
            'lat' => $track_points[0]['lat'],
            'lng' => $track_points[0]['lng'],
            'search_radius' => $first_radius,
            'density_score' => $first_density,
            'phase' => 'optimized'
        );
        $last_sampled_point = $track_points[0];
        error_log('TNPOI Map Preview: Added first optimized point (density: ' . round($first_density, 2) . ', radius: ' . $first_radius . 'm)');
        
        // Sample remaining points with adaptive intervals
        for ($i = 1; $i < count($track_points); $i++) {
            $current_point = $track_points[$i];
            $segment_distance = $this->calculate_distance(
                $last_sampled_point['lat'], $last_sampled_point['lng'],
                $current_point['lat'], $current_point['lng']
            );
            
            $cumulative_distance += $segment_distance;
            
            // Calculate density based on discovered POI patterns
            $density_score = $this->calculate_point_density($current_point['lat'], $current_point['lng'], $poi_clusters, $sparse_areas);
            $adaptive_interval = $this->get_optimized_interval($density_score, $base_interval);
            
            if ($cumulative_distance >= $adaptive_interval) {
                $adaptive_radius = $this->get_optimized_radius($density_score, $base_radius);
                
                $optimized_points[] = array(
                    'lat' => $current_point['lat'],
                    'lng' => $current_point['lng'],
                    'search_radius' => $adaptive_radius,
                    'density_score' => $density_score,
                    'phase' => 'optimized'
                );
                $last_sampled_point = $current_point;
                $cumulative_distance = 0;
                error_log('TNPOI Map Preview: Added optimized point at index ' . $i . ' (distance: ' . round($segment_distance) . 'm, density: ' . round($density_score, 2) . ', radius: ' . $adaptive_radius . 'm)');
            }
        }
        
        return $optimized_points;
    }
    
    /**
     * Analyze area importance using OSM data for trail users
     */
    private function analyze_trail_area_importance($lat, $lng, $radius = 500) {
        error_log('TNPOI Map Preview: Analyzing trail area importance at ' . $lat . ', ' . $lng);
        
        // Query OSM for trail-relevant data using the zone data method
        $osm_data = $this->query_osm_zone_data($lat, $lng, $radius);
        
        // If OSM query failed or returned no data, fall back to hardcoded method
        if (empty($osm_data) || empty($osm_data['elements'])) {
            error_log('TNPOI Map Preview: OSM query failed, using fallback method');
            return $this->estimate_density_from_location($lat, $lng);
        }
        
        // Calculate importance score based on multiple factors
        $importance_score = $this->calculate_trail_importance_score($osm_data, $lat, $lng);
        
        error_log('TNPOI Map Preview: Calculated importance score: ' . round($importance_score, 3));
        
        return $importance_score;
    }
    
    /**
     * Query OSM for zone discovery (simplified categories)
     */
    private function query_osm_zone_data($lat, $lng, $radius) {
        // Enhanced Overpass query for zone classification - includes ways and relations for parks
        $query = "
            [out:json][timeout:20];
            (
                // Food & Dining (nodes)
                node[\"amenity\"=\"restaurant\"](around:$radius,$lat,$lng);
                node[\"amenity\"=\"cafe\"](around:$radius,$lat,$lng);
                node[\"amenity\"=\"bar\"](around:$radius,$lat,$lng);
                node[\"amenity\"=\"fast_food\"](around:$radius,$lat,$lng);
                
                // Parks & Recreation (nodes, ways, and relations)
                node[\"leisure\"=\"park\"](around:$radius,$lat,$lng);
                node[\"leisure\"=\"playground\"](around:$radius,$lat,$lng);
                node[\"leisure\"=\"garden\"](around:$radius,$lat,$lng);
                node[\"leisure\"=\"fitness_centre\"](around:$radius,$lat,$lng);
                node[\"leisure\"=\"sports_centre\"](around:$radius,$lat,$lng);
                node[\"tourism\"=\"attraction\"](around:$radius,$lat,$lng);
                node[\"tourism\"=\"museum\"](around:$radius,$lat,$lng);
                node[\"tourism\"=\"viewpoint\"](around:$radius,$lat,$lng);
                node[\"natural\"=\"water\"](around:$radius,$lat,$lng);
                node[\"historic\"](around:$radius,$lat,$lng);
                
                // Park areas (ways)
                way[\"leisure\"=\"park\"](around:$radius,$lat,$lng);
                way[\"leisure\"=\"playground\"](around:$radius,$lat,$lng);
                way[\"leisure\"=\"garden\"](around:$radius,$lat,$lng);
                way[\"leisure\"=\"fitness_centre\"](around:$radius,$lat,$lng);
                way[\"leisure\"=\"sports_centre\"](around:$radius,$lat,$lng);
                way[\"landuse\"=\"recreation_ground\"](around:$radius,$lat,$lng);
                way[\"landuse\"=\"grass\"](around:$radius,$lat,$lng);
                way[\"natural\"=\"water\"](around:$radius,$lat,$lng);
                way[\"natural\"=\"wood\"](around:$radius,$lat,$lng);
                way[\"natural\"=\"scrub\"](around:$radius,$lat,$lng);
                way[\"tourism\"=\"attraction\"](around:$radius,$lat,$lng);
                way[\"historic\"](around:$radius,$lat,$lng);
                
                // Park relations
                relation[\"leisure\"=\"park\"](around:$radius,$lat,$lng);
                relation[\"leisure\"=\"playground\"](around:$radius,$lat,$lng);
                relation[\"leisure\"=\"garden\"](around:$radius,$lat,$lng);
                relation[\"landuse\"=\"recreation_ground\"](around:$radius,$lat,$lng);
                relation[\"natural\"=\"water\"](around:$radius,$lat,$lng);
                relation[\"tourism\"=\"attraction\"](around:$radius,$lat,$lng);
                
                // NAME-BASED PARK DETECTION - Search for names containing park-related terms
                node[\"name\"~\"park|Park|PARK\"](around:$radius,$lat,$lng);
                way[\"name\"~\"park|Park|PARK\"](around:$radius,$lat,$lng);
                relation[\"name\"~\"park|Park|PARK\"](around:$radius,$lat,$lng);
                node[\"name\"~\"recreation|Recreation|RECREATION\"](around:$radius,$lat,$lng);
                way[\"name\"~\"recreation|Recreation|RECREATION\"](around:$radius,$lat,$lng);
                relation[\"name\"~\"recreation|Recreation|RECREATION\"](around:$radius,$lat,$lng);
                node[\"name\"~\"playground|Playground|PLAYGROUND\"](around:$radius,$lat,$lng);
                way[\"name\"~\"playground|Playground|PLAYGROUND\"](around:$radius,$lat,$lng);
                relation[\"name\"~\"playground|Playground|PLAYGROUND\"](around:$radius,$lat,$lng);
                node[\"name\"~\"memorial|Memorial|MEMORIAL\"](around:$radius,$lat,$lng);
                way[\"name\"~\"memorial|Memorial|MEMORIAL\"](around:$radius,$lat,$lng);
                relation[\"name\"~\"memorial|Memorial|MEMORIAL\"](around:$radius,$lat,$lng);
                node[\"name\"~\"plaza|Plaza|PLAZA\"](around:$radius,$lat,$lng);
                way[\"name\"~\"plaza|Plaza|PLAZA\"](around:$radius,$lat,$lng);
                relation[\"name\"~\"plaza|Plaza|PLAZA\"](around:$radius,$lat,$lng);
                node[\"name\"~\"square|Square|SQUARE\"](around:$radius,$lat,$lng);
                way[\"name\"~\"square|Square|SQUARE\"](around:$radius,$lat,$lng);
                relation[\"name\"~\"square|Square|SQUARE\"](around:$radius,$lat,$lng);
                
                // Shopping & Retail (nodes)
                node[\"shop\"](around:$radius,$lat,$lng);
                
                // Services (nodes)
                node[\"amenity\"=\"bank\"](around:$radius,$lat,$lng);
                node[\"amenity\"=\"dentist\"](around:$radius,$lat,$lng);
                node[\"amenity\"=\"lawyer\"](around:$radius,$lat,$lng);
                node[\"office\"](around:$radius,$lat,$lng);
            );
            out body;
            >;
            out skel qt;
        ";
        
        error_log('TNPOI Map Preview: Querying OSM at (' . $lat . ', ' . $lng . ') with radius ' . $radius . 'm');
        
        $url = 'https://overpass-api.de/api/interpreter';
        $response = wp_remote_post($url, array(
            'body' => $query,
            'timeout' => 15,
            'headers' => array(
                'Content-Type' => 'application/x-www-form-urlencoded'
            )
        ));
        
        if (is_wp_error($response)) {
            error_log('TNPOI Map Preview: OSM zone query error: ' . $response->get_error_message());
            return array();
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (empty($data) || !isset($data['elements'])) {
            error_log('TNPOI Map Preview: Invalid OSM zone response');
            return array();
        }
        
        error_log('TNPOI Map Preview: OSM zone query returned ' . count($data['elements']) . ' elements');
        
        // Log details of what was found
        $category_counts = array(
            'food_dining' => 0,
            'parks_recreation' => 0,
            'shopping' => 0,
            'services' => 0
        );
        
        foreach ($data['elements'] as $element) {
            if (isset($element['tags'])) {
                $tags = $element['tags'];
                $element_type = $element['type'] ?? 'node';
                
                // Get coordinates for logging (nodes have lat/lon, ways/relations don't)
                $coords = '';
                if (isset($element['lat']) && isset($element['lon'])) {
                    $coords = ' at (' . $element['lat'] . ', ' . $element['lon'] . ')';
                } else {
                    $coords = ' (' . $element_type . ' ID: ' . $element['id'] . ')';
                }
                
                // Food & Dining (nodes only)
                if ($element_type === 'node' && isset($tags['amenity']) && in_array($tags['amenity'], ['restaurant', 'cafe', 'bar', 'fast_food'])) {
                    $category_counts['food_dining']++;
                    error_log('TNPOI Map Preview: Found food/dining: ' . $tags['amenity'] . $coords);
                }
                
                // TRUE CITY PARKS - Tag-based detection
                if (isset($tags['leisure']) && $tags['leisure'] === 'park') {
                    // Parks with the 'park' tag
                    $category_counts['parks_recreation']++;
                    error_log('TNPOI Map Preview: Found TRUE CITY PARK (tag): ' . $tags['leisure'] . $coords);
                }
                // SOPHISTICATED NAME-BASED PARK DETECTION - Avoid false positives
                elseif (isset($tags['name'])) {
                    $name = strtolower($tags['name']);
                    $element_type = $element['type'] ?? 'node';
                    
                    // Check if this is likely a real park (not parking, street, etc.)
                    if ($this->is_likely_park_name($name, $tags, $element_type)) {
                        $category_counts['parks_recreation']++;
                        error_log('TNPOI Map Preview: Found REAL NAMED PARK: ' . $tags['name'] . $coords);
                    }
                    elseif ($this->is_likely_recreation_area($name, $tags, $element_type)) {
                        $category_counts['parks_recreation'] += 0.8; // High weight for recreation areas
                        error_log('TNPOI Map Preview: Found RECREATION AREA: ' . $tags['name'] . $coords);
                    }
                    elseif ($this->is_likely_memorial($name, $tags, $element_type)) {
                        $category_counts['parks_recreation'] += 0.7; // High weight for memorials
                        error_log('TNPOI Map Preview: Found MEMORIAL: ' . $tags['name'] . $coords);
                    }
                    elseif ($this->is_likely_plaza_square($name, $tags, $element_type)) {
                        $category_counts['parks_recreation'] += 0.6; // Moderate weight for plazas/squares
                        error_log('TNPOI Map Preview: Found PLAZA/SQUARE: ' . $tags['name'] . $coords);
                    }
                }
                // Playgrounds (moderate priority)
                elseif (isset($tags['leisure']) && $tags['leisure'] === 'playground') {
                    $category_counts['parks_recreation'] += 0.5; // Half weight for playgrounds
                    error_log('TNPOI Map Preview: Found playground: ' . $tags['leisure'] . $coords);
                }
                // Major attractions/museums (moderate priority)
                elseif (isset($tags['tourism']) && in_array($tags['tourism'], ['attraction', 'museum'])) {
                    $category_counts['parks_recreation'] += 0.4; // Moderate weight for attractions
                    error_log('TNPOI Map Preview: Found attraction: ' . $tags['tourism'] . $coords);
                }
                // Recreation grounds (moderate priority)
                elseif (isset($tags['landuse']) && $tags['landuse'] === 'recreation_ground') {
                    $category_counts['parks_recreation'] += 0.6; // Moderate weight for recreation grounds
                    error_log('TNPOI Map Preview: Found recreation ground: ' . $tags['landuse'] . $coords);
                }
                // Sports facilities (moderate priority)
                elseif ((isset($tags['leisure']) && in_array($tags['leisure'], ['fitness_centre', 'sports_centre'])) ||
                    (isset($tags['amenity']) && in_array($tags['amenity'], ['sports_centre', 'fitness_centre']))) {
                    $category_counts['parks_recreation'] += 0.3; // Moderate weight for sports facilities
                    $park_type = '';
                    if (isset($tags['leisure'])) $park_type = $tags['leisure'];
                    elseif (isset($tags['amenity'])) $park_type = 'amenity:' . $tags['amenity'];
                    error_log('TNPOI Map Preview: Found sports facility: ' . $park_type . $coords);
                }
                // EXCLUDE: Gardens - these are often just landscaping, not actual parks
                // EXCLUDE: natural features (water, woods, grass) - these are just river corridor features
                // EXCLUDE: These are NOT parks, just natural features along the trail
                
                // Shopping & Retail (nodes only)
                if ($element_type === 'node' && isset($tags['shop'])) {
                    $category_counts['shopping']++;
                    error_log('TNPOI Map Preview: Found shop: ' . $tags['shop'] . $coords);
                }
                
                // Services (nodes only)
                if ($element_type === 'node' && ((isset($tags['amenity']) && in_array($tags['amenity'], ['bank', 'dentist', 'lawyer'])) ||
                    (isset($tags['office'])))) {
                    $category_counts['services']++;
                    $service_type = isset($tags['amenity']) ? $tags['amenity'] : 'office';
                    error_log('TNPOI Map Preview: Found service: ' . $service_type . $coords);
                }
            }
        }
        
        error_log('TNPOI Map Preview: Category breakdown - Food: ' . $category_counts['food_dining'] . ', Parks: ' . $category_counts['parks_recreation'] . ', Shopping: ' . $category_counts['shopping'] . ', Services: ' . $category_counts['services']);
        
        return $data;
    }
    
    /**
     * Calculate zone score using simplified OSM categories
     */
    private function calculate_zone_score($osm_data, $weights = array()) {
        if (empty($osm_data['elements'])) {
            return array('score' => 0, 'category_counts' => array(
                'food_dining' => 0,
                'parks_recreation' => 0,
                'shopping' => 0,
                'services' => 0
            ), 'score_breakdown' => array(
                'food_dining' => 0,
                'parks_recreation' => 0,
                'shopping' => 0,
                'services' => 0
            ), 'poi_names' => array(
                'food_dining' => array(),
                'parks_recreation' => array(),
                'shopping' => array(),
                'services' => array()
            ));
        }
        
        // Default weights if not provided
        $default_weights = array(
            'food_dining' => 10,
            'parks_recreation' => 10,
            'shopping' => 4,
            'services' => 1
        );
        
        $weights = array_merge($default_weights, $weights);
        
        $category_counts = array(
            'food_dining' => 0,
            'parks_recreation' => 0,
            'shopping' => 0,
            'services' => 0
        );
        $poi_names = array(
            'food_dining' => array(),
            'parks_recreation' => array(),
            'shopping' => array(),
            'services' => array()
        );
        
        foreach ($osm_data['elements'] as $element) {
            if (isset($element['tags'])) {
                $tags = $element['tags'];
                $element_type = $element['type'] ?? 'node';
                $name = isset($tags['name']) ? $tags['name'] : null;
                
                // Food & Dining (nodes only)
                if ($element_type === 'node' && isset($tags['amenity']) && in_array($tags['amenity'], ['restaurant', 'cafe', 'bar', 'fast_food'])) {
                    $category_counts['food_dining']++;
                    if ($name) $poi_names['food_dining'][] = $name;
                }
                
                // TRUE CITY PARKS - Tag-based detection
                if (isset($tags['leisure']) && $tags['leisure'] === 'park') {
                    // Parks with the 'park' tag
                    $category_counts['parks_recreation']++;
                    if ($name) $poi_names['parks_recreation'][] = $name;
                }
                // NAME-BASED PARK DETECTION - Much more reliable!
                elseif (isset($tags['name'])) {
                    $name = strtolower($tags['name']);
                    if (strpos($name, 'park') !== false) {
                        $category_counts['parks_recreation']++;
                        $poi_names['parks_recreation'][] = $tags['name'];
                    }
                    elseif (strpos($name, 'recreation') !== false) {
                        $category_counts['parks_recreation'] += 0.8;
                        $poi_names['parks_recreation'][] = $tags['name'];
                    }
                    elseif (strpos($name, 'memorial') !== false) {
                        $category_counts['parks_recreation'] += 0.7;
                        $poi_names['parks_recreation'][] = $tags['name'];
                    }
                    elseif (strpos($name, 'plaza') !== false || strpos($name, 'square') !== false) {
                        $category_counts['parks_recreation'] += 0.6;
                        $poi_names['parks_recreation'][] = $tags['name'];
                    }
                }
                // Playgrounds (moderate priority)
                elseif (isset($tags['leisure']) && $tags['leisure'] === 'playground') {
                    $category_counts['parks_recreation'] += 0.5;
                    if ($name) $poi_names['parks_recreation'][] = $name;
                }
                // Major attractions/museums (moderate priority)
                elseif (isset($tags['tourism']) && in_array($tags['tourism'], ['attraction', 'museum'])) {
                    $category_counts['parks_recreation'] += 0.4;
                    if ($name) $poi_names['parks_recreation'][] = $name;
                }
                // Recreation grounds (moderate priority)
                elseif (isset($tags['landuse']) && $tags['landuse'] === 'recreation_ground') {
                    $category_counts['parks_recreation'] += 0.6;
                    if ($name) $poi_names['parks_recreation'][] = $name;
                }
                // Sports facilities (moderate priority)
                elseif ((isset($tags['leisure']) && in_array($tags['leisure'], ['fitness_centre', 'sports_centre'])) ||
                    (isset($tags['amenity']) && in_array($tags['amenity'], ['sports_centre', 'fitness_centre']))) {
                    $category_counts['parks_recreation'] += 0.3;
                    if ($name) $poi_names['parks_recreation'][] = $name;
                }
                // Shopping & Retail (nodes only)
                if ($element_type === 'node' && isset($tags['shop'])) {
                    $category_counts['shopping']++;
                    if ($name) $poi_names['shopping'][] = $name;
                }
                // Services (nodes only)
                if ($element_type === 'node' && ((isset($tags['amenity']) && in_array($tags['amenity'], ['bank', 'dentist', 'lawyer'])) ||
                    (isset($tags['office'])))) {
                    $category_counts['services']++;
                    if ($name) $poi_names['services'][] = $name;
                }
            }
        }
        
        // Calculate weighted score
        $total_score = 0;
        $score_breakdown = array();
        foreach ($category_counts as $category => $count) {
            $category_score = $count * $weights[$category];
            $total_score += $category_score;
            $score_breakdown[$category] = $category_score;
        }
        
        error_log('TNPOI Map Preview: Zone score calculation - Food: ' . $category_counts['food_dining'] . 
                 ' (score: ' . $score_breakdown['food_dining'] . '), Parks: ' . $category_counts['parks_recreation'] . 
                 ' (score: ' . $score_breakdown['parks_recreation'] . '), Shopping: ' . $category_counts['shopping'] . 
                 ' (score: ' . $score_breakdown['shopping'] . '), Services: ' . $category_counts['services'] . 
                 ' (score: ' . $score_breakdown['services'] . '), Total Score: ' . $total_score);
        
        return array('score' => $total_score, 'category_counts' => $category_counts, 'score_breakdown' => $score_breakdown, 'poi_names' => $poi_names);
    }
    
    /**
     * Classify zone based on score and thresholds
     */
    private function classify_zone($score, $hot_threshold = 25, $warm_threshold = 10) {
        // Use the provided thresholds (or defaults)
        // With parks_recreation_weight = 10:
        // - Hot: At least 2.5+ TRUE parks (score 25+)
        // - Warm: At least 1+ park (score 10+)
        // - Cold: Less than 1 park (score < 10)
        
        if ($score >= $hot_threshold) {
            return 'hot';
        } elseif ($score >= $warm_threshold) {
            return 'warm';
        } else {
            return 'cold';
        }
    }
    
    /**
     * Calculate trail importance score based on OSM data
     */
    private function calculate_trail_importance_score($osm_data, $lat, $lng) {
        if (empty($osm_data['elements'])) {
            return 0.1; // Default low importance if no data
        }
        
        $scores = array(
            'trail_infrastructure' => 0,
            'amenities' => 0,
            'natural_attractions' => 0,
            'commercial' => 0,
            'transportation' => 0,
            'cultural' => 0,
            'connectivity' => 0
        );
        
        $element_counts = array(
            'trail_ways' => 0,
            'amenity_nodes' => 0,
            'natural_nodes' => 0,
            'commercial_nodes' => 0,
            'transport_nodes' => 0,
            'cultural_nodes' => 0
        );
        
        foreach ($osm_data['elements'] as $element) {
            if (isset($element['tags'])) {
                $tags = $element['tags'];
                
                // Trail infrastructure (ways)
                if (isset($tags['highway']) && in_array($tags['highway'], ['path', 'footway', 'cycleway', 'pedestrian'])) {
                    $element_counts['trail_ways']++;
                    $scores['trail_infrastructure'] += 0.1;
                }
                
                // Route tags (bicycle, hiking routes)
                if (isset($tags['route']) && in_array($tags['route'], ['bicycle', 'hiking'])) {
                    $scores['trail_infrastructure'] += 0.15;
                }
                
                // Trail amenities
                if (isset($tags['amenity']) && in_array($tags['amenity'], ['drinking_water', 'toilets', 'bench', 'shelter', 'parking'])) {
                    $element_counts['amenity_nodes']++;
                    $scores['amenities'] += 0.2;
                }
                
                // Natural attractions
                if ((isset($tags['leisure']) && in_array($tags['leisure'], ['park', 'playground', 'garden'])) ||
                    (isset($tags['natural']) && $tags['natural'] === 'water') ||
                    (isset($tags['tourism']) && $tags['tourism'] === 'viewpoint') ||
                    (isset($tags['historic']))) {
                    $element_counts['natural_nodes']++;
                    $scores['natural_attractions'] += 0.25;
                }
                
                // Commercial establishments
                if ((isset($tags['shop'])) ||
                    (isset($tags['amenity']) && in_array($tags['amenity'], ['restaurant', 'cafe', 'bar', 'fast_food', 'ice_cream']))) {
                    $element_counts['commercial_nodes']++;
                    $scores['commercial'] += 0.3;
                }
                
                // Transportation and access
                if ((isset($tags['highway']) && in_array($tags['highway'], ['traffic_signals', 'bus_stop'])) ||
                    (isset($tags['railway']) && in_array($tags['railway'], ['station', 'tram_stop']))) {
                    $element_counts['transport_nodes']++;
                    $scores['transportation'] += 0.2;
                }
                
                // Cultural and educational
                if ((isset($tags['amenity']) && in_array($tags['amenity'], ['school', 'university', 'library'])) ||
                    (isset($tags['tourism']) && $tags['tourism'] === 'museum') ||
                    (isset($tags['amenity']) && $tags['amenity'] === 'arts_centre')) {
                    $element_counts['cultural_nodes']++;
                    $scores['cultural'] += 0.25;
                }
            }
        }
        
        // Calculate connectivity score based on trail way intersections
        $scores['connectivity'] = min(0.5, $element_counts['trail_ways'] * 0.1);
        
        // Log detailed analysis
        error_log('TNPOI Map Preview: OSM Analysis - Trail ways: ' . $element_counts['trail_ways'] . 
                 ', Amenities: ' . $element_counts['amenity_nodes'] . 
                 ', Natural: ' . $element_counts['natural_nodes'] . 
                 ', Commercial: ' . $element_counts['commercial_nodes'] . 
                 ', Transport: ' . $element_counts['transport_nodes'] . 
                 ', Cultural: ' . $element_counts['cultural_nodes']);
        
        // Calculate weighted importance score
        $importance_score = (
            $scores['trail_infrastructure'] * 0.15 +
            $scores['amenities'] * 0.20 +
            $scores['natural_attractions'] * 0.20 +
            $scores['commercial'] * 0.25 +
            $scores['transportation'] * 0.10 +
            $scores['cultural'] * 0.05 +
            $scores['connectivity'] * 0.05
        );
        
        // Normalize to 0-1 range
        $importance_score = min(1.0, $importance_score);
        
        return $importance_score;
    }
    
    /**
     * Simulate POI discovery using OSM-based importance analysis
     */
    private function simulate_poi_discovery($lat, $lng, $radius) {
        // Use OSM-based importance analysis instead of hardcoded density
        $importance_score = $this->analyze_trail_area_importance($lat, $lng, $radius);
        
        // Convert importance score to simulated POI count
        if ($importance_score > 0.7) {
            return rand(10, 20); // High importance: 10-20 POIs
        } elseif ($importance_score > 0.4) {
            return rand(5, 12);  // Medium importance: 5-12 POIs
        } elseif ($importance_score > 0.2) {
            return rand(2, 6);   // Low importance: 2-6 POIs
        } else {
            return rand(0, 3);   // Very low importance: 0-3 POIs
        }
    }
    
    /**
     * Calculate point density based on discovered POI clusters and sparse areas
     */
    private function calculate_point_density($lat, $lng, $poi_clusters, $sparse_areas) {
        $max_cluster_distance = 1000; // 1km max influence
        $max_sparse_distance = 500;   // 500m max influence
        
        $cluster_influence = 0;
        $sparse_influence = 0;
        
        // Check influence from POI clusters
        foreach ($poi_clusters as $cluster) {
            $distance = $this->calculate_distance($lat, $lng, $cluster['lat'], $cluster['lng']);
            if ($distance <= $max_cluster_distance) {
                // Strong influence from clusters, weighted by distance and POI count
                $influence_factor = (1 - ($distance / $max_cluster_distance)) * ($cluster['poi_count'] / 10);
                $cluster_influence = max($cluster_influence, $influence_factor);
            }
        }
        
        // Check influence from sparse areas
        foreach ($sparse_areas as $sparse) {
            $distance = $this->calculate_distance($lat, $lng, $sparse['lat'], $sparse['lng']);
            if ($distance <= $max_sparse_distance) {
                // Moderate influence from sparse areas
                $influence_factor = (1 - ($distance / $max_sparse_distance)) * ($sparse['poi_count'] / 5);
                $sparse_influence = max($sparse_influence, $influence_factor);
            }
        }
        
        // Combine influences with cluster influence being more significant
        $total_density = ($cluster_influence * 0.7) + ($sparse_influence * 0.3);
        
        // Ensure density is between 0.1 and 1.0
        return max(0.1, min(1.0, $total_density));
    }
    
    /**
     * Get optimized interval based on discovered POI patterns
     */
    private function get_optimized_interval($density_score, $base_interval) {
        if ($density_score > 0.7) {
            return $base_interval * 0.4; // High density: 40% of base interval (more frequent sampling)
        } elseif ($density_score > 0.4) {
            return $base_interval * 0.6; // Medium density: 60% of base interval
        } elseif ($density_score > 0.2) {
            return $base_interval * 0.8; // Low density: 80% of base interval
        } else {
            return $base_interval * 1.2; // Very low density: 120% of base interval (less frequent sampling)
        }
    }
    
    /**
     * Get optimized radius based on discovered POI patterns
     */
    private function get_optimized_radius($density_score, $base_radius) {
        if ($density_score > 0.7) {
            return intval($base_radius * 0.5); // High density: 50% of base radius (focused search)
        } elseif ($density_score > 0.4) {
            return intval($base_radius * 0.7); // Medium density: 70% of base radius
        } elseif ($density_score > 0.2) {
            return $base_radius; // Normal density: base radius
        } else {
            return intval($base_radius * 1.4); // Low density: 140% of base radius (broader search)
        }
    }
    
    /**
     * Analyze area density around a point using OSM data
     */
    private function analyze_area_density($lat, $lng) {
        error_log('TNPOI Map Preview: Analyzing density for coordinates: ' . $lat . ', ' . $lng);
        
        // Query OSM Overpass API for area characteristics
        $osm_data = $this->query_osm_area_data($lat, $lng);
        
        // Calculate density score from OSM data
        $density_score = $this->calculate_area_density($osm_data);
        
        error_log('TNPOI Map Preview: Density score calculated: ' . $density_score);
        
        return $density_score;
    }
    
    /**
     * Get adaptive interval based on density score
     */
    private function get_adaptive_interval($density_score, $base_interval) {
        // High density areas: sample more frequently (smaller intervals)
        // Low density areas: sample less frequently (larger intervals)
        if ($density_score > 0.7) {
            return $base_interval * 0.5; // High density: 50% of base interval
        } elseif ($density_score > 0.4) {
            return $base_interval * 0.75; // Medium density: 75% of base interval
        } elseif ($density_score > 0.2) {
            return $base_interval; // Normal density: base interval
        } else {
            return $base_interval * 1.5; // Low density: 150% of base interval
        }
    }
    
    /**
     * Get adaptive radius based on density score
     */
    private function get_adaptive_radius($density_score, $base_radius) {
        // High density areas: smaller search radius (more focused)
        // Low density areas: larger search radius (broader search)
        if ($density_score > 0.7) {
            return intval($base_radius * 0.6); // High density: 60% of base radius
        } elseif ($density_score > 0.4) {
            return intval($base_radius * 0.8); // Medium density: 80% of base radius
        } elseif ($density_score > 0.2) {
            return $base_radius; // Normal density: base radius
        } else {
            return intval($base_radius * 1.3); // Low density: 130% of base radius
        }
    }
    
    /**
     * Query OSM Overpass API for pedestrian-friendly POI data
     */
    private function query_osm_area_data($lat, $lng) {
        $radius = 500; // 500m radius to analyze
        
        // Overpass query specifically for pedestrian-friendly POIs
        $query = "
            [out:json][timeout:15];
            (
                // Retail and food establishments
                node[\"shop\"](around:$radius,$lat,$lng);
                node[\"amenity\"=\"restaurant\"](around:$radius,$lat,$lng);
                node[\"amenity\"=\"cafe\"](around:$radius,$lat,$lng);
                node[\"amenity\"=\"bar\"](around:$radius,$lat,$lng);
                node[\"amenity\"=\"fast_food\"](around:$radius,$lat,$lng);
                node[\"amenity\"=\"ice_cream\"](around:$radius,$lat,$lng);
                
                // Parks and recreation
                node[\"leisure\"=\"park\"](around:$radius,$lat,$lng);
                node[\"leisure\"=\"playground\"](around:$radius,$lat,$lng);
                node[\"leisure\"=\"garden\"](around:$radius,$lat,$lng);
                node[\"leisure\"=\"fitness_centre\"](around:$radius,$lat,$lng);
                
                // Landmarks and tourist attractions
                node[\"tourism\"=\"attraction\"](around:$radius,$lat,$lng);
                node[\"historic\"](around:$radius,$lat,$lng);
                node[\"tourism\"=\"museum\"](around:$radius,$lat,$lng);
                node[\"tourism\"=\"viewpoint\"](around:$radius,$lat,$lng);
                
                // Pedestrian amenities
                node[\"amenity\"=\"toilets\"](around:$radius,$lat,$lng);
                node[\"amenity\"=\"drinking_water\"](around:$radius,$lat,$lng);
                node[\"amenity\"=\"bench\"](around:$radius,$lat,$lng);
                node[\"amenity\"=\"shelter\"](around:$radius,$lat,$lng);
                
                // Entertainment and culture
                node[\"amenity\"=\"cinema\"](around:$radius,$lat,$lng);
                node[\"amenity\"=\"theatre\"](around:$radius,$lat,$lng);
                node[\"amenity\"=\"arts_centre\"](around:$radius,$lat,$lng);
                
                // Educational (visitor centers, etc.)
                node[\"amenity\"=\"school\"](around:$radius,$lat,$lng);
                node[\"tourism\"=\"information\"](around:$radius,$lat,$lng);
            );
            out body;
            >;
            out skel qt;
        ";
        
        $url = 'https://overpass-api.de/api/interpreter';
        $response = wp_remote_post($url, array(
            'body' => $query,
            'timeout' => 20,
            'headers' => array(
                'Content-Type' => 'application/x-www-form-urlencoded'
            )
        ));
        
        if (is_wp_error($response)) {
            error_log('TNPOI Map Preview: OSM query error: ' . $response->get_error_message());
            return array();
        }
        
        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }
    
    /**
     * Calculate pedestrian-friendly POI density score from OSM data
     */
    private function calculate_area_density($osm_data) {
        if (empty($osm_data['elements'])) {
            return 0.1; // Default to low density if no data
        }
        
        $retail_count = 0;
        $food_count = 0;
        $park_count = 0;
        $landmark_count = 0;
        $amenity_count = 0;
        $entertainment_count = 0;
        
        foreach ($osm_data['elements'] as $element) {
            if (isset($element['tags'])) {
                $tags = $element['tags'];
                
                // Retail establishments
                if (isset($tags['shop'])) {
                    $retail_count++;
                }
                
                // Food establishments
                if (isset($tags['amenity']) && in_array($tags['amenity'], ['restaurant', 'cafe', 'bar', 'fast_food', 'ice_cream'])) {
                    $food_count++;
                }
                
                // Parks and recreation
                if (isset($tags['leisure']) && in_array($tags['leisure'], ['park', 'playground', 'garden', 'fitness_centre'])) {
                    $park_count++;
                }
                
                // Landmarks and tourist attractions
                if (isset($tags['tourism']) && in_array($tags['tourism'], ['attraction', 'museum', 'viewpoint']) || isset($tags['historic'])) {
                    $landmark_count++;
                }
                
                // Pedestrian amenities
                if (isset($tags['amenity']) && in_array($tags['amenity'], ['toilets', 'drinking_water', 'bench', 'shelter'])) {
                    $amenity_count++;
                }
                
                // Entertainment and culture
                if (isset($tags['amenity']) && in_array($tags['amenity'], ['cinema', 'theatre', 'arts_centre'])) {
                    $entertainment_count++;
                }
            }
        }
        
        // Calculate weighted density score (0-1)
        $total_pois = $retail_count + $food_count + $park_count + $landmark_count + $amenity_count + $entertainment_count;
        
        if ($total_pois === 0) {
            return 0.1;
        }
        
        // Weighted scoring based on importance for trail users
        $retail_score = min($retail_count / 8, 1.0) * 0.25; // 25% weight - shops
        $food_score = min($food_count / 6, 1.0) * 0.30; // 30% weight - restaurants/cafes
        $park_score = min($park_count / 3, 1.0) * 0.20; // 20% weight - parks/recreation
        $landmark_score = min($landmark_count / 2, 1.0) * 0.15; // 15% weight - landmarks
        $amenity_score = min($amenity_count / 4, 1.0) * 0.08; // 8% weight - amenities
        $entertainment_score = min($entertainment_count / 2, 1.0) * 0.02; // 2% weight - entertainment
        
        $density_score = $retail_score + $food_score + $park_score + $landmark_score + $amenity_score + $entertainment_score;
        
        error_log('TNPOI Map Preview: POI counts - Retail: ' . $retail_count . ', Food: ' . $food_count . ', Parks: ' . $park_count . ', Landmarks: ' . $landmark_count . ', Amenities: ' . $amenity_count . ', Entertainment: ' . $entertainment_count . ', Total: ' . $total_pois . ', Score: ' . round($density_score, 3));
        
        return $density_score;
    }
    
    /**
     * Estimate pedestrian-friendly POI density from location
     * Focuses on retail, landmarks, parks, and pedestrian amenities
     */
    private function estimate_density_from_location($lat, $lng) {
        // Known pedestrian-friendly commercial areas along the Swamp Rabbit Trail
        $pedestrian_friendly_areas = array(
            // Downtown Greenville - High density retail, restaurants, landmarks
            array('lat' => 34.8508, 'lng' => -82.3839, 'radius' => 1500, 'density' => 0.9),
            
            // Falls Park area - Landmarks, restaurants, tourist attractions
            array('lat' => 34.8475, 'lng' => -82.3989, 'radius' => 1200, 'density' => 0.85),
            
            // Conestee Nature Preserve - Park, visitor center, amenities
            array('lat' => 34.7699, 'lng' => -82.3493, 'radius' => 1000, 'density' => 0.7),
            
            // Travelers Rest - Restaurants, shops, trail amenities
            array('lat' => 34.9916, 'lng' => -82.4640, 'radius' => 1200, 'density' => 0.75),
            
            // Swamp Rabbit Cafe & Grocery area - Food, retail
            array('lat' => 34.8136, 'lng' => -82.3276, 'radius' => 800, 'density' => 0.6),
            
            // Cleveland Park - Park, playground, amenities
            array('lat' => 34.8454, 'lng' => -82.4640, 'radius' => 1000, 'density' => 0.65),
            
            // Greenville Tech area - Campus amenities, nearby retail
            array('lat' => 34.8350, 'lng' => -82.3650, 'radius' => 1000, 'density' => 0.55),
            
            // Mauldin area - Some retail, restaurants
            array('lat' => 34.7800, 'lng' => -82.3100, 'radius' => 1200, 'density' => 0.5),
        );
        
        // Check if point is in a known pedestrian-friendly area
        foreach ($pedestrian_friendly_areas as $area) {
            $distance = $this->calculate_distance($lat, $lng, $area['lat'], $area['lng']);
            if ($distance <= $area['radius']) {
                // Add some variation based on distance from center
                $distance_factor = 1 - ($distance / $area['radius']);
                $variation = (rand(-10, 10) / 100); // ±0.1 variation
                return max(0.1, min(1.0, $area['density'] * $distance_factor + $variation));
            }
        }
        
        // Check for proximity to trail corridor (medium density)
        $trail_corridor_areas = array(
            array('lat' => 34.8200, 'lng' => -82.3500, 'radius' => 500), // Central trail corridor
            array('lat' => 34.8600, 'lng' => -82.4200, 'radius' => 500), // Northern corridor
            array('lat' => 34.7600, 'lng' => -82.3300, 'radius' => 500), // Southern corridor
        );
        
        foreach ($trail_corridor_areas as $area) {
            $distance = $this->calculate_distance($lat, $lng, $area['lat'], $area['lng']);
            if ($distance <= $area['radius']) {
                return 0.3 + (rand(0, 20) / 100); // 0.3-0.5 for trail corridor
            }
        }
        
        // Default to low density for rural/remote areas
        return 0.1 + (rand(0, 15) / 100); // 0.1-0.25 for rural areas
    }
    
    /**
     * Calculate distance between two points in meters
     */
    private function calculate_distance($lat1, $lng1, $lat2, $lng2) {
        $earth_radius = 6371000; // meters
        
        $lat1_rad = deg2rad($lat1);
        $lng1_rad = deg2rad($lng1);
        $lat2_rad = deg2rad($lat2);
        $lng2_rad = deg2rad($lng2);
        
        $dlat = $lat2_rad - $lat1_rad;
        $dlng = $lng2_rad - $lng1_rad;
        
        $a = sin($dlat / 2) * sin($dlat / 2) +
             cos($lat1_rad) * cos($lat2_rad) *
             sin($dlng / 2) * sin($dlng / 2);
        
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        
        return $earth_radius * $c;
    }
    
    /**
     * AJAX handler for getting sync preview data
     */
    public static function ajax_get_sync_preview() {
        check_ajax_referer('tnpoi_map_preview_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $trail_id = sanitize_text_field($_POST['trail_id'] ?? '');
        $search_radius = intval($_POST['search_radius'] ?? 500);
        $coordinate_interval = intval($_POST['coordinate_interval'] ?? 200);
        $osm_analysis_radius = intval($_POST['osm_analysis_radius'] ?? 500);
        $use_adaptive_sampling = isset($_POST['enable_adaptive']) ? (bool)$_POST['enable_adaptive'] : false;
        
        // Debug the received parameters
        // AJAX logging removed for clean log
        
        if (empty($trail_id)) {
            wp_send_json_error('Trail ID is required');
        }
        
        $instance = new self();
        $preview_data = $instance->get_sync_preview_data($trail_id, $search_radius, $coordinate_interval, $use_adaptive_sampling);
        
        wp_send_json_success($preview_data);
    }
    
    /**
     * Fetch trail coordinates from RideWithGPS if not available
     */
    public function fetch_trail_coordinates($route_id) {
        // Try multiple API key option names for compatibility
        $api_key = get_option('tnpoi_ridewithgps_api_key', '');
        if (empty($api_key)) {
            $api_key = get_option('tcgp2_ridewithgps_api_key', '');
        }
        if (empty($api_key)) {
            $api_key = get_option('tcgp_ridewithgps_api_key', '');
        }
        
        if (empty($api_key)) {
            // No RideWithGPS API key configured
            return array();
        }
        
        $url = "https://ridewithgps.com/routes/{$route_id}.json?apikey={$api_key}";
        // Fetching RideWithGPS JSON
        
        $response = wp_remote_get($url, array(
            'timeout' => 30,
            'headers' => array('User-Agent' => 'TrailNavigator/3.0')
        ));
        
        if (is_wp_error($response)) {
            // Error fetching trail coordinates
            return array();
        }
        
        $body = wp_remote_retrieve_body($response);
        // RideWithGPS JSON response received
        
        $data = json_decode($body, true);
        
        // Check for the correct data structure (route.track_points)
        if (!$data || !isset($data['route']['track_points'])) {
            // No track_points found in RideWithGPS JSON
            return array();
        }
        
        $track_points = $data['route']['track_points'];
        // Fetched track points from RideWithGPS
        
        // Convert to the expected format
        $coordinates = array();
        foreach ($track_points as $point) {
            $coordinates[] = array(
                'lat' => $point['y'],
                'lng' => $point['x']
            );
        }
        
        // Parsed coordinates from RideWithGPS JSON
        return $coordinates;
    }
    
    /**
     * Get complete trail data with coordinates
     */
    public function get_complete_trail_data($trail) {
        if (isset($trail['trackPoints']) && !empty($trail['trackPoints'])) {
            return $trail;
        }
        
        // Try to fetch coordinates from RideWithGPS
        if (isset($trail['routeId'])) {
            $coordinates = $this->fetch_trail_coordinates($trail['routeId']);
            if (!empty($coordinates)) {
                $trail['trackPoints'] = $coordinates;
                // Added track points to trail
                return $trail;
            } else {
                // Failed to fetch coordinates for trail
            }
        } else {
            // No routeId found in trail data
        }
        
        return $trail;
    }
    
    /**
     * AJAX handler for zone discovery
     */
    public static function ajax_discover_zones() {
        check_ajax_referer('tnpoi_map_preview_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Unauthorized');
        }
        
        $trail_id = sanitize_text_field($_POST['trail_id'] ?? '');
        $weights = array(
            'food_dining' => intval($_POST['food_dining_weight'] ?? 10),
            'parks_recreation' => intval($_POST['parks_recreation_weight'] ?? 10),
            'shopping' => intval($_POST['shopping_weight'] ?? 4),
            'services' => intval($_POST['services_weight'] ?? 1)
        );
        $hot_threshold = intval($_POST['hot_threshold'] ?? 25);
        $warm_threshold = intval($_POST['warm_threshold'] ?? 10);
        $start_index = isset($_POST['start_index']) ? intval($_POST['start_index']) : 0;
        $batch_size = isset($_POST['batch_size']) ? intval($_POST['batch_size']) : 10;
        $search_radius = isset($_POST['search_radius']) ? intval($_POST['search_radius']) : 300;
        $osm_analysis_radius = isset($_POST['osm_analysis_radius']) ? intval($_POST['osm_analysis_radius']) : 500;
        
        // Debug the received parameters
        // AJAX logging removed for clean log
        
        if (empty($trail_id)) {
            wp_send_json_error('Trail ID is required');
        }
        
        $instance = new self();
        $trail_data = $instance->get_trail_data($trail_id);
        if (!$trail_data) {
            wp_send_json_error('Trail not found');
        }
        
        $zones_result = $instance->discover_trail_zones($trail_data, $weights, $hot_threshold, $warm_threshold, $start_index, $batch_size, $search_radius, $osm_analysis_radius);
        $zones = $zones_result['zones'];
        $total_batches = $zones_result['total_batches'];
        $current_batch = $zones_result['current_batch'];
        $has_more = $zones_result['has_more'];
        wp_send_json_success(array(
            'zones' => $zones,
            'total_points' => count($trail_data['trackPoints']),
            'zone_count' => $zones_result['zone_count'],
            'total_batches' => $total_batches,
            'current_batch' => $current_batch,
            'has_more' => $has_more
        ));
    }
    
    /**
     * Discover zones along the trail using OSM data
     */
    private function discover_trail_zones($trail_data, $weights, $hot_threshold, $warm_threshold, $start_index = 0, $batch_size = 10, $search_radius = 300, $osm_analysis_radius = 500) {
        $zones = array();
        $track_points = $trail_data['trackPoints'];
        $sample_interval = 500; // meters (0.3 miles)
        $total_points = count($track_points);
        $sampled_indices = array();
        $current_distance = 0;
        $last_sampled_distance = -$sample_interval;
        for ($i = 0; $i < $total_points; $i++) {
            if ($i > 0) {
                $prev_point = $track_points[$i - 1];
                $curr_point = $track_points[$i];
                $current_distance += $this->calculate_distance($prev_point['lat'], $prev_point['lng'], $curr_point['lat'], $curr_point['lng']);
            }
            if ($current_distance - $last_sampled_distance >= $sample_interval) {
                $sampled_indices[] = $i;
                $last_sampled_distance = $current_distance;
            }
        }
        $zone_count = count($sampled_indices);
        $total_batches = ceil($zone_count / $batch_size);
        $current_batch = floor($start_index / $batch_size) + 1;
        $has_more = ($start_index + $batch_size) < $zone_count;
        $batch_indices = array_slice($sampled_indices, $start_index, $batch_size);
        foreach ($batch_indices as $zone_idx) {
            $point = $track_points[$zone_idx];
            $lat = $point['lat'];
            $lng = $point['lng'];
            $osm_data = $this->query_osm_zone_data($lat, $lng, $osm_analysis_radius);
            $score_result = $this->calculate_zone_score($osm_data, $weights);
            $score = $score_result['score'];
            $category_counts = $score_result['category_counts'];
            $score_breakdown = $score_result['score_breakdown'];
            $poi_names = $score_result['poi_names'];
            $zone_type = $this->classify_zone($score, $hot_threshold, $warm_threshold);
            $zones[] = array(
                'lat' => $lat,
                'lng' => $lng,
                'score' => $score,
                'zone_type' => $zone_type,
                'sampling_interval' => $sample_interval,
                'search_radius' => $osm_analysis_radius,
                'osm_count' => count($osm_data['elements'] ?? array()),
                'score_breakdown' => $score_breakdown,
                'category_counts' => $category_counts,
                'poi_names' => $poi_names
            );
            usleep(100000); // 0.1 second delay
        }
        
        // Cache the zones for use in sync operations
        $this->cache_trail_zones($trail_data['routeId'], $zones);
        
        return array(
            'zones' => $zones,
            'zone_count' => $zone_count,
            'total_batches' => $total_batches,
            'current_batch' => $current_batch,
            'has_more' => $has_more
        );
    }
    
    /**
     * Cache trail zones for use in sync operations
     */
    private function cache_trail_zones($trail_id, $zones) {
        // Cache zones for 1 hour
        set_transient('tnpoi_trail_zones_' . $trail_id, $zones, HOUR_IN_SECONDS);
        error_log('TNPOI Map Preview: Cached ' . count($zones) . ' zones for trail ' . $trail_id);
    }
    
    /**
     * Get cached trail zones
     */
    public function get_cached_trail_zones($trail_id) {
        return get_transient('tnpoi_trail_zones_' . $trail_id);
    }
    
    /**
     * Get sampling parameters for different zone types
     */
    private function get_zone_sampling_params($zone_type) {
        // No longer used for radius, but keep for interval if needed
        return array(
            'interval' => 500, // 0.3 mile (or whatever you want for sampling)
            'radius' => null // Not used
        );
    }
    
    /**
     * Get trail data by ID
     */
    private function get_trail_data($trail_id) {
        $trail_config = get_option('trail_navigator_config', array());
        $trails = isset($trail_config['trails']) ? $trail_config['trails'] : array();
        
        foreach ($trails as $trail) {
            if ((string)$trail['routeId'] === (string)$trail_id) {
                return $this->get_complete_trail_data($trail);
            }
        }
        
        return null;
    }
    
    /**
     * Check if a name is likely a real park (not parking, street, etc.)
     */
    private function is_likely_park_name($name, $tags, $element_type) {
        // Normalize name
        $name = strtolower($name);
        // Must contain "park" as a standalone word or at the end
        if (!preg_match('/\bpark\b|park$/', $name)) {
            return false;
        }
        // Expanded false positives list
        $false_positives = array(
            'parking', 'car park', 'dog park cafe', 'apartment', 'market', 'cleaners', 'avenue', 'center', 'centre', 'lot', 'garage',
            'parkway', 'parkview', 'parkland', 'parkwood', 'parkdale', 'parkville', 'parkhurst', 'parkfield', 'parkstone', 'parkgate',
            'parkhead', 'parkhill', 'parkmore', 'parkmount', 'parkridge', 'parkroyal', 'parkside', 'parkwood', 'parkland',
            'business park', 'industrial park', 'office park', 'retail park', 'shopping park', 'trailer park', 'theme park', 'water park',
            'dog park cafe', 'dog park bar', 'dog park grill', 'dog park restaurant', 'dog park market', 'dog park cleaners',
            'dog park avenue', 'dog park center', 'dog park centre', 'dog park lot', 'dog park garage',
            'dog parkway', 'dog parkview', 'dog parkland', 'dog parkwood', 'dog parkdale', 'dog parkville', 'dog parkhurst', 'dog parkfield',
            'dog parkstone', 'dog parkgate', 'dog parkhead', 'dog parkhill', 'dog parkmore', 'dog parkmount', 'dog parkridge', 'dog parkroyal',
            'dog parkside', 'dog parkwood', 'dog parkland',
        );
        foreach ($false_positives as $false_positive) {
            if (strpos($name, $false_positive) !== false) {
                error_log('is_likely_park_name: Excluded as false positive: ' . $name . ' (matched: ' . $false_positive . ')');
                return false;
            }
        }
        // Require additional context for confidence
        $supporting_tags = array('leisure', 'landuse', 'tourism', 'historic', 'amenity');
        $has_supporting_tag = false;
        foreach ($supporting_tags as $tag) {
            if (isset($tags[$tag])) {
                $has_supporting_tag = true;
                break;
            }
        }
        // For ways and relations, we're more confident (these are usually areas)
        if ($element_type === 'way' || $element_type === 'relation') {
            if ($has_supporting_tag) {
                error_log('is_likely_park_name: Accepted as park (way/relation): ' . $name);
                return true;
            }
        }
        // For nodes, require stronger evidence
        if ($element_type === 'node') {
            if ($has_supporting_tag && (isset($tags['leisure']) || isset($tags['tourism']) || isset($tags['historic']))) {
                error_log('is_likely_park_name: Accepted as park (node): ' . $name);
                return true;
            }
        }
        error_log('is_likely_park_name: Not accepted as park: ' . $name);
        return false;
    }
    
    /**
     * Check if a name is likely a recreation area
     */
    private function is_likely_recreation_area($name, $tags, $element_type) {
        if (!preg_match('/\brecreation\b/', $name)) {
            return false;
        }
        
        // Exclude false positives
        $false_positives = array('recreation center', 'recreation complex', 'recreation facility');
        foreach ($false_positives as $false_positive) {
            if (strpos($name, $false_positive) !== false) {
                return false;
            }
        }
        
        // Require supporting tags
        $supporting_tags = array('leisure', 'landuse', 'amenity');
        foreach ($supporting_tags as $tag) {
            if (isset($tags[$tag])) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if a name is likely a memorial
     */
    private function is_likely_memorial($name, $tags, $element_type) {
        if (!preg_match('/\bmemorial\b/', $name)) {
            return false;
        }
        
        // Exclude false positives
        $false_positives = array('memorial hospital', 'memorial medical', 'memorial clinic');
        foreach ($false_positives as $false_positive) {
            if (strpos($name, $false_positive) !== false) {
                return false;
            }
        }
        
        // Require supporting tags
        $supporting_tags = array('historic', 'tourism', 'leisure', 'amenity');
        foreach ($supporting_tags as $tag) {
            if (isset($tags[$tag])) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if a name is likely a plaza or square
     */
    private function is_likely_plaza_square($name, $tags, $element_type) {
        if (!preg_match('/\b(plaza|square)\b/', $name)) {
            return false;
        }
        
        // Exclude false positives
        $false_positives = array('square feet', 'square meter', 'square mile', 'square yard');
        foreach ($false_positives as $false_positive) {
            if (strpos($name, $false_positive) !== false) {
                return false;
            }
        }
        
        // Require supporting tags
        $supporting_tags = array('leisure', 'landuse', 'amenity', 'tourism');
        foreach ($supporting_tags as $tag) {
            if (isset($tags[$tag])) {
                return true;
            }
        }
        
        return false;
    }

    public function get_preview_settings() {
        if ($this->preview_settings === null) {
            $saved = get_option($this->preview_option_name, array());
            $this->preview_settings = array_merge($this->preview_defaults, $saved);
        }
        return $this->preview_settings;
    }

    public function update_preview_settings($settings) {
        $current = $this->get_preview_settings();
        $new = array_merge($current, $settings);
        update_option($this->preview_option_name, $new);
        $this->preview_settings = $new;
    }

    public static function ajax_save_map_preview_settings() {
        check_ajax_referer('tnpoi_map_preview_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Unauthorized');
        }
        $settings = isset($_POST['settings']) ? $_POST['settings'] : array();
        if (empty($settings) || !is_array($settings)) {
            wp_send_json_error('No settings provided');
        }
        $instance = new self();
        $instance->update_preview_settings($settings);
        wp_send_json_success();
    }
}

// Initialize the class
new TNPOI_Map_Preview();

// Register AJAX handlers
add_action('wp_ajax_tnpoi_get_pois_map_preview', array('TNPOI_Map_Preview', 'ajax_get_pois_map_preview'));
add_action('wp_ajax_tnpoi_get_poi_details', array('TNPOI_Map_Preview', 'ajax_get_poi_details'));
add_action('wp_ajax_tnpoi_get_sync_preview', array('TNPOI_Map_Preview', 'ajax_get_sync_preview'));
add_action('wp_ajax_tnpoi_discover_zones', array('TNPOI_Map_Preview', 'ajax_discover_zones'));
add_action('wp_ajax_tnpoi_save_map_preview_settings', ['TNPOI_Map_Preview', 'ajax_save_map_preview_settings']);
