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
        $poi_db = new TNPOI_POI_DB();
        // Only export POIs where ignored = 0 and match filters
        $pois = [];
        if (isset($filters['poi_ids']) && !empty($filters['poi_ids'])) {
            $all_pois = $this->get_pois_by_ids($filters['poi_ids']);
            $pois = array_filter($all_pois, function($poi) use ($filters) {
                if ($poi->ignored) return false;
                if (!empty($filters['status']) && $filters['status'] !== $poi->status) return false;
                if (!empty($filters['trail_id']) && $filters['trail_id'] !== $poi->trail_id) return false;
                return true;
            });
        } else {
            $pois_data = $poi_db->get_pois(1, 10000, '', '', '', 'created_at', 'DESC', '', '', 0); // Only ignored = 0
            $pois = $pois_data['pois'];
            // Optionally filter by status and trail if no POI IDs provided
            if (!empty($filters['status']) || !empty($filters['trail_id'])) {
                $pois = array_filter($pois, function($poi) use ($filters) {
                    if (!empty($filters['status']) && $filters['status'] !== $poi->status) return false;
                    if (!empty($filters['trail_id']) && $filters['trail_id'] !== $poi->trail_id) return false;
                    return true;
                });
            }
        }
        if (empty($pois)) {
            return array(
                'success' => false,
                'message' => 'No POIs found to export'
            );
        }
        $filename = 'pois_export_' . date('Y-m-d_H-i-s') . '.csv';
        $headers = $this->get_export_headers($format);
        ob_start();
        $this->output_csv_headers($filename);
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
                    'ID' => 'ID',
                    'post_title' => 'post_title',
                    'post_content' => 'post_content',
                    'post_status' => 'post_status',
                    'post_author' => 'post_author',
                    'post_type' => 'post_type',
                    'post_date' => 'post_date',
                    'post_modified' => 'post_modified',
                    'post_tags' => 'post_tags',
                    'post_category' => 'post_category',
                    'default_category' => 'default_category',
                    'featured' => 'featured',
                    'street' => 'street',
                    'street2' => 'street2',
                    'city' => 'city',
                    'region' => 'region',
                    'country' => 'country',
                    'zip' => 'zip',
                    'latitude' => 'latitude',
                    'longitude' => 'longitude',
                    'google_places_id' => 'google_places_id',
                    'post_images' => 'post_images'
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
            $this->enrich_address_if_needed($poi);
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
                case 'ID':
                    $row[] = '';
                    break;
                case 'post_title':
                    $row[] = $poi->name;
                    break;
                case 'post_content':
                    $row[] = '';
                    break;
                case 'post_status':
                    $row[] = 'publish';
                    break;
                case 'post_author':
                    $row[] = '1';
                    break;
                case 'post_type':
                    $row[] = 'gd_place';
                    break;
                case 'post_date':
                    $row[] = $poi->created_at;
                    break;
                case 'post_modified':
                    $row[] = $poi->updated_at;
                    break;
                case 'post_tags':
                    $row[] = '';
                    break;
                case 'post_category': {
                    $catIds = [];
                    if (!empty($poi->category_ids)) {
                        if (trim($poi->category_ids)[0] === '[') {
                            $catIds = json_decode($poi->category_ids, true);
                        } else {
                            $catIds = array_map('trim', explode(',', $poi->category_ids));
                        }
                    }
                    $catIds = array_filter($catIds, function($id) { return $id !== '' && $id !== null; });
                    $row[] = implode(',', $catIds);
                    break;
                }
                case 'default_category': {
                    $catIds = [];
                    if (!empty($poi->category_ids)) {
                        if (trim($poi->category_ids)[0] === '[') {
                            $catIds = json_decode($poi->category_ids, true);
                        } else {
                            $catIds = array_map('trim', explode(',', $poi->category_ids));
                        }
                    }
                    $catIds = array_filter($catIds, function($id) { return $id !== '' && $id !== null; });
                    $row[] = count($catIds) ? $catIds[0] : '';
                    break;
                }
                case 'featured':
                    $row[] = '0';
                    break;
                case 'street':
                    $row[] = $poi->street ?? '';
                    break;
                case 'street2':
                    $row[] = $poi->street2 ?? '';
                    break;
                case 'city':
                    $row[] = $poi->city ?? '';
                    break;
                case 'region':
                    $row[] = $poi->region ?? '';
                    break;
                case 'country':
                    $row[] = $poi->country ?? '';
                    break;
                case 'zip':
                    $row[] = $poi->zip ?? '';
                    break;
                case 'latitude':
                    $row[] = $poi->latitude;
                    break;
                case 'longitude':
                    $row[] = $poi->longitude;
                    break;
                case 'google_places_id':
                    $row[] = $poi->place_id ?? '';
                    break;
                case 'post_images':
                    $row[] = '';
                    break;
                default:
                    $row[] = isset($poi->$key) ? $poi->$key : '';
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
        
        if (!empty($poi->street)) {
            $parts[] = $poi->street;
        }
        if (!empty($poi->city)) {
            $parts[] = $poi->city;
        }
        if (!empty($poi->region)) {
            $parts[] = $poi->region;
        }
        if (!empty($poi->zip)) {
            $parts[] = $poi->zip;
        }
        if (!empty($poi->country)) {
            $parts[] = $poi->country;
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
        
        $nonce = isset($_POST['nonce']) ? $_POST['nonce'] : (isset($_GET['nonce']) ? $_GET['nonce'] : '');
        if (!wp_verify_nonce($nonce, 'tnpoi_admin_nonce')) {
            wp_send_json_error('Invalid nonce');
        }
        
        $filters = isset($_POST['filters']) ? $_POST['filters'] : array();
        $format = isset($_POST['format']) ? sanitize_text_field($_POST['format']) : 'geodirectory';
        
        // Check if specific POI IDs are provided
        if (isset($_POST['poi_ids']) && !empty($_POST['poi_ids'])) {
            $filters['poi_ids'] = array_map('intval', $_POST['poi_ids']);
        }
        
        $result = $this->export_pois($filters, $format);
        
        if ($result['success']) {
            // For direct download, output the CSV content directly
            if (isset($_POST['direct_download']) && $_POST['direct_download']) {
                $this->output_csv_headers($result['filename']);
                echo $result['content'];
                exit;
            } else {
                wp_send_json_success($result);
            }
        } else {
            wp_send_json_error($result['message']);
        }
    }
    
    /**
     * Get POIs by specific IDs
     */
    private function get_pois_by_ids($poi_ids) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'tnpoi_pois';
        
        if (empty($poi_ids)) {
            return array();
        }
        
        $placeholders = implode(',', array_fill(0, count($poi_ids), '%d'));
        $sql = "SELECT * FROM {$table_name} WHERE id IN ({$placeholders}) ORDER BY created_at DESC";
        
        return $wpdb->get_results($wpdb->prepare($sql, $poi_ids));
    }
    
    /**
     * Get export statistics
     */
    public function get_export_stats($filters = array()) {
        $poi_db = new TNPOI_POI_DB();
        $pois_data = $poi_db->get_pois(1, 1, '', '', '', 'created_at', 'DESC', '', '', '');
        
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
    
    private function enrich_address_if_needed(&$poi) {
        // If any address field is missing, fetch from Google Places
        $fields = ['street', 'city', 'region', 'country', 'zip', 'street2'];
        $missing = false;
        foreach ($fields as $field) {
            if (empty($poi->$field)) {
                $missing = true;
                break;
            }
        }
        if (!$missing || empty($poi->place_id)) return;
        $api_key = $this->settings->get_setting('google_places_api_key', '');
        if (!$api_key) return;
        $details = $this->fetch_google_place_details($poi->place_id, $api_key);
        if ($details) {
            $parsed = $this->parse_google_address($details);
            if ($parsed) {
                foreach ($fields as $field) {
                    if (!empty($parsed[$field])) {
                        $poi->$field = $parsed[$field];
                    }
                }
                // Update the POI in the DB
                $db = new TNPOI_POI_DB();
                $db->update_poi($poi->id, $parsed);
            }
        }
    }

    private function fetch_google_place_details($place_id, $api_key) {
        $url = 'https://maps.googleapis.com/maps/api/place/details/json?place_id=' . urlencode($place_id) . '&fields=address_component&key=' . urlencode($api_key);
        $resp = wp_remote_get($url);
        if (is_wp_error($resp)) return null;
        $body = wp_remote_retrieve_body($resp);
        $data = json_decode($body, true);
        if (!isset($data['result']['address_components'])) return null;
        return $data['result']['address_components'];
    }

    private function parse_google_address($components) {
        $out = [
            'street' => '',
            'street2' => '',
            'city' => '',
            'region' => '',
            'country' => '',
            'zip' => ''
        ];
        foreach ($components as $comp) {
            if (in_array('street_number', $comp['types'])) {
                $out['street'] = $comp['long_name'] . ' ' . ($out['street'] ?? '');
            } elseif (in_array('route', $comp['types'])) {
                $out['street'] = ($out['street'] ?? '') . $comp['long_name'];
            } elseif (in_array('subpremise', $comp['types'])) {
                $out['street2'] = $comp['long_name'];
            } elseif (in_array('locality', $comp['types'])) {
                $out['city'] = $comp['long_name'];
            } elseif (in_array('administrative_area_level_1', $comp['types'])) {
                $out['region'] = $comp['long_name'];
            } elseif (in_array('country', $comp['types'])) {
                $out['country'] = $comp['long_name'];
            } elseif (in_array('postal_code', $comp['types'])) {
                $out['zip'] = $comp['long_name'];
            }
        }
        return $out;
    }
} 