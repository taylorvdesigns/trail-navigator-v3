<?php
/**
 * Database operations for Trail Navigator POI Finder v3
 */
class TNPOI_POI_DB {
    
    private static $table_name;
    
    /**
     * Initialize database
     */
    public static function init() {
        global $wpdb;
        self::$table_name = $wpdb->prefix . 'tnpoi_pois';
    }
    
    /**
     * Create the POIs table
     */
    public static function create_table() {
        global $wpdb;
        self::init();
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE IF NOT EXISTS " . self::$table_name . " (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            place_id VARCHAR(64) NOT NULL,
            name VARCHAR(255) NOT NULL,
            types TEXT,
            lat DOUBLE,
            lng DOUBLE,
            trail_id VARCHAR(64),
            trail_name VARCHAR(255),
            date_synced DATETIME DEFAULT CURRENT_TIMESTAMP,
            date_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            street VARCHAR(255),
            city VARCHAR(255),
            region VARCHAR(255),
            country VARCHAR(255),
            zip VARCHAR(32),
            cat_id VARCHAR(32),
            status ENUM('active', 'inactive', 'ignored') DEFAULT 'active',
            rating DECIMAL(3,2),
            user_ratings_total INT,
            price_level TINYINT,
            website VARCHAR(500),
            phone VARCHAR(50),
            hours TEXT,
            photos TEXT,
            notes TEXT,
            UNIQUE KEY place_id (place_id),
            KEY trail_id (trail_id),
            KEY status (status),
            KEY cat_id (cat_id),
            KEY lat_lng (lat, lng)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Insert or update a POI
     */
    public static function save_poi($data) {
        global $wpdb;
        self::init();
        
        $defaults = array(
            'place_id' => '',
            'name' => '',
            'types' => array(),
            'lat' => 0,
            'lng' => 0,
            'trail_id' => '',
            'trail_name' => '',
            'street' => '',
            'city' => '',
            'region' => '',
            'country' => '',
            'zip' => '',
            'cat_id' => '',
            'status' => 'active',
            'rating' => 0,
            'user_ratings_total' => 0,
            'price_level' => 0,
            'website' => '',
            'phone' => '',
            'hours' => '',
            'photos' => array(),
            'notes' => ''
        );
        
        $data = wp_parse_args($data, $defaults);
        
        // Serialize arrays
        $data['types'] = maybe_serialize($data['types']);
        $data['photos'] = maybe_serialize($data['photos']);
        
        // Check if POI exists
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM " . self::$table_name . " WHERE place_id = %s",
            $data['place_id']
        ));
        
        if ($existing) {
            // Update existing POI
            $result = $wpdb->update(
                self::$table_name,
                $data,
                array('id' => $existing)
            );
            return $existing;
        } else {
            // Insert new POI
            $result = $wpdb->insert(self::$table_name, $data);
            return $result ? $wpdb->insert_id : false;
        }
    }
    
    /**
     * Get POIs with filters and pagination
     */
    public static function get_pois($filters = array(), $page = 1, $per_page = 20) {
        global $wpdb;
        self::init();
        
        $where_clauses = array('1=1');
        $where_values = array();
        
        // Apply filters
        if (!empty($filters['search'])) {
            $where_clauses[] = "name LIKE %s";
            $where_values[] = '%' . $wpdb->esc_like($filters['search']) . '%';
        }
        
        if (!empty($filters['trail_id'])) {
            $where_clauses[] = "trail_id = %s";
            $where_values[] = $filters['trail_id'];
        }
        
        if (!empty($filters['status'])) {
            $where_clauses[] = "status = %s";
            $where_values[] = $filters['status'];
        }
        
        if (!empty($filters['cat_id'])) {
            $where_clauses[] = "cat_id = %s";
            $where_values[] = $filters['cat_id'];
        }
        
        if (!empty($filters['has_category'])) {
            $where_clauses[] = "cat_id != '' AND cat_id IS NOT NULL";
        }
        
        // Build query
        $where_sql = implode(' AND ', $where_clauses);
        $offset = ($page - 1) * $per_page;
        
        $sql = "SELECT * FROM " . self::$table_name . " WHERE $where_sql ORDER BY date_synced DESC LIMIT %d OFFSET %d";
        $where_values[] = $per_page;
        $where_values[] = $offset;
        
        $pois = $wpdb->get_results($wpdb->prepare($sql, $where_values), ARRAY_A);
        
        // Get total count for pagination
        $count_sql = "SELECT COUNT(*) FROM " . self::$table_name . " WHERE $where_sql";
        $total = $wpdb->get_var($wpdb->prepare($count_sql, array_slice($where_values, 0, -2)));
        
        return array(
            'pois' => $pois,
            'total' => $total,
            'pages' => ceil($total / $per_page),
            'current_page' => $page
        );
    }
    
