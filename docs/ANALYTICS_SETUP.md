# Google Analytics Setup Guide

## Overview
This application includes comprehensive Google Analytics tracking to help understand user behavior and trail usage patterns.

## Setup Instructions

### 1. Create Google Analytics 4 Property
1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property for your trail navigator app
3. Note your Measurement ID (format: G-XXXXXXXXXX)

### 2. Configure Environment Variables
Add the following to your `.env.local` file:

```bash
# Google Analytics Configuration
REACT_APP_GA_TRACKING_ID=G-XXXXXXXXXX
```

Replace `G-XXXXXXXXXX` with your actual Google Analytics 4 Measurement ID.

### 3. Deploy to Production
When deploying to Vercel or other platforms, add the environment variable:
- **Vercel**: Add `REACT_APP_GA_TRACKING_ID` in your project settings
- **Other platforms**: Add the environment variable according to your platform's documentation

## Tracking Events

### Core Events Implemented
- **Session tracking**: Start/end of user sessions
- **POI interactions**: Views, details opened, Google Places integration
- **Map interactions**: Zoom, pan, POI group focus
- **View mode changes**: Map, List, Navigation mode switches
- **Filter usage**: Category filter applications
- **Business intelligence**: Business discovery and engagement

### Event Categories
- `trail_navigation`: Entry/exit points, route selection
- `poi_interaction`: POI views, details, Google Places
- `map_interaction`: Zoom, pan, area focus
- `filter_usage`: Category and other filter applications
- `app_navigation`: View mode changes
- `user_session`: Session start/end tracking
- `business_intelligence`: Business discovery and engagement

## Privacy Considerations
- User data is anonymized where possible
- No personally identifiable information is tracked
- Location data is aggregated and anonymized
- Users can opt out via browser settings

## Analytics Dashboard Setup
Recommended Google Analytics custom reports:
1. **Trail Usage Overview**: Daily/weekly active users, session duration
2. **POI Performance**: Most viewed POIs, business categories
3. **Geographic Insights**: Popular trail segments, entry/exit points
4. **User Journey**: Navigation patterns, feature usage
5. **Business Impact**: Business discovery rates, engagement metrics

## Troubleshooting
- Ensure `REACT_APP_GA_TRACKING_ID` is set correctly
- Check browser console for analytics errors
- Verify Google Analytics is receiving data in real-time reports
- Test in incognito mode to avoid cached data 