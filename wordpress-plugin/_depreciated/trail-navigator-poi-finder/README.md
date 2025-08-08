# Trail Navigator POI Finder

A WordPress plugin to import, curate, and export POIs for trail systems using RideWithGPS and Google Places, with GeoDirectory export compatibility.

## Requirements
- WordPress 6.5+
- PHP 8.1+
- RideWithGPS API key
- Google Places API key
- Trail Config plugin (for trail definitions)

## Installation
1. Copy the `trail-navigator-poi-finder` folder to your `wp-content/plugins/` directory.
2. Activate the plugin in the WordPress admin.
3. Ensure the Trail Config plugin is active and trails are configured.

## Configuration
1. Go to **Trail POI Finder > Settings** in the WordPress admin menu.
2. Enter your Google Places API key and RideWithGPS API key.
3. Set the default search radius and minimum distance between API calls.
4. Map Google Place types to GeoDirectory categories in the Category Mapping section.

## Syncing POIs
1. Go to **Trail POI Finder > Sync**.
2. Select a trail and click **Sync POIs**.
3. The plugin will fetch POIs along the trail, showing progress and results.
4. Synced POIs are stored in the database and can be managed in the POI Manager.

## Exporting POIs
1. After syncing, use the **Export GeoDirectory CSV** button to download a CSV compatible with GeoDirectory import.
2. The export matches the required template exactly, including address and category fields.

## Managing POIs
- Use the **POI Manager** to view, search, filter, and bulk delete POIs.
- Use the **Map Preview** to visualize trails, search points, hotspots, and synced POIs.

## Troubleshooting
- Ensure API keys are correct and have sufficient quota.
- If sync is slow or fails, check your server's PHP and network settings.
- For missing or miscategorized POIs, review your category mapping settings.

## Support
For help or feature requests, contact the plugin author or open an issue in your project repository. 