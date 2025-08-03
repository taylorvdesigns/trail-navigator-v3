/**
 * MapView Component
 * 
 * Main map component that displays trails, POIs, and user location using Leaflet.
 * Handles map interactions, POI clustering, trail visualization, and user navigation.
 * 
 * Features:
 * - Interactive map with trail overlays
 * - POI markers with category-based icons
 * - User location tracking
 * - POI clustering and grouping
 * - Trail network visualization
 * - Zoom and pan controls
 * - POI focus and navigation
 * - Category filtering
 * - Distance calculations
 */

import React, { useRef, useEffect, useMemo, useState } from 'react';
import ReactDOMServer from 'react-dom/server';
import { MapContainer, TileLayer, Polyline, Marker, Polygon, Popup, Pane } from 'react-leaflet';
import { Box, CircularProgress, Typography } from '@mui/material';
import { FilterBottomSheet } from '../FilterBottomSheet/FilterBottomSheet';
import './MapView.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapPin, faPersonWalking, faPersonRunning, faPersonBiking } from '@fortawesome/free-solid-svg-icons';
import { POI, TrailConfig } from '../../types/index';
import L from 'leaflet';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import { LocationContext } from '../../contexts/LocationContext';
import { GrayscaleMapLayer } from './GrayscaleMapLayer';
import { useTrailsData } from '../../hooks/useTrailsData';
import { useTrailJunctions } from '../../hooks/useTrailJunctions';
import { useTrailGraph } from '../../hooks/useTrailGraph';

import { useUser } from '../../contexts/UserContext';
import * as mapUtils from 'utils/mapUtils';
import { assignPOIsToTrails } from '../../utils/poi';
import { useContext } from 'react';
import { slugToTagName } from '../../utils/poi';
import { haversine } from '../../utils/distance';
import { useAnalytics } from '../../contexts/AnalyticsContext';
import { useCategories } from '../../hooks/useCategories';
import { parseFontAwesomeIcon, parseFontAwesomeColor } from '../../utils/fontAwesomeParser';
import { POIDistanceModal } from '../POIDistanceModal';
import { GooglePlacesModal } from '../GooglePlacesModal/GooglePlacesModal';

/**
 * Props interface for MapView component
 */
interface MapViewProps {
  trails: TrailConfig[];                           // Array of trail configurations to display
  pois?: POI[];                                   // Array of POIs to display on the map
  onPoiClick?: (poi: POI) => void;               // Callback when a POI is clicked
  center?: [number, number];                     // Initial map center coordinates [lat, lng]
  zoom?: number;                                 // Initial zoom level
  currentLocation?: [number, number];           // User's current GPS coordinates
  highlightedPOIs?: POI[];                      // POIs to highlight on the map
  onZoomChange?: (zoom: number) => void;        // Callback when zoom level changes
  fitBounds?: [number, number][] | null;        // Bounds to fit the map to
}









/**
 * Main MapView component that renders the interactive map with trails and POIs
 */