    /**
     * Get POI by ID
     */
    public static function get_poi($id) {
        global $wpdb;
        self::init();
        
        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM " . self::$table_name . " WHERE id = %d",
            $id
        ), ARRAY_A);
    }
    
    /**
     * Get POI by place_id
     */
    public static function get_poi_by_place_id($place_id) {
        global $wpdb;
        self::init();
        
        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM " . self::$table_name . " WHERE place_id = %s",
            $place_id
        ), ARRAY_A);
    }
    
    /**
     * Get POIs by trail
     */
    public static function get_pois_by_trail($trail_id) {
        global $wpdb;
        self::init();
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM " . self::$table_name . " WHERE trail_id = %s AND status = 'active' ORDER BY name",
            $trail_id
        ), ARRAY_A);
    }
    
    /**
     * Update POI status
     */
    public static function update_poi_status($id, $status) {
        global $wpdb;
        self::init();
        
        return $wpdb->update(
            self::$table_name,
            array('status' => $status),
            array('id' => $id),
            array('%s'),
            array('%d')
        );
    }
    
    /**
     * Update POI category
     */
    public static function update_poi_category($id, $cat_id) {
        global $wpdb;
        self::init();
        
        return $wpdb->update(
            self::$table_name,
            array('cat_id' => $cat_id),
            array('id' => $id),
            array('%s'),
            array('%d')
        );
    }
    
    /**
     * Delete POI
     */
    public static function delete_poi($id) {
        global $wpdb;
        self::init();
        
        return $wpdb->delete(
            self::$table_name,
            array('id' => $id),
            array('%d')
        );
    }
    
    /**
     * Bulk delete POIs
     */
    public static function bulk_delete_pois($ids) {
        global $wpdb;
        self::init();
        
        if (empty($ids) || !is_array($ids)) {
            return false;
        }
        
        $ids = array_map('intval', $ids);
        $ids_string = implode(',', $ids);
        
        return $wpdb->query(
            "DELETE FROM " . self::$table_name . " WHERE id IN ($ids_string)"
        );
    }
    
    /**
     * Get statistics
     */
    public static function get_stats() {
        global $wpdb;
        self::init();
        
        $stats = array();
        
        // Total POIs
        $stats['total'] = $wpdb->get_var("SELECT COUNT(*) FROM " . self::$table_name);
        
        // Active POIs
        $stats['active'] = $wpdb->get_var("SELECT COUNT(*) FROM " . self::$table_name . " WHERE status = 'active'");
        
        // POIs with categories
        $stats['with_category'] = $wpdb->get_var("SELECT COUNT(*) FROM " . self::$table_name . " WHERE cat_id != '' AND cat_id IS NOT NULL");
        
        // POIs without categories
        $stats['without_category'] = $wpdb->get_var("SELECT COUNT(*) FROM " . self::$table_name . " WHERE cat_id = '' OR cat_id IS NULL");
        
        // Ignored POIs
        $stats['ignored'] = $wpdb->get_var("SELECT COUNT(*) FROM " . self::$table_name . " WHERE status = 'ignored'");
        
        // POIs by trail
        $stats['by_trail'] = $wpdb->get_results("SELECT trail_name, COUNT(*) as count FROM " . self::$table_name . " GROUP BY trail_id ORDER BY count DESC", ARRAY_A);
        
        // Recent POIs (last 7 days)
        $stats['recent'] = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM " . self::$table_name . " WHERE date_synced >= %s",
            date('Y-m-d H:i:s', strtotime('-7 days'))
        ));
        
        return $stats;
    }
    
    /**
     * Get unique trails
     */
    public static function get_trails() {
        global $wpdb;
        self::init();
        
        return $wpdb->get_results(
            "SELECT DISTINCT trail_id, trail_name FROM " . self::$table_name . " WHERE trail_id IS NOT NULL ORDER BY trail_name",
            ARRAY_A
        );
    }
    
    /**
     * Get unique categories
     */
    public static function get_categories() {
        global $wpdb;
        self::init();
        
        return $wpdb->get_results(
            "SELECT DISTINCT cat_id FROM " . self::$table_name . " WHERE cat_id != '' AND cat_id IS NOT NULL ORDER BY cat_id",
            ARRAY_A
        );
    }
    
    /**
     * Search POIs
     */
    public static function search_pois($query, $limit = 50) {
        global $wpdb;
        self::init();
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM " . self::$table_name . " WHERE name LIKE %s AND status = 'active' ORDER BY name LIMIT %d",
            '%' . $wpdb->esc_like($query) . '%',
            $limit
        ), ARRAY_A);
    }
} 