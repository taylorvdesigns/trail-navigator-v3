// Google Analytics Configuration
export const GA_TRACKING_ID = process.env.REACT_APP_GA_TRACKING_ID || '';

// Extend Window interface for Google Analytics
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Initialize Google Analytics (simplified - script is now in index.html)
export const initGA = () => {
  if (typeof window !== 'undefined' && GA_TRACKING_ID) {
    // Google Analytics script is now loaded via index.html
    // Just ensure gtag is available globally
    if (typeof window.gtag === 'function') {
      console.log('Google Analytics is ready (loaded from index.html)');
    } else {
      console.warn('Google Analytics gtag function not available');
    }
  } else {
    console.warn('Analytics not initialized: Missing tracking ID or not in browser environment');
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

  // Adaptive zoom tracking
  adaptiveZoomApplied: (targetZoom: number, poiDensity: number, userLocation: [number, number], trigger: 'initial_load' | 'location_change' | 'simulation_mode') => {
    trackEvent('adaptive_zoom_applied', 'map_interaction', `zoom_${targetZoom}_density_${poiDensity}`, targetZoom, {
      target_zoom_level: targetZoom,
      poi_density: poiDensity,
      trigger_type: trigger,
      user_latitude: userLocation[1],
      user_longitude: userLocation[0],
    });
  },

  adaptiveZoomSkipped: (reason: 'manual_interaction' | 'no_user_location' | 'poi_parameter' | 'missing_data') => {
    trackEvent('adaptive_zoom_skipped', 'map_interaction', reason, undefined, {
      skip_reason: reason,
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