<?php
/**
 * REST API functionality for Trail Navigator POI Finder v3
 */
class TNPOI_REST_API {
    
    private $namespace = 'tnpoi/v1';
    
    /**
     * Initialize REST API
     */
    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
    }
    
    /**
     * Register REST API routes
     */
    public function register_routes() {
        // Get POIs
        register_rest_route($this->namespace, '/pois', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_pois'),
            'permission_callback' => array($this, 'check_permissions'),
        ));
        
        // Get statistics
        register_rest_route($this->namespace, '/stats', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_stats'),
            'permission_callback' => array($this, 'check_permissions'),
        ));
        
        // Search POIs
        register_rest_route($this->namespace, '/search', array(
            'methods' => 'GET',
            'callback' => array($this, 'search_pois'),
            'permission_callback' => array($this, 'check_permissions'),
        ));
    }
    
    /**
     * Check permissions
     */
    public function check_permissions() {
        return current_user_can('read');
    }
    
    /**
     * Get POIs
     */
    public function get_pois($request) {
        $filters = array();
        $page = $request->get_param('page') ?: 1;
        $per_page = $request->get_param('per_page') ?: 20;
        
        if ($request->get_param('search')) {
            $filters['search'] = $request->get_param('search');
        }
        if ($request->get_param('trail_id')) {
            $filters['trail_id'] = $request->get_param('trail_id');
        }
        if ($request->get_param('status')) {
            $filters['status'] = $request->get_param('status');
        }
        
        $pois_data = TNPOI_POI_DB::get_pois($filters, $page, $per_page);
        return new WP_REST_Response($pois_data, 200);
    }
    
    /**
     * Get statistics
     */
    public function get_stats($request) {
        $stats = TNPOI_POI_DB::get_stats();
        return new WP_REST_Response($stats, 200);
    }
    
    /**
     * Search POIs
     */
    public function search_pois($request) {
        $query = $request->get_param('q');
        $limit = $request->get_param('limit') ?: 50;
        
        if (!$query) {
            return new WP_Error('missing_query', 'Search query is required', array('status' => 400));
        }
        
        $pois = TNPOI_POI_DB::search_pois($query, $limit);
        return new WP_REST_Response($pois, 200);
    }
} 