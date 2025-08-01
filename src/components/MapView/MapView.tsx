import React, { useRef, useEffect, useMemo, useState } from 'react';
import ReactDOMServer from 'react-dom/server';
import { MapContainer, TileLayer, Polyline, Marker, Polygon, useMap, Popup, Pane } from 'react-leaflet';
import { Box, CircularProgress, Typography } from '@mui/material';
import { FilterBottomSheet } from '../FilterBottomSheet/FilterBottomSheet';
import './MapView.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleXmark, faMapPin } from '@fortawesome/free-solid-svg-icons';
import { POI, TrailConfig, TrailPoint } from '../../types/index';
import L from 'leaflet';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import { LocationContext } from '../../contexts/LocationContext';
import { GrayscaleMapLayer } from './GrayscaleMapLayer';
import { useTrailsData } from '../../hooks/useTrailsData';
import { useTrailJunctions } from '../../hooks/useTrailJunctions';
import { findNearestTrailPoint } from '../../utils/trail';
import { metersToMiles } from '../../utils/distance';
import { calculateETA } from '../../utils/eta';
import { useUser } from '../../contexts/UserContext';
import * as mapUtils from 'utils/mapUtils';
import { assignPOIsToTrails } from '../../utils/poi';
import { useContext } from 'react';
import { slugToTagName } from '../../utils/poi';
import { useAnalytics } from '../../contexts/AnalyticsContext';
import { useCategories } from '../../hooks/useCategories';
import { parseFontAwesomeIcon, parseFontAwesomeColor } from '../../utils/fontAwesomeParser';

interface MapViewProps {
  trails: TrailConfig[];
  pois?: POI[];
  onPoiClick?: (poi: POI) => void;
  center?: [number, number];
  zoom?: number;
  currentLocation?: [number, number];
  highlightedPOIs?: POI[];
  onZoomChange?: (zoom: number) => void;
  fitBounds?: [number, number][] | null;
}

// Custom hook to fit bounds to trail
const FitBounds: React.FC<{ coordinates: [number, number][] }> = ({ coordinates }) => {
  const map = useMap();
  const [hasInitialFit, setHasInitialFit] = React.useState(false);
  
  React.useEffect(() => {
    if (coordinates.length > 0 && !hasInitialFit) {
      const bounds = L.latLngBounds(coordinates);
      // Use responsive padding that works better on mobile
      const padding: [number, number] = [20, 20]; // Reduced padding for better mobile fit
      map.fitBounds(bounds, { padding, maxZoom: 15 });
      setHasInitialFit(true);
    }
  }, [coordinates, map, hasInitialFit]);

  return null;
};

// Helper: Check if a point is inside a polygon (ray-casting algorithm)
function pointInPolygon(point: [number, number], polygon: [number, number][]) {
  let [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i][0], yi = polygon[i][1];
    let xj = polygon[j][0], yj = polygon[j][1];
    let intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Helper: Check if a point is near a polyline (trail)
function pointNearPolyline(point: [number, number], polyline: [number, number][], threshold = 0.0005) {
  let minDist = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const [x1, y1] = polyline[i];
    const [x2, y2] = polyline[i + 1];
    // Project point onto segment
    const A = point[0] - x1;
    const B = point[1] - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = len_sq !== 0 ? dot / len_sq : -1;
    let xx, yy;
    if (param < 0) {
      xx = x1; yy = y1;
    } else if (param > 1) {
      xx = x2; yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    const dx = point[0] - xx;
    const dy = point[1] - yy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) minDist = dist;
  }
  return minDist < threshold;
}

// Helper: Estimate label width in pixels (font size 14px, bold, padding 2px 8px)
function estimateLabelSize(text: string) {
  const charWidth = 8; // average width for bold 14px font
  const padding = 16; // 8px left + 8px right
  const height = 20; // 14px font + padding
  return {
    width: text.length * charWidth + padding,
    height
  };
}

// Helper: Convert pixel size to map degrees (approximate, latitude only)
function pixelsToLatLng(width: number, height: number, lat: number, zoom: number) {
  // 256 * 2^zoom pixels = 360 degrees
  const scale = 256 * Math.pow(2, zoom) / 360;
  const degPerPx = 1 / scale;
  return {
    dLat: degPerPx * height,
    dLng: degPerPx * width / Math.cos(lat * Math.PI / 180)
  };
}

