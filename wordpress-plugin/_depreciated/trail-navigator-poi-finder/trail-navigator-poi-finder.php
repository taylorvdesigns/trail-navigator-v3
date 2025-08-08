<?php
/*
Plugin Name: Trail Navigator POI Finder
Description: Import, curate, and export POIs for trail systems using RideWithGPS and Google Places, with GeoDirectory export compatibility.
Version: 1.0.0
Author: Your Name
License: GPL2
*/

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

register_activation_hook(__FILE__, array('TrailNavigatorPOIFinder', 'activate_plugin'));

class TrailNavigatorPOIFinder {
    public function __construct() {
        // Register hooks
        add_action('admin_menu', array($this, 'register_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_leaflet_assets'));
        add_action('admin_init', array($this, 'maybe_export_csv'));
        
        // Register AJAX actions
        add_action('wp_ajax_tnpf_get_sampled_points', array($this, 'ajax_get_sampled_points'));
        add_action('wp_ajax_tnpf_sync_batch', array($this, 'ajax_sync_batch'));
    }

    public function register_admin_menu() {
        add_menu_page(
            'Trail Navigator POI Finder',
            'Trail POI Finder',
            'manage_options',
            'trail-navigator-poi-finder',
            array($this, 'render_admin_page'),
            'dashicons-location',
            25
        );
        add_submenu_page(
            'trail-navigator-poi-finder',
            'Settings',
            'Settings',
            'manage_options',
            'trail-navigator-poi-finder-settings',
            array($this, 'render_settings_page')
        );
        add_submenu_page(
            'trail-navigator-poi-finder',
            'Sync',
            'Sync',
            'manage_options',
            'trail-navigator-poi-finder-sync',
            array($this, 'render_sync_page')
        );
        add_submenu_page(
            'trail-navigator-poi-finder',
            'Map Preview',
            'Map Preview',
            'manage_options',
            'trail-navigator-poi-finder-map',
            array($this, 'render_map_preview_page')
        );
        add_submenu_page(
            'trail-navigator-poi-finder',
            'POI Manager',
            'POI Manager',
            'manage_options',
            'trail-navigator-poi-finder-pois',
            array($this, 'render_poi_manager_page')
        );
    }

    public function register_settings() {
        register_setting('tnpf_settings_group', 'tnpf_google_places_api_key');
        register_setting('tnpf_settings_group', 'tnpf_ridewithgps_api_key');
        register_setting('tnpf_settings_group', 'tnpf_sync_radius');
        register_setting('tnpf_settings_group', 'tnpf_sync_interval');
        register_setting('tnpf_settings_group', 'tnpf_category_mapping');

        add_settings_section('tnpf_api_section', 'API Keys', null, 'trail-navigator-poi-finder-settings');
        add_settings_field('tnpf_google_places_api_key', 'Google Places API Key', function() {
            echo '<input type="text" name="tnpf_google_places_api_key" value="' . esc_attr(get_option('tnpf_google_places_api_key', '')) . '" class="regular-text">';
        }, 'trail-navigator-poi-finder-settings', 'tnpf_api_section');
        add_settings_field('tnpf_ridewithgps_api_key', 'RideWithGPS API Key', function() {
            echo '<input type="text" name="tnpf_ridewithgps_api_key" value="' . esc_attr(get_option('tnpf_ridewithgps_api_key', '')) . '" class="regular-text">';
        }, 'trail-navigator-poi-finder-settings', 'tnpf_api_section');

        add_settings_section('tnpf_sync_section', 'Sync Settings', null, 'trail-navigator-poi-finder-settings');
        add_settings_field('tnpf_sync_radius', 'Default Search Radius (meters)', function() {
            echo '<input type="number" name="tnpf_sync_radius" value="' . esc_attr(get_option('tnpf_sync_radius', 100)) . '" min="10" max="5000">';
        }, 'trail-navigator-poi-finder-settings', 'tnpf_sync_section');
        add_settings_field('tnpf_sync_interval', 'Minimum Distance Between API Calls (meters)', function() {
            echo '<input type="number" name="tnpf_sync_interval" value="' . esc_attr(get_option('tnpf_sync_interval', 300)) . '" min="10" max="2000">';
        }, 'trail-navigator-poi-finder-settings', 'tnpf_sync_section');

        add_settings_section('tnpf_category_section', 'Category Mapping', null, 'trail-navigator-poi-finder-settings');
        add_settings_field('tnpf_category_mapping', 'Map Google Place Types to GeoDirectory Categories', array($this, 'render_category_mapping_field'), 'trail-navigator-poi-finder-settings', 'tnpf_category_section');
    }

