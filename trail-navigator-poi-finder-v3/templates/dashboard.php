<div class="wrap tnpoi-dashboard">
    <h1>Trail Navigator POI Finder</h1>
    <p>Import, curate, and export POIs for your trail system. Use the menu to manage POIs, sync with Google Places, preview on the map, or configure settings.</p>
    <h2>Statistics</h2>
    <ul>
        <li><strong>Total POIs:</strong> <?php echo esc_html($stats['total'] ?? 0); ?></li>
        <li><strong>Active POIs:</strong> <?php echo esc_html($stats['active'] ?? 0); ?></li>
        <li><strong>With Category:</strong> <?php echo esc_html($stats['with_category'] ?? 0); ?></li>
        <li><strong>Without Category:</strong> <?php echo esc_html($stats['without_category'] ?? 0); ?></li>
        <li><strong>Ignored:</strong> <?php echo esc_html($stats['ignored'] ?? 0); ?></li>
        <li><strong>Recent (7 days):</strong> <?php echo esc_html($stats['recent'] ?? 0); ?></li>
    </ul>
    <h3>POIs by Trail</h3>
    <ul>
        <?php if (!empty($stats['by_trail'])): ?>
            <?php foreach ($stats['by_trail'] as $trail): ?>
                <li><?php echo esc_html($trail['trail_name'] . ' (' . $trail['count'] . ')'); ?></li>
            <?php endforeach; ?>
        <?php else: ?>
            <li>No trails found.</li>
        <?php endif; ?>
    </ul>
</div> 