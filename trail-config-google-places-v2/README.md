# Trail Config Google Places Integration v2

A WordPress plugin for importing Points of Interest (POIs) from Google Places along trails, curating them, and exporting to GeoDirectory CSV format.

## Features

- **Google Places Integration**: Import POIs from Google Places API along trail routes
- **RideWithGPS Integration**: Fetch trail coordinates from RideWithGPS API
- **POI Management**: View, filter, and manage imported POIs
- **Category Mapping**: Map Google Place types to GeoDirectory categories
- **CSV Export**: Export POIs in GeoDirectory-compatible format
- **Modern Admin UI**: Clean, responsive interface with improved UX
- **Bulk Operations**: Delete, activate, or deactivate multiple POIs
- **API Key Management**: Secure storage and testing of API keys

## Requirements

- WordPress 5.0 or higher
- PHP 7.4 or higher
- Google Places API key
- RideWithGPS API key
- Trail Navigator Configuration plugin (for trail data)

## Installation

1. Upload the plugin files to `/wp-content/plugins/trail-config-google-places-v2/`
2. Activate the plugin through the 'Plugins' screen in WordPress
3. Configure your API keys in the Settings page
4. Set up trail configurations in the Trail Navigator Configuration plugin

## Configuration

### API Keys

1. **Google Places API Key**:
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Places API
   - Create an API key with Places API access
   - Set up billing (required for API usage)

2. **RideWithGPS API Key**:
   - Log into your [RideWithGPS account](https://ridewithgps.com/users/edit)
   - Navigate to your account settings
   - Copy your API key

### Settings

- **Search Radius**: Distance in meters from trail coordinates to search for POIs
- **Max POIs per Sync**: Limit the number of POIs imported per sync operation
- **Auto-assign Categories**: Automatically assign categories based on Google Place types
- **Place Types**: Select which types of places to search for during sync

## Usage

### Dashboard

The dashboard provides an overview of your POI data:
- Total POIs imported
- New POIs awaiting review
- POIs with/without category assignments
- Last sync date
- Number of configured trails

### POI Manager

Manage your imported POIs:
- **Filtering**: Search by name, filter by status or trail
- **Bulk Actions**: Delete, activate, or deactivate multiple POIs
- **Individual Actions**: Edit or delete individual POIs
- **Export**: Generate GeoDirectory-compatible CSV files

### Sync

Import POIs from Google Places:
- Select a trail to sync
- Configure search radius and place types
- Monitor sync progress
- View sync history

### Settings

Configure the plugin:
- **General Settings**: Basic configuration options
- **API Keys**: Secure storage of API credentials
- **Category Mapping**: Map Google Place types to GeoDirectory categories
- **Sync Options**: Configure which place types to search for

## Code Improvements in v2.0.0

### Architecture

- **Separated Concerns**: Moved admin functionality to dedicated `TCGP2_Admin` class
- **Template System**: Created separate template files for better maintainability
- **Asset Management**: Proper CSS/JS enqueuing with versioning
- **Error Handling**: Improved error handling and user feedback

### Security

- **Nonce Verification**: All forms and AJAX requests use WordPress nonces
- **Capability Checks**: Proper permission checking for all admin actions
- **Input Sanitization**: All user input is properly sanitized
- **API Key Protection**: API keys are stored securely and hidden from non-admins

### User Experience

- **Modern UI**: Clean, responsive design with improved styling
- **Tabbed Interface**: Organized settings with tabbed navigation
- **Real-time Feedback**: AJAX-powered interactions with immediate feedback
- **Progress Indicators**: Visual feedback for long-running operations
- **Responsive Design**: Mobile-friendly interface

### Performance

- **Optimized Queries**: Improved database queries with proper indexing
- **Asset Optimization**: Minified CSS and efficient JavaScript
- **Caching**: Smart caching of API responses and database queries
- **Pagination**: Efficient handling of large datasets

### Maintainability

- **Code Organization**: Clear separation of concerns and modular design
- **Documentation**: Comprehensive inline documentation
- **Error Logging**: Detailed logging for debugging
- **Extensibility**: Easy to extend with new features

## File Structure

```
trail-config-google-places-v2/
├── assets/
│   ├── css/
│   │   └── admin.css          # Admin styles
│   └── js/
│       └── admin.js           # Admin JavaScript
├── includes/
│   ├── class-admin.php        # Admin functionality
│   ├── class-csv-export.php   # CSV export logic
│   ├── class-poi-db.php       # Database operations
│   ├── class-poi-sync.php     # POI synchronization
│   ├── class-rest-api.php     # REST API endpoints
│   └── class-settings.php     # Settings management
├── templates/
│   ├── dashboard.php          # Dashboard template
│   ├── poi-manager.php        # POI manager template
│   ├── settings.php           # Settings template
│   └── sync.php              # Sync template
└── trail-config-google-places-v2.php  # Main plugin file
```

## API Usage

The plugin uses several APIs:

### Google Places API
- **Nearby Search**: Find POIs near trail coordinates
- **Place Details**: Get detailed information about specific places
- **Rate Limits**: Monitor usage to avoid quota limits

### RideWithGPS API
- **Route Data**: Fetch trail coordinates and metadata
- **Authentication**: Uses API key for access

## Troubleshooting

### Common Issues

1. **API Key Errors**:
   - Verify API keys are correct and have proper permissions
   - Check billing status for Google Places API
   - Ensure API keys are enabled for the required services

2. **No POIs Found**:
   - Check trail configuration in Trail Navigator plugin
   - Verify search radius is appropriate
   - Ensure place types are selected in settings

3. **CSV Export Issues**:
   - Check file permissions for upload directory
   - Verify GeoDirectory is properly configured
   - Ensure category mappings are set up

### Debug Mode

Enable WordPress debug mode to see detailed error messages:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

## Support

For support and feature requests:
- GitHub Issues: [Create an issue](https://github.com/taylorv/trail-navigator-v3/issues)
- Email: support@example.com
- Documentation: [View full docs](https://github.com/taylorv/trail-navigator-v3/tree/main/trail-config-google-places-v2)

## Changelog

### v2.0.0
- Complete code refactoring and optimization
- New admin class architecture
- Template system for better maintainability
- Improved security and error handling
- Modern, responsive UI design
- Enhanced user experience with AJAX interactions
- Better performance and scalability

### v1.x.x
- Initial plugin development
- Basic POI import and export functionality
- Simple admin interface

## License

This plugin is licensed under the GPL v2 or later.

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Credits

Developed for trail management and POI integration needs. 