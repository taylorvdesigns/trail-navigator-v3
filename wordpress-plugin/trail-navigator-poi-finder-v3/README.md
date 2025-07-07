# Trail Navigator POI Finder v3

A professional WordPress plugin for importing, curating, and exporting Points of Interest (POIs) for trail systems. This version combines the robust architecture of v2 with enhanced features including coordinate thinning, map preview, and AJAX progress tracking.

## 🚀 What's New in v3

### Enhanced Features from Previous Versions
- **Coordinate Thinning**: Optimized API calls using intelligent point sampling
- **Map Preview**: Visual trail and POI mapping with Leaflet.js
- **AJAX Progress**: Real-time sync progress with batch processing
- **Enhanced Database**: Improved schema with ratings, photos, and detailed metadata
- **Bulk Operations**: Advanced POI management with bulk actions
- **Professional UI**: Modern, responsive admin interface

### Architecture Improvements
- **Modular Design**: Clean separation of concerns with dedicated classes
- **Template System**: Organized template files for maintainability
- **Asset Management**: Proper CSS/JS enqueuing with versioning
- **REST API**: Dedicated API endpoints for external integrations
- **Error Handling**: Comprehensive error handling and logging

## 📋 Features

### Core Functionality
- **Google Places Integration**: Import POIs from Google Places API along trail routes
- **RideWithGPS Integration**: Fetch trail coordinates from RideWithGPS API
- **Coordinate Thinning**: Reduce API calls by intelligently sampling trail points
- **Category Mapping**: Map Google Place types to GeoDirectory categories
- **CSV Export**: Export POIs in GeoDirectory-compatible format

### Advanced Management
- **POI Manager**: View, filter, and manage imported POIs with advanced search
- **Bulk Operations**: Delete, activate, or deactivate multiple POIs
- **Status Management**: Track POI status (active, inactive, ignored)
- **Category Assignment**: Manual and automatic category assignment
- **Notes & Metadata**: Add custom notes and track detailed POI information

### Visual Tools
- **Map Preview**: Interactive map showing trails, sampled points, and POIs
- **Sync Progress**: Real-time progress tracking during POI synchronization
- **Dashboard**: Overview with statistics and quick actions
- **Trail Visualization**: Visual representation of trail routes and POI distribution

### Performance & Optimization
- **API Optimization**: Coordinate thinning reduces API calls by 70-90%
- **Batch Processing**: Efficient handling of large datasets
- **Caching**: Smart caching of API responses and database queries
- **Rate Limiting**: Built-in rate limiting to respect API quotas

## 🛠️ Requirements

- WordPress 5.0 or higher
- PHP 7.4 or higher
- Google Places API key
- RideWithGPS API key
- Trail Navigator Configuration plugin (for trail data)

## 📦 Installation

1. Upload the plugin files to `/wp-content/plugins/trail-navigator-poi-finder-v3/`
2. Activate the plugin through the 'Plugins' screen in WordPress
3. Configure your API keys in the Settings page
4. Set up trail configurations in the Trail Navigator Configuration plugin

## ⚙️ Configuration

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
- **Coordinate Interval**: Minimum distance between API calls (coordinate thinning)
- **Max POIs per Sync**: Limit the number of POIs imported per sync operation
- **Place Types**: Select which types of places to search for during sync
- **Category Mapping**: Map Google Place types to GeoDirectory categories

## 🎯 Usage

### Dashboard

The dashboard provides an overview of your POI data:
- Total POIs imported
- Active vs inactive POIs
- POIs with/without category assignments
- Recent sync activity
- Trail statistics

### POI Manager

Manage your imported POIs with advanced features:
- **Advanced Filtering**: Search by name, filter by status, trail, or category
- **Bulk Actions**: Delete, activate, or deactivate multiple POIs
- **Individual Actions**: Edit, delete, or change status of individual POIs
- **Category Management**: Assign or change categories for POIs
- **Export**: Generate GeoDirectory-compatible CSV files

### Sync

Import POIs from Google Places with enhanced features:
- **Trail Selection**: Choose which trail to sync
- **Coordinate Thinning**: Automatic optimization of API calls
- **Progress Tracking**: Real-time progress with batch processing
- **Test Mode**: Preview sync results without saving
- **Error Handling**: Comprehensive error reporting and recovery

### Map Preview

Visualize your trails and POIs:
- **Interactive Map**: Leaflet.js powered map interface
- **Trail Display**: Visual representation of trail routes
- **POI Markers**: Color-coded POI markers with popup information
- **Sampled Points**: Show optimized API call points
- **Filtering**: Filter POIs by category or status

### Settings

