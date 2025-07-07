<?php
/**
 * Dashboard Template
 * 
 * Main dashboard page with statistics and quick actions
 */

if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="wrap tnpoi-dashboard">
    <h1 class="wp-heading-inline">Trail Navigator POI Finder Dashboard</h1>
    
    <div class="tnpoi-stats-grid">
        <div class="tnpoi-stat-card">
            <div class="tnpoi-stat-icon">📍</div>
            <div class="tnpoi-stat-content">
                <h3><?php echo number_format($stats['total_pois']); ?></h3>
                <p>Total POIs</p>
            </div>
        </div>
        
        <div class="tnpoi-stat-card">
            <div class="tnpoi-stat-icon">🆕</div>
            <div class="tnpoi-stat-content">
                <h3><?php echo number_format($stats['recent_pois']); ?></h3>
                <p>New (24h)</p>
            </div>
        </div>
        
        <div class="tnpoi-stat-card">
            <div class="tnpoi-stat-icon">🔍</div>
            <div class="tnpoi-stat-content">
                <h3><?php echo number_format($stats['search_terms']); ?></h3>
                <p>Search Terms</p>
            </div>
        </div>
        
        <div class="tnpoi-stat-card">
            <div class="tnpoi-stat-icon">⭐</div>
            <div class="tnpoi-stat-content">
                <h3><?php echo number_format($stats['last_sync'] !== 'Never' ? 1 : 0); ?></h3>
                <p>Last Sync</p>
            </div>
        </div>
    </div>
    
    <div class="tnpoi-dashboard-content">
        <div class="tnpoi-dashboard-main">
            <div class="tnpoi-card">
                <h2>Recent POIs</h2>
                <?php if (!empty($recent_pois)): ?>
                    <div class="tnpoi-recent-pois">
                        <?php foreach ($recent_pois as $poi): ?>
                            <div class="tnpoi-poi-item">
                                <div class="tnpoi-poi-info">
                                    <h4><?php echo esc_html($poi->name); ?></h4>
                                    <p class="tnpoi-poi-address"><?php echo esc_html($poi->address); ?></p>
                                    <div class="tnpoi-poi-meta">
                                        <span class="tnpoi-poi-rating">
                                            <?php if ($poi->rating > 0): ?>
                                                ⭐ <?php echo number_format($poi->rating, 1); ?>
                                                (<?php echo number_format($poi->user_ratings_total); ?>)
                                            <?php endif; ?>
                                        </span>
                                        <span class="tnpoi-poi-type"><?php echo esc_html($poi->types); ?></span>
                                        <span class="tnpoi-poi-term"><?php echo esc_html($poi->search_term); ?></span>
                                    </div>
                                </div>
                                <div class="tnpoi-poi-actions">
                                    <a href="<?php echo admin_url('admin.php?page=tnpoi-poi-manager&poi_id=' . $poi->id); ?>" 
                                       class="button button-small">Edit</a>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                    <div class="tnpoi-card-footer">
                        <a href="<?php echo admin_url('admin.php?page=tnpoi-poi-manager'); ?>" class="button">
                            View All POIs
                        </a>
                    </div>
                <?php else: ?>
                    <p>No POIs found. <a href="<?php echo admin_url('admin.php?page=tnpoi-sync'); ?>">Start syncing</a> to import POIs.</p>
                <?php endif; ?>
            </div>
        </div>
        
        <div class="tnpoi-dashboard-sidebar">
            <div class="tnpoi-card">
                <h2>Quick Actions</h2>
                <div class="tnpoi-quick-actions">
                    <a href="<?php echo admin_url('admin.php?page=tnpoi-sync'); ?>" class="button button-primary button-large">
                        🔄 Sync POIs
                    </a>
                    <a href="<?php echo admin_url('admin.php?page=tnpoi-poi-manager'); ?>" class="button button-secondary button-large">
                        📋 Manage POIs
                    </a>
                    <a href="<?php echo admin_url('admin.php?page=tnpoi-map-preview'); ?>" class="button button-secondary button-large">
                        🗺️ Map Preview
                    </a>
                    <a href="<?php echo admin_url('admin.php?page=tnpoi-settings'); ?>" class="button button-secondary button-large">
                        ⚙️ Settings
                    </a>
                </div>
            </div>
            
            <div class="tnpoi-card">
                <h2>Export Options</h2>
                <div class="tnpoi-export-actions">
                    <a href="<?php echo admin_url('admin-ajax.php?action=tnpoi_export_csv&nonce=' . wp_create_nonce('tnpoi_export_nonce')); ?>" 
                       class="button button-secondary">
                        📊 Export CSV
                    </a>
                    <a href="<?php echo admin_url('admin-ajax.php?action=tnpoi_export_geodirectory&nonce=' . wp_create_nonce('tnpoi_export_nonce')); ?>" 
                       class="button button-secondary">
                        🏠 GeoDirectory Format
                    </a>
                </div>
            </div>
            
            <div class="tnpoi-card">
                <h2>System Status</h2>
                <div class="tnpoi-status-list">
                    <?php
                    $api_key = get_option('tnpoi_google_places_api_key', '');
                    $search_terms = get_option('tnpoi_search_terms', array());
                    ?>
                    <div class="tnpoi-status-item">
                        <span class="tnpoi-status-label">API Key:</span>
                        <span class="tnpoi-status-value <?php echo !empty($api_key) ? 'status-ok' : 'status-error'; ?>">
                            <?php echo !empty($api_key) ? 'Configured' : 'Missing'; ?>
                        </span>
                    </div>
                    <div class="tnpoi-status-item">
                        <span class="tnpoi-status-label">Search Terms:</span>
                        <span class="tnpoi-status-value <?php echo !empty($search_terms) ? 'status-ok' : 'status-warning'; ?>">
                            <?php echo count($search_terms); ?> configured
                        </span>
                    </div>
                    <div class="tnpoi-status-item">
                        <span class="tnpoi-status-label">Database:</span>
                        <span class="tnpoi-status-value status-ok">Ready</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
