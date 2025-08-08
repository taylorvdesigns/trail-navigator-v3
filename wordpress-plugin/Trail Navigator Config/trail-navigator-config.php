<?php
/*
Plugin Name: Trail Navigator Configuration
Description: Configuration page for Trail Navigator mobile app
Version: 1.0
Author: Taylor Vandiver
*/

// Prevent direct access to this file
if (!defined('ABSPATH')) {
    exit;
}

// Add menu item to WordPress admin
function trail_navigator_add_menu() {
    add_menu_page(
        'Trail Navigator Config', // Page title
        'Trail Config', // Menu title
        'manage_options', // Capability required
        'trail-navigator-config', // Menu slug
        'trail_navigator_config_page', // Function to display the page
        'dashicons-location', // Icon
        30 // Position in menu
    );
    
}
add_action('admin_menu', 'trail_navigator_add_menu');

// Add submenu for POI Import
function trail_navigator_add_poi_import_submenu() {
    add_submenu_page(
        'trail-navigator-config', // Parent slug
        'POI Import',             // Page title
        'POI Import',             // Menu title
        'manage_options',         // Capability
        'trail-navigator-poi-import', // Menu slug
        'trail_navigator_poi_import_page' // Callback function
    );
}
add_action('admin_menu', 'trail_navigator_add_poi_import_submenu');

// Function to display the configuration page
function trail_navigator_config_page() {
    // Check if user has permission
    if (!current_user_can('manage_options')) {
        return;
    }
    ?>
    <div class="wrap">
        <h1>Trail Navigator Configuration</h1>
        <form method="post" action="options.php">
            <?php
            settings_fields('trail_navigator_options');
            do_settings_sections('trail_navigator_config');
            submit_button('Save Configuration');
            ?>
        </form>
    </div>
    <?php
}

function trail_navigator_poi_import_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    // Get trails from your config
    $options = get_option('trail_navigator_config');
    $trails = isset($options['trails']) ? $options['trails'] : array();

    // Handle form submission
    if (isset($_POST['selected_trail'])) {
        $selected_trail = sanitize_text_field($_POST['selected_trail']);
        echo '<div class="notice notice-success"><p>Selected Trail: <strong>' . esc_html($selected_trail) . '</strong></p></div>';
        // In the next step, you’ll use this to fetch geometry and call Google Places
    }
    ?>
    <div class="wrap">
        <h1>POI Import (Google Places)</h1>
        <form method="post">
            <label for="selected_trail"><strong>Select a Trail:</strong></label>
            <select name="selected_trail" id="selected_trail" required>
                <option value="">-- Select --</option>
                <?php foreach ($trails as $trail): ?>
                    <option value="<?php echo esc_attr($trail['routeId']); ?>">
                        <?php echo esc_html($trail['name']); ?>
                    </option>
                <?php endforeach; ?>
            </select>
            <button type="submit" class="button button-primary">Search for POIs</button>
        </form>
    </div>
    <?php
}

// Register our settings
function trail_navigator_register_settings() {
    register_setting(
        'trail_navigator_options',
        'trail_navigator_config',
        'trail_navigator_sanitize_config'
    );

    add_settings_section(
        'trail_navigator_main_section',
        'Trail System Settings',
        'trail_navigator_section_callback',
        'trail_navigator_config'
    );

    add_settings_field(
        'system_name',
        'Trail System Name',
        'trail_navigator_system_name_callback',
        'trail_navigator_config',
        'trail_navigator_main_section'
    );

    add_settings_field(
        'trails',
        'Trails Configuration',
        'trail_navigator_trails_callback',
        'trail_navigator_config',
        'trail_navigator_main_section'
    );
}
add_action('admin_init', 'trail_navigator_register_settings');

// Callback function for the section
function trail_navigator_section_callback() {
    echo '<p>Configure your trail system settings here.</p>';
}

// Callback function for the system name field
function trail_navigator_system_name_callback() {
    $options = get_option('trail_navigator_config');
    $system_name = isset($options['system_name']) ? $options['system_name'] : '';
    ?>
    <input type="text" 
           name="trail_navigator_config[system_name]" 
           value="<?php echo esc_attr($system_name); ?>" 
           class="regular-text">
    <?php
}

