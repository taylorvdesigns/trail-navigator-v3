# Trail Config Google Places Plugin

A WordPress plugin for importing Points of Interest (POIs) from Google Places API into your Trail Navigator system. This plugin uses a streamlined approach to store only essential data for map display while providing on-demand access to current information.

## Overview

This plugin integrates with your existing Trail Navigator WordPress configuration to:

- **Import Essential POI Data**: Store only the basic information needed for map display
- **On-Demand Details**: Fetch current information from Google Places API when users request it
- **Trail Integration**: Work with your existing trail configuration and RideWithGPS geometry
- **Category Mapping**: Automatically map Google Places types to trail categories

## Data Strategy

The plugin stores only essential information to keep your database lean and efficient:

### Stored Data (Essential for Map Display)
- **Name**: Place name
- **Coordinates**: Latitude and longitude for map positioning
- **Category**: Mapped from Google Places types (food, restroom, parking, etc.)
- **Short Description**: Vicinity/address information
- **Google Places ID**: For on-demand detailed information

### On-Demand Data (Fetched Fresh)
When users tap on a POI for details, the app fetches current information from Google Places API:
- Hours of operation
- Current ratings and reviews
- Photos
- Contact information
- Website
- Price level
- And more...

This approach ensures users always get the most current information while keeping your database efficient.

## Installation