.tnpoi-dashboard {
    margin: 20px 0;
}

.tnpoi-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.tnpoi-stat-card {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    display: flex;
    align-items: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tnpoi-stat-icon {
    font-size: 2em;
    margin-right: 15px;
}

.tnpoi-stat-content h3 {
    margin: 0 0 5px 0;
    font-size: 1.8em;
    color: #2271b1;
}

.tnpoi-stat-content p {
    margin: 0;
    color: #666;
}

.tnpoi-dashboard-content {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 30px;
}

.tnpoi-card {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tnpoi-card h2 {
    margin-top: 0;
    margin-bottom: 20px;
    color: #1d2327;
}

.tnpoi-recent-pois {
    max-height: 400px;
    overflow-y: auto;
}

.tnpoi-poi-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 0;
    border-bottom: 1px solid #f0f0f0;
}

.tnpoi-poi-item:last-child {
    border-bottom: none;
}

.tnpoi-poi-info h4 {
    margin: 0 0 5px 0;
    color: #1d2327;
}

.tnpoi-poi-address {
    margin: 0 0 8px 0;
    color: #666;
    font-size: 0.9em;
}

.tnpoi-poi-meta {
    display: flex;
    gap: 15px;
    font-size: 0.8em;
    color: #888;
}

.tnpoi-poi-rating {
    color: #f39c12;
}

.tnpoi-quick-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.tnpoi-export-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.tnpoi-status-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.tnpoi-status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
}

.tnpoi-status-item:last-child {
    border-bottom: none;
}

.tnpoi-status-label {
    font-weight: 500;
}

.tnpoi-status-value {
    font-weight: 600;
}

.tnpoi-status-value.status-ok {
    color: #46b450;
}

.tnpoi-status-value.status-warning {
    color: #ffb900;
}

.tnpoi-status-value.status-error {
    color: #dc3232;
}

.tnpoi-card-footer {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #f0f0f0;
    text-align: center;
}

@media (max-width: 768px) {
    .tnpoi-dashboard-content {
        grid-template-columns: 1fr;
    }
    
    .tnpoi-stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
</style> 