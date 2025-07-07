<?php
// Get current search terms
$search_terms = get_option('tnpoi_search_terms', array());
$settings = get_option('tnpoi_settings', array());
$last_sync = get_option('tnpoi_last_sync', '');
$sync_stats = get_option('tnpoi_sync_stats', array());
?>

<div class="wrap tnpoi-sync">
    <h1>Sync POIs</h1>
    
    <div class="tnpoi-sync-overview">
        <div class="sync-stats">
            <h3>Sync Statistics</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-number"><?php echo number_format($sync_stats['total_synced'] ?? 0); ?></span>
                    <span class="stat-label">Total Synced</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number"><?php echo number_format($sync_stats['last_sync_count'] ?? 0); ?></span>
                    <span class="stat-label">Last Sync</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number"><?php echo $last_sync ? date('M j, Y g:i A', strtotime($last_sync)) : 'Never'; ?></span>
                    <span class="stat-label">Last Sync Time</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number"><?php echo count($search_terms); ?></span>
                    <span class="stat-label">Search Terms</span>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Search Terms Management -->
    <div class="tnpoi-search-terms">
        <h2>Search Terms</h2>
        <p>Add search terms to find POIs along your trails. These will be used to search Google Places API.</p>
        
        <div class="search-terms-form">
            <form method="post" action="" id="add-search-term-form">
                <?php wp_nonce_field('tnpoi_add_search_term', 'tnpoi_search_nonce'); ?>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="search-term">Search Term:</label>
                        <input type="text" id="search-term" name="search_term" placeholder="e.g., restaurant, cafe, gas station" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="search-radius">Radius (miles):</label>
                        <input type="number" id="search-radius" name="search_radius" value="<?php echo esc_attr($settings['sync_radius'] ?? 100); ?>" min="1" max="500">
                    </div>
                    
                    <div class="form-group">
                        <label for="search-location">Location:</label>
                        <input type="text" id="search-location" name="search_location" placeholder="e.g., trail name or coordinates" required>
                    </div>
                    
                    <div class="form-group">
                        <button type="submit" class="button button-primary">Add Search Term</button>
                    </div>
                </div>
            </form>
        </div>
        
        <!-- Search Terms List -->
        <div class="search-terms-list">
            <h3>Current Search Terms</h3>
            
            <?php if (!empty($search_terms)): ?>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th>Search Term</th>
                            <th>Location</th>
                            <th>Radius</th>
                            <th>Last Used</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($search_terms as $index => $term): ?>
                            <tr>
                                <td><?php echo esc_html($term['term']); ?></td>
                                <td><?php echo esc_html($term['location']); ?></td>
                                <td><?php echo esc_html($term['radius']); ?> miles</td>
                                <td><?php echo $term['last_used'] ? date('M j, Y g:i A', strtotime($term['last_used'])) : 'Never'; ?></td>
                                <td>
                                    <button type="button" class="button delete-search-term" data-index="<?php echo esc_attr($index); ?>">Delete</button>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php else: ?>
                <p>No search terms added yet. Add some search terms above to get started.</p>
            <?php endif; ?>
        </div>
    </div>
    
    <!-- Sync Controls -->
    <div class="tnpoi-sync-controls">
        <h2>Sync Controls</h2>
        
        <div class="sync-options">
            <form method="post" action="" id="sync-form">
                <?php wp_nonce_field('tnpoi_sync_pois', 'tnpoi_sync_nonce'); ?>
                
                <div class="sync-options-grid">
                    <div class="option-group">
                        <label>
                            <input type="checkbox" name="sync_options[]" value="coordinate_thinning" checked>
                            Enable coordinate thinning (reduce nearby POIs)
                        </label>
                    </div>
                    
                    <div class="option-group">
                        <label>
                            <input type="checkbox" name="sync_options[]" value="auto_categorize" checked>
                            Auto-assign categories based on place types
                        </label>
                    </div>
                    
                    <div class="option-group">
                        <label>
                            <input type="checkbox" name="sync_options[]" value="update_existing" checked>
                            Update existing POIs with new data
                        </label>
                    </div>
                    
                    <div class="option-group">
                        <label>
                            <input type="checkbox" name="sync_options[]" value="ignore_duplicates" checked>
                            Ignore duplicate POIs
                        </label>
                    </div>
                </div>
                
                <div class="sync-actions">
                    <button type="button" id="start-sync" class="button button-primary button-large">Start Sync</button>
                    <button type="button" id="stop-sync" class="button button-secondary button-large" style="display: none;">Stop Sync</button>
                    <button type="button" id="test-sync" class="button">Test Sync (1 term)</button>
                </div>
            </form>
        </div>
    </div>
    
    <!-- Progress Tracking -->
    <div class="tnpoi-sync-progress" style="display: none;">
        <h2>Sync Progress</h2>
        
        <div class="progress-container">
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%;"></div>
            </div>
            <div class="progress-text">
                <span class="progress-percentage">0%</span>
                <span class="progress-status">Ready to start...</span>
            </div>
        </div>
        
        <div class="sync-log">
            <h3>Sync Log</h3>
            <div class="log-container">
                <div class="log-content"></div>
            </div>
            <button type="button" class="button clear-log">Clear Log</button>
        </div>
    </div>
    
    <!-- Help Tips -->
    <div class="tnpoi-sync-help">
        <h2>Sync Help</h2>
        
        <div class="help-tips">
            <div class="tip">
                <h4>Search Terms</h4>
                <p>Use specific terms like "restaurant", "cafe", "gas station", "lodging", "park", "museum", "library", "pharmacy", "atm", "bank", "store", "tourist_attraction". You can also use broader terms like "food" or "services".</p>
            </div>
            
            <div class="tip">
                <h4>Locations</h4>
                <p>Specify trail names, coordinates (lat,lng), or general areas. The system will search for POIs within the specified radius of these locations.</p>
            </div>
            
            <div class="tip">
                <h4>Coordinate Thinning</h4>
                <p>This feature reduces the number of nearby POIs to avoid clustering. POIs within 100 meters of each other will be consolidated.</p>
            </div>
            
            <div class="tip">
                <h4>API Limits</h4>
                <p>Google Places API has rate limits. The sync process includes delays between requests to respect these limits. Large syncs may take several minutes.</p>
            </div>
            
            <div class="tip">
                <h4>Categories</h4>
                <p>POIs are automatically categorized based on their Google Places type. You can manually adjust categories in the POI Manager after import.</p>
            </div>
        </div>
    </div>
</div>

<!-- Sync Status Modal -->
<div id="sync-status-modal" class="tnpoi-modal" style="display: none;">
    <div class="tnpoi-modal-content">
        <div class="tnpoi-modal-header">
            <h2>Sync Status</h2>
            <span class="tnpoi-modal-close">&times;</span>
        </div>
        <div class="tnpoi-modal-body">
            <div id="sync-status-content"></div>
        </div>
    </div>
</div> 