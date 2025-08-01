// Google Analytics Configuration
// Check if we're using GTM or direct GA4
export const GA_TRACKING_ID = process.env.REACT_APP_GA_TRACKING_ID || '';
export const GTM_CONTAINER_ID = process.env.REACT_APP_GTM_CONTAINER_ID || '';

// Determine which tracking method to use
// For now, let's force direct GA4 to avoid GTM configuration issues
export const isUsingGTM = false; // Temporarily disable GTM
export const trackingId = GA_TRACKING_ID;

// Extend Window interface for Google Analytics
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Initialize Google Analytics or Google Tag Manager
export const initGA = () => {
  console.log('🔍 Initializing Analytics...');
  console.log('📊 GA Tracking ID:', GA_TRACKING_ID);
  console.log('🏷️ GTM Container ID:', GTM_CONTAINER_ID);
  console.log('🔧 Using GTM:', isUsingGTM);
  console.log('🌐 Window object available:', typeof window !== 'undefined');
  console.log('🌍 Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A');
  console.log('🔧 NODE_ENV:', process.env.NODE_ENV);

  if (typeof window !== 'undefined' && trackingId) {
    console.log('✅ Tracking ID found, setting up analytics...');
    
    if (isUsingGTM) {
      // Initialize Google Tag Manager
      console.log('🏷️ Initializing Google Tag Manager...');
      
      // Check if GTM script already exists
      const existingGTMScript = document.querySelector(`script[src*="googletagmanager.com/gtm.js"]`);
      if (existingGTMScript) {
        console.log('📜 GTM script already exists, skipping...');
      } else {
        // Load GTM script
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`;
        document.head.appendChild(script);
        console.log('📜 GTM script added to head');
      }

      // Initialize dataLayer
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        'gtm.start': new Date().getTime(),
        event: 'gtm.js'
      });

      // Add GTM noscript fallback
      const noscript = document.createElement('noscript');
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`;
      iframe.height = '0';
      iframe.width = '0';
      iframe.style.display = 'none';
      iframe.style.visibility = 'hidden';
      noscript.appendChild(iframe);
      document.head.appendChild(noscript);
      
      console.log('✅ Google Tag Manager initialized successfully!');
      console.log('📊 dataLayer length after init:', window.dataLayer.length);
    } else {
      // Initialize direct Google Analytics
      console.log('📊 Initializing direct Google Analytics...');
      
      // Check if gtag script already exists
      const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`);
      if (existingScript) {
        console.log('📜 Gtag script already exists, skipping...');
      } else {
        // Load gtag script
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
        document.head.appendChild(script);
        console.log('📜 Gtag script added to head');
      }

      // Initialize gtag
      window.dataLayer = window.dataLayer || [];
      const gtag = (...args: any[]) => {
        console.log('📊 Gtag called with args:', args);
        window.dataLayer.push(args);
      };
      gtag('js', new Date());
      gtag('config', GA_TRACKING_ID, {
        page_title: 'Trail Navigator',
        page_location: window.location.href,
        debug_mode: process.env.NODE_ENV === 'development',
        send_page_view: true,
        anonymize_ip: false,
      });

      // Make gtag available globally
      window.gtag = gtag;
      
      // Force a page view event
      gtag('event', 'page_view', {
        page_title: 'Trail Navigator',
        page_location: window.location.href,
        page_referrer: document.referrer,
      });
      
      // Test immediate event
      setTimeout(() => {
        gtag('event', 'test_immediate', {
          event_category: 'test',
          event_label: 'immediate_test',
          value: 1,
        });
        console.log('🔄 Sent immediate test event');
      }, 1000);
      
      console.log('✅ Google Analytics initialized successfully!');
      console.log('📊 dataLayer length after init:', window.dataLayer.length);
      console.log('🔍 GA4 Property ID being used:', GA_TRACKING_ID);
      console.log('🌐 Current URL:', window.location.href);
      console.log('🔧 Debug mode:', process.env.NODE_ENV === 'development');
    }
  } else {
    console.warn('⚠️ Analytics not initialized: Missing tracking ID or not in browser environment');
    console.log('GA_TRACKING_ID:', GA_TRACKING_ID);
    console.log('GTM_CONTAINER_ID:', GTM_CONTAINER_ID);
    console.log('Window available:', typeof window !== 'undefined');
  }
};

// Custom event tracking functions
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number,
  customParameters?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
      ...customParameters,
    });
  }
};

// Page view tracking
export const trackPageView = (page_title?: string, page_location?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_title: page_title || document.title,
      page_location: page_location || window.location.href,
    });
  }
};

// Trail-specific tracking functions
export const trackTrailEvent = {
  // Entry/Exit tracking
  entryPointSelected: (entryPoint: string, coordinates?: [number, number]) => {
    trackEvent('entry_point_selected', 'trail_navigation', entryPoint, undefined, {
      entry_point: entryPoint,
      coordinates: coordinates ? `${coordinates[0]},${coordinates[1]}` : undefined,
    });
  },

  exitPointReached: (exitPoint: string, sessionDuration?: number) => {
    trackEvent('exit_point_reached', 'trail_navigation', exitPoint, sessionDuration, {
      exit_point: exitPoint,
      session_duration_seconds: sessionDuration,
    });
  },

  // POI tracking
  poiViewed: (poiName: string, poiCategory: string, poiGroup: string) => {
    trackEvent('poi_viewed', 'poi_interaction', poiName, undefined, {
      poi_name: poiName,
      poi_category: poiCategory,
      poi_group: poiGroup,
    });
  },

  poiDetailsOpened: (poiName: string, poiCategory: string) => {
    trackEvent('poi_details_opened', 'poi_interaction', poiName, undefined, {
      poi_name: poiName,
      poi_category: poiCategory,
    });
  },

  poiGooglePlacesOpened: (poiName: string, placeId?: string) => {
    trackEvent('poi_google_places_opened', 'poi_interaction', poiName, undefined, {
      poi_name: poiName,
      google_place_id: placeId,
    });
  },

  // Map interaction tracking
  mapZoomed: (zoomLevel: number, zoomDirection: 'in' | 'out', focusedArea?: string) => {
    trackEvent('map_zoomed', 'map_interaction', `${zoomDirection}_to_${zoomLevel}`, zoomLevel, {
      zoom_level: zoomLevel,
      zoom_direction: zoomDirection,
      focused_area: focusedArea,
    });
  },

  mapPanned: (direction: string, distance?: number) => {
    trackEvent('map_panned', 'map_interaction', direction, distance, {
      pan_direction: direction,
      pan_distance: distance,
    });
  },

  poiGroupFocused: (groupName: string, poiCount: number) => {
    trackEvent('poi_group_focused', 'map_interaction', groupName, poiCount, {
      group_name: groupName,
      poi_count: poiCount,
    });
  },

  // Filter tracking
  filterApplied: (filterType: string, filterValue: string) => {
    trackEvent('filter_applied', 'filter_usage', filterValue, undefined, {
      filter_type: filterType,
      filter_value: filterValue,
    });
  },

  // View mode tracking
  viewModeChanged: (fromMode: string, toMode: string) => {
    trackEvent('view_mode_changed', 'app_navigation', `${fromMode}_to_${toMode}`, undefined, {
      from_mode: fromMode,
      to_mode: toMode,
    });
  },

  // Session tracking
  sessionStarted: (entryMethod: string, deviceType: string) => {
    trackEvent('session_started', 'user_session', entryMethod, undefined, {
      entry_method: entryMethod,
      device_type: deviceType,
      timestamp: new Date().toISOString(),
    });
  },

  sessionEnded: (duration: number, exitMethod: string) => {
    trackEvent('session_ended', 'user_session', exitMethod, duration, {
      session_duration_seconds: duration,
      exit_method: exitMethod,
    });
  },

  // Business intelligence tracking
  businessDiscovered: (businessName: string, businessCategory: string, businessGroup: string) => {
    trackEvent('business_discovered', 'business_intelligence', businessName, undefined, {
      business_name: businessName,
      business_category: businessCategory,
      business_group: businessGroup,
    });
  },

  businessContactAccessed: (businessName: string, contactType: string) => {
    trackEvent('business_contact_accessed', 'business_intelligence', businessName, undefined, {
      business_name: businessName,
      contact_type: contactType,
    });
  },

  businessDirectionsRequested: (businessName: string, fromLocation?: string) => {
    trackEvent('business_directions_requested', 'business_intelligence', businessName, undefined, {
      business_name: businessName,
      from_location: fromLocation,
    });
  },
};

// Error tracking
export const trackError = (error: Error, context?: string) => {
  trackEvent('error_occurred', 'app_error', error.message, undefined, {
    error_message: error.message,
    error_stack: error.stack,
    context: context,
  });
};

// Performance tracking
export const trackPerformance = (metric: string, value: number, context?: string) => {
  trackEvent('performance_metric', 'app_performance', metric, value, {
    metric_name: metric,
    metric_value: value,
    context: context,
  });
}; 