// Helper: Check if label bounding box overlaps hull or is near trail
function labelBoxOverlaps(labelPos: [number, number], size: {width: number, height: number}, hull: [number, number][], trail: [number, number][], zoom: number) {
  // Get box corners (anchor is left-middle)
  const { dLat, dLng } = pixelsToLatLng(size.width, size.height, labelPos[0], zoom);
  const boxCorners: [number, number][] = [
    [labelPos[0] - dLat/2, labelPos[1]], // left-middle
    [labelPos[0] - dLat/2, labelPos[1] + dLng], // right-middle
    [labelPos[0] + dLat/2, labelPos[1] + dLng], // right-bottom
    [labelPos[0] + dLat/2, labelPos[1]], // left-bottom
  ];
  // Check if any corner is inside hull or near trail
  return boxCorners.some(corner => pointInPolygon(corner, hull) || pointNearPolyline(corner, trail));
}

// Helper: Check if a pixel box overlaps a pixel polygon or is near a pixel polyline
function pixelBoxOverlaps(box: {x: number, y: number, width: number, height: number}, hullPx: {x: number, y: number}[], trailPx: {x: number, y: number}[]) {
  // Check if any box corner is inside hull polygon
  const corners = [
    {x: box.x, y: box.y},
    {x: box.x + box.width, y: box.y},
    {x: box.x + box.width, y: box.y + box.height},
    {x: box.x, y: box.y + box.height}
  ];
  if (corners.some(corner => pointInPolygonPx(corner, hullPx))) return true;
  // Check if any box edge is near trail polyline
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i], b = corners[(i+1)%corners.length];
    if (polylineNearSegment(trailPx, a, b, 8)) return true; // 8px threshold
  }
  return false;
}

// Helper: Point-in-polygon in pixel space
function pointInPolygonPx(point: {x: number, y: number}, polygon: {x: number, y: number}[]) {
  let {x, y} = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i].x, yi = polygon[i].y;
    let xj = polygon[j].x, yj = polygon[j].y;
    let intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Helper: Check if a polyline is near a segment (in px)
function polylineNearSegment(polyline: {x: number, y: number}[], a: {x: number, y: number}, b: {x: number, y: number}, threshold: number) {
  for (let i = 0; i < polyline.length - 1; i++) {
    if (segmentsClose(a, b, polyline[i], polyline[i+1], threshold)) return true;
  }
  return false;
}

// Helper: Check if two segments are closer than threshold (in px)
function segmentsClose(a1: {x: number, y: number}, a2: {x: number, y: number}, b1: {x: number, y: number}, b2: {x: number, y: number}, threshold: number) {
  // Check endpoints and midpoints
  const points = [a1, a2, b1, b2, midpoint(a1, a2), midpoint(b1, b2)];
  for (let p of points) {
    if (pointToSegmentDist(p, a1, a2) < threshold || pointToSegmentDist(p, b1, b2) < threshold) return true;
  }
  return false;
}

function midpoint(a: {x: number, y: number}, b: {x: number, y: number}) {
  return {x: (a.x + b.x)/2, y: (a.y + b.y)/2};
}

