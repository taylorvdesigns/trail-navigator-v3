<?php
/**
 * Dashboard template for Trail Config Google Places v2
 */
?>

<div class="tcgp2-stats-grid">
    <div class="tcgp2-stat-card">
        <span class="dashicons dashicons-list-view"></span>
        <div class="tcgp2-stat-number"><?php echo esc_html($stats['total']); ?></div>
        <div class="tcgp2-stat-label">Total POIs</div>
    </div>
    
    <div class="tcgp2-stat-card">
        <span class="dashicons dashicons-plus-alt2"></span>
        <div class="tcgp2-stat-number"><?php echo esc_html($stats['new']); ?></div>
        <div class="tcgp2-stat-label">New POIs</div>
    </div>
    
    <div class="tcgp2-stat-card">
        <span class="dashicons dashicons-yes"></span>
        <div class="tcgp2-stat-number"><?php echo esc_html($stats['with_categories']); ?></div>
        <div class="tcgp2-stat-label">With Categories</div>
    </div>
    
    <div class="tcgp2-stat-card">
        <span class="dashicons dashicons-warning"></span>
        <div class="tcgp2-stat-number"><?php echo esc_html($stats['without_categories']); ?></div>
        <div class="tcgp2-stat-label">Without Categories</div>
    </div>
    
    <div class="tcgp2-stat-card">
        <span class="dashicons dashicons-clock"></span>
        <div class="tcgp2-stat-number"><?php echo $last_sync ? esc_html(date('Y-m-d H:i', strtotime($last_sync))) : '--'; ?></div>
        <div class="tcgp2-stat-label">Last Sync</div>
    </div>
    
    <div class="tcgp2-stat-card">
        <span class="dashicons dashicons-admin-multisite"></span>
        <div class="tcgp2-stat-number"><?php echo esc_html($num_trails); ?></div>
        <div class="tcgp2-stat-label"># Trails</div>
    </div>
</div>

<div class="tcgp2-actions-grid">
    <a href="<?php echo esc_url(admin_url('admin.php?page=tcgp2-sync')); ?>" class="tcgp2-action-card">
        <div class="tcgp2-action-icon dashicons dashicons-update"></div>
        <h3>Sync POIs</h3>
        <p>Import POIs from Google Places along your trails</p>
    </a>
    
    <a href="<?php echo esc_url(admin_url('admin.php?page=tcgp2-pois')); ?>" class="tcgp2-action-card">
        <div class="tcgp2-action-icon dashicons dashicons-list-view"></div>
        <h3>Manage POIs</h3>
        <p>View, edit, and export your POI data</p>
    </a>
    
    <a href="<?php echo esc_url(admin_url('admin.php?page=tcgp2-settings')); ?>" class="tcgp2-action-card">
        <div class="tcgp2-action-icon dashicons dashicons-admin-settings"></div>
        <h3>Settings</h3>
        <p>Configure API keys and sync options</p>
    </a>
</div>

<?php if ($stats['total'] == 0): ?>
<div class="tcgp2-notice tcgp2-notice-info">
    <h3>Welcome to Trail POIs!</h3>
    <p>You haven't synced any POIs yet. Start by configuring your API keys in Settings, then use the Sync tool to import POIs from Google Places along your trails.</p>
    <p><a href="<?php echo esc_url(admin_url('admin.php?page=tcgp2-settings')); ?>" class="button button-primary">Configure Settings</a></p>
</div>
<?php endif; ?>

<?php if ($stats['without_categories'] > 0): ?>
<div class="tcgp2-notice tcgp2-notice-warning">
    <h3>POIs Need Categories</h3>
    <p>You have <?php echo esc_html($stats['without_categories']); ?> POIs without category assignments. Visit the POI Manager to assign categories or configure automatic category mapping in Settings.</p>
    <p><a href="<?php echo esc_url(admin_url('admin.php?page=tcgp2-pois')); ?>" class="button button-secondary">Manage POIs</a></p>
</div>
<?php endif; ?> 