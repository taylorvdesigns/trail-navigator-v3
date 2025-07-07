<?php
/**
 * POI Database Class
 * 
 * Handles all database operations for POIs
 */

if (!defined('ABSPATH')) {
    exit;
}

class TNPOI_POI_DB {
    
    private $table_name;
    
    public function __construct() {
        global $wpdb;
        $this->table_name = $wpdb->prefix . 'tnpoi_pois';
    }
    
    /**
     * Get table name
     */
    public function get_table_name() {
        return $this->table_name;
    }
    
    /**
     * Create database table
     */
    public static function create_table() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'tnpoi_pois';
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE {$table_name} (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            place_id varchar(255) NOT NULL,
            name varchar(255) NOT NULL,
            address text,
            latitude decimal(10,8) NOT NULL,
            longitude decimal(11,8) NOT NULL,
            types text,
            category_ids text,
            rating decimal(2,1) DEFAULT 0,
            user_ratings_total int(11) DEFAULT 0,
            price_level tinyint(1) DEFAULT 0,
            search_term varchar(255),
            search_location varchar(255),
            search_radius int(11),
            trail_id varchar(64),
            trail_name varchar(255),
            distance_along_trail decimal(10,2) DEFAULT 0,
            trail_position int(11) DEFAULT 0,
            status varchar(32) DEFAULT 'new',
            ignored tinyint(1) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY place_id (place_id),
            KEY latitude (latitude),
            KEY longitude (longitude),
            KEY search_term (search_term),
            KEY trail_id (trail_id),
            KEY distance_along_trail (distance_along_trail),
            KEY trail_position (trail_position),
            KEY status (status),
            KEY ignored (ignored),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        // Add new columns to existing installations
        self::add_trail_columns_if_missing();
    }
    
    /**
     * Add trail position columns to existing installations
     */
    public static function add_trail_columns_if_missing() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'tnpoi_pois';
        
        // Check and add trail_id column
        $column_exists = $wpdb->get_results("SHOW COLUMNS FROM $table_name LIKE 'trail_id'");
        if (empty($column_exists)) {
            $wpdb->query("ALTER TABLE $table_name ADD COLUMN trail_id VARCHAR(64) AFTER search_radius");
        }
        
        // Check and add trail_name column
        $column_exists = $wpdb->get_results("SHOW COLUMNS FROM $table_name LIKE 'trail_name'");
        if (empty($column_exists)) {
            $wpdb->query("ALTER TABLE $table_name ADD COLUMN trail_name VARCHAR(255) AFTER trail_id");
        }
        
        // Check and add distance_along_trail column
        $column_exists = $wpdb->get_results("SHOW COLUMNS FROM $table_name LIKE 'distance_along_trail'");
        if (empty($column_exists)) {
            $wpdb->query("ALTER TABLE $table_name ADD COLUMN distance_along_trail DECIMAL(10,2) DEFAULT 0 AFTER trail_name");
        }
        
        // Check and add trail_position column
        $column_exists = $wpdb->get_results("SHOW COLUMNS FROM $table_name LIKE 'trail_position'");
        if (empty($column_exists)) {
            $wpdb->query("ALTER TABLE $table_name ADD COLUMN trail_position INT(11) DEFAULT 0 AFTER distance_along_trail");
        }
        
        // Check and add status column
        $column_exists = $wpdb->get_results("SHOW COLUMNS FROM $table_name LIKE 'status'");
        if (empty($column_exists)) {
            $wpdb->query("ALTER TABLE $table_name ADD COLUMN status VARCHAR(32) DEFAULT 'new' AFTER trail_position");
        }
        
