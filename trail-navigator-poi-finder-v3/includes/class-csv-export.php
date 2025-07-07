<?php
/**
 * CSV Export functionality for Trail Navigator POI Finder v3
 */
class TNPOI_CSV_Export {
    
    private $settings;
    
    /**
     * Initialize export functionality
     */
    public function __construct() {
        $this->settings = new TNPOI_Settings();
        add_action('wp_ajax_tnpoi_export_csv', array($this, 'ajax_export_csv'));
    }
    
    /**
     * Export POIs to CSV
     */
    public function export_pois($filters = array(), $format = 'geodirectory') {
        $pois_data = TNPOI_POI_DB::get_pois($filters, 1, 10000); // Get all POIs
        $pois = $pois_data['pois'];
        
        if (empty($pois)) {
            return array(
                'success' => false,
                'message' => 'No POIs found to export'
            );
        }
        
        $filename = 'pois_export_' . date('Y-m-d_H-i-s') . '.csv';
        $headers = $this->get_export_headers($format);
        
        // Start output buffering
        ob_start();
        
        // Output CSV headers
        $this->output_csv_headers($filename);
        
        // Output CSV content
        $this->output_csv_content($pois, $headers, $format);
        
        $csv_content = ob_get_clean();
        
        return array(
            'success' => true,
            'filename' => $filename,
            'content' => $csv_content,
            'count' => count($pois)
        );
    }
    
    /**
     * Get export headers based on format
     */
    private function get_export_headers($format) {
        switch ($format) {
            case 'geodirectory':
                return array(
                    'post_title' => 'Name',
                    'post_content' => 'Description',
                    'post_excerpt' => 'Excerpt',
                    'post_status' => 'Status',
                    'post_author' => 'Author',
                    'post_date' => 'Date',
                    'post_modified' => 'Modified',
                    'post_category' => 'Category',
                    'post_tags' => 'Tags',
                    'geodir_contact' => 'Contact',
                    'geodir_email' => 'Email',
                    'geodir_website' => 'Website',
                    'geodir_twitter' => 'Twitter',
                    'geodir_facebook' => 'Facebook',
                    'geodir_video' => 'Video',
                    'geodir_special_offers' => 'Special Offers',
                    'geodir_business_hours' => 'Business Hours',
                    'geodir_accepts_credit_cards' => 'Accepts Credit Cards',
                    'geodir_currencies' => 'Currencies',
                    'geodir_payment_methods' => 'Payment Methods',
                    'geodir_phone' => 'Phone',
                    'geodir_fax' => 'Fax',
                    'geodir_address' => 'Address',
                    'geodir_street' => 'Street',
                    'geodir_street2' => 'Street 2',
                    'geodir_city' => 'City',
                    'geodir_region' => 'Region',
                    'geodir_country' => 'Country',
                    'geodir_zip' => 'ZIP',
                    'geodir_latitude' => 'Latitude',
                    'geodir_longitude' => 'Longitude',
                    'geodir_mapview' => 'Map View',
                    'geodir_mapzoom' => 'Map Zoom',
                    'geodir_rating' => 'Rating',
                    'geodir_review_count' => 'Review Count',
                    'geodir_price' => 'Price',
                    'geodir_claimed' => 'Claimed',
                    'geodir_featured' => 'Featured',
                    'geodir_default_category' => 'Default Category'
                );
                
            case 'custom':
                $export_fields = $this->settings->get_setting('export_fields', array());
                $headers = array();
                foreach ($export_fields as $field) {
                    $headers[$field] = ucwords(str_replace('_', ' ', $field));
                }
                return $headers;
                
            default:
                return array(
                    'name' => 'Name',
                    'street' => 'Street',
                    'city' => 'City',
                    'region' => 'Region',
                    'country' => 'Country',
                    'zip' => 'ZIP',
                    'lat' => 'Latitude',
                    'lng' => 'Longitude',
                    'cat_id' => 'Category ID',
                    'rating' => 'Rating',
                    'website' => 'Website',
                    'phone' => 'Phone'
                );
        }
    }
    
    /**
     * Output CSV headers for download
     */
    private function output_csv_headers($filename) {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Pragma: no-cache');
        header('Expires: 0');
    }
    
    /**
     * Output CSV content
     */
    private function output_csv_content($pois, $headers, $format) {
        // Output header row
        $output = fopen('php://output', 'w');
        fputcsv($output, array_values($headers));
        
        // Output data rows
        foreach ($pois as $poi) {
            $row = $this->format_poi_for_export($poi, $headers, $format);
            fputcsv($output, $row);
        }
        
        fclose($output);
    }
    
