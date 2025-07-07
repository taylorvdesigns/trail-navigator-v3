<?php
class TCGP2_REST_API {
    public function register_routes() {
        // POI management
        register_rest_route('tcgp2/v1', '/pois', [
            'methods' => ['GET', 'POST'],
            'callback' => [$this, 'handle_pois'],
            'permission_callback' => function() { return current_user_can('manage_options'); }
        ]);
        
        register_rest_route('tcgp2/v1', '/pois/(?P<id>\d+)', [
            'methods' => ['GET', 'PUT', 'DELETE'],
            'callback' => [$this, 'handle_poi'],
            'permission_callback' => function() { return current_user_can('manage_options'); }
        ]);
        
        // Settings management
        register_rest_route('tcgp2/v1', '/settings', [
            'methods' => ['GET', 'POST'],
            'callback' => [$this, 'handle_settings'],
            'permission_callback' => function() { return current_user_can('manage_options'); }
        ]);
        
        register_rest_route('tcgp2/v1', '/settings/test-api-key', [
            'methods' => 'POST',
            'callback' => [$this, 'handle_test_api_key'],
            'permission_callback' => function() { return current_user_can('manage_options'); }
        ]);
        
        // Trail management
        register_rest_route('tcgp2/v1', '/trails', [
            'methods' => 'GET',
            'callback' => [$this, 'handle_trails'],
            'permission_callback' => function() { return current_user_can('manage_options'); }
        ]);
        
        // Sync operations
        register_rest_route('tcgp2/v1', '/sync', [
            'methods' => 'POST',
            'callback' => [$this, 'handle_sync'],
            'permission_callback' => function() { return current_user_can('manage_options'); }
        ]);
        
        register_rest_route('tcgp2/v1', '/sync/auto-assign-categories', [
            'methods' => 'POST',
            'callback' => [$this, 'handle_auto_assign_categories'],
            'permission_callback' => function() { return current_user_can('manage_options'); }
        ]);
        
        // Export operations
        register_rest_route('tcgp2/v1', '/export', [
            'methods' => 'GET',
            'callback' => [$this, 'handle_export'],
            'permission_callback' => function() { return current_user_can('manage_options'); }
        ]);
        
        // Categories and tags
        register_rest_route('tcgp2/v1', '/categories', [
            'methods' => 'GET',
            'callback' => [$this, 'handle_categories'],
            'permission_callback' => function() { return current_user_can('manage_options'); }
        ]);
        
        register_rest_route('tcgp2/v1', '/tags', [
            'methods' => 'GET',
            'callback' => [$this, 'handle_tags'],
            'permission_callback' => function() { return current_user_can('manage_options'); }
        ]);
        
        register_rest_route('tcgp2/v1', '/place-types', [
            'methods' => 'GET',
            'callback' => [$this, 'handle_place_types'],
            'permission_callback' => function() { return current_user_can('manage_options'); }
        ]);
        
        // Statistics
        register_rest_route('tcgp2/v1', '/stats', [
            'methods' => 'GET',
            'callback' => [$this, 'handle_stats'],
            'permission_callback' => function() { return current_user_can('manage_options'); }
        ]);
    }

    public function handle_pois($request) {
        if ($request->get_method() === 'GET') {
            $filters = $request->get_param('filters') ?: array();
            $page = intval($request->get_param('page')) ?: 1;
            $per_page = intval($request->get_param('per_page')) ?: 20;
            
            $result = TCGP2_POI_DB::get_all_pois($filters, $page, $per_page);
            return new WP_REST_Response($result, 200);
        } elseif ($request->get_method() === 'POST') {
            $data = $request->get_json_params();
            $id = TCGP2_POI_DB::insert_poi($data);
            return new WP_REST_Response(['id' => $id], 201);
        }
        return new WP_REST_Response(['message' => 'Method not allowed'], 405);
    }
    
    public function handle_poi($request) {
        $id = intval($request['id']);
        if ($request->get_method() === 'GET') {
            $poi = TCGP2_POI_DB::get_poi_by_id($id);
            if ($poi) return new WP_REST_Response($poi, 200);
            return new WP_REST_Response(['message' => 'Not found'], 404);
        } elseif ($request->get_method() === 'PUT') {
            $data = $request->get_json_params();
            $result = TCGP2_POI_DB::update_poi($id, $data);
            return new WP_REST_Response(['updated' => $result], 200);
        } elseif ($request->get_method() === 'DELETE') {
            $result = TCGP2_POI_DB::delete_poi($id);
            return new WP_REST_Response(['deleted' => $result], 200);
        }
        return new WP_REST_Response(['message' => 'Method not allowed'], 405);
    }
    
    public function handle_settings($request) {
        $settings = new TCGP2_Settings();
        return $settings->handle_settings_request($request);
    }
    
    public function handle_test_api_key($request) {
        $settings = new TCGP2_Settings();
        return $settings->handle_test_api_key_request($request);
    }
    
    public function handle_trails($request) {
        $settings = new TCGP2_Settings();
        return $settings->handle_trails_request($request);
    }
    
    public function handle_sync($request) {
        $data = $request->get_json_params();
        $trail_id = $data['trail_id'] ?? '';
        $radius = intval($data['radius'] ?? 50);
        
        if (empty($trail_id)) {
            return new WP_REST_Response(['error' => 'Trail ID is required'], 400);
        }
        
        $sync = new TCGP2_POI_Sync();
        $result = $sync->sync_trail($trail_id, $radius);
        
        if (is_wp_error($result)) {
            return new WP_REST_Response(['error' => $result->get_error_message()], 400);
        }
        
        return new WP_REST_Response($result, 200);
    }
    
    public function handle_auto_assign_categories($request) {
        $sync = new TCGP2_POI_Sync();
        $updated_count = $sync->auto_assign_categories_to_existing();
        
        return new WP_REST_Response([
            'success' => true,
            'updated_count' => $updated_count,
            'message' => "Updated $updated_count POIs with categories"
        ], 200);
    }
    
    public function handle_export($request) {
        $poi_ids = $request->get_param('poi_ids');
        
        $export = new TCGP2_CSV_Export();
        return $export->handle_export_request($request);
    }
    
    public function handle_categories($request) {
        $settings = new TCGP2_Settings();
        return $settings->handle_categories_request($request);
    }
    
    public function handle_tags($request) {
        $settings = new TCGP2_Settings();
        return $settings->handle_tags_request($request);
    }
    
    public function handle_place_types($request) {
        $settings = new TCGP2_Settings();
        return $settings->handle_place_types_request($request);
    }
    
    public function handle_stats($request) {
        $stats = TCGP2_POI_DB::get_stats();
        return new WP_REST_Response($stats, 200);
    }
} 