export const MapView: React.FC<MapViewProps> = ({
  trails,
  pois,
  onPoiClick,
  center = [34.8526, -82.3940],  // Default center: Greenville, SC
  zoom = 13,
  currentLocation,
  highlightedPOIs,
  onZoomChange,
  fitBounds
}) => {
  // Hooks for data and functionality
  const { categories } = useCategories(); // Categories for POI filtering
  
  // Categories for POI icon rendering from WordPress API
  const { trackTrailEvent } = useAnalytics(); // Analytics tracking for trail events
  const location = useRouterLocation(); // React Router location
  const mapRef = useRef<L.Map | null>(null); // Leaflet map reference
  const locationContext = useContext(LocationContext); // Location context
  const { selectedCategories, locomotionMode } = useUser(); // User's selected categories and locomotion mode
  const navigate = useNavigate(); // Navigation function
  
  // Location state management
  const userLocation = locationContext?.currentLocation || currentLocation;
  const entryPoint = locationContext?.entryPoint;
  const isSimPlaying = locationContext?.isSimPlaying || false;
  const simAnimatedLocation = locationContext?.simAnimatedLocation;
  
  // Component state management
  const [focusedGroup, setFocusedGroup] = useState<string | null>(null); // Currently focused POI group
  const [showViewList, setShowViewList] = useState(false); // Show list view toggle
  const [showZoomOut, setShowZoomOut] = useState(false); // Show zoom out button
  const [lastBounds, setLastBounds] = useState<[number, number][]>([]); // Previous map bounds
  const [showPOIGroupLabels, setShowPOIGroupLabels] = useState(true); // Show POI group labels
  const [filterBottomSheetOpen, setFilterBottomSheetOpen] = useState(false); // Filter modal state
  const [hasInitialLoad, setHasInitialLoad] = useState(false); // Initial load flag
  const [currentZoom, setCurrentZoom] = useState<number>(zoom); // Current zoom level
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null); // Currently selected POI
  const [hasShownInitialZoom, setHasShownInitialZoom] = useState(false); // Initial zoom shown flag
  const [isProgrammaticZoom, setIsProgrammaticZoom] = useState(false); // Programmatic zoom flag
  const [labelHighlightedPOI, setLabelHighlightedPOI] = useState<POI | null>(null); // POI with highlighted label
  const [showDistanceModal, setShowDistanceModal] = useState(false); // Distance modal state
  const [googlePlacesModalOpen, setGooglePlacesModalOpen] = useState(false); // Google Places modal state
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>(''); // Selected Google Place ID
  const [selectedPoiName, setSelectedPoiName] = useState<string>(''); // Selected POI name for modal

  // Adaptive zoom state management
  const [adaptiveZoomEnabled] = useState(true); // Whether adaptive zoom is enabled
  const [lastManualInteraction, setLastManualInteraction] = useState<Date | null>(null); // Track last manual zoom/pan
  const [zoomMode, setZoomMode] = useState<'adaptive' | 'manual' | 'poi-focus'>('adaptive'); // Current zoom mode
  const [hasAppliedInitialAdaptiveZoom, setHasAppliedInitialAdaptiveZoom] = useState(false); // Track if initial adaptive zoom was applied
  const [lastUserLocation, setLastUserLocation] = useState<[number, number] | null>(null); // Track last user location for change detection
  const [simulationModeReady, setSimulationModeReady] = useState(false); // Track if simulation mode has had time to set location

  // Trail data and junction processing
  const { data: trailsData, isLoading, isError } = useTrailsData(trails);
  
  // Trail graph for network distance calculations
  const { graph } = useTrailGraph();

  /**
   * Find trail junctions with a higher threshold (20 meters)
   * Used for identifying intersection points between trails
   */
  const junctions = useTrailJunctions(
    trailsData?.map(data => ({
      id: data.id,
      points: data.points
    })) || [],
    20 // Increased threshold from 10 to 20 meters
  );

  /**
   * Transform trail data to include coordinates for map rendering
   * Converts trail points to [lat, lng] format for Leaflet
   */
  const trailsWithCoordinates = useMemo(() => {
    return trails.map((trail, index) => {
      const trailData = trailsData[index];
      return {
        ...trail,
        coordinates: trailData?.points.map(point => [point.latitude, point.longitude] as [number, number]) || []
      };
    });
  }, [trails, trailsData]);

  // Get highlightPOI from navigation state for initial POI focus
  const { highlightPOI, highlightZoom } = location.state || {};
 

 
  // URL parameter handling for group and POI focus
  const searchParams = new URLSearchParams(location.search);
  const urlGroupParam = searchParams.get('group');
  const urlPoiParam = searchParams.get('poi');
  
  /**
   * Convert URL group parameter to group name if it's a slug
   * Handles both direct tag names and slug-to-name conversion
   */
  const urlGroupName = useMemo(() => {
    if (!urlGroupParam || !pois) return null;
    
    // First try to find by original tag name
    if (pois.some(poi => poi.post_tags.some(tag => tag.name === urlGroupParam))) {
      return urlGroupParam;
    }
    
    // If not found, try to convert from slug
    const foundTagName = slugToTagName(pois, urlGroupParam);
    return foundTagName;
  }, [urlGroupParam, pois]);
 
  // Handle URL parameter changes - exit focused mode if group parameter is removed
  useEffect(() => {
    if (!urlGroupParam && focusedGroup) {
      setFocusedGroup(null);
      setShowViewList(false);
      setShowZoomOut(false);
    }
  }, [urlGroupParam, focusedGroup]);

  // Handle URL parameter changes for focused groups
  useEffect(() => {
    if (urlGroupName && !focusedGroup && mapRef.current && pois) {
      const currentGroupPOIs = pois.filter(poi => poi.post_tags[0]?.name === urlGroupName) || [];
      
      if (currentGroupPOIs.length >= 3) {
        // Calculate hull and bounds (same logic as whenReady callback)
        const pointsLngLat = currentGroupPOIs.map(poi => [poi.coordinates[1], poi.coordinates[0]] as [number, number]);
        const hullLngLat = mapUtils.convexHull(pointsLngLat);
        const expandedHullLngLat = mapUtils.expandHullFromCentroid(hullLngLat, 0.0005);
        
        // Fix: expandedHullLngLat is already in [lat, lng] format, so use as-is
        const latLngBounds = expandedHullLngLat;
        const map = mapRef.current;
        const boundsObj = L.latLngBounds(latLngBounds as [number, number][]);
        map.fitBounds(latLngBounds as [number, number][], { padding: [80, 80], maxZoom: 17 });
        setTimeout(() => {
          const afterZoom = map.getZoom();
          if (afterZoom < 16) {
            const center = boundsObj.getCenter();
            map.setView(center, 16);
          }
        }, 500);
        
        setFocusedGroup(urlGroupName);
      }
    }
  }, [urlGroupName, focusedGroup, pois]);

  // Handle URL parameter changes for POI selection
  useEffect(() => {

    
    if (urlPoiParam && pois && pois.length > 0 && mapRef.current && hasInitialLoad) {
      const targetPOI = pois.find(poi => poi.id.toString() === urlPoiParam);
      
      if (targetPOI) {
        // Check if coordinates are valid
        if (!targetPOI.coordinates || targetPOI.coordinates.length !== 2 || 
            isNaN(targetPOI.coordinates[0]) || isNaN(targetPOI.coordinates[1])) {
          return;
        }
        
        // Only set selectedPOI if it's different from current
        if (!selectedPOI || selectedPOI.id !== targetPOI.id) {
          setSelectedPOI(targetPOI);
          setHasShownInitialZoom(true);
          
          // Direct zoom to the POI with smooth animation
          const poiCoords: [number, number] = [targetPOI.coordinates[1], targetPOI.coordinates[0]]; // [latitude, longitude] for Leaflet
          setIsProgrammaticZoom(true);
          
          // Add a longer delay to ensure the map is fully ready and no other zoom operations are running
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.setView(poiCoords, 18, { animate: true, duration: 2 });
            }
          }, 300);
          
          // Reset the flag after a short delay to allow the zoom to complete
          setTimeout(() => setIsProgrammaticZoom(false), 1000);
        }
      }
    }
  }, [urlPoiParam, pois, selectedPOI, hasInitialLoad]);

  // Clear selected POI when parameter is removed
  useEffect(() => {
    if (!urlPoiParam && selectedPOI) {
      setSelectedPOI(null);
      setHasShownInitialZoom(false);
    }
  }, [urlPoiParam, selectedPOI]);

  // Clear selected POI on map interaction
  // Note: Removed automatic exit on zoom/move to allow users to explore context
  // Users can now zoom/pan freely without losing POI focus
 
  /**
   * Group POIs by their first post tag for clustering and organization
   * Creates a map of group names to arrays of POI coordinates and names
   */
  const groupedPOIs = useMemo(() => {
    const groups: Record<string, Array<{ coordinates: [number, number], name: string }>> = {};
    pois?.forEach(poi => {
      const groupName = poi.post_tags[0]?.name || 'Ungrouped';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push({
        coordinates: [poi.coordinates[1], poi.coordinates[0]],
        name: poi.title.rendered
      });
    });
    return groups;
  }, [pois]);

  /**
   * Get all trail coordinates for bounds fitting
   * Flattens all trail coordinates into a single array for map bounds calculation
   */
  const allTrailCoords = useMemo(() => {
    return trailsWithCoordinates.flatMap(trail => trail.coordinates || []);
  }, [trailsWithCoordinates]);

  /**
   * Determine if we should fit bounds to trails
   * Prevents auto-fitting when specific bounds are provided (e.g., for POI groups)
   */
  const shouldFitBounds = useMemo(() => {
    // Don't auto-fit to trails if we have specific fitBounds (like for POI groups)
    if (fitBounds && fitBounds.length > 0) {
      return false;
    }
    // Always fit bounds when we have trails and no specific highlight POI
    return trailsWithCoordinates && trailsWithCoordinates.length > 0 && !highlightPOI;
  }, [trailsWithCoordinates, highlightPOI, fitBounds]);

  // Swap coordinates to match Leaflet's expected format [latitude, longitude]
  const safeCenter = useMemo(() => {
    if (highlightPOI) {
      return highlightPOI as [number, number];
    }
    return center || [35.7796, -78.6382]; // Default to Raleigh
  }, [highlightPOI, center]);



  /**
   * Get the locomotion icon based on current locomotion mode
   * Returns the appropriate FontAwesome icon for walking, running, or biking
   * 
   * @returns FontAwesome icon for current locomotion mode
   */
  const getLocomotionIcon = () => {
    switch (locomotionMode) {
      case 'walking':
        return faPersonWalking;
      case 'running':
        return faPersonRunning;
      case 'biking':
        return faPersonBiking;
      default:
        return faPersonWalking;
    }
  };

  /**
   * Calculate optimal zoom level based on POI density around user location
   * 
   * Adaptive zoom logic that considers:
   * - Number of nearby POIs (within 500m radius)
   * - POI density patterns (urban vs rural)
   * - Mobile screen constraints
   * - User interaction history
   * 
   * @param userLocation - User's current GPS coordinates [lng, lat]
   * @param pois - Array of all POIs to analyze
   * @param radius - Search radius in meters (default: 500m)
   * @returns Optimal zoom level (15-18) for mobile viewing
   * 
   * Zoom Level Guidelines:
   * - 15: Rural areas, sparse POIs (0-2 nearby)
   * - 16: Suburban areas, moderate POIs (3-5 nearby)  
   * - 17: Urban areas, dense POIs (6-10 nearby)
   * - 18: Very dense areas (10+ nearby)
   */
  /**
   * Calculate optimal zoom level based on POI density around user location
   * 
   * Analyzes the number of POIs within a specified radius of the user's location
   * and determines the appropriate zoom level for optimal viewing experience.
   * 
   * Zoom Strategy:
   * - 0 POIs (rural areas): Zoom 15 (wider view to show trail context)
   * - 1-3 POIs (sparse areas): Zoom 15 (lower zoom to show more area)
   * - 4-8 POIs (moderate density): Zoom 16 (balanced view)
   * - 9+ POIs (high density): Zoom 17 (detailed view of busy areas)
   * 
   * @param userLocation - The current user's [lng, lat] coordinates
   * @param pois - Array of POI objects to analyze
   * @param radius - Search radius in meters for nearby POIs (default: 1000m)
   * @returns Optimal zoom level (15-17) based on POI density
   */
  const calculateOptimalInitialZoom = (userLocation: [number, number] | null, pois: POI[] | undefined, radius = 1000): number => {
    // If no POIs available, return default zoom
    if (!pois) {
      return 16; // Default to moderate zoom for mobile
    }

    // Prioritize user location over map center for reference point
    let referenceLocation: [number, number] | null = null;
    
    if (userLocation) {
      // Use actual user location (GPS or simulation)
      referenceLocation = userLocation;
    } else if (mapRef.current) {
      // Fallback to map center only if no user location available
      const center = mapRef.current.getCenter();
      referenceLocation = [center.lng, center.lat];
    }
    
    // If no reference location or trail graph available, return default
    if (!referenceLocation || !graph) {
      return 16; // Default to moderate zoom for mobile
    }

    // Calculate POI density within specified radius of reference location
    const nearbyPOIs = pois.filter(poi => {
      if (!poi.coordinates || !referenceLocation) return false;
      
      // Calculate straight-line distance for POI density analysis
      const distance = haversine(referenceLocation, poi.coordinates);
      
      // Only include POIs within the search radius
      return distance <= radius;
    });

    // Determine optimal zoom level based on POI density patterns
    let optimalZoom: number;
    if (nearbyPOIs.length === 0) {
      // Rural area - show more context and trail surroundings
      optimalZoom = 15;
    } else if (nearbyPOIs.length <= 3) {
      // Sparse POIs - lower zoom to show more area and context
      optimalZoom = 15;
    } else if (nearbyPOIs.length <= 8) {
      // Moderate density - balanced zoom for readability
      optimalZoom = 16;
    } else {
      // High density - higher zoom for detailed view of busy areas
      optimalZoom = 17;
    }

    return optimalZoom;
  };

  /**
   * Apply adaptive zoom to the map
   * 
   * Smoothly animates to the optimal zoom level based on POI density
   * Only applies if adaptive zoom is enabled and user hasn't manually interacted recently
   * 
   * @param targetZoom - The zoom level to animate to
   * @param userLocation - User's current location coordinates
   * @param duration - Animation duration in seconds (default: 1.5s)
   * @param poiDensity - Number of POIs in the area (for analytics)
   * @param trigger - What triggered the adaptive zoom (for analytics)
   */
  const applyAdaptiveZoom = (targetZoom: number, userLocation: [number, number], duration = 1.5, poiDensity = 0, trigger: 'initial_load' | 'location_change' | 'simulation_mode' = 'initial_load') => {
    if (!mapRef.current || !adaptiveZoomEnabled) {
      // Track when adaptive zoom is skipped due to missing data
      trackTrailEvent.adaptiveZoomSkipped('missing_data');
      return;
    }

    // Check if user has manually interacted recently (within 30 seconds)
    const now = new Date();
    const timeSinceLastInteraction = lastManualInteraction 
      ? now.getTime() - lastManualInteraction.getTime() 
      : Infinity;
    
    if (timeSinceLastInteraction < 30000) { // 30 seconds
      // Track when adaptive zoom is skipped due to recent manual interaction
      trackTrailEvent.adaptiveZoomSkipped('manual_interaction');
      return;
    }

    const currentZoom = mapRef.current.getZoom();
    if (Math.abs(currentZoom - targetZoom) < 0.5) {
      return;
    }

    // Convert from [lng, lat] to [lat, lng] for Leaflet
    const leafletCoordinates: [number, number] = [userLocation[1], userLocation[0]];
    
    // Apply smooth zoom animation and center on user location
    mapRef.current.setView(
      leafletCoordinates,
      targetZoom,
      { 
        animate: true, 
        duration: duration 
      }
    );

    // Track successful adaptive zoom application
    trackTrailEvent.adaptiveZoomApplied(targetZoom, poiDensity, userLocation, trigger);

    // Update zoom mode
    setZoomMode('adaptive');
  };

  // Create a custom React component for the user location marker
  const UserLocationMarker = () => (
    <div style={{
      position: 'relative',
      width: '24px',
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#e91e63',
      borderRadius: '50%',
      border: '2px solid white',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
    }}>
      <FontAwesomeIcon 
        icon={getLocomotionIcon()} 
        style={{ 
          color: 'white', 
          fontSize: '14px',
          zIndex: 1000
        }} 
      />
    </div>
  );

  const userLocationIcon = new L.DivIcon({
    className: 'pulse-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: ReactDOMServer.renderToString(<UserLocationMarker />)
  });



  // Helper to get group post_tag by name
  const getGroupTag = (groupName: string) => {
    const groupPOI = pois?.find(poi => poi.post_tags[0]?.name === groupName);
    return groupPOI?.post_tags[0]?.id;
  };

  // Helper to fit map to trail with center-based zoom
  const fitTrail = () => {
    if (mapRef.current && allTrailCoords.length > 0) {
      const bounds = L.latLngBounds(allTrailCoords as [number, number][]);
      const center = bounds.getCenter();
      

      
      // Use setView with center and specific zoom level
      mapRef.current.setView(center, 12, { 
        animate: true,
        duration: 1.5
      });
      
      setTimeout(() => {

      }, 2000);
    }
  };

  // Show zoom out button when viewing a highlighted POI
  useEffect(() => {
    if (highlightPOI) {
      setShowZoomOut(true);
    }
  }, [highlightPOI]);

  // Listen for map move/zoom to hide buttons if user pans/zooms away
  // Auto-reset logic removed - focused group is only cleared by Zoom Out button

  // Listen for zoom changes to update onZoomChange prop
  /**
   * Set up zoom change handler to track current zoom level
   * This is essential for POI icon rendering which depends on zoom level >= 15
   * Also triggers onZoomChange callback for parent components
   */
  useEffect(() => {
    if (!mapRef.current) return;
    
    const map = mapRef.current;
    
    /**
     * Handle zoom level changes from user interaction or programmatic zoom
     * Updates currentZoom state and calls onZoomChange callback
     */
    const handleZoom = () => {
      const newZoom = map.getZoom();
      setCurrentZoom(newZoom);
      if (onZoomChange) {
        onZoomChange(newZoom);
      }
    };

    /**
     * Handle manual user interactions (zoom/pan)
     * Tracks when user manually controls the map to respect their preferences
     */
    const handleManualInteraction = () => {
      setLastManualInteraction(new Date());
      setZoomMode('manual');
      console.log(`[AdaptiveZoom] Manual interaction detected - disabling adaptive zoom for 30s`);
    };
    
    // Listen for zoom end events (when zoom animation completes)
    map.on('zoomend', handleZoom);
    
    // Listen for manual user interactions
    map.on('zoomstart', handleManualInteraction);
    map.on('movestart', handleManualInteraction);
    
    // Set initial zoom level on mount
    const initialZoom = map.getZoom();
    setCurrentZoom(initialZoom);
    if (onZoomChange) {
      onZoomChange(initialZoom);
    }
    
    // Cleanup: remove event listeners when component unmounts
    return () => {
      map.off('zoomend', handleZoom);
      map.off('zoomstart', handleManualInteraction);
      map.off('movestart', handleManualInteraction);
    };
  }, [onZoomChange, mapRef.current]); // Include mapRef.current to ensure proper event listener attachment

  /**
   * Effect: Handle adaptive zoom on initial load and location changes
   * 
   * Triggers:
   * - Initial map load (when userLocation becomes available)
   * - User location changes (GPS updates or simulation location changes)
   * - POI data changes (new POIs loaded)
   * 
   * Behavior:
   * - Calculates optimal zoom based on nearby POI density
   * - Smoothly animates to new zoom level
   * - Respects user's manual zoom preferences
   * - Detects location changes and re-applies adaptive zoom
   * - Logs zoom decisions for debugging
   */
  useEffect(() => {
    // Only apply adaptive zoom if we have required data (POIs and map)
    if (!pois || !mapRef.current || !adaptiveZoomEnabled) {
      return;
    }

    // Detect if user location has changed
    const locationChanged = userLocation && lastUserLocation && 
      (Math.abs(userLocation[0] - lastUserLocation[0]) > 0.000001 || 
       Math.abs(userLocation[1] - lastUserLocation[1]) > 0.000001);
    
    if (locationChanged) {
      setHasAppliedInitialAdaptiveZoom(false);
      setLastUserLocation(userLocation);
    } else if (userLocation && !lastUserLocation) {
      // First time we have a user location
      setLastUserLocation(userLocation);
    }

    // Skip if we've already applied adaptive zoom for this location
    if (hasAppliedInitialAdaptiveZoom && !locationChanged) {
      return;
    }

    // Skip if user has manually interacted recently
    const now = new Date();
    const timeSinceLastInteraction = lastManualInteraction 
      ? now.getTime() - lastManualInteraction.getTime() 
      : Infinity;
    
    if (timeSinceLastInteraction < 30000) { // 30 seconds
      return;
    }

    // Wait for simulation mode to be ready and have location
    if (isSimPlaying && (!userLocation || !simulationModeReady)) {
      return;
    }

    // Don't apply adaptive zoom without a user location (prevent zooming to map center)
    if (!userLocation) {
      trackTrailEvent.adaptiveZoomSkipped('no_user_location');
      return;
    }

    // Skip adaptive zoom if there's a POI parameter in the URL (let POI-specific zoom handle it)
    if (urlPoiParam) {
      trackTrailEvent.adaptiveZoomSkipped('poi_parameter');
      return;
    }

    // Calculate optimal zoom based on POI density
    const optimalZoom = calculateOptimalInitialZoom(userLocation || null, pois);
    
    // Calculate POI density for analytics
    const nearbyPOIs = pois.filter(poi => {
      if (!poi.coordinates || !userLocation) return false;
      const distance = haversine(userLocation, poi.coordinates);
      return distance <= 1000; // 1km radius
    });
    
    // Determine trigger type for analytics
    const trigger: 'initial_load' | 'location_change' | 'simulation_mode' = 
      locationChanged ? 'location_change' : 
      isSimPlaying ? 'simulation_mode' : 'initial_load';
    
    // Apply adaptive zoom with smooth animation and analytics tracking
    applyAdaptiveZoom(optimalZoom, userLocation, 2.0, nearbyPOIs.length, trigger); // Longer duration for initial zoom
    
    // Mark that we've applied adaptive zoom for this location
    setHasAppliedInitialAdaptiveZoom(true);
  }, [userLocation, pois, adaptiveZoomEnabled, hasAppliedInitialAdaptiveZoom, lastManualInteraction, lastUserLocation, isSimPlaying, simulationModeReady, urlPoiParam, calculateOptimalInitialZoom, applyAdaptiveZoom]);

  /**
   * Effect: Set simulation mode ready flag after delay
   * Gives simulation mode time to set the user location before applying adaptive zoom
   */
  useEffect(() => {
    if (isSimPlaying && !simulationModeReady) {
      const timer = setTimeout(() => {
        setSimulationModeReady(true);
      }, 1000); // 1 second delay

      return () => clearTimeout(timer);
    }
  }, [isSimPlaying, simulationModeReady]);

    /**
   * Determine marker size based on zoom level and highlight status
   * Larger markers are used when zoomed in (level 15+) to accommodate POI icons
   * 
   * @param isHighlighted - Whether the POI is highlighted/selected
   * @param zoomLevel - Current map zoom level
   * @returns Marker size in pixels
   */
  const getMarkerSize = (isHighlighted: boolean, zoomLevel: number): number => {
    const baseSize = isHighlighted ? 18 : 14; // Base sizes for zoomed out view

    // If zoomed in (zoom level 15 or higher), make markers larger to accommodate POI icons
    if (zoomLevel >= 15) {
      return isHighlighted ? 28 : 24; // Larger sizes for zoomed in view
    }

    return baseSize; // Default size for zoomed out view
  };

  // Map POI id to assigned trail color
  const poiTrailColorMap = useMemo(() => {
    if (!pois || !trailsData) return {};
    const assignments = assignPOIsToTrails(pois, trailsData, 100);
    const colorMap: Record<string, string> = {};
    for (const [trailId, poisForTrail] of Array.from(assignments.entries())) {
      const trail = trailsData.find(t => t.id === trailId);
      const color = trail?.color || '#43D633'; // default to green
      for (const poi of poisForTrail) {
        colorMap[poi.id] = color;
      }
    }
    return colorMap;
  }, [pois, trailsData]);



  /**
   * Get category icon for a POI from WordPress API data
   * Matches POI's primary category with categories data and parses FontAwesome icons
   * 
   * @param poi - The POI to get category icon for
   * @returns Object with iconComponent and iconColor, or null if not found
   */
  const getCategoryIcon = (poi: POI) => {
    // Check if POI has category data
    if (!poi.post_category || !Array.isArray(poi.post_category) || poi.post_category.length === 0) {
      return null;
    }
    
    // Get the first category (primary category)
    const primaryCategory = poi.post_category[0];
    if (!primaryCategory.name) {
      return null;
    }
    
    // Find matching category in our categories data from WordPress API
    const categoryData = categories.find((cat: any) => cat.name === primaryCategory.name);
    if (!categoryData) {
      return null;
    }
    
    // Parse the FontAwesome icon and color from WordPress data
    const iconComponent = parseFontAwesomeIcon(categoryData.fa_icon);
    const iconColor = parseFontAwesomeColor(categoryData.fa_icon_color);
    
    return { iconComponent, iconColor };
  };

  /**
   * Handle opening Google Places modal for a POI
   * Sets the modal state and place ID for displaying business information
   * 
   * @param poi - The POI to show Google Places information for
   */
  const handleOpenGooglePlaces = (poi: POI) => {
    if (poi.google_place_id && poi.google_place_id !== 'none') {
      setSelectedPlaceId(poi.google_place_id);
      setSelectedPoiName(poi.title.rendered);
      setGooglePlacesModalOpen(true);
    }
  };

  useEffect(() => {
    if (fitBounds && mapRef.current && !hasInitialLoad) {
      const map = mapRef.current;
      if (fitBounds.length > 0) {
        // Add a small delay to ensure this runs after any FitBounds component effects
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.fitBounds(fitBounds, { padding: [40, 40], maxZoom: 17 });
          }
        }, 100);
      }
    }
  }, [fitBounds, hasInitialLoad]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Error loading trail data</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* POI Group Labels Toggle */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1000,
          bgcolor: 'rgba(0, 0, 0, 0.8)',
          borderRadius: 2,
          p: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: 'white',
          fontSize: '12px',
          fontWeight: 500,
        }}
      >
        <Box
          component="label"
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            gap: 1,
          }}
        >
          <input
            type="checkbox"
            checked={showPOIGroupLabels}
            onChange={(e) => setShowPOIGroupLabels(e.target.checked)}
            style={{ margin: 0 }}
          />
          Hub Names
        </Box>
      </Box>
      
      <MapContainer
        center={safeCenter}
        zoom={highlightZoom || (shouldFitBounds ? 13 : zoom)} // fallback zoom if no bounds
        style={{ height: '100%', width: '100%' }}
        whenReady={() => {
          // Add a small delay to ensure map is fully ready
                      setTimeout(() => {
            if (mapRef.current && !hasInitialLoad) {
              if (highlightPOI) {
                mapRef.current.setView(safeCenter, highlightZoom || 16);

              } else if (urlGroupName && !focusedGroup) {
                // Handle focused group from URL parameter
                const currentGroupPOIs = pois?.filter(poi => poi.post_tags[0]?.name === urlGroupName) || [];
                
                if (currentGroupPOIs.length >= 3) {
                  // Calculate hull and bounds (same logic as MapView click handler)
                  const pointsLngLat = currentGroupPOIs.map(poi => [poi.coordinates[1], poi.coordinates[0]] as [number, number]);
                  const hullLngLat = mapUtils.convexHull(pointsLngLat);
                  const expandedHullLngLat = mapUtils.expandHullFromCentroid(hullLngLat, 0.0005);
                  
                  // Fix: expandedHullLngLat is already in [lat, lng] format, so use as-is
                  const latLngBounds = expandedHullLngLat;

                  const map = mapRef.current;
                  const boundsObj = L.latLngBounds(latLngBounds as [number, number][]);
                  map.fitBounds(latLngBounds as [number, number][], { padding: [80, 80], maxZoom: 17 });
                  setTimeout(() => {
                    const afterZoom = map.getZoom();
                    if (afterZoom < 16) {
                      const center = boundsObj.getCenter();
                      map.setView(center, 16);
                    }
                  }, 500);
                  
                  setFocusedGroup(urlGroupName);
                  setShowViewList(true);
                  setShowZoomOut(true);
                  setLastBounds(latLngBounds as [number, number][]);
                }
              } else if (shouldFitBounds && allTrailCoords.length > 0 && !isSimPlaying && !focusedGroup && !selectedPOI && !urlPoiParam) {
                // Initial load: use center-based zoom for consistent viewing
                // Only run if there's no POI parameter in the URL
                setTimeout(() => {
                  if (mapRef.current && allTrailCoords.length > 0) {
                    const bounds = L.latLngBounds(allTrailCoords);
                    const center = bounds.getCenter();
                    

                    
                    // Use setView with center and specific zoom level
                    mapRef.current.setView(center, 12, { 
                      animate: true,
                      duration: 1.5
                    });
                    
                    setTimeout(() => {

                    }, 2000);
                  }
                }, 100);
              }
              // Always set hasInitialLoad to true, regardless of whether we zoomed or not
              setHasInitialLoad(true);
            }
          }, 100);
        }}
        ref={mapRef}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          eventHandlers={{
            loading: () => {},
            load: () => {},
            tileerror: (e: any) => {},
          }}
        />
        <GrayscaleMapLayer />
        <Pane name="group-labels" style={{ zIndex: 1000 }} />
        <Pane name="selected-poi" style={{ zIndex: 9999 }} />
        {/* Initial bounds fitting is handled in whenReady callback to avoid conflicts */}
        
        {/* Draw convex hull polygons for each POI group */}
        {Object.entries(groupedPOIs).map(([groupName, groupPOIs], idx) => {
          if (groupPOIs.length < 3) return null;
          if (!groupName || groupName === 'Ungrouped') return null;
          // All calculations in [lng, lat]
          const pointsLngLat = groupPOIs.map(poi => [poi.coordinates[1], poi.coordinates[0]] as [number, number]);
          const hullLngLat = mapUtils.convexHull(pointsLngLat);
          const expandedHullLngLat = mapUtils.expandHullFromCentroid(hullLngLat, 0.0005);
          // Calculate centroid in [lng, lat] for the expanded hull
          const centroidLngLat = expandedHullLngLat.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
          centroidLngLat[0] /= expandedHullLngLat.length;
          centroidLngLat[1] /= expandedHullLngLat.length;
          // For rendering, convert centroid to [lat, lng]
          const centroidLatLng: [number, number] = [centroidLngLat[1], centroidLngLat[0]];
          return (
            <React.Fragment key={groupName}>
              <Polygon
                positions={expandedHullLngLat.map(([lng, lat]) => [lat, lng]) as [number, number][]}
                pathOptions={{
                  color: 'rgba(30,144,255,1)',
                  fillColor: 'rgba(30,144,255,0.5)',
                  fillOpacity: 0.5,
                  weight: 2
                }}
                eventHandlers={{
                  click: () => {
                    if (mapRef.current) {
                      // Fix: expandedHullLngLat is already in [lat, lng] format, so use as-is
                      const latLngBounds = expandedHullLngLat;

                      const map = mapRef.current;
                      const boundsObj = L.latLngBounds(latLngBounds as [number, number][]);

                                              // Update URL to include group parameter (let URL parameter handling do the work)
                        const searchParams = new URLSearchParams(location.search);
                        const modeParam = searchParams.get('mode');
                        
                        const newSearchParams = new URLSearchParams();
                        if (modeParam === 'sim') {
                          newSearchParams.set('mode', 'sim');
                        }
                        newSearchParams.set('group', groupName);
                        
                        const newSearch = newSearchParams.toString();
                        navigate(`/map?${newSearch}`, { replace: true });
                    }
                  }
                }}
              />
              {/* Show group label marker only when not focused on this group and no POI is selected */}
              {focusedGroup !== groupName && showPOIGroupLabels && !selectedPOI && (
                <Marker
                  position={centroidLatLng}
                  pane="group-labels"
                  icon={L.divIcon({
                    className: 'group-label-marker',
                    iconAnchor: [0, 16],
                    html: `<div class='group-label-box' style='z-index:1000; position:relative; color: #636363;'>${groupName}</div>`
                  })}
                  eventHandlers={{
                    click: () => {
                      if (mapRef.current) {
                        // Fix: expandedHullLngLat is already in [lat, lng] format, so use as-is
                        const latLngBounds = expandedHullLngLat;
                        const map = mapRef.current;
                        const boundsObj = L.latLngBounds(latLngBounds as [number, number][]);

                        // Update URL to include group parameter (let URL parameter handling do the work)
                        const searchParams = new URLSearchParams(location.search);
                        const modeParam = searchParams.get('mode');
                        
                        const newSearchParams = new URLSearchParams();
                        if (modeParam === 'sim') {
                          newSearchParams.set('mode', 'sim');
                        }
                        newSearchParams.set('group', groupName);
                        
                        const newSearch = newSearchParams.toString();
                        navigate(`/map?${newSearch}`, { replace: true });
                      }
                    }
                  }}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Draw trails */}
        {trailsWithCoordinates.map((trail, index) => (
          <Polyline
            key={`trail-${index}`}
            positions={trail.coordinates || []}
            pathOptions={{
              color: trail.color || '#1e90ff',
              weight: 4,
              opacity: 0.8
            }}
          />
        ))}

        {/* Draw junctions */}
        {junctions.map((junction, index) => (
          <Marker
            key={`junction-${index}`}
            position={[junction.location[1], junction.location[0]]}
            icon={L.divIcon({
              className: 'junction-marker',
              html: `<div style="
                background-color: white;
                border: 2px solid #666;
                border-radius: 2px;
                width: 12px;
                height: 12px;
                margin-left: -6px;
                margin-top: -6px;
              "></div>`
            })}
          >
            <Popup>
              <Typography variant="body2">
                Junction of {junction.trails.length} trails
              </Typography>
            </Popup>
          </Marker>
        ))}



        {((isSimPlaying && simAnimatedLocation) || (!isSimPlaying && userLocation)) && (
          <Marker
            position={
              isSimPlaying 
                ? (simAnimatedLocation as [number, number]) 
                : userLocation 
                  ? [userLocation[1], userLocation[0]] as [number, number] // Convert [lng, lat] to [lat, lng] for Leaflet
                  : [0, 0] as [number, number]
            }
            icon={userLocationIcon}
          />
        )}

        {/* Entry Point Marker */}
        {entryPoint && (
          <Marker
            position={[entryPoint[0], entryPoint[1]]}
            icon={L.divIcon({
              className: 'entry-point-marker',
              iconAnchor: [12, 12],
              html: `
                <div style="display: flex; flex-direction: column; align-items: center;">
                  <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                    ${ReactDOMServer.renderToString(
                      <FontAwesomeIcon 
                        icon={faMapPin} 
                        style={{ 
                          color: 'white', 
                          fontSize: '20px', 
                          zIndex: 1000, 
                          filter: 'drop-shadow(0 0 2px #1976d2) drop-shadow(0 0 4px #1976d2)' 
                        }} 
                      />
                    )}
                  </div>
                  <!-- <div style="margin-top:4px;background:#fff;color:#4CAF50;font-weight:600;border-radius:6px;padding:2px 8px;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,0.10);white-space:nowrap;z-index:2;pointer-events:none;">Starting Point</div> -->
                </div>
              `
            })}
          />
        )}



        {/* Fixed bottom action bar for View List and Zoom Out when focused on a group */}
        {focusedGroup && (
          <Box
            sx={{
              position: 'fixed',
              left: 0,
              right: '80px', // Leave space for filter button on the right
              bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 16px)', // Match filter button position
              zIndex: 2100,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 2,
              px: 3,
              pb: 2,
              pointerEvents: 'none',
            }}
          >
            <button
              style={{
                width: '45%',
                background: '#fff',
                color: '#1976d2',
                border: '2px solid #1976d2',
                borderRadius: 8,
                padding: '10px 0',
                fontSize: 16,
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                cursor: 'pointer',
                pointerEvents: 'auto',
                marginRight: '2%',
                marginLeft: 2,
              }}
              onClick={() => {
                const tag = getGroupTag(focusedGroup);
                if (tag) {
                  // Preserve simulation mode query parameter if present
                  const searchParams = new URLSearchParams(location.search);
                  const modeParam = searchParams.get('mode');
                  
                  // Create new search params with mode parameter
                  const newSearchParams = new URLSearchParams();
                  if (modeParam === 'sim') {
                    newSearchParams.set('mode', 'sim');
                  }
                  
                  newSearchParams.set('group', focusedGroup);
                  const newSearch = newSearchParams.toString();
                  const listUrl = `/list?${newSearch}`;
                  navigate(listUrl);
                }
              }}
            >
              View List
            </button>
            <button
              style={{
                width: '45%',
                background: '#fff',
                color: '#1976d2',
                border: '2px solid #1976d2',
                borderRadius: 8,
                padding: '10px 0',
                fontSize: 16,
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                cursor: 'pointer',
                pointerEvents: 'auto',
                marginLeft: '2%',
                marginRight: 2,
              }}
              onClick={() => {
                fitTrail();
                setShowViewList(false);
                setShowZoomOut(false);
                setFocusedGroup(null);
                // Remove group parameter from URL
                const searchParams = new URLSearchParams(location.search);
                searchParams.delete('group');
                const newSearch = searchParams.toString();
                const newUrl = `/map${newSearch ? '?' + newSearch : ''}`;
                navigate(newUrl, { replace: true });
              }}
            >
              Zoom Out
            </button>
          </Box>
        )}

        {/* Individual POI Focus Buttons - Same pattern as group focus */}
        {selectedPOI && (
          <Box
            sx={{
              position: 'fixed',
              left: 0,
              right: '80px', // Leave space for filter button on the right
              bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 16px)', // Match filter button position
              zIndex: 2100,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 2,
              px: 3,
              pb: 2,
              pointerEvents: 'none',
            }}
          >
            <button
              style={{
                width: '45%',
                background: '#fff',
                color: '#1976d2',
                border: '2px solid #1976d2',
                borderRadius: 8,
                padding: '10px 0',
                fontSize: 16,
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                cursor: 'pointer',
                pointerEvents: 'auto',
                marginRight: '2%',
                marginLeft: 2,
              }}
              onClick={() => {
                setShowDistanceModal(true);
              }}
            >
              How Far?
            </button>
            <button
              style={{
                width: '45%',
                background: '#fff',
                color: '#1976d2',
                border: '2px solid #1976d2',
                borderRadius: 8,
                padding: '10px 0',
                fontSize: 16,
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                cursor: 'pointer',
                pointerEvents: 'auto',
                marginLeft: '2%',
                marginRight: 2,
              }}
              onClick={() => {
                fitTrail();
                setSelectedPOI(null);
                setHasShownInitialZoom(false);
                // Remove POI parameter from URL
                const newSearchParams = new URLSearchParams(location.search);
                newSearchParams.delete('poi');
                const newSearch = newSearchParams.toString();
                navigate(`/map?${newSearch}`, { replace: true });
              }}
            >
              Zoom Out
            </button>
          </Box>
        )}

        {/* Filter POIs based on selected categories - RENDERED LAST TO APPEAR ABOVE POLYGONS */}
        {pois?.filter(poi => {
          if (!selectedCategories || selectedCategories.length === 0) {
            return true; // Show all POIs if no categories selected
          }
          
          if (!poi.post_category || !Array.isArray(poi.post_category)) {
            return false;
          }
          
          return poi.post_category.some(category => {
            if (!category.name) return false;
            const cleanName = category.name.split('-').pop()?.trim() || category.name;
            return selectedCategories.includes(cleanName);
          });
        }).map((poi, index) => {
          // Check if this POI is highlighted or selected
          const isHighlighted = (highlightPOI && poi.coordinates[1] === highlightPOI[0] && poi.coordinates[0] === highlightPOI[1]) ||
                               (highlightedPOIs && highlightedPOIs.some(highlightedPoi => highlightedPoi.id === poi.id));
          const isSelected = selectedPOI && selectedPOI.id === poi.id;
          const isLabelHighlighted = labelHighlightedPOI && labelHighlightedPOI.id === poi.id;
          
          // Use trail color for marker, or #242424 if label is highlighted or POI is selected
          const markerColor = (isLabelHighlighted || isSelected) ? '#242424' : (poiTrailColorMap[poi.id] || '#43D633');
          
          // Get marker size based on zoom level
          const markerSize = getMarkerSize(isHighlighted, currentZoom);
          const iconAnchor = markerSize / 2; // Center the marker
          
          // Get category icon for this POI from WordPress API
          const categoryIcon = getCategoryIcon(poi);
          
          // Create marker HTML with category icon if available and zoomed in
          let markerHtml = `<div style='width:${markerSize}px;height:${markerSize}px;background:${isHighlighted ? '#e53935' : markerColor};border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.18);`;
          
          // POI icon rendering based on zoom level and category data availability
          
          // Only add flexbox styling and icon if zoomed in (level 15+) and category icon is available
          if (currentZoom >= 15 && categoryIcon && categoryIcon.iconComponent) {

            markerHtml += `display:flex;align-items:center;justify-content:center;'>`;
            
            // Render FontAwesome icon as HTML string with better visibility
            // Icon size scales with marker size but has a minimum of 12px
            const iconSize = Math.max(12, markerSize * 0.6); // Increased from 0.4 to 0.6, minimum 12px
            const iconHtml = ReactDOMServer.renderToString(
              <FontAwesomeIcon 
                icon={categoryIcon.iconComponent} 
                style={{ 
                  color: 'white', // Always white for better contrast against marker background
                  fontSize: `${iconSize}px`
                }} 
              />
            );
            markerHtml += iconHtml;
            markerHtml += '</div>';
          } else {
            // Simple div without flexbox for zoomed out view (no icon displayed)
            markerHtml += `'></div>`;
          }
          
          // Add label for selected POI - wrap marker in container for proper z-index layering
          if (isSelected) {
            markerHtml = `<div style="display: flex; flex-direction: column; align-items: center; z-index: 9999; position: relative;">
              ${markerHtml}
            </div>`;
          }
          
          // Create Leaflet divIcon with custom HTML for POI marker
          let markerIcon = L.divIcon({
            className: isHighlighted ? 'highlight-poi-marker' : 'poi-marker',
            iconSize: [markerSize, markerSize], // Keep original size
            iconAnchor: [iconAnchor, iconAnchor], // Keep original anchor for proper positioning
            html: markerHtml
          });
          
          return (
            <React.Fragment key={`poi-${index}`}>
              <Marker
                position={[poi.coordinates[1], poi.coordinates[0]]}
                icon={markerIcon}
                pane={isSelected ? "selected-poi" : "markerPane"}
                zIndexOffset={isSelected ? 1000 : 0}
                eventHandlers={{
                  click: () => {
                    // Track POI interaction
                    const poiCategory = poi.post_category?.[0]?.name || 'Unknown';
                    const poiGroup = poi.post_tags?.[0]?.name || 'Unknown';
                    
                    trackTrailEvent.poiViewed(poi.title.rendered, poiCategory, poiGroup);
                    trackTrailEvent.businessDiscovered(poi.title.rendered, poiCategory, poiGroup);
                    
                    onPoiClick?.(poi);
                  }
                }}
              />
              {/* Show label only for highlighted or selected POI */}
              {(isLabelHighlighted || isSelected) && (
                <Marker
                  position={[poi.coordinates[1], poi.coordinates[0]]}
                  icon={L.divIcon({
                    className: 'poi-label',
                    iconSize: [1, 1], // Small size to avoid visual marker
                    iconAnchor: [0.5, 0], // Center horizontally, anchor at top
                    html: `<div style="
                      background: ${labelHighlightedPOI && labelHighlightedPOI.id === poi.id ? '#f0f0f0' : 'white'};
                      color: #333;
                      padding: 4px 8px;
                      border-radius: 4px;
                      font-size: 12px;
                      font-weight: bold;
                      margin-top: 30px;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                      white-space: nowrap;
                      text-align: center;
                      z-index: 99999;
                      position: relative;
                      cursor: pointer;
                      display: inline-block;
                      min-width: fit-content;
                      transform: translateX(-50%);
                      transition: all 0.2s ease;
                    ">${poi.title.rendered}</div>`
                  })}
                  pane="selected-poi"
                  zIndexOffset={isSelected ? 1000 : 0}
                  eventHandlers={{
                    mouseover: () => {
                      setLabelHighlightedPOI(poi);
                    },
                    mouseout: () => {
                      setLabelHighlightedPOI(null);
                    },
                    click: () => {
                      // Open Google Places modal when POI label is clicked
                      handleOpenGooglePlaces(poi);
                    }
                  }}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Filter Bottom Sheet */}
        <FilterBottomSheet
          open={filterBottomSheetOpen}
          onClose={() => setFilterBottomSheetOpen(false)}
          onToggle={() => setFilterBottomSheetOpen(!filterBottomSheetOpen)}
          title="Map Filters"
        />

        {/* POI Distance Modal */}
                {showDistanceModal && selectedPOI && (
          <>
            <POIDistanceModal
              poi={selectedPOI}
              onClose={() => setShowDistanceModal(false)}
              onStartNavigation={() => {
                setShowDistanceModal(false);
                // Navigate to Nav View with the POI as destination
                const searchParams = new URLSearchParams();
                searchParams.set('destination', selectedPOI.id);
                
                // Preserve simulation mode if present
                const currentSearchParams = new URLSearchParams(location.search);
                const modeParam = currentSearchParams.get('mode');
                if (modeParam === 'sim') {
                  searchParams.set('mode', 'sim');
                }
                
                const navUrl = `/nav?${searchParams.toString()}`;
                navigate(navUrl);
              }}
            />
          </>
        )}

        {/* Google Places Modal */}
        <GooglePlacesModal
          open={googlePlacesModalOpen}
          onClose={() => setGooglePlacesModalOpen(false)}
          placeId={selectedPlaceId}
          poiName={selectedPoiName}
        />
      </MapContainer>
    </Box>
  );
};