    /**
     * Format POI data for export
     */
    private function format_poi_for_export($poi, $headers, $format) {
        $row = array();
        
        foreach ($headers as $key => $label) {
            switch ($key) {
                // GeoDirectory specific fields
                case 'post_title':
                    $row[] = $poi['name'];
                    break;
                case 'post_content':
                    $row[] = ''; // Description would need to be added
                    break;
                case 'post_excerpt':
                    $row[] = ''; // Excerpt would need to be added
                    break;
                case 'post_status':
                    $row[] = $poi['status'] === 'active' ? 'publish' : 'draft';
                    break;
                case 'post_author':
                    $row[] = '1'; // Default author ID
                    break;
                case 'post_date':
                    $row[] = $poi['date_synced'];
                    break;
                case 'post_modified':
                    $row[] = $poi['date_updated'];
                    break;
                case 'post_category':
                    $row[] = $poi['cat_id'];
                    break;
                case 'post_tags':
                    $row[] = ''; // Tags would need to be added
                    break;
                case 'geodir_contact':
                    $row[] = $poi['name'];
                    break;
                case 'geodir_email':
                    $row[] = ''; // Email would need to be added
                    break;
                case 'geodir_website':
                    $row[] = $poi['website'];
                    break;
                case 'geodir_twitter':
                    $row[] = ''; // Twitter would need to be added
                    break;
                case 'geodir_facebook':
                    $row[] = ''; // Facebook would need to be added
                    break;
                case 'geodir_video':
                    $row[] = ''; // Video would need to be added
                    break;
                case 'geodir_special_offers':
                    $row[] = ''; // Special offers would need to be added
                    break;
                case 'geodir_business_hours':
                    $row[] = $poi['hours'];
                    break;
                case 'geodir_accepts_credit_cards':
                    $row[] = ''; // Credit cards would need to be added
                    break;
                case 'geodir_currencies':
                    $row[] = ''; // Currencies would need to be added
                    break;
                case 'geodir_payment_methods':
                    $row[] = ''; // Payment methods would need to be added
                    break;
                case 'geodir_phone':
                    $row[] = $poi['phone'];
                    break;
                case 'geodir_fax':
                    $row[] = ''; // Fax would need to be added
                    break;
                case 'geodir_address':
                    $row[] = $this->format_address($poi);
                    break;
                case 'geodir_street':
                    $row[] = $poi['street'];
                    break;
                case 'geodir_street2':
                    $row[] = ''; // Street 2 would need to be added
                    break;
                case 'geodir_city':
                    $row[] = $poi['city'];
                    break;
                case 'geodir_region':
                    $row[] = $poi['region'];
                    break;
                case 'geodir_country':
                    $row[] = $poi['country'];
                    break;
                case 'geodir_zip':
                    $row[] = $poi['zip'];
                    break;
                case 'geodir_latitude':
                    $row[] = $poi['lat'];
                    break;
                case 'geodir_longitude':
                    $row[] = $poi['lng'];
                    break;
                case 'geodir_mapview':
                    $row[] = 'ROADMAP';
                    break;
                case 'geodir_mapzoom':
                    $row[] = '15';
                    break;
                case 'geodir_rating':
                    $row[] = $poi['rating'];
                    break;
                case 'geodir_review_count':
                    $row[] = $poi['user_ratings_total'];
                    break;
                case 'geodir_price':
                    $row[] = $poi['price_level'];
                    break;
                case 'geodir_claimed':
                    $row[] = '0';
                    break;
                case 'geodir_featured':
                    $row[] = '0';
                    break;
                case 'geodir_default_category':
                    $row[] = $poi['cat_id'];
                    break;
                    
                // Custom fields
                default:
                    if (isset($poi[$key])) {
                        $row[] = $poi[$key];
                    } else {
                        $row[] = '';
                    }
                    break;
            }
        }
        
        return $row;
    }
    
    /**
     * Format address for GeoDirectory
     */
    private function format_address($poi) {
        $parts = array();
        
        if (!empty($poi['street'])) {
            $parts[] = $poi['street'];
        }
        if (!empty($poi['city'])) {
            $parts[] = $poi['city'];
        }
        if (!empty($poi['region'])) {
            $parts[] = $poi['region'];
        }
        if (!empty($poi['zip'])) {
            $parts[] = $poi['zip'];
        }
        if (!empty($poi['country'])) {
            $parts[] = $poi['country'];
        }
        
        return implode(', ', $parts);
    }
    
    /**
     * AJAX handler for CSV export
     */
    public function ajax_export_csv() {
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Unauthorized');
        }
        
        if (!wp_verify_nonce($_POST['nonce'], 'tnpoi_admin_nonce')) {
            wp_send_json_error('Invalid nonce');
        }
        
        $filters = isset($_POST['filters']) ? $_POST['filters'] : array();
        $format = isset($_POST['format']) ? sanitize_text_field($_POST['format']) : 'geodirectory';
        
        $result = $this->export_pois($filters, $format);
        
        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result['message']);
        }
    }
    
    /**
     * Get export statistics
     */
    public function get_export_stats($filters = array()) {
        $pois_data = TNPOI_POI_DB::get_pois($filters, 1, 1);
        
        return array(
            'total_pois' => $pois_data['total'],
            'exportable_pois' => $pois_data['total'], // All POIs are exportable
            'estimated_size' => $this->estimate_export_size($pois_data['total'])
        );
    }
    
    /**
     * Estimate export file size
     */
    private function estimate_export_size($poi_count) {
        // Rough estimate: 500 bytes per POI
        $size_bytes = $poi_count * 500;
        
        if ($size_bytes < 1024) {
            return $size_bytes . ' B';
        } elseif ($size_bytes < 1024 * 1024) {
            return round($size_bytes / 1024, 1) . ' KB';
        } else {
            return round($size_bytes / (1024 * 1024), 1) . ' MB';
        }
    }
} 