// Callback function for trails configuration
function trail_navigator_trails_callback() {
    $options = get_option('trail_navigator_config');
    $trails = isset($options['trails']) ? $options['trails'] : array();
    ?>
    <div id="trails-container">
        <?php
        if (!empty($trails)) {
            foreach ($trails as $index => $trail) {
                ?>
                <div class="trail-entry">
                    <h3>Trail <?php echo $index + 1; ?></h3>
                    <p>
                        <label>Route ID:</label><br>
                        <input type="text" 
                               name="trail_navigator_config[trails][<?php echo $index; ?>][routeId]" 
                               value="<?php echo esc_attr($trail['routeId']); ?>" 
                               class="regular-text">
                    </p>
                    <p>
                        <label>Display Name:</label><br>
                        <input type="text" 
                               name="trail_navigator_config[trails][<?php echo $index; ?>][name]" 
                               value="<?php echo esc_attr($trail['name']); ?>" 
                               class="regular-text">
                    </p>
                    <p>
                        <label>Color:</label><br>
                        <input type="color" 
                               name="trail_navigator_config[trails][<?php echo $index; ?>][color]" 
                               value="<?php echo esc_attr($trail['color']); ?>">
                    </p>
                    <p>
                        <label>Type:</label><br>
                        <select name="trail_navigator_config[trails][<?php echo $index; ?>][type]">
                            <option value="main" <?php selected($trail['type'], 'main'); ?>>Main Trail</option>
                            <option value="spur" <?php selected($trail['type'], 'spur'); ?>>Spur Trail</option>
                        </select>
                    </p>
                    <p>
                        <label>Endpoint 1 Name:</label><br>
                        <input type="text"
                        name="trail_navigator_config[trails][<?php echo $index; ?>][endpoint1_name]"
                        value="<?php echo isset($trail['endpoint1_name']) ? esc_attr($trail['endpoint1_name']) : ''; ?>"
                        class="regular-text">
                    </p>
                    <p>
                        <label>Endpoint 2 Name:</label><br>
                        <input type="text"
                        name="trail_navigator_config[trails][<?php echo $index; ?>][endpoint2_name]"
                        value="<?php echo isset($trail['endpoint2_name']) ? esc_attr($trail['endpoint2_name']) : ''; ?>"
                        class="regular-text">
                    </p>
                    <button type="button" class="button remove-trail">Remove Trail</button>
                </div>
                <?php
            }
        }
        ?>
        <button type="button" class="button button-primary" id="add-trail">Add New Trail</button>
    </div>

    <script>
    jQuery(document).ready(function($) {
        $('#add-trail').on('click', function() {
            var index = $('.trail-entry').length;
            var template = `
                <div class="trail-entry">
                    <h3>Trail ${index + 1}</h3>
                    <p>
                        <label>Route ID:</label><br>
                        <input type="text" 
                               name="trail_navigator_config[trails][${index}][routeId]" 
                               class="regular-text">
                    </p>
                    <p>
                        <label>Display Name:</label><br>
                        <input type="text" 
                               name="trail_navigator_config[trails][${index}][name]" 
                               class="regular-text">
                    </p>
                    <p>
                        <label>Color:</label><br>
                        <input type="color" 
                               name="trail_navigator_config[trails][${index}][color]" 
                               value="#43D633">
                    </p>
                    <p>
                        <label>Type:</label><br>
                        <select name="trail_navigator_config[trails][${index}][type]">
                            <option value="main">Main Trail</option>
                            <option value="spur">Spur Trail</option>
                        </select>
                    </p>
                    <p>
    <label>Endpoint 1 Name:</label><br>
    <input type="text"
           name="trail_navigator_config[trails][${index}][endpoint1_name]"
           class="regular-text">
</p>
<p>
    <label>Endpoint 2 Name:</label><br>
    <input type="text"
           name="trail_navigator_config[trails][${index}][endpoint2_name]"
           class="regular-text">
</p>
                    <button type="button" class="button remove-trail">Remove Trail</button>
                </div>
            `;
            $('#trails-container').append(template);
        });

        $(document).on('click', '.remove-trail', function() {
            $(this).closest('.trail-entry').remove();
            // Renumber remaining trails
            $('.trail-entry').each(function(index) {
                $(this).find('h3').text('Trail ' + (index + 1));
                $(this).find('input, select').each(function() {
                    var name = $(this).attr('name');
                    name = name.replace(/\[\d+\]/, '[' + index + ']');
                    $(this).attr('name', name);
                });
            });
        });
    });
    </script>
    <?php
}

// Register REST API endpoint
function trail_navigator_register_api_endpoint() {
    register_rest_route('trail-navigator/v1', '/config', array(
        'methods' => 'GET',
        'callback' => 'trail_navigator_get_config',
        'permission_callback' => '__return_true' // Public endpoint
    ));
}
add_action('rest_api_init', 'trail_navigator_register_api_endpoint');

// API endpoint callback
function trail_navigator_get_config() {
    $config = get_option('trail_navigator_config', array());
    
    // Get the current site URL
    $site_url = get_site_url();
    
    // Ensure we have the expected structure
    $response = array(
        'systemName' => isset($config['system_name']) ? $config['system_name'] : '',
        'trails' => isset($config['trails']) ? $config['trails'] : array(),
        'apiUrl' => $site_url // Automatically use the current site URL
    );
    
    return rest_ensure_response($response);
}

// Sanitization function
function trail_navigator_sanitize_config($input) {
    $sanitized = array();
    
    if (isset($input['system_name'])) {
        $sanitized['system_name'] = sanitize_text_field($input['system_name']);
    }
    
    if (isset($input['trails']) && is_array($input['trails'])) {
        $sanitized['trails'] = array();
        foreach ($input['trails'] as $trail) {
            $sanitized['trails'][] = array(
                'routeId' => sanitize_text_field($trail['routeId']),
                'name' => sanitize_text_field($trail['name']),
                'color' => sanitize_text_field($trail['color']), // Changed from sanitize_hex_color
                'type' => in_array($trail['type'], array('main', 'spur')) ? $trail['type'] : 'main',
                'endpoint1_name' => isset($trail['endpoint1_name']) ? sanitize_text_field($trail['endpoint1_name']) : '',
'endpoint2_name' => isset($trail['endpoint2_name']) ? sanitize_text_field($trail['endpoint2_name']) : ''
            );
        }
    }
    
    return $sanitized;
}