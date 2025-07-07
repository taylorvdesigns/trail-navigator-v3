<?php
class TCGP2_POI_DB {
    public static function create_table() {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp2_pois';
        $charset_collate = $wpdb->get_charset_collate();
        $sql = "CREATE TABLE $table (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            place_id VARCHAR(64) NOT NULL,
            name VARCHAR(255) NOT NULL,
            latitude DECIMAL(10,7) NOT NULL,
            longitude DECIMAL(10,7) NOT NULL,
            formatted_address TEXT,
            street VARCHAR(255),
            street2 VARCHAR(255),
            city VARCHAR(100),
            region VARCHAR(100),
            country VARCHAR(100),
            zip VARCHAR(20),
            types TEXT,
            category_ids TEXT,
            tag_ids TEXT,
            status VARCHAR(32) DEFAULT 'new',
            ignored TINYINT(1) DEFAULT 0,
            raw_data LONGTEXT,
            date_synced DATETIME,
            trail_id VARCHAR(64),
            trail_name VARCHAR(255),
            PRIMARY KEY  (id),
            UNIQUE KEY place_id (place_id)
        ) $charset_collate;";
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        // Add ignored column if it doesn't exist (for existing installations)
        self::add_ignored_column_if_missing();
    }
    
    /**
     * Add ignored column to existing installations
     */
    public static function add_ignored_column_if_missing() {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp2_pois';
        
        // Check if ignored column exists
        $column_exists = $wpdb->get_results("SHOW COLUMNS FROM $table LIKE 'ignored'");
        
        if (empty($column_exists)) {
            $wpdb->query("ALTER TABLE $table ADD COLUMN ignored TINYINT(1) DEFAULT 0 AFTER status");
        }
    }
    
    /**
     * Get all POIs
     */
    public static function get_all_pois($filters = array(), $page = 1, $per_page = 20) {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp2_pois';
        
        $where_conditions = array();
        $where_values = array();
        
        // Apply filters
        if (!empty($filters['status'])) {
            $where_conditions[] = 'status = %s';
            $where_values[] = $filters['status'];
        }
        
        if (!empty($filters['search'])) {
            $where_conditions[] = 'name LIKE %s';
            $where_values[] = '%' . $wpdb->esc_like($filters['search']) . '%';
        }
        
        if (isset($filters['ignored'])) {
            $where_conditions[] = 'ignored = %d';
            $where_values[] = $filters['ignored'];
        }
        
        if (!empty($filters['google_type'])) {
            $where_conditions[] = 'types LIKE %s';
            $where_values[] = '%' . $wpdb->esc_like($filters['google_type']) . '%';
        }
        
        $where_clause = '';
        if (!empty($where_conditions)) {
            $where_clause = 'WHERE ' . implode(' AND ', $where_conditions);
        }
        
        // Count total
        $count_sql = "SELECT COUNT(*) FROM $table $where_clause";
        if (!empty($where_values)) {
            $count_sql = $wpdb->prepare($count_sql, $where_values);
        }
        $total = $wpdb->get_var($count_sql);
        
        // Get paginated results
        $offset = ($page - 1) * $per_page;
        $sql = "SELECT * FROM $table $where_clause ORDER BY date_synced DESC LIMIT %d OFFSET %d";
        $where_values[] = $per_page;
        $where_values[] = $offset;
        
        $pois = $wpdb->get_results($wpdb->prepare($sql, $where_values), ARRAY_A);
        
        return array(
            'pois' => $pois,
            'total' => $total,
            'page' => $page,
            'per_page' => $per_page
        );
    }
    
    /**
     * Get POI by ID
     */
    public static function get_poi_by_id($id) {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp2_pois';
        
        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table WHERE id = %d",
            $id
        ), ARRAY_A);
    }
    
    /**
     * Get POI by Google Place ID
     */
    public static function get_poi_by_place_id($place_id) {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp2_pois';
        
        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table WHERE place_id = %s",
            $place_id
        ), ARRAY_A);
    }
    
    /**
     * Get POIs by IDs
     */
    public static function get_pois_by_ids($ids) {
        if (empty($ids)) {
            return array();
        }
        
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp2_pois';
        
        $placeholders = implode(',', array_fill(0, count($ids), '%d'));
        $sql = "SELECT * FROM $table WHERE id IN ($placeholders)";
        
        return $wpdb->get_results($wpdb->prepare($sql, $ids), ARRAY_A);
    }
    
    /**
     * Insert new POI
     */
    public static function insert_poi($data) {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp2_pois';
        
        $result = $wpdb->insert($table, $data);
        
        if ($result === false) {
            return false;
        }
        
        return $wpdb->insert_id;
    }
    
    /**
     * Update POI
     */
    public static function update_poi($id, $data) {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp2_pois';
        
        $result = $wpdb->update($table, $data, array('id' => $id));
        
        return $result !== false;
    }
    
    /**
     * Delete POI
     */
    public static function delete_poi($id) {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp2_pois';
        
        $result = $wpdb->delete($table, array('id' => $id));
        
        return $result !== false;
    }
    
    /**
     * Get POI statistics
     */
    public static function get_stats() {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp2_pois';
        
        return array(
            'total' => $wpdb->get_var("SELECT COUNT(*) FROM $table"),
            'new' => $wpdb->get_var("SELECT COUNT(*) FROM $table WHERE status = 'new'"),
            'active' => $wpdb->get_var("SELECT COUNT(*) FROM $table WHERE status = 'active'"),
            'with_categories' => $wpdb->get_var("SELECT COUNT(*) FROM $table WHERE category_ids IS NOT NULL AND category_ids != '' AND category_ids != '[]'"),
            'without_categories' => $wpdb->get_var("SELECT COUNT(*) FROM $table WHERE category_ids IS NULL OR category_ids = '' OR category_ids = '[]'")
        );
    }
    
    /**
     * Bulk update POIs
     */
    public static function bulk_update_pois($poi_ids, $data) {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp2_pois';
        
        $placeholders = implode(',', array_fill(0, count($poi_ids), '%d'));
        $sql = "UPDATE $table SET ";
        
        $update_parts = array();
        $values = array();
        
        foreach ($data as $field => $value) {
            $update_parts[] = "$field = %s";
            $values[] = $value;
        }
        
        $sql .= implode(', ', $update_parts);
        $sql .= " WHERE id IN ($placeholders)";
        
        $values = array_merge($values, $poi_ids);
        
        $result = $wpdb->query($wpdb->prepare($sql, $values));
        
        return $result !== false;
    }
    
    /**
     * Delete all POIs
     */
    public static function delete_all_pois() {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp2_pois';
        
        $result = $wpdb->query("DELETE FROM $table");
        
        return $result !== false;
    }
    
    /**
     * Get all unique trails (trail_id and trail_name)
     */
    public static function get_all_trails() {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp2_pois';
        $results = $wpdb->get_results("SELECT DISTINCT trail_id, trail_name FROM $table WHERE trail_id IS NOT NULL AND trail_id != '' ORDER BY trail_name ASC", ARRAY_A);
        return $results;
    }

    /**
     * Get all unique GeoDirectory category names/IDs
     */
    public static function get_all_categories() {
        global $wpdb;
        $table = $wpdb->prefix . 'tcgp2_pois';
        $results = $wpdb->get_col("SELECT DISTINCT category_ids FROM $table WHERE category_ids IS NOT NULL AND category_ids != ''");
        $all_ids = array();
        foreach ($results as $json) {
            $ids = json_decode($json, true);
            if (is_array($ids)) {
                foreach ($ids as $id) {
                    if (!in_array($id, $all_ids)) {
                        $all_ids[] = $id;
                    }
                }
            }
        }
        sort($all_ids);
        return $all_ids;
    }
} 