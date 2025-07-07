<?php
/**
 * Sync template for Trail Config Google Places v2
 */
?>

<div class="tcgp2-sync-status">
    <h3>Current Sync Configuration</h3>
    <div class="tcgp2-sync-badges">
        <span class="tcgp2-sync-badge">
            <span class="dashicons dashicons-admin-multisite"></span>
            Search Radius: <?php echo esc_html($sync_settings['search_radius']); ?> meters
        </span>
        <span class="tcgp2-sync-badge">
            <span class="dashicons dashicons-list-view"></span>
            Max POIs: <?php echo esc_html($sync_settings['max_pois_per_sync']); ?>
        </span>
        <?php if (!empty($sync_settings['relevant_types'])): ?>
            <span class="tcgp2-sync-badge">
                <span class="dashicons dashicons-tag"></span>
                Place Types: <?php echo esc_html(implode(', ', $sync_settings['relevant_types'])); ?>
            </span>
        <?php else: ?>
            <span class="tcgp2-sync-badge">
                <span class="dashicons dashicons-tag"></span>
                Place Types: All establishment types
            </span>
        <?php endif; ?>
    </div>
</div>

<div class="tcgp2-form-card">
    <h3>Sync POIs from Google Places</h3>
    <p>Import POIs from Google Places along your configured trails. This will search for places within the specified radius of trail coordinates.</p>
    
    <form method="post" action="">
        <?php wp_nonce_field('tcgp2_sync', 'tcgp2_nonce'); ?>
        <input type="hidden" name="action" value="sync_pois">
        <input type="hidden" name="radius" value="<?php echo esc_attr($sync_settings['search_radius']); ?>">
        
        <div class="tcgp2-form-row">
            <label for="trail_id">Select Trail:</label>
            <select name="trail_id" id="trail_id" required>
                <option value="">Choose a trail...</option>
                <option value="all" <?php selected($_POST['trail_id'] ?? '', 'all'); ?>>All Trails</option>
                <?php foreach ($trails as $trail): ?>
                    <option value="<?php echo esc_attr($trail['routeId']); ?>" <?php selected($_POST['trail_id'] ?? '', $trail['routeId']); ?>>
                        <?php echo esc_html($trail['name']); ?>
                        <?php if (!empty($trail['description'])): ?>
                            - <?php echo esc_html($trail['description']); ?>
                        <?php endif; ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        
        <div class="tcgp2-form-row">
            <label>Search Radius:</label>
            <div class="tcgp2-setting-display">
                <?php echo esc_html($sync_settings['search_radius']); ?> meters
                <div class="tcgp2-help-text">Configured in <a href="<?php echo esc_url(admin_url('admin.php?page=tcgp2-settings')); ?>">Settings</a></div>
            </div>
        </div>
        
        <div class="tcgp2-form-row">
            <button type="button" id="test-sync-btn" class="button button-secondary button-large" style="margin-right: 10px;">
                <span class="dashicons dashicons-search" style="margin-right: 5px;"></span>
                Test Sync (Preview)
            </button>
            <button type="submit" class="button button-primary button-large">
                <span class="dashicons dashicons-update" style="margin-right: 5px;"></span>
                Start Sync
            </button>
        </div>
    </form>
    
    <!-- Test Sync Results -->
    <div id="test-sync-results" class="tcgp2-test-sync-results" style="display: none;">
        <h4>Test Sync Results</h4>
        <div id="test-sync-content"></div>
    </div>
</div>

<?php if (empty($trails)): ?>
<div class="tcgp2-notice tcgp2-notice-warning">
    <h3>No Trails Configured</h3>
    <p>You need to configure trails in the Trail Navigator Configuration plugin before you can sync POIs.</p>
    <p><a href="<?php echo esc_url(admin_url('admin.php?page=trail-navigator-config')); ?>" class="button button-secondary">Configure Trails</a></p>
</div>
<?php endif; ?>

<?php if (empty($sync_settings['google_places_api_key'])): ?>
<div class="tcgp2-notice tcgp2-notice-error">
    <h3>Google Places API Key Required</h3>
    <p>You need to configure your Google Places API key in Settings before you can sync POIs.</p>
    <p><a href="<?php echo esc_url(admin_url('admin.php?page=tcgp2-settings')); ?>" class="button button-primary">Configure API Keys</a></p>
</div>
<?php endif; ?>

<?php if (empty($sync_settings['ridewithgps_api_key'])): ?>
<div class="tcgp2-notice tcgp2-notice-error">
    <h3>RideWithGPS API Key Required</h3>
    <p>You need to configure your RideWithGPS API key in Settings to fetch trail coordinates.</p>
    <p><a href="<?php echo esc_url(admin_url('admin.php?page=tcgp2-settings')); ?>" class="button button-primary">Configure API Keys</a></p>
</div>
<?php endif; ?>

<div class="tcgp2-form-card">
    <h3>Sync Information</h3>
    <ul>
        <li><strong>API Usage:</strong> Each sync operation uses Google Places API calls. Monitor your API quota to avoid rate limiting.</li>
        <li><strong>Duplicate Prevention:</strong> POIs are automatically deduplicated based on Google Place ID.</li>
        <li><strong>Category Assignment:</strong> POIs are automatically assigned categories based on Google Place types and your category mappings.</li>
        <li><strong>Address Parsing:</strong> Full addresses are parsed into individual components (street, city, state, etc.) for better GeoDirectory compatibility.</li>
        <li><strong>Data Storage:</strong> All POI data is stored locally in your WordPress database for fast access and export.</li>
    </ul>
</div>

<div class="tcgp2-form-card">
    <h3>Recent Sync History</h3>
    <?php
    global $wpdb;
    $table_name = $wpdb->prefix . 'tcgp2_pois';
    $recent_syncs = $wpdb->get_results("
        SELECT trail_name, COUNT(*) as count, MAX(date_synced) as last_sync
        FROM $table_name 
        WHERE date_synced IS NOT NULL 
        GROUP BY trail_name 
        ORDER BY last_sync DESC 
        LIMIT 5
    ");
    
    if (!empty($recent_syncs)): ?>
        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th>Trail</th>
                    <th>POIs</th>
                    <th>Last Sync</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($recent_syncs as $sync): ?>
                    <tr>
                        <td><?php echo esc_html($sync->trail_name ?: 'Unknown Trail'); ?></td>
                        <td><?php echo esc_html($sync->count); ?></td>
                        <td><?php echo esc_html(date('Y-m-d H:i', strtotime($sync->last_sync))); ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php else: ?>
        <p>No sync history available.</p>
    <?php endif; ?>
</div> 