        // Check and add ignored column
        $column_exists = $wpdb->get_results("SHOW COLUMNS FROM $table_name LIKE 'ignored'");
        if (empty($column_exists)) {
            $wpdb->query("ALTER TABLE $table_name ADD COLUMN ignored TINYINT(1) DEFAULT 0 AFTER status");
        }
    }
    
    /**
     * Insert or update POI
     */
    public function insert_or_update_poi($poi_data) {
        global $wpdb;
        $table = $this->get_table_name();
        // Try to insert, if duplicate, update
        $result = $wpdb->replace($table, $poi_data);
        if ($result === false || $result === 0) {
            error_log('TNPOI DEBUG: insert_or_update_poi FAILED for ' . ($poi_data['name'] ?? 'unknown') . ' (' . ($poi_data['place_id'] ?? 'no place_id') . ')');
            return false;
        }
        // $wpdb->replace returns 1 for insert, 2 for update
        if ($result === 1) {
            error_log('TNPOI DEBUG: insert_or_update_poi INSERTED ' . ($poi_data['name'] ?? 'unknown') . ' (' . ($poi_data['place_id'] ?? 'no place_id') . ')');
            return 'inserted';
        } elseif ($result === 2) {
            error_log('TNPOI DEBUG: insert_or_update_poi UPDATED ' . ($poi_data['name'] ?? 'unknown') . ' (' . ($poi_data['place_id'] ?? 'no place_id') . ')');
            return 'updated';
        } else {
            error_log('TNPOI DEBUG: insert_or_update_poi UNKNOWN RESULT (' . $result . ') for ' . ($poi_data['name'] ?? 'unknown') . ' (' . ($poi_data['place_id'] ?? 'no place_id') . ')');
            return false;
        }
    }
    
    /**
     * Insert new POI
     */
    public function insert_poi($data) {
        global $wpdb;
        // Ensure ignored = 0 by default
        if (!isset($data['ignored'])) {
            $data['ignored'] = 0;
        }
        $result = $wpdb->insert(
            $this->table_name,
            array(
                'place_id' => $data['place_id'],
                'name' => $data['name'],
                'address' => $data['address'],
                'latitude' => $data['latitude'],
                'longitude' => $data['longitude'],
                'types' => $data['types'],
                'rating' => $data['rating'],
                'user_ratings_total' => $data['user_ratings_total'],
                'price_level' => $data['price_level'],
                'search_term' => $data['search_term'],
                'search_location' => $data['search_location'],
                'search_radius' => $data['search_radius'],
                'created_at' => $data['created_at'],
                'updated_at' => $data['updated_at'],
                'ignored' => $data['ignored']
            ),
            array(
                '%s', '%s', '%s', '%f', '%f', '%s', '%f', '%d', '%d', '%s', '%s', '%d', '%s', '%s', '%d', '%s', '%s', '%d'
            )
        );
        return $result ? $wpdb->insert_id : false;
    }
    
    /**
     * Update POI by ID
     */
    public function update_poi($poi_id, $data) {
        global $wpdb;
        error_log('TNPOI DEBUG: update_poi called for POI ' . $poi_id . ' with data: ' . print_r($data, true));
        $table = $this->get_table_name();
        $result = $wpdb->update($table, $data, array('id' => $poi_id));
        error_log('TNPOI DEBUG: update_poi result for POI ' . $poi_id . ': ' . var_export($result, true));
        if ($result === false) {
            error_log('TNPOI DEBUG: update_poi FAILED for POI ' . $poi_id . ' (DB error: ' . $wpdb->last_error . ')');
            return false;
        }
        // 0 means no rows changed, but that's not an error
        return true;
    }
    
    /**
     * Delete POI
     */
    public function delete_poi($id) {
        global $wpdb;
        
        return $wpdb->delete(
            $this->table_name,
            array('id' => $id),
            array('%d')
        );
    }
    
    /**
     * Get single POI
     */
    public function get_poi($id) {
        global $wpdb;
        
        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->table_name} WHERE id = %d",
            $id
        ));
    }
    
    /**
     * Get all POIs
     */
    public function get_all_pois() {
        global $wpdb;
        
        return $wpdb->get_results(
            "SELECT * FROM {$this->table_name} ORDER BY created_at DESC"
        );
    }
    
    /**
     * Get recent POIs
     */
    public function get_recent_pois($limit = 10) {
        global $wpdb;
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$this->table_name} ORDER BY created_at DESC LIMIT %d",
            $limit
        ));
    }
    
    /**
     * Get POIs with pagination and filtering
     */
    public function get_pois($page = 1, $per_page = 20, $search = '', $filter_type = '', $filter_search_term = '', $sort_by = 'created_at', $sort_order = 'DESC', $filter_trail = '', $filter_status = '', $filter_ignored = '') {
        global $wpdb;
        
        $offset = ($page - 1) * $per_page;
        $where_conditions = array();
        $where_values = array();
        
        // Search filter
        if (!empty($search)) {
            $where_conditions[] = "(name LIKE %s OR address LIKE %s)";
            $where_values[] = '%' . $wpdb->esc_like($search) . '%';
            $where_values[] = '%' . $wpdb->esc_like($search) . '%';
        }
        
        // Type filter
        if (!empty($filter_type)) {
            $where_conditions[] = "types LIKE %s";
            $where_values[] = '%' . $wpdb->esc_like($filter_type) . '%';
        }
        
        // Search term filter
        if (!empty($filter_search_term)) {
            $where_conditions[] = "search_term = %s";
            $where_values[] = $filter_search_term;
        }
        
        // Trail filter
        if (!empty($filter_trail)) {
            $where_conditions[] = "trail_id = %s";
            $where_values[] = $filter_trail;
        }
        
        // Status filter
        if (!empty($filter_status)) {
            $where_conditions[] = "status = %s";
            $where_values[] = $filter_status;
        }
        
        // Ignored filter
        if ($filter_ignored !== '') {
            $where_conditions[] = "ignored = %d";
            $where_values[] = intval($filter_ignored);
        }
        
        $where_clause = '';
        if (!empty($where_conditions)) {
            $where_clause = 'WHERE ' . implode(' AND ', $where_conditions);
        }
        
        // Validate sort parameters
        $allowed_sort_fields = array('name', 'created_at', 'rating', 'trail_position', 'distance_along_trail', 'trail_name', 'status');
        $sort_by = in_array($sort_by, $allowed_sort_fields) ? $sort_by : 'created_at';
        $sort_order = strtoupper($sort_order) === 'ASC' ? 'ASC' : 'DESC';
        
        $sql = "SELECT * FROM {$this->table_name} {$where_clause} ORDER BY {$sort_by} {$sort_order} LIMIT %d OFFSET %d";
        $where_values[] = $per_page;
        $where_values[] = $offset;
        
        $pois = $wpdb->get_results($wpdb->prepare($sql, $where_values));
        
        return array(
            'pois' => $pois,
            'total' => $this->get_pois_count($search, $filter_type, $filter_search_term, $filter_trail, $filter_status, $filter_ignored),
            'page' => $page,
            'per_page' => $per_page,
            'pages' => ceil($this->get_pois_count($search, $filter_type, $filter_search_term, $filter_trail, $filter_status, $filter_ignored) / $per_page)
        );
    }
    
    /**
     * Get POIs sorted by trail position
     */
    public function get_pois_by_trail_position($trail_id = '', $page = 1, $per_page = 20) {
        global $wpdb;
        
        $offset = ($page - 1) * $per_page;
        $where_conditions = array();
        $where_values = array();
        
        // Trail filter
        if (!empty($trail_id)) {
            $where_conditions[] = "trail_id = %s";
            $where_values[] = $trail_id;
        }
        
        $where_clause = '';
        if (!empty($where_conditions)) {
            $where_clause = 'WHERE ' . implode(' AND ', $where_conditions);
        }
        
        $sql = "SELECT * FROM {$this->table_name} {$where_clause} ORDER BY trail_position ASC, distance_along_trail ASC LIMIT %d OFFSET %d";
        $where_values[] = $per_page;
        $where_values[] = $offset;
        
        $pois = $wpdb->get_results($wpdb->prepare($sql, $where_values));
        
        return array(
            'pois' => $pois,
            'total' => $this->get_pois_count('', '', '', $trail_id),
            'page' => $page,
            'per_page' => $per_page,
            'pages' => ceil($this->get_pois_count('', '', '', $trail_id) / $per_page)
        );
    }
    
    /**
     * Calculate and update trail positions for all POIs
     */
    public function calculate_trail_positions() {
        global $wpdb;
        
        // Get all unique trails
        $trails = $this->get_unique_trails();
        
        foreach ($trails as $trail) {
            $this->calculate_trail_positions_for_trail($trail->trail_id);
        }
        
        return true;
    }
    
    /**
     * Calculate trail positions for a specific trail
     */
    public function calculate_trail_positions_for_trail($trail_id) {
        global $wpdb;
        
        // Get trail coordinates
        $trail_coordinates = $this->get_trail_coordinates($trail_id);
        if (empty($trail_coordinates)) {
            return false;
        }
        
        // Get all POIs for this trail
        $pois = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$this->table_name} WHERE trail_id = %s ORDER BY distance_along_trail ASC",
            $trail_id
        ));
        
        if (empty($pois)) {
            return false;
        }
        
        // Calculate distances and positions
        $position = 1;
        foreach ($pois as $poi) {
            $distance = $this->calculate_distance_along_trail($poi->latitude, $poi->longitude, $trail_coordinates);
            
            $wpdb->update(
                $this->table_name,
                array(
                    'distance_along_trail' => $distance,
                    'trail_position' => $position
                ),
                array('id' => $poi->id),
                array('%f', '%d'),
                array('%d')
            );
            
            $position++;
        }
        
        return true;
    }
    
    /**
     * Calculate distance along trail for a POI
     */
    private function calculate_distance_along_trail($poi_lat, $poi_lng, $trail_coordinates) {
        if (empty($trail_coordinates) || count($trail_coordinates) < 2) {
            return 0;
        }
        
        $min_distance = PHP_FLOAT_MAX;
        $closest_segment_distance = 0;
        
        // Find the closest point on the trail
        for ($i = 0; $i < count($trail_coordinates) - 1; $i++) {
            $point1 = $trail_coordinates[$i];
            $point2 = $trail_coordinates[$i + 1];
            
            // Calculate distance from POI to this trail segment
            $distance_to_segment = $this->distance_to_line_segment(
                $poi_lat, $poi_lng,
                $point1['lat'], $point1['lng'],
                $point2['lat'], $point2['lng']
            );
            
            if ($distance_to_segment < $min_distance) {
                $min_distance = $distance_to_segment;
                
                // Calculate distance along trail to this segment
                $closest_segment_distance = $this->calculate_distance_along_trail_to_segment($i, $trail_coordinates);
            }
        }
        
        return $closest_segment_distance;
    }
    
    /**
     * Calculate distance from point to line segment
     */
    private function distance_to_line_segment($px, $py, $x1, $y1, $x2, $y2) {
        $A = $px - $x1;
        $B = $py - $y1;
        $C = $x2 - $x1;
        $D = $y2 - $y1;
        
        $dot = $A * $C + $B * $D;
        $len_sq = $C * $C + $D * $D;
        
        if ($len_sq == 0) {
            return $this->calculate_distance($px, $py, $x1, $y1);
        }
        
        $param = $dot / $len_sq;
        
        if ($param < 0) {
            return $this->calculate_distance($px, $py, $x1, $y1);
        } elseif ($param > 1) {
            return $this->calculate_distance($px, $py, $x2, $y2);
        } else {
            $xx = $x1 + $param * $C;
            $yy = $y1 + $param * $D;
            return $this->calculate_distance($px, $py, $xx, $yy);
        }
    }
    
    /**
     * Calculate distance along trail to a specific segment
     */
    private function calculate_distance_along_trail_to_segment($segment_index, $trail_coordinates) {
        $distance = 0;
        
        for ($i = 0; $i < $segment_index; $i++) {
            $point1 = $trail_coordinates[$i];
            $point2 = $trail_coordinates[$i + 1];
            $distance += $this->calculate_distance($point1['lat'], $point1['lng'], $point2['lat'], $point2['lng']);
        }
        
        return $distance;
    }
    
    /**
     * Get trail coordinates from RideWithGPS
     */
    private function get_trail_coordinates($trail_id) {
        $trail_config = get_option('trail_navigator_config', array());
        if (empty($trail_config['trails'])) {
            return array();
        }
        
        $selected_trail = null;
        foreach ($trail_config['trails'] as $trail) {
            if ((string)$trail['routeId'] === (string)$trail_id) {
                $selected_trail = $trail;
                break;
            }
        }
        
        if (!$selected_trail || empty($selected_trail['trackPoints'])) {
            return array();
        }
        
        return $selected_trail['trackPoints'];
    }
    
    /**
     * Get unique trails from POIs
     */
    public function get_unique_trails() {
        global $wpdb;
        
        return $wpdb->get_results(
            "SELECT DISTINCT trail_id, trail_name FROM {$this->table_name} WHERE trail_id IS NOT NULL AND trail_id != '' ORDER BY trail_name ASC"
        );
    }
    
    /**
     * Get POI count with trail filter
     */
    public function get_pois_count($search = '', $filter_type = '', $filter_search_term = '', $filter_trail = '', $filter_status = '', $filter_ignored = '') {
        global $wpdb;
        
        $where_conditions = array();
        $where_values = array();
        
        // Search filter
        if (!empty($search)) {
            $where_conditions[] = "(name LIKE %s OR address LIKE %s)";
            $where_values[] = '%' . $wpdb->esc_like($search) . '%';
            $where_values[] = '%' . $wpdb->esc_like($search) . '%';
        }
        
        // Type filter
        if (!empty($filter_type)) {
            $where_conditions[] = "types LIKE %s";
            $where_values[] = '%' . $wpdb->esc_like($filter_type) . '%';
        }
        
        // Search term filter
        if (!empty($filter_search_term)) {
            $where_conditions[] = "search_term = %s";
            $where_values[] = $filter_search_term;
        }
        
        // Trail filter
        if (!empty($filter_trail)) {
            $where_conditions[] = "trail_id = %s";
            $where_values[] = $filter_trail;
        }
        
        // Status filter
        if (!empty($filter_status)) {
            $where_conditions[] = "status = %s";
            $where_values[] = $filter_status;
        }
        
        // Ignored filter
        if ($filter_ignored !== '') {
            $where_conditions[] = "ignored = %d";
            $where_values[] = intval($filter_ignored);
        }
        
        $where_clause = '';
        if (!empty($where_conditions)) {
            $where_clause = 'WHERE ' . implode(' AND ', $where_conditions);
        }
        
        $sql = "SELECT COUNT(*) FROM {$this->table_name} {$where_clause}";
        
        if (!empty($where_values)) {
            return $wpdb->get_var($wpdb->prepare($sql, $where_values));
        } else {
            return $wpdb->get_var($sql);
        }
    }
    
    /**
     * Get POIs by search term
     */
    public function get_pois_by_search_term($search_term) {
        global $wpdb;
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$this->table_name} WHERE search_term = %s ORDER BY created_at DESC",
            $search_term
        ));
    }
    
    /**
     * Get POIs within radius
     */
    public function get_pois_in_radius($lat, $lng, $radius_km) {
        global $wpdb;
        
        $radius_meters = $radius_km * 1000;
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT *, 
             (6371000 * acos(cos(radians(%f)) * cos(radians(latitude)) * cos(radians(longitude) - radians(%f)) + sin(radians(%f)) * sin(radians(latitude)))) AS distance 
             FROM {$this->table_name} 
             HAVING distance <= %f 
             ORDER BY distance",
            $lat, $lng, $lat, $radius_meters
        ));
    }
    
    /**
     * Get unique search terms
     */
    public function get_unique_search_terms() {
        global $wpdb;
        
        return $wpdb->get_col(
            "SELECT DISTINCT search_term FROM {$this->table_name} WHERE search_term IS NOT NULL AND search_term != '' ORDER BY search_term"
        );
    }
    
    /**
     * Get statistics
     */
    public function get_stats() {
        global $wpdb;
        
        return array(
            'total_pois' => $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name}"),
            'recent_pois' => $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$this->table_name} WHERE created_at >= %s",
                date('Y-m-d H:i:s', strtotime('-24 hours'))
            )),
            'search_terms' => $wpdb->get_var("SELECT COUNT(DISTINCT search_term) FROM {$this->table_name}"),
            'avg_rating' => $wpdb->get_var("SELECT AVG(rating) FROM {$this->table_name} WHERE rating > 0"),
            'top_types' => $wpdb->get_results(
                "SELECT types, COUNT(*) as count FROM {$this->table_name} GROUP BY types ORDER BY count DESC LIMIT 5"
            )
        );
    }
    
    /**
     * Clean old POIs
     */
    public function clean_old_pois($days = 30) {
        global $wpdb;
        
        $cutoff_date = date('Y-m-d H:i:s', strtotime("-{$days} days"));
        
        return $wpdb->query($wpdb->prepare(
            "DELETE FROM {$this->table_name} WHERE created_at < %s",
            $cutoff_date
        ));
    }
    
    /**
     * Export POIs for CSV
     */
    public function export_pois_for_csv($filters = array()) {
        global $wpdb;
        
        $where_conditions = array();
        $where_values = array();
        
        if (!empty($filters['search_term'])) {
            $where_conditions[] = "search_term = %s";
            $where_values[] = $filters['search_term'];
        }
        
        if (!empty($filters['type'])) {
            $where_conditions[] = "types LIKE %s";
            $where_values[] = '%' . $wpdb->esc_like($filters['type']) . '%';
        }
        
        $where_clause = '';
        if (!empty($where_conditions)) {
            $where_clause = 'WHERE ' . implode(' AND ', $where_conditions);
        }
        
        $sql = "SELECT * FROM {$this->table_name} {$where_clause} ORDER BY created_at DESC";
        
        if (!empty($where_values)) {
            return $wpdb->get_results($wpdb->prepare($sql, $where_values));
        } else {
            return $wpdb->get_results($sql);
        }
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
} 