1. Upload the plugin files to `/wp-content/plugins/trail-config-google-places/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Configure your Google Places API key in the plugin settings
4. Run your first sync to import POIs along your trails

## Configuration

### Google Places API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Places API
4. Create credentials (API Key)
5. Add the API key in the plugin settings

### Trail Configuration
The plugin automatically integrates with your existing trail configuration system, including:
- Trail route IDs from RideWithGPS
- Trail names and colors
- Trail geometry for POI search

## Usage

### Manual Sync
1. Go to the plugin admin page
2. Select a trail from the dropdown
3. Click "Search and Import POIs"
4. Review and approve the found POIs
5. Import selected POIs to your database

### Automated Sync
Configure automatic sync intervals in the settings to keep POI data updated.

### API Integration
Your Trail Navigator app can access POI data via these REST API endpoints:

#### Get Essential POI Data for a Trail
```
GET /wp-json/tcgp/v1/trail/{trail_id}/pois
```

Response:
```json
{
  "pois": [
    {
      "place_id": "ChIJ...",
      "name": "Trailside Cafe",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "category": "food",
      "short_description": "123 Main St, City, State"
    }
  ]
}
```

#### Get On-Demand Detailed Information
```
GET /wp-json/tcgp/v1/poi/{place_id}/details
```

Response: Full Google Places API response with current information.

## Category Mapping

The plugin automatically maps Google Places types to trail categories:

- **Food & Drink**: restaurant, cafe, bar, bakery → `food`
- **Restrooms**: toilet, restroom → `restroom`
- **Parking**: parking → `parking`
- **Water**: drinking_water → `water`
- **Emergency**: hospital, police, fire_station → `emergency`
- **Information**: tourist_information → `information`
- **Recreation**: park, playground, gym → `recreation`
- **Shopping**: store, convenience_store, gas_station → `shopping`
- **Lodging**: hotel, campground → `lodging`
- **Transportation**: transit_station, bus_station → `transportation`
- **Other**: Any unmapped types → `other`

## Benefits

1. **Efficient Storage**: Only essential data is stored locally
2. **Current Information**: Users always get fresh details from Google
3. **Fast Map Loading**: Quick display of POIs using local data
4. **Reduced API Costs**: Detailed data only fetched when needed
5. **Better User Experience**: Immediate map display with on-demand details

## Support

For support and questions, please refer to the plugin documentation or contact the development team.

## Features

### 🎯 **Smart POI Discovery**
- **Search All Trails at Once**: No need to select individual trails - the plugin searches all configured trails simultaneously
- **No Category Pre-selection**: Pulls all POIs within your specified radius and shows categories in the results
- **Master List with Status Tracking**: Color-coded POIs showing new, updated, existing, or deleted status

### 🔐 **Secure API Key Management**
- **WordPress Settings Integration**: Securely store your Google Places API key in WordPress settings
- **Settings Page**: Dedicated settings page with API key configuration and usage information
- **Security Best Practices**: Guidance on API key restrictions and monitoring

### 📊 **Comprehensive Management**
- **Bulk Import**: Select multiple POIs from the master list and import them all at once
- **Status Filtering**: Filter results by status (new, updated, existing, deleted)
- **Trail Grouping**: All POIs are grouped together regardless of which trail they're near
- **Sync Status**: View detailed sync statistics and recent sync logs

## Requirements

- WordPress 5.0 or higher
- Trail Navigator Configuration plugin installed and configured
- Google Places API key
- RideWithGPS API key (for trail geometry)

## Installation

1. **Download and Install**:
   - Download the plugin ZIP file
   - Upload to WordPress via Plugins > Add New > Upload Plugin
   - Activate the plugin

2. **Configure API Keys**:
   - Go to **Trail Places > Settings**
   - Enter your Google Places API key
   - Set your default search radius
   - Save settings

3. **Configure Trails**:
   - Ensure your Trail Navigator Configuration plugin is set up
   - Configure your trails with route IDs, names, colors, and endpoint names

## Usage

### Getting Started

1. **Get a Google Places API Key**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the "Places API" and "Geocoding API"
   - Create credentials (API Key)
   - Restrict the API key to your domain for security

2. **Configure Settings**:
   - Navigate to **Trail Places > Settings**
   - Enter your Google Places API key
   - Set your search radius (100-5000 meters)
   - Save your settings

3. **Import POIs**:
   - Go to **Trail Places** in your WordPress admin
   - Click "Search All Trails for Places"
   - Review the master list of found POIs
   - Select the POIs you want to import
   - Click "Import Selected"

### Features in Detail

#### **Master List with Status Tracking**
- **Green (New)**: POIs found that aren't in your database yet
- **Yellow (Updated)**: POIs that exist but have changed information
- **Gray (Existing)**: POIs that are already imported and unchanged
- **Red (Deleted)**: POIs that were previously imported but no longer found

#### **Filtering and Selection**
- Use the status filters to show/hide different types of POIs
- Select individual POIs or use "Select All"/"Deselect All" buttons
- See categories and trail associations for each POI

#### **Bulk Operations**
- Import multiple POIs at once
- Delete POIs individually or in bulk
- View sync statistics and logs

## API Endpoints

The plugin provides REST API endpoints for your Trail Navigator app:

### Get All Places
```
GET /wp-json/tcgp/v1/places
```

### Get Place Details
```
GET /wp-json/tcgp/v1/places/{place_id}
```

## Database Structure

The plugin creates two database tables:

### `wp_tcgp_places`
Stores all imported POI data:
- `place_id`: Google Places unique identifier
- `name`: POI name
- `vicinity`: Nearby location description
- `formatted_address`: Full address
- `latitude`/`longitude`: GPS coordinates
- `types`: JSON array of place categories
- `rating`: Google rating (0-5)
- `user_ratings_total`: Number of reviews
- `price_level`: Price level (0-4)
- `opening_hours`: JSON object with hours
- `website`: Website URL
- `phone`: Phone number
- `photos`: JSON array of photo references
- `trail_id`: Associated trail route ID
- `status`: active/deleted
- `created_date`/`updated_date`: Timestamps

### `wp_tcgp_sync_logs`
Tracks sync operations:
- `trail_id`: Trail being synced
- `sync_type`: success/error
- `places_found`: Number of places found
- `places_imported`: Number of new places imported
- `places_updated`: Number of places updated
- `places_removed`: Number of places marked as deleted
- `errors`: Error messages if any
- `sync_date`: When the sync occurred

## Configuration

### Settings Page
Access via **Trail Places > Settings**:

- **Google Places API Key**: Your API key for Google Places API
- **Default Search Radius**: Distance from trails to search for places (meters)
- **Usage Information**: API limits and security recommendations

### Search Radius
- **Minimum**: 1 meter
- **Maximum**: 50000 meters (Google Places API limit)
- **Default**: 50 meters
- **Recommendation**: Start with 50m and adjust based on your needs. Smaller values will find fewer POIs but may be more relevant to the trail.
- **Note**: The plugin now supports any radius value from 1 meter up to 50km, with automatic filtering for very small radius values.

### Address Parsing
The plugin now uses Google's Geocoding API to properly parse addresses into separate fields required by GeoDirectory:
- **Street**: Street number and name
- **City**: Locality or sublocality
- **Region**: Administrative area (state/province)
- **Country**: Country name
- **ZIP**: Postal code

This ensures that CSV exports are compatible with GeoDirectory's import requirements.

## API Usage and Costs

### Google Places API Limits
- **Free Tier**: 1,000 requests per day
- **Paid Tier**: $17 per 1,000 requests after free tier
- **Typical Usage**: Each place search uses 1-2 API calls

### Cost Optimization
- Use appropriate search radius (smaller = fewer API calls)
- Run syncs during off-peak hours
- Monitor usage in Google Cloud Console
- Set up billing alerts

## Troubleshooting

### Common Issues

**"No trails configured"**
- Ensure Trail Navigator Configuration plugin is installed
- Configure trails in Trail Config admin page

**"API key is invalid"**
- Check your Google Places API key in settings
- Ensure Places API and Geocoding API are enabled
- Verify API key restrictions allow your domain

**"No places found"**
- Increase search radius
- Check if trails have valid geometry from RideWithGPS
- Verify API key has sufficient quota

### Debug Information
- Check sync logs in the main plugin page
- Review WordPress error logs
- Test API key in settings page

## Security Considerations

### API Key Security
- **Restrict by Domain**: Limit API key to your WordPress domain
- **Restrict by IP**: If possible, restrict to your server's IP
- **Monitor Usage**: Set up billing alerts in Google Cloud Console
- **Regular Rotation**: Periodically rotate your API keys

### Data Privacy
- POI data is stored locally in your WordPress database
- No POI data is sent to external services except Google Places API
- Consider GDPR implications for EU users

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review WordPress error logs
3. Verify API key and permissions
4. Test with a smaller search radius

## Changelog

### Version 1.0.0
- Initial release
- Search all trails simultaneously
- Master list with status tracking
- Secure API key storage
- Bulk import functionality
- Comprehensive sync logging
- REST API endpoints
- Settings page with usage guidance

## License

GPL v2 or later

## CSV Export Format

The plugin exports POI data in **GeoDirectory format** that matches the standard GeoDirectory import template:

### CSV Header Fields
- `post_title` - POI name
- `post_content` - Description/content
- `post_status` - Post status (publish)
- `post_author` - Author ID (1)
- `post_type` - Post type (gd_place)
- `post_date` - Creation date
- `post_modified` - Last modified date
- `post_tags` - Comma-separated tags
- `post_category` - Primary category
- `default_category` - Default category
- `featured` - Featured status (0)
- `street` - Street address
- `street2` - Secondary street address
- `city` - City
- `region` - State/region
- `country` - Country
- `zip` - ZIP/postal code
- `latitude` - Latitude coordinate
- `longitude` - Longitude coordinate
- `post_images` - Image URLs

### Category Mapping
The plugin automatically maps Google Places types to GeoDirectory categories:
- **Food & Drink**: restaurant, cafe, bar, bakery → `food`
- **Restrooms**: toilet, restroom → `restroom`
- **Parking**: parking → `parking`
- **Water**: drinking_water → `water`
- **Emergency**: hospital, police, fire_station → `emergency`
- **Information**: tourist_information → `information`
- **Recreation**: park, playground, gym → `recreation`
- **Shopping**: store, convenience_store, gas_station → `shopping`
- **Lodging**: hotel, campground → `lodging`
- **Transportation**: transit_station, bus_station → `transportation`
- **Other**: Any unmapped types → `other`

### Address Parsing
The plugin attempts to parse address components from the Google Places vicinity information:
- Splits address by commas to extract street, city, and region
- Falls back to full address if parsing fails

### Usage
1. Select POIs in the Master POI List
2. Click "Export Selected as GeoDirectory CSV"
3. Import the CSV into GeoDirectory or compatible systems

## API Endpoints 