function pointToSegmentDist(p: {x: number, y: number}, a: {x: number, y: number}, b: {x: number, y: number}) {
  const l2 = (a.x-b.x)**2 + (a.y-b.y)**2;
  if (l2 === 0) return Math.hypot(p.x-a.x, p.y-a.y);
  let t = ((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x-(a.x+t*(b.x-a.x)), p.y-(a.y+t*(b.y-a.y)));
}

export const MapView: React.FC<MapViewProps> = ({
  trails,
  pois,
  onPoiClick,
  center = [34.8526, -82.3940],
  zoom = 13,
  currentLocation,
  highlightedPOIs,
  onZoomChange,
  fitBounds
}) => {
  const { categories } = useCategories(); // Add categories hook
  const { trackTrailEvent } = useAnalytics();
  const location = useRouterLocation();
  const mapRef = useRef<L.Map | null>(null);
  const locationContext = useContext(LocationContext);
  const { locomotionMode, selectedCategories } = useUser();
  const navigate = useNavigate();
  
  // Use the location from context if available, otherwise fall back to prop
  const userLocation = locationContext?.currentLocation || currentLocation;
  const entryPoint = locationContext?.entryPoint;
  const isSimPlaying = locationContext?.isSimPlaying || false;
  const simAnimatedLocation = locationContext?.simAnimatedLocation;
  

  
  const [focusedGroup, setFocusedGroup] = useState<string | null>(null);
  const [showViewList, setShowViewList] = useState(false);
  const [showZoomOut, setShowZoomOut] = useState(false);
  const [lastBounds, setLastBounds] = useState<[number, number][]>([]);
  const [showPOIGroupLabels, setShowPOIGroupLabels] = useState(true);
  const [filterBottomSheetOpen, setFilterBottomSheetOpen] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(zoom);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [hasShownInitialZoom, setHasShownInitialZoom] = useState(false);
  const [isProgrammaticZoom, setIsProgrammaticZoom] = useState(false);
  const [labelHighlightedPOI, setLabelHighlightedPOI] = useState<POI | null>(null);

  const { data: trailsData, isLoading, isError } = useTrailsData(trails);

  // Find trail junctions with a higher threshold (20 meters)
  const junctions = useTrailJunctions(
    trailsData?.map(data => ({
      id: data.id,
      points: data.points
    })) || [],
    20 // Increased threshold from 10 to 20 meters
  );

  // Transform trail data to include coordinates
  const trailsWithCoordinates = useMemo(() => {
    return trails.map((trail, index) => {
      const trailData = trailsData[index];
      return {
        ...trail,
        coordinates: trailData?.points.map(point => [point.latitude, point.longitude] as [number, number]) || []
      };
    });
  }, [trails, trailsData]);

  // Get highlightPOI from navigation state
  const { highlightPOI, highlightZoom } = location.state || {};
 

 
  // Get focusedGroup and POI from URL parameters
  const searchParams = new URLSearchParams(location.search);
  const urlGroupParam = searchParams.get('group');
  const urlPoiParam = searchParams.get('poi');
  
  // Convert URL group parameter to group name if it's a slug
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
        setShowViewList(true);
        setShowZoomOut(true);
        setLastBounds(latLngBounds as [number, number][]);
      }
    }
  }, [urlGroupName, focusedGroup, pois]);

  // Handle URL parameter changes for POI selection
  useEffect(() => {
    console.log('🔍 POI Navigation Debug:', {
      urlPoiParam,
      poisCount: pois?.length,
      mapRefExists: !!mapRef.current,
      selectedPOI: !!selectedPOI,
      hasInitialLoad,
      poisLoaded: !!pois
    });
    
    if (urlPoiParam && pois && pois.length > 0 && mapRef.current && !selectedPOI && hasInitialLoad) {
      const targetPOI = pois.find(poi => poi.id.toString() === urlPoiParam);
      
      if (targetPOI) {
        console.log('🎯 Found target POI:', targetPOI.title.rendered, 'ID:', targetPOI.id);
        console.log('📍 POI coordinates:', targetPOI.coordinates);
        
        // Check if coordinates are valid
        if (!targetPOI.coordinates || targetPOI.coordinates.length !== 2 || 
            isNaN(targetPOI.coordinates[0]) || isNaN(targetPOI.coordinates[1])) {
          console.log('❌ Invalid POI coordinates:', targetPOI.coordinates);
          return;
        }
        
        setSelectedPOI(targetPOI);
        setHasShownInitialZoom(true);
        
        // Direct zoom to the POI with smooth animation
        const poiCoords: [number, number] = [targetPOI.coordinates[1], targetPOI.coordinates[0]]; // [latitude, longitude] for Leaflet
        console.log('🎯 Zooming to coordinates:', poiCoords);
        
        console.log('🔍 Zooming directly to POI at level 18');
        setIsProgrammaticZoom(true);
        
        // Add a small delay to ensure the map is fully ready
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.setView(poiCoords, 18, { animate: true, duration: 2 });
            console.log('✅ Direct zoom completed');
          }
        }, 100);
        
        // Reset the flag after a short delay to allow the zoom to complete
        setTimeout(() => setIsProgrammaticZoom(false), 1000);
      } else {
        console.log('❌ POI not found for ID:', urlPoiParam);
        console.log('Available POI IDs:', pois.map(p => p.id));
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
  useEffect(() => {
    if (!mapRef.current || !selectedPOI) return;
    
    const map = mapRef.current;
    const handleMapInteraction = () => {
      // Don't clear selected POI if we're in the middle of a programmatic zoom
      if (selectedPOI && !isProgrammaticZoom) {
        setSelectedPOI(null);
        setHasShownInitialZoom(false);
        // Remove POI parameter from URL
        const newSearchParams = new URLSearchParams(location.search);
        newSearchParams.delete('poi');
        const newSearch = newSearchParams.toString();
        navigate(`/map?${newSearch}`, { replace: true });
      }
    };
    
    map.on('moveend', handleMapInteraction);
    map.on('zoomend', handleMapInteraction);
    
    return () => {
      map.off('moveend', handleMapInteraction);
      map.off('zoomend', handleMapInteraction);
    };
  }, [selectedPOI, location.search, navigate, isProgrammaticZoom]);
 
  // Group POIs by their first post tag
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

  // Get all trail coordinates for bounds fitting
  const allTrailCoords = useMemo(() => {
    return trailsWithCoordinates.flatMap(trail => trail.coordinates || []);
  }, [trailsWithCoordinates]);

  // Determine if we should fit bounds
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

  // Create custom icons
  const highlightIcon = new L.DivIcon({
    className: 'highlight-poi-marker',
    iconAnchor: [8, 8],
    html: `<div style="display:flex;align-items:center;">
      <div style='width:14px;height:14px;background:#e53935;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.15);'></div>
      <div style='margin-left:8px;padding:2px 8px;background:#fff;border-radius:4px;font-size:14px;font-weight:bold;color:#333;box-shadow:0 1px 4px rgba(0,0,0,0.10);white-space:nowrap;'>POI_LABEL</div>
    </div>`
  });

  const defaultIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  // Create a custom React component for the user location marker
  const UserLocationMarker = () => (
    <div style={{
      position: 'relative',
      width: '24px',
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <FontAwesomeIcon 
        icon={faCircleXmark} 
        style={{ 
          color: 'white', 
          fontSize: '20px',
          zIndex: 1000,
          filter: 'drop-shadow(0 0 2px #1976d2) drop-shadow(0 0 4px #1976d2)'
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

  const poiIcon = L.divIcon({
    className: 'poi-marker',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    html: `<div style='width:12px;height:12px;background:#00ff00;border-radius:50%;border:2px solid #fff;'></div>`
  });

  // Helper to get group post_tag by name
  const getGroupTag = (groupName: string) => {
    const groupPOI = pois?.find(poi => poi.post_tags[0]?.name === groupName);
    return groupPOI?.post_tags[0]?.id;
  };

  // Helper to fit map to trail
  const fitTrail = () => {
    if (mapRef.current && allTrailCoords.length > 0) {
      mapRef.current.fitBounds(allTrailCoords as [number, number][]);
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
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const handleZoom = () => {
      const newZoom = map.getZoom();
      console.log(`🗺️ Zoom changed to: ${newZoom}`);
      setCurrentZoom(newZoom);
      if (onZoomChange) {
        onZoomChange(newZoom);
      }
    };
    map.on('zoomend', handleZoom);
    // Call once on mount
    const initialZoom = map.getZoom();
    console.log(`🗺️ Initial zoom: ${initialZoom}`);
    setCurrentZoom(initialZoom);
    if (onZoomChange) {
      onZoomChange(initialZoom);
    }
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [mapRef.current]); // Run when mapRef.current changes (when map is created)

    // Function to determine marker size based on zoom level
  const getMarkerSize = (isHighlighted: boolean, zoomLevel: number): number => {
    const baseSize = isHighlighted ? 18 : 14; // Increased base sizes

    // If zoomed in (zoom level 15 or higher), make markers larger
    if (zoomLevel >= 15) {
      console.log(`🔍 Zoom level ${zoomLevel}: Using large markers (${isHighlighted ? 28 : 24}px)`);
      return isHighlighted ? 28 : 24; // Increased from 24/20 to 28/24
    }

    console.log(`🔍 Zoom level ${zoomLevel}: Using small markers (${baseSize}px)`);
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

  // Helper: Get the trail color for a POI group by majority
  const getGroupTrailColor = (groupPOIs: any[]): string => {
    if (!groupPOIs || groupPOIs.length === 0 || !trails) return '#84d2cf'; // fallback accent
    // Count trailId occurrences
    const trailIdCounts: Record<string, number> = {};
    groupPOIs.forEach((poi: any) => {
      const trailId = poi.trailId || poi.trail_id || poi.trail_id_main || poi.trail_id_spur; // try common fields
      if (trailId) {
        trailIdCounts[trailId] = (trailIdCounts[trailId] || 0) + 1;
      }
    });
    // Find the most common trailId
    let maxCount = 0;
    let majorityTrailId: string | null = null;
    for (const [trailId, count] of Object.entries(trailIdCounts)) {
      const countNum = typeof count === 'number' ? count : Number(count);
      if (countNum > maxCount) {
        maxCount = countNum;
        majorityTrailId = trailId;
      }
    }
    // Find the color for the majority trail
    const trail = trails.find(t => t.id === majorityTrailId || t.routeId === majorityTrailId);
    return trail?.color || '#84d2cf';
  };

  // Helper function to get category icon for a POI
  const getCategoryIcon = (poi: POI) => {
    if (!poi.post_category || !Array.isArray(poi.post_category) || poi.post_category.length === 0) {
      return null;
    }
    
    // Get the first category (primary category)
    const primaryCategory = poi.post_category[0];
    if (!primaryCategory.name) {
      return null;
    }
    
    // Find matching category in our categories data
    const categoryData = categories.find((cat: any) => cat.name === primaryCategory.name);
    if (!categoryData) {
      return null;
    }
    
    // Parse the FontAwesome icon
    const iconComponent = parseFontAwesomeIcon(categoryData.fa_icon);
    const iconColor = parseFontAwesomeColor(categoryData.fa_icon_color);
    
    return { iconComponent, iconColor };
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
                console.log('MapView whenReady: URL parameter handling - urlGroupName:', urlGroupName, 'focusedGroup:', focusedGroup);
              } else if (shouldFitBounds && allTrailCoords.length > 0 && !isSimPlaying && !focusedGroup) {
                // Fallback: ensure bounds fitting happens on initial load
                setTimeout(() => {
                  if (mapRef.current && allTrailCoords.length > 0) {
                    const bounds = L.latLngBounds(allTrailCoords);
                    mapRef.current.fitBounds(bounds, { padding: [20, 20] as [number, number], maxZoom: 15 });
                  }
                }, 100);
              }
              console.log('✅ Map initialized, setting hasInitialLoad to true');
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
        {/* Always fit bounds to all trails if shouldFitBounds is true and no group is focused */}
        {shouldFitBounds && allTrailCoords.length > 0 && !isSimPlaying && !focusedGroup && (
          <FitBounds coordinates={allTrailCoords} />
        )}
        
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
          // Get the group color by majority trail
          const groupColor = getGroupTrailColor(groupPOIs);
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
              {/* Show group label marker only when not focused on this group */}
              {focusedGroup !== groupName && showPOIGroupLabels && (
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
          console.log(`📍 Creating marker for ${poi.title.rendered}: size=${markerSize}px, zoom=${currentZoom}, highlighted=${isHighlighted}`);
          
          // Get category icon for this POI
          const categoryIcon = getCategoryIcon(poi);
          if (currentZoom >= 15 && categoryIcon && categoryIcon.iconComponent) {
            console.log(`🎯 Adding category icon to ${poi.title.rendered}: ${categoryIcon.iconComponent.iconName}, color: ${categoryIcon.iconColor}`);
          }
          
          // Create marker HTML with category icon if available and zoomed in
          let markerHtml = `<div style='width:${markerSize}px;height:${markerSize}px;background:${isHighlighted ? '#e53935' : markerColor};border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.18);`;
          
          // Only add flexbox styling and icon if zoomed in (level 15+)
          if (currentZoom >= 15 && categoryIcon && categoryIcon.iconComponent) {
            markerHtml += `display:flex;align-items:center;justify-content:center;'>`;
            // Render FontAwesome icon as HTML string with better visibility
            const iconSize = Math.max(12, markerSize * 0.6); // Increased from 0.4 to 0.6, minimum 12px
            const iconHtml = ReactDOMServer.renderToString(
              <FontAwesomeIcon 
                icon={categoryIcon.iconComponent} 
                style={{ 
                  color: 'white', // Always white, ignore category color
                  fontSize: `${iconSize}px`
                }} 
              />
            );
            markerHtml += iconHtml;
            markerHtml += '</div>';
          } else {
            // Simple div without flexbox for zoomed out view
            markerHtml += `'></div>`;
          }
          
          // Add label for selected POI
          if (isSelected) {
            markerHtml = `<div style="display: flex; flex-direction: column; align-items: center; z-index: 9999; position: relative;">
              ${markerHtml}
            </div>`;
          }
          
          let markerIcon = L.divIcon({
            className: isHighlighted ? 'highlight-poi-marker' : 'poi-marker',
            iconSize: [markerSize, markerSize], // Keep original size
            iconAnchor: [iconAnchor, iconAnchor], // Keep original anchor
            html: markerHtml
          });
          
          return (
            <React.Fragment key={`poi-${index}`}>
              <Marker
                position={[poi.coordinates[1], poi.coordinates[0]]}
                icon={markerIcon}
                pane={isSelected ? "selected-poi" : "markerPane"}
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
                  eventHandlers={{
                    mouseover: () => {
                      setLabelHighlightedPOI(poi);
                    },
                    mouseout: () => {
                      setLabelHighlightedPOI(null);
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
      </MapContainer>
    </Box>
  );
};