    public function enqueue_leaflet_assets($hook) {
        if ($hook !== 'trail-navigator-poi-finder_page_trail-navigator-poi-finder-map') {
            return;
        }
        wp_enqueue_style('leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        wp_enqueue_script('leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
    }

    public function render_admin_page() {
        echo '<div class="wrap"><h1>Trail Navigator POI Finder</h1><p>Welcome to the new plugin! Admin UI coming soon.</p></div>';
    }

    public function render_settings_page() {
        echo '<div class="wrap"><h1>Trail Navigator POI Finder - Settings</h1>';
        echo '<form method="post" action="options.php">';
        settings_fields('tnpf_settings_group');
        do_settings_sections('trail-navigator-poi-finder-settings');
        submit_button();
        echo '</form></div>';
    }

    public function render_sync_page() {
        // Fetch trail config from the existing trail config plugin
        $trail_config = get_option('trail_navigator_config', array());
        $trails = isset($trail_config['trails']) ? $trail_config['trails'] : array();
        $sync_interval = intval(get_option('tnpf_sync_interval', 300));
        $search_radius = intval(get_option('tnpf_sync_radius', 100));
        $google_api_key = get_option('tnpf_google_places_api_key', '');
        $selected_trail = null;
        $sampled_points = array();
        $sync_result = '';
        $pois = array();
        $errors = array();
        $inserted = 0;
        $updated = 0;
        $export_url = '';
        $category_mapping = get_option('tnpf_category_mapping', array());
        $ajax_nonce = wp_create_nonce('tnpf_sync_ajax');
        
        if (!empty($_POST['tnpf_trail_id'])) {
            foreach ($trails as $trail) {
                if ((string)$trail['routeId'] === (string)$_POST['tnpf_trail_id']) {
                    $selected_trail = $trail;
                    break;
                }
            }
            // Calculate sampled points (coordinate thinning)
            if ($selected_trail && !empty($selected_trail['trackPoints'])) {
                $last_point = null;
                foreach ($selected_trail['trackPoints'] as $pt) {
                    if (!$last_point) {
                        $sampled_points[] = $pt;
                        $last_point = $pt;
                    } else {
                        $dist = $this->haversine($last_point['lat'], $last_point['lng'], $pt['lat'], $pt['lng']);
                        if ($dist >= $sync_interval) {
                            $sampled_points[] = $pt;
                            $last_point = $pt;
                        }
                    }
                }
                $sync_result = '<div class="notice notice-info"><p>Sampled ' . count($sampled_points) . ' search points for API calls.</p></div>';
                // Google Places API integration
                if (empty($google_api_key)) {
                    $errors[] = 'Google Places API key is not set.';
                } else {
                    $seen_place_ids = array();
                    foreach ($sampled_points as $i => $pt) {
                        $lat = $pt['lat'];
                        $lng = $pt['lng'];
                        $url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=' . urlencode($lat . ',' . $lng) . '&radius=' . $search_radius . '&key=' . urlencode($google_api_key) . '&type=establishment';
                        $response = wp_remote_get($url, array('timeout' => 15));
                        if (is_wp_error($response)) {
                            $errors[] = 'API error at point ' . ($i+1) . ': ' . $response->get_error_message();
                            continue;
                        }
                        $body = wp_remote_retrieve_body($response);
                        $data = json_decode($body, true);
                        if (empty($data['results'])) {
                            continue;
                        }
                        foreach ($data['results'] as $place) {
                            $place_id = $place['place_id'] ?? '';
                            if (!$place_id || isset($seen_place_ids[$place_id])) continue;
                            $seen_place_ids[$place_id] = true;
                            // Parse address components
                            $address = $this->parse_address_components($place['vicinity'] ?? '', $place['address_components'] ?? []);
                            // Category mapping
                            $cat_id = '';
                            foreach (($place['types'] ?? array()) as $type) {
                                if (isset($category_mapping[$type]) && $category_mapping[$type]) {
                                    $cat_id = $category_mapping[$type];
                                    break;
                                }
                            }
                            $pois[] = array(
                                'place_id' => $place_id,
                                'name' => $place['name'] ?? '',
                                'types' => $place['types'] ?? array(),
                                'lat' => $place['geometry']['location']['lat'] ?? '',
                                'lng' => $place['geometry']['location']['lng'] ?? '',
                                'street' => $address['street'] ?? '',
                                'city' => $address['city'] ?? '',
                                'region' => $address['region'] ?? '',
                                'country' => $address['country'] ?? '',
                                'zip' => $address['zip'] ?? '',
                                'cat_id' => $cat_id
                            );
                        }
                    }
                    $sync_result .= '<div class="notice notice-success"><p>Found ' . count($pois) . ' unique POIs (not yet saved).</p></div>';
                    if (!empty($errors)) {
                        $sync_result .= '<div class="notice notice-error"><ul>';
                        foreach ($errors as $err) {
                            $sync_result .= '<li>' . esc_html($err) . '</li>';
                        }
                        $sync_result .= '</ul></div>';
                    }
                    if (!empty($pois)) {
                        global $wpdb;
                        $table_name = $wpdb->prefix . 'tnpf_pois';
                        foreach ($pois as $poi) {
                            $existing = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table_name WHERE place_id = %s", $poi['place_id']));
                            $data = array(
                                'place_id' => $poi['place_id'],
                                'name' => $poi['name'],
                                'types' => maybe_serialize($poi['types']),
                                'lat' => $poi['lat'],
                                'lng' => $poi['lng'],
                                'trail_id' => $selected_trail['routeId'],
                                'trail_name' => $selected_trail['name'],
                                'date_synced' => current_time('mysql'),
                                'street' => $poi['street'],
                                'city' => $poi['city'],
                                'region' => $poi['region'],
                                'country' => $poi['country'],
                                'zip' => $poi['zip'],
                                'cat_id' => $poi['cat_id']
                            );
                            if ($existing) {
                                $wpdb->update($table_name, $data, array('id' => $existing));
                                $updated++;
                            } else {
                                $wpdb->insert($table_name, $data);
                                $inserted++;
                            }
                        }
                        $sync_result .= '<div class="notice notice-success"><p>Inserted ' . intval($inserted) . ' new POIs, updated ' . intval($updated) . ' existing POIs in the database.</p></div>';
                    }
                    // Prepare export URL for this trail
                    $export_url = add_query_arg(array(
                        'page' => 'trail-navigator-poi-finder-sync',
                        'tnpf_export_trail_id' => urlencode($_POST['tnpf_trail_id']),
                        '_wpnonce' => wp_create_nonce('tnpf_export')
                    ), admin_url('admin.php'));
                }
            }
        }
        
        echo '<div class="wrap"><h1>Trail Navigator POI Finder - Sync</h1>';
        if (empty($trails)) {
            echo '<p>No trails found. Please configure trails in the Trail Config plugin.</p>';
        } else {
            echo '<form id="tnpf-sync-form" method="post">';
            echo '<label for="tnpf_trail_id">Select Trail:</label> ';
            echo '<select name="tnpf_trail_id" id="tnpf_trail_id">';
            foreach ($trails as $trail) {
                $id = esc_attr($trail['routeId']);
                $name = esc_html($trail['name']);
                $selected = (!empty($_POST['tnpf_trail_id']) && $_POST['tnpf_trail_id'] == $id) ? 'selected' : '';
                echo "<option value='$id' $selected>$name</option>";
            }
            echo '</select> ';
            echo '<button type="button" id="tnpf-sync-btn" class="button button-primary">Sync POIs</button>';
            echo '</form>';
            echo '<div id="tnpf-sync-progress" style="margin-top:20px;display:none;">';
            echo '<div style="width:100%;background:#eee;border-radius:4px;overflow:hidden;"><div id="tnpf-progress-bar" style="width:0%;height:20px;background:#0073aa;"></div></div>';
            echo '<div id="tnpf-progress-text" style="margin-top:8px;"></div>';
            echo '</div>';
            echo '<div id="tnpf-sync-result"></div>';
            
            // JavaScript for AJAX sync
            ?>
            <script>
            var tnpfSyncRunning = false;
            var tnpfAjaxNonce = <?php echo json_encode($ajax_nonce); ?>;
            
            document.getElementById('tnpf-sync-btn').onclick = function() {
                if (tnpfSyncRunning) return;
                tnpfSyncRunning = true;
                var form = document.getElementById('tnpf-sync-form');
                var trailId = form.tnpf_trail_id.value;
                if (!trailId) { 
                    alert('Please select a trail.'); 
                    tnpfSyncRunning = false; 
                    return; 
                }
                var progressBar = document.getElementById('tnpf-progress-bar');
                var progressText = document.getElementById('tnpf-progress-text');
                var progressDiv = document.getElementById('tnpf-sync-progress');
                var resultDiv = document.getElementById('tnpf-sync-result');
                progressDiv.style.display = 'block';
                progressBar.style.width = '0%';
                progressText.textContent = 'Starting sync...';
                resultDiv.innerHTML = '';
                
                // Get sampled points from server
                fetch(ajaxurl + '?action=tnpf_get_sampled_points&trail_id=' + encodeURIComponent(trailId) + '&nonce=' + encodeURIComponent(tnpfAjaxNonce))
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (!data.success) { 
                        progressText.textContent = data.data || 'Failed to get points.'; 
                        tnpfSyncRunning = false; 
                        return; 
                    }
                    var points = data.data.points;
                    var total = points.length;
                    var batchSize = 5;
                    var processed = 0;
                    var allResults = [];
                    var hadError = false;
                    
                    function processBatch(start) {
                        var batch = points.slice(start, start + batchSize);
                        if (batch.length === 0) {
                            progressBar.style.width = '100%';
                            progressText.textContent = 'Sync complete. ' + allResults.length + ' POIs found.';
                            resultDiv.innerHTML = '<div class="notice notice-success"><p>Sync complete. ' + allResults.length + ' POIs found. <a href="admin.php?page=trail-navigator-poi-finder-pois">View POIs</a></p></div>';
                            tnpfSyncRunning = false;
                            return;
                        }
                        progressText.textContent = 'Processing ' + (start + 1) + ' - ' + (start + batch.length) + ' of ' + total + '...';
                        
                        fetch(ajaxurl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: 'action=tnpf_sync_batch&trail_id=' + encodeURIComponent(trailId) + '&points=' + encodeURIComponent(JSON.stringify(batch)) + '&nonce=' + encodeURIComponent(tnpfAjaxNonce)
                        })
                        .then(function(r) { return r.json(); })
                        .then(function(data) {
                            if (data.success) {
                                allResults = allResults.concat(data.data.pois);
                            } else {
                                hadError = true;
                                resultDiv.innerHTML += '<div class="notice notice-error"><p>Batch failed: ' + (data.data || 'Unknown error') + '</p></div>';
                            }
                            processed += batch.length;
                            progressBar.style.width = Math.round(100 * processed / total) + '%';
                            processBatch(start + batchSize);
                        })
                        .catch(function(e) {
                            hadError = true;
                            resultDiv.innerHTML += '<div class="notice notice-error"><p>Batch failed: ' + e + '</p></div>';
                            processed += batch.length;
                            progressBar.style.width = Math.round(100 * processed / total) + '%';
                            processBatch(start + batchSize);
                        });
                    }
                    processBatch(0);
                });
            };
            </script>
            <?php
        }
        
        if ($export_url) {
            echo '<form method="get" action="' . esc_url($export_url) . '">';
            echo '<input type="hidden" name="page" value="trail-navigator-poi-finder-sync">';
            echo '<input type="hidden" name="tnpf_export_trail_id" value="' . esc_attr($_POST['tnpf_trail_id']) . '">';
            echo '<input type="hidden" name="_wpnonce" value="' . esc_attr(wp_create_nonce('tnpf_export')) . '">';
            echo '<button type="submit" class="button button-secondary">Export GeoDirectory CSV</button>';
            echo '</form>';
        }
        echo '</div>';
    }

    // AJAX: Get sampled points for sync
    public function ajax_get_sampled_points() {
        if (!current_user_can('manage_options') || !isset($_GET['trail_id']) || !wp_verify_nonce($_GET['nonce'], 'tnpf_sync_ajax')) {
            wp_send_json_error('Unauthorized');
        }
        $trail_id = sanitize_text_field($_GET['trail_id']);
        $trail_config = get_option('trail_navigator_config', array());
        $trails = isset($trail_config['trails']) ? $trail_config['trails'] : array();
        $selected_trail = null;
        foreach ($trails as $trail) {
            if ((string)$trail['routeId'] === (string)$trail_id) {
                $selected_trail = $trail;
                break;
            }
        }
        $sync_interval = intval(get_option('tnpf_sync_interval', 300));
        $sampled_points = array();
        if ($selected_trail && !empty($selected_trail['trackPoints'])) {
            $last_point = null;
            foreach ($selected_trail['trackPoints'] as $pt) {
                if (!$last_point) {
                    $sampled_points[] = $pt;
                    $last_point = $pt;
                } else {
                    $dist = $this->haversine($last_point['lat'], $last_point['lng'], $pt['lat'], $pt['lng']);
                    if ($dist >= $sync_interval) {
                        $sampled_points[] = $pt;
                        $last_point = $pt;
                    }
                }
            }
        }
        wp_send_json_success(array('points' => $sampled_points));
    }

    // AJAX: Sync a batch of points
    public function ajax_sync_batch() {
        if (!current_user_can('manage_options') || !isset($_POST['trail_id']) || !isset($_POST['points']) || !wp_verify_nonce($_POST['nonce'], 'tnpf_sync_ajax')) {
            wp_send_json_error('Unauthorized');
        }
        $trail_id = sanitize_text_field($_POST['trail_id']);
        $points = json_decode(stripslashes($_POST['points']), true);
        $trail_config = get_option('trail_navigator_config', array());
        $trails = isset($trail_config['trails']) ? $trail_config['trails'] : array();
        $selected_trail = null;
        foreach ($trails as $trail) {
            if ((string)$trail['routeId'] === (string)$trail_id) {
                $selected_trail = $trail;
                break;
            }
        }
        $search_radius = intval(get_option('tnpf_sync_radius', 100));
        $google_api_key = get_option('tnpf_google_places_api_key', '');
        $category_mapping = get_option('tnpf_category_mapping', array());
        $pois = array();
        $seen_place_ids = array();
        foreach ($points as $pt) {
            $lat = $pt['lat'];
            $lng = $pt['lng'];
            $url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=' . urlencode($lat . ',' . $lng) . '&radius=' . $search_radius . '&key=' . urlencode($google_api_key) . '&type=establishment';
            $response = wp_remote_get($url, array('timeout' => 15));
            if (is_wp_error($response)) continue;
            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);
            if (empty($data['results'])) continue;
            foreach ($data['results'] as $place) {
                $place_id = $place['place_id'] ?? '';
                if (!$place_id || isset($seen_place_ids[$place_id])) continue;
                $seen_place_ids[$place_id] = true;
                $address = $this->parse_address_components($place['vicinity'] ?? '', $place['address_components'] ?? []);
                $cat_id = '';
                foreach (($place['types'] ?? array()) as $type) {
                    if (isset($category_mapping[$type]) && $category_mapping[$type]) {
                        $cat_id = $category_mapping[$type];
                        break;
                    }
                }
                $pois[] = array(
                    'place_id' => $place_id,
                    'name' => $place['name'] ?? '',
                    'types' => $place['types'] ?? array(),
                    'lat' => $place['geometry']['location']['lat'] ?? '',
                    'lng' => $place['geometry']['location']['lng'] ?? '',
                    'street' => $address['street'] ?? '',
                    'city' => $address['city'] ?? '',
                    'region' => $address['region'] ?? '',
                    'country' => $address['country'] ?? '',
                    'zip' => $address['zip'] ?? '',
                    'cat_id' => $cat_id
                );
            }
        }
        // Store POIs in DB
        global $wpdb;
        $table_name = $wpdb->prefix . 'tnpf_pois';
        $inserted = 0;
        $updated = 0;
        foreach ($pois as $poi) {
            $existing = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table_name WHERE place_id = %s", $poi['place_id']));
            $data = array(
                'place_id' => $poi['place_id'],
                'name' => $poi['name'],
                'types' => maybe_serialize($poi['types']),
                'lat' => $poi['lat'],
                'lng' => $poi['lng'],
                'trail_id' => $selected_trail['routeId'],
                'trail_name' => $selected_trail['name'],
                'date_synced' => current_time('mysql'),
                'street' => $poi['street'],
                'city' => $poi['city'],
                'region' => $poi['region'],
                'country' => $poi['country'],
                'zip' => $poi['zip'],
                'cat_id' => $poi['cat_id']
            );
            if ($existing) {
                $wpdb->update($table_name, $data, array('id' => $existing));
                $updated++;
            } else {
                $wpdb->insert($table_name, $data);
                $inserted++;
            }
        }
        wp_send_json_success(array('pois' => $pois, 'inserted' => $inserted, 'updated' => $updated));
    }

    // Handle CSV export
    public function maybe_export_csv() {
        if (isset($_GET['tnpf_export_trail_id']) && isset($_GET['_wpnonce']) && wp_verify_nonce($_GET['_wpnonce'], 'tnpf_export')) {
            global $wpdb;
            $trail_id = sanitize_text_field($_GET['tnpf_export_trail_id']);
            $table_name = $wpdb->prefix . 'tnpf_pois';
            $pois = $wpdb->get_results($wpdb->prepare("SELECT * FROM $table_name WHERE trail_id = %s", $trail_id), ARRAY_A);
            $headers = [
                'ID','post_title','post_content','post_status','post_author','post_type','post_date','post_modified','post_tags','post_category','default_category','featured','street','street2','city','region','country','zip','latitude','longitude','google_places_id','post_images'
            ];
            header('Content-Type: text/csv');
            header('Content-Disposition: attachment; filename="geodirectory_pois_export_' . date('Ymd_His') . '.csv"');
            $out = fopen('php://output', 'w');
            fputcsv($out, $headers);
            $id = 1;
            foreach ($pois as $poi) {
                $row = [
                    $id,
                    $poi['name'],
                    '',
                    'publish',
                    1,
                    'gd_place',
                    $poi['date_synced'],
                    $poi['date_synced'],
                    '',
                    $poi['cat_id'],
                    $poi['cat_id'],
                    0,
                    $poi['street'],
                    '',
                    $poi['city'],
                    $poi['region'],
                    $poi['country'] ?: 'United States',
                    $poi['zip'],
                    $poi['lat'],
                    $poi['lng'],
                    $poi['place_id'],
                    ''
                ];
                fputcsv($out, $row);
                $id++;
            }
            fclose($out);
            exit;
        }
    }

    public function render_map_preview_page() {
        // Fetch trail config
        $trail_config = get_option('trail_navigator_config', array());
        $trails = isset($trail_config['trails']) ? $trail_config['trails'] : array();
        $selected_trail = null;
        $sampled_points = array();
        $hotspots = array();
        $sync_interval = intval(get_option('tnpf_sync_interval', 300));
        $hotspot_radius = 100; // meters (placeholder)
        $pois = array();
        
        if (!empty($_GET['trail_id'])) {
            foreach ($trails as $trail) {
                if ((string)$trail['routeId'] === (string)$_GET['trail_id']) {
                    $selected_trail = $trail;
                    break;
                }
            }
            // Calculate sampled points (coordinate thinning)
            if ($selected_trail && !empty($selected_trail['trackPoints'])) {
                $last_point = null;
                foreach ($selected_trail['trackPoints'] as $pt) {
                    if (!$last_point) {
                        $sampled_points[] = $pt;
                        $last_point = $pt;
                    } else {
                        $dist = $this->haversine($last_point['lat'], $last_point['lng'], $pt['lat'], $pt['lng']);
                        if ($dist >= $sync_interval) {
                            $sampled_points[] = $pt;
                            $last_point = $pt;
                        }
                    }
                }
                // Example: Add a placeholder hotspot at the midpoint (for demo)
                if (count($selected_trail['trackPoints']) > 0) {
                    $mid_idx = intval(count($selected_trail['trackPoints']) / 2);
                    $hotspots[] = $selected_trail['trackPoints'][$mid_idx];
                }
            }
            // Fetch synced POIs for this trail
            global $wpdb;
            $table_name = $wpdb->prefix . 'tnpf_pois';
            $pois = $wpdb->get_results($wpdb->prepare("SELECT * FROM $table_name WHERE trail_id = %s", $selected_trail['routeId']), ARRAY_A);
        }
        
        echo '<div class="wrap"><h1>Trail Navigator POI Finder - Map Preview</h1>';
        if (empty($trails)) {
            echo '<p>No trails found. Please configure trails in the Trail Config plugin.</p>';
        } else {
            // Trail selection dropdown
            echo '<form method="get" action="">';
            echo '<input type="hidden" name="page" value="trail-navigator-poi-finder-map">';
            echo '<label for="tnpf_map_trail_id">Select Trail:</label> ';
            echo '<select name="trail_id" id="tnpf_map_trail_id" onchange="this.form.submit()">';
            echo '<option value="">-- Select a trail --</option>';
            foreach ($trails as $trail) {
                $id = esc_attr($trail['routeId']);
                $name = esc_html($trail['name']);
                $selected = (!empty($_GET['trail_id']) && $_GET['trail_id'] == $id) ? 'selected' : '';
                echo "<option value='$id' $selected>$name</option>";
            }
            echo '</select>';
            echo '</form>';
            
            // Map container
            echo '<div id="tnpf-map" style="height: 500px; margin-top: 20px;"></div>';
            
            // Output trail data as JavaScript variables
            if ($selected_trail && !empty($selected_trail['trackPoints'])) {
                $geojson = array(
                    'type' => 'Feature',
                    'geometry' => array(
                        'type' => 'LineString',
                        'coordinates' => array_map(function($pt) {
                            return [$pt['lng'], $pt['lat']];
                        }, $selected_trail['trackPoints'])
                    ),
                    'properties' => array('name' => $selected_trail['name'])
                );
                ?>
                <script>
                window.tnpfTrailGeoJSON = <?php echo json_encode($geojson); ?>;
                window.tnpfSampledPoints = <?php echo json_encode($sampled_points); ?>;
                window.tnpfHotspots = <?php echo json_encode($hotspots); ?>;
                window.tnpfHotspotRadius = <?php echo intval($hotspot_radius); ?>;
                window.tnpfPOIs = <?php echo json_encode($pois); ?>;
                </script>
                <?php
            } else {
                ?>
                <script>
                window.tnpfTrailGeoJSON = null;
                window.tnpfSampledPoints = [];
                window.tnpfHotspots = [];
                window.tnpfHotspotRadius = 100;
                window.tnpfPOIs = [];
                </script>
                <?php
            }
            
            // Leaflet map JavaScript
            ?>
            <script>
            document.addEventListener('DOMContentLoaded', function() {
                if (!window.L || !window.tnpfTrailGeoJSON) return;
                var map = L.map('tnpf-map');
                var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
                    attribution: '&copy; OpenStreetMap contributors' 
                }).addTo(map);
                var trail = L.geoJSON(window.tnpfTrailGeoJSON, { 
                    color: '#0073aa', 
                    weight: 4 
                }).addTo(map);
                map.fitBounds(trail.getBounds());
                
                // Sampled search points (red markers)
                window.tnpfSampledPoints.forEach(function(pt) {
                    L.circleMarker([pt.lat, pt.lng], { 
                        radius: 6, 
                        color: '#c00', 
                        fillColor: '#f44', 
                        fillOpacity: 0.8 
                    }).addTo(map);
                });
                
                // Hotspot circles (orange)
                window.tnpfHotspots.forEach(function(pt) {
                    L.circle([pt.lat, pt.lng], { 
                        radius: window.tnpfHotspotRadius, 
                        color: 'orange', 
                        fillColor: '#ffa500', 
                        fillOpacity: 0.2 
                    }).addTo(map);
                });
                
                // POI markers (blue)
                window.tnpfPOIs.forEach(function(poi) {
                    if (!poi.lat || !poi.lng) return;
                    var popup = '<strong>' + (poi.name || '') + '</strong>';
                    if (poi.cat_id) popup += '<br>Category: ' + poi.cat_id;
                    L.circleMarker([poi.lat, poi.lng], { 
                        radius: 7, 
                        color: '#0073aa', 
                        fillColor: '#3399ff', 
                        fillOpacity: 0.9 
                    }).addTo(map).bindPopup(popup);
                });
            });
            </script>
            <?php
        }
        echo '</div>';
    }

    // Haversine formula for meters
    private function haversine($lat1, $lon1, $lat2, $lon2) {
        $earth_radius = 6371000; // meters
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat/2) * sin($dLat/2) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon/2) * sin($dLon/2);
        $c = 2 * atan2(sqrt($a), sqrt(1-$a));
        return $earth_radius * $c;
    }

    // Parse address components from Google Places API result
    private function parse_address_components($vicinity, $components) {
        $result = [
            'street' => '', 'city' => '', 'region' => '', 'country' => '', 'zip' => ''
        ];
        if (!empty($components) && is_array($components)) {
            foreach ($components as $comp) {
                if (in_array('street_number', $comp['types'])) {
                    $result['street'] = $comp['long_name'] . ' ' . ($result['street'] ?? '');
                }
                if (in_array('route', $comp['types'])) {
                    $result['street'] = trim(($result['street'] ? $result['street'] . ' ' : '') . $comp['long_name']);
                }
                if (in_array('locality', $comp['types'])) {
                    $result['city'] = $comp['long_name'];
                }
                if (in_array('administrative_area_level_1', $comp['types'])) {
                    $result['region'] = $comp['long_name'];
                }
                if (in_array('country', $comp['types'])) {
                    $result['country'] = $comp['long_name'];
                }
                if (in_array('postal_code', $comp['types'])) {
                    $result['zip'] = $comp['long_name'];
                }
            }
        } elseif (!empty($vicinity)) {
            $result['street'] = $vicinity;
        }
        return $result;
    }

    public function render_category_mapping_field() {
        $mapping = get_option('tnpf_category_mapping', array());
        $all_types = $this->get_all_google_place_types();
        $categories = $this->get_geodirectory_categories();
        echo '<table class="widefat striped" style="max-width:600px">';
        echo '<thead><tr><th>Google Place Type</th><th>GeoDirectory Category</th></tr></thead><tbody>';
        foreach ($all_types as $type) {
            echo '<tr><td>' . esc_html($type) . '</td><td>';
            echo '<select name="tnpf_category_mapping[' . esc_attr($type) . ']">';
            echo '<option value="">-- None --</option>';
            foreach ($categories as $cat_id => $cat_name) {
                $selected = (isset($mapping[$type]) && $mapping[$type] == $cat_id) ? 'selected' : '';
                echo '<option value="' . esc_attr($cat_id) . '" ' . $selected . '>' . esc_html($cat_name) . '</option>';
            }
            echo '</select>';
            echo '</td></tr>';
        }
        echo '</tbody></table>';
        echo '<p class="description">Map each Google Place type to a GeoDirectory category for export.</p>';
    }

    private function get_all_google_place_types() {
        // Example: a minimal set; expand as needed
        return array(
            'restaurant','cafe','bar','bakery','food','convenience_store','grocery_or_supermarket','lodging','hotel','motel','campground','parking','park','museum','library','pharmacy','atm','bank','gas_station','store','shopping_mall','tourist_attraction','point_of_interest'
        );
    }

    private function get_geodirectory_categories() {
        $terms = get_terms(array(
            'taxonomy' => 'gd_placecategory',
            'hide_empty' => false
        ));
        $cats = array();
        if (!is_wp_error($terms)) {
            foreach ($terms as $term) {
                $cats[$term->term_id] = $term->name;
            }
        }
        return $cats;
    }

    public function render_poi_manager_page() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'tnpf_pois';
        $trails = $wpdb->get_col("SELECT DISTINCT trail_name FROM $table_name ORDER BY trail_name");
        $filter_trail = isset($_GET['trail']) ? sanitize_text_field($_GET['trail']) : '';
        $search = isset($_GET['s']) ? sanitize_text_field($_GET['s']) : '';
        $where = '1=1';
        $params = array();
        if ($filter_trail) {
            $where .= ' AND trail_name = %s';
            $params[] = $filter_trail;
        }
        if ($search) {
            $where .= ' AND name LIKE %s';
            $params[] = '%' . $wpdb->esc_like($search) . '%';
        }
        $sql = "SELECT * FROM $table_name WHERE $where ORDER BY date_synced DESC LIMIT 200";
        $pois = $params ? $wpdb->get_results($wpdb->prepare($sql, $params), ARRAY_A) : $wpdb->get_results($sql, ARRAY_A);
        // Bulk delete
        if (!empty($_POST['delete_ids']) && is_array($_POST['delete_ids'])) {
            $ids = array_map('intval', $_POST['delete_ids']);
            foreach ($ids as $id) {
                $wpdb->delete($table_name, array('id' => $id));
            }
            echo '<div class="notice notice-success"><p>Deleted ' . count($ids) . ' POIs.</p></div>';
        }
        echo '<div class="wrap"><h1>POI Manager</h1>';
        echo '<form method="get" style="margin-bottom:10px;">';
        echo '<input type="hidden" name="page" value="trail-navigator-poi-finder-pois">';
        echo '<input type="text" name="s" value="' . esc_attr($search) . '" placeholder="Search POIs..."> ';
        echo '<select name="trail"><option value="">All Trails</option>';
        foreach ($trails as $trail) {
            $sel = ($filter_trail == $trail) ? 'selected' : '';
            echo '<option value="' . esc_attr($trail) . '" ' . $sel . '>' . esc_html($trail) . '</option>';
        }
        echo '</select> ';
        echo '<button type="submit" class="button">Filter</button>';
        echo '</form>';
        echo '<form method="post">';
        echo '<table class="widefat striped"><thead><tr>';
        echo '<th><input type="checkbox" onclick="jQuery(\'.tnpf-poi-checkbox\').prop(\'checked\', this.checked)"></th>';
        echo '<th>Name</th><th>Type</th><th>Trail</th><th>Synced</th><th>Actions</th></tr></thead><tbody>';
        foreach ($pois as $poi) {
            echo '<tr>';
            echo '<td><input type="checkbox" class="tnpf-poi-checkbox" name="delete_ids[]" value="' . intval($poi['id']) . '"></td>';
            echo '<td>' . esc_html($poi['name']) . '</td>';
            echo '<td>' . esc_html(implode(", ", maybe_unserialize($poi['types']))) . '</td>';
            echo '<td>' . esc_html($poi['trail_name']) . '</td>';
            echo '<td>' . esc_html($poi['date_synced']) . '</td>';
            echo '<td><a href="#" onclick="return false;">View</a></td>';
            echo '</tr>';
        }
        echo '</tbody></table>';
        echo '<button type="submit" class="button button-danger" style="margin-top:10px;">Delete Selected</button>';
        echo '</form>';
        echo '</div>';
    }

    public static function activate_plugin() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'tnpf_pois';
        $charset_collate = $wpdb->get_charset_collate();
        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            place_id VARCHAR(64) NOT NULL,
            name VARCHAR(255),
            types TEXT,
            lat DOUBLE,
            lng DOUBLE,
            trail_id VARCHAR(64),
            trail_name VARCHAR(255),
            date_synced DATETIME DEFAULT CURRENT_TIMESTAMP,
            street VARCHAR(255),
            city VARCHAR(255),
            region VARCHAR(255),
            country VARCHAR(255),
            zip VARCHAR(32),
            cat_id VARCHAR(32),
            UNIQUE KEY place_id (place_id)
        ) $charset_collate;";
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

new TrailNavigatorPOIFinder(); 