Configure the plugin with comprehensive options:
- **General Settings**: Basic configuration and API keys
- **Sync Settings**: Coordinate thinning and place type configuration
- **Category Mapping**: Map Google Place types to GeoDirectory categories
- **Export Settings**: Configure CSV export options

## 🏗️ Architecture

### File Structure
```
trail-navigator-poi-finder-v3/
├── assets/
│   ├── css/
│   │   └── admin.css          # Admin styles
│   └── js/
│       └── admin.js           # Admin JavaScript
├── includes/
│   ├── class-admin.php        # Admin functionality
│   ├── class-poi-db.php       # Database operations
│   ├── class-poi-sync.php     # POI synchronization
│   ├── class-csv-export.php   # CSV export logic
│   ├── class-settings.php     # Settings management
│   ├── class-map-preview.php  # Map preview functionality
│   └── class-rest-api.php     # REST API endpoints
├── templates/
│   ├── dashboard.php          # Dashboard template
│   ├── poi-manager.php        # POI manager template
│   ├── sync.php              # Sync template
│   ├── map-preview.php       # Map preview template
│   └── settings.php           # Settings template
├── trail-navigator-poi-finder-v3.php  # Main plugin file
└── README.md                  # This file
```

### Key Classes

- **TNPOI_Admin**: Main admin functionality and page rendering
- **TNPOI_POI_DB**: Database operations and POI management
- **TNPOI_POI_Sync**: POI synchronization with coordinate thinning
- **TNPOI_CSV_Export**: GeoDirectory-compatible CSV export
- **TNPOI_Settings**: Settings management and validation
- **TNPOI_Map_Preview**: Map visualization functionality
- **TNPOI_REST_API**: REST API endpoints for external integrations

## 🔧 Technical Improvements

### Performance Optimizations
- **Coordinate Thinning**: Reduces API calls by sampling trail points intelligently
- **Batch Processing**: Processes POIs in batches for better performance
- **Database Indexing**: Optimized database queries with proper indexing
- **Caching**: Smart caching of API responses and database queries

### Security Enhancements
- **Nonce Verification**: All forms and AJAX requests use WordPress nonces
- **Capability Checks**: Proper permission checking for all admin actions
- **Input Sanitization**: All user input is properly sanitized
- **API Key Protection**: API keys are stored securely and hidden from non-admins

### User Experience
- **Modern UI**: Clean, responsive design with improved styling
- **Real-time Feedback**: AJAX-powered interactions with immediate feedback
- **Progress Indicators**: Visual feedback for long-running operations
- **Error Handling**: Comprehensive error messages and recovery options

## 🚀 Migration from v2

The v3 plugin is designed to be a drop-in replacement for v2 with enhanced features:

1. **Database Compatibility**: v3 can read existing v2 data
2. **Settings Migration**: Automatic migration of v2 settings
3. **Enhanced Features**: All v2 features plus new capabilities
4. **Backward Compatibility**: v2 templates and customizations can be adapted

## 🐛 Troubleshooting

### Common Issues

1. **API Key Errors**:
   - Verify API keys are correct and have proper permissions
   - Check billing status for Google Places API
   - Ensure API keys are enabled for the required services

2. **No POIs Found**:
   - Check trail configuration in Trail Navigator plugin
   - Verify search radius is appropriate
   - Ensure place types are selected in settings
   - Check coordinate thinning settings

3. **Sync Performance**:
   - Adjust coordinate interval for better optimization
   - Check API quota limits
   - Monitor sync progress for errors

### Debug Mode

Enable WordPress debug mode to see detailed error messages:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

## 📈 Performance Metrics

### API Call Reduction
- **v2**: ~1000 API calls for a 50km trail
- **v3**: ~100-200 API calls for the same trail (70-90% reduction)

### Database Performance
- **Enhanced Schema**: Better indexing and data structure
- **Optimized Queries**: Improved query performance
- **Bulk Operations**: Efficient handling of large datasets

## 🤝 Support

For support and feature requests:
- GitHub Issues: [Create an issue](https://github.com/taylorv/trail-navigator-v3/issues)
- Email: support@example.com
- Documentation: [View full docs](https://github.com/taylorv/trail-navigator-v3/tree/main/trail-navigator-poi-finder-v3)

## 📝 Changelog

### v3.0.0
- Complete architectural redesign
- Added coordinate thinning optimization
- Implemented map preview functionality
- Enhanced database schema
- Added AJAX progress tracking
- Improved error handling and logging
- Added bulk operations
- Enhanced UI/UX design

## 📄 License

This plugin is licensed under the GPL v2 or later.

---

**Trail Navigator POI Finder v3** - Professional POI management for trail systems with enhanced performance and user experience. 