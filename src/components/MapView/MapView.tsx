import React, { useRef, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Polygon, useMap, Popup, Pane } from 'react-leaflet';
import { Box, CircularProgress, Typography } from '@mui/material';
import { POI, TrailConfig, TrailPoint } from '../../types/index';
import L from 'leaflet';
import { useTrailsData } from '../../hooks/useTrailsData';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import { useLocation as useAppLocation } from '../../hooks/useLocation';
import { GrayscaleMapLayer } from './GrayscaleMapLayer';
import StarIcon from '@mui/icons-material/Star';
import { useTrailData } from '../../hooks/useTrailData';
import { findNearestTrailPoint } from '../../utils/trail';
import { metersToMiles } from '../../utils/distance';
import { calculateETA } from '../../utils/eta';
import { useUser } from '../../contexts/UserContext';
import * as mapUtils from 'utils/mapUtils';

interface TrailData {
  points: TrailPoint[];
  color: string;
}

// Custom hook to fit bounds to trail
const FitBounds: React.FC<{ coordinates: [number, number][] }> = ({ coordinates }) => {
  const map = useMap();
  
  React.useEffect(() => {
    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coordinates, map]);

  return null;
};

interface MapViewProps {
  trails: TrailConfig[];
  pois?: POI[];
  onPoiClick?: (poi: POI) => void;
  center?: [number, number];
  zoom?: number;
  currentLocation?: [number, number];
}

// Convex hull algorithm (Graham scan, suitable for small sets)
function convexHull(points: [number, number][]): [number, number][] {
  if (points.length < 4) return points;
  // Sort by x, then y
  points = points.slice().sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of points) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

// Expand hull points outward from centroid by a fixed distance (in degrees)
function expandHullFixed(hull: [number, number][], distance: number = 0.003): [number, number][] {
  if (hull.length === 0) return hull;
  // Calculate centroid
  const centroid = hull.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
  centroid[0] /= hull.length;
  centroid[1] /= hull.length;
  // Expand each point
  return hull.map(([lat, lng]) => {
    const dLat = lat - centroid[0];
    const dLng = lng - centroid[1];
    const length = Math.sqrt(dLat * dLat + dLng * dLng);
    if (length === 0) return [lat, lng];
    const scale = (length + distance) / length;
    return [centroid[0] + dLat * scale, centroid[1] + dLng * scale];
  });
}

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

// Helper: Find the farthest hull point from centroid
function farthestHullPoint(hull: [number, number][], centroid: [number, number]) {
  return hull.reduce((max, p) => {
    const d = Math.hypot(p[0] - centroid[0], p[1] - centroid[1]);
    return d > max.dist ? { point: p, dist: d } : max;
  }, { point: hull[0], dist: 0 }).point;
}

// Helper: Find nearest hull point to a given point
function nearestHullPoint(hull: [number, number][], pt: [number, number]) {
  return hull.reduce((min, p) => {
    const d = Math.hypot(p[0] - pt[0], p[1] - pt[1]);
    return d < min.dist ? { point: p, dist: d } : min;
  }, { point: hull[0], dist: Infinity }).point;
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
  currentLocation
}) => {
  const location = useRouterLocation();
  const mapRef = useRef<L.Map | null>(null);
  const { data: trailsData, isLoading, isError } = useTrailsData(trails);
  const { currentLocation: userLocation, entryPoint } = useAppLocation();
  const { locomotionMode } = useUser();
  const navigate = useNavigate();
  const [focusedGroup, setFocusedGroup] = useState<string | null>(null);
  const [showViewList, setShowViewList] = useState(false);
  const [showZoomOut, setShowZoomOut] = useState(false);
  const [lastBounds, setLastBounds] = useState<[number, number][]>([]);

  // Get highlightPOI from navigation state
  const { highlightPOI, highlightZoom } = location.state || {};

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
    if (!trailsData) return [];
    return trailsData.flatMap(trail => 
      trail.points.map(point => [point.latitude, point.longitude] as [number, number])
    );
  }, [trailsData]);

  // Determine if we should fit bounds
  const shouldFitBounds = useMemo(() => {
    // If we have trail data and we're not highlighting a POI, fit bounds
    return trailsData && trailsData.length > 0 && !highlightPOI;
  }, [trailsData, highlightPOI]);

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

  const userLocationIcon = new L.DivIcon({
    className: 'pulse-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `
      <div class="pulse-marker-inner"></div>
      <div class="pulse-marker-outer"></div>
    `
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
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onMove = () => {
      if (focusedGroup && lastBounds.length > 0) {
        const bounds = L.latLngBounds(lastBounds);
        if (!map.getBounds().contains(bounds)) {
          setShowViewList(false);
          setShowZoomOut(false);
          setFocusedGroup(null);
        }
      }
    };
    map.on('moveend', onMove);
    return () => { map.off('moveend', onMove); };
  }, [focusedGroup, lastBounds]);

  return (
    <Box sx={{ height: '100vh', width: '100%', position: 'relative' }}>
      {isLoading ? (
        <Box sx={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          zIndex: 1000
        }}>
          <CircularProgress />
        </Box>
      ) : (
        <MapContainer
          center={safeCenter}
          zoom={highlightZoom || zoom}
          style={{ height: '100%', width: '100%' }}
          whenReady={() => {
            if (mapRef.current) {
              if (highlightPOI) {
                mapRef.current.setView(safeCenter, highlightZoom || 16);
              }
            }
          }}
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <GrayscaleMapLayer />
          <Pane name="group-labels" style={{ zIndex: 1000 }} />
          {shouldFitBounds && allTrailCoords.length > 0 && (
            <FitBounds coordinates={allTrailCoords} />
          )}
          
          {/* Draw convex hull polygons for each POI group */}
          {Object.entries(groupedPOIs).map(([groupName, groupPOIs], idx) => {
            if (groupPOIs.length < 3) return null;
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
                        const latLngBounds = expandedHullLngLat.map(([lng, lat]) => [lat, lng]);
                        console.log('Zooming to group:', groupName, 'Bounds:', latLngBounds);
                        const map = mapRef.current;
                        console.log('Before fitBounds: zoom', map.getZoom(), 'bounds', map.getBounds());
                        const boundsObj = L.latLngBounds(latLngBounds as [number, number][]);
                        console.log('L.latLngBounds:', boundsObj);
                        map.fitBounds(latLngBounds as [number, number][], { padding: [20, 20], maxZoom: 18 });
                        setTimeout(() => {
                          const afterZoom = map.getZoom();
                          const afterBounds = map.getBounds();
                          console.log('After fitBounds: zoom', afterZoom, 'bounds', afterBounds);
                          if (afterZoom < 16) {
                            const center = boundsObj.getCenter();
                            map.setView(center, 16);
                            console.log('Force zoom to 16 at center', center);
                          }
                        }, 500);
                        setFocusedGroup(groupName);
                        setShowViewList(true);
                        setShowZoomOut(true);
                        setLastBounds(latLngBounds as [number, number][]);
                      }
                    }
                  }}
                />
                {/* Centered group label */}
                <Marker
                  position={centroidLatLng}
                  pane="group-labels"
                  icon={L.divIcon({
                    className: 'group-label-marker',
                    iconAnchor: [0, 16],
                    html: `<div class='group-label-box' style='z-index:1000; position:relative;'>${groupName}</div>`
                  })}
                  eventHandlers={{
                    click: () => {
                      if (mapRef.current) {
                        const latLngBounds = expandedHullLngLat.map(([lng, lat]) => [lat, lng]);
                        console.log('Zooming to group:', groupName, 'Bounds:', latLngBounds);
                        const map = mapRef.current;
                        console.log('Before fitBounds: zoom', map.getZoom(), 'bounds', map.getBounds());
                        const boundsObj = L.latLngBounds(latLngBounds as [number, number][]);
                        console.log('L.latLngBounds:', boundsObj);
                        map.fitBounds(latLngBounds as [number, number][], { padding: [20, 20], maxZoom: 18 });
                        setTimeout(() => {
                          const afterZoom = map.getZoom();
                          const afterBounds = map.getBounds();
                          console.log('After fitBounds: zoom', afterZoom, 'bounds', afterBounds);
                          if (afterZoom < 16) {
                            const center = boundsObj.getCenter();
                            map.setView(center, 16);
                            console.log('Force zoom to 16 at center', center);
                          }
                        }, 500);
                        setFocusedGroup(groupName);
                        setShowViewList(true);
                        setShowZoomOut(true);
                        setLastBounds(latLngBounds as [number, number][]);
                      }
                    }
                  }}
                />
                {/* View List button below label */}
                {focusedGroup === groupName && showViewList && (
                  <Marker
                    position={[centroidLatLng[0] - 0.00015, centroidLatLng[1]]}
                    pane="group-labels"
                    icon={L.divIcon({
                      className: 'view-list-btn',
                      iconAnchor: [60, -10],
                      html: `<button style='background:#1976d2;color:#fff;border:none;border-radius:6px;padding:6px 18px;font-size:15px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.15);cursor:pointer;'>View List</button>`
                    })}
                    eventHandlers={{
                      click: () => {
                        const tag = getGroupTag(groupName);
                        if (tag) {
                          navigate('/list', { state: { group: groupName, tag } });
                        }
                      }
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}

          {trailsData?.map((trail: TrailData, index: number) => (
            <Polyline
              key={`trail-${index}`}
              positions={trail.points.map(point => [point.latitude, point.longitude] as [number, number])}
              pathOptions={{
                color: trail.color || '#1e90ff',
                weight: 4,
                opacity: 0.8
              }}
            />
          ))}

          {pois?.map((poi, index) => {
            const isHighlighted = highlightPOI && poi.coordinates[1] === highlightPOI[0] && poi.coordinates[0] === highlightPOI[1];
            let markerIcon = poiIcon;
            if (isHighlighted) {
              markerIcon = new L.DivIcon({
                className: 'highlight-poi-marker',
                iconAnchor: [8, 8],
                html: `<div style="display:flex;align-items:center;">
                  <div style='width:16px;height:16px;background:#e53935;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.18);margin-right:4px;z-index:2;'></div>
                  <div style='padding:2px 8px;background:#fff;border-radius:4px;font-size:14px;font-weight:bold;color:#333;box-shadow:0 1px 4px rgba(0,0,0,0.10);white-space:nowrap;z-index:1;'>${poi.title.rendered}</div>
                </div>`
              });
            }
            return (
              <Marker
                key={`poi-${index}`}
                position={[poi.coordinates[1], poi.coordinates[0]]}
                icon={markerIcon}
                eventHandlers={{
                  click: () => onPoiClick?.(poi)
                }}
              >
                <Popup>
                  <Box sx={{ p: 1 }}>
                    <Typography variant="h6" component="div" sx={{ mb: 1 }}>
                      {poi.title.rendered}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {poi.content.rendered}
                    </Typography>
                  </Box>
                </Popup>
              </Marker>
            );
          })}

          {userLocation && (
            <Marker
              position={[userLocation[0], userLocation[1]]}
              icon={userLocationIcon}
            />
          )}

          {/* Entry Point Marker */}
          {entryPoint && (
            <Marker
              position={[entryPoint[0], entryPoint[1]]}
              icon={L.divIcon({
                className: 'entry-point-marker',
                iconAnchor: [8, 8],
                html: `
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <div style=\"width:16px;height:16px;background:#e91e63;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.15);z-index:2;\"></div>
                    <div style=\"margin-top:4px;background:#fff;color:#e91e63;font-weight:600;border-radius:6px;padding:2px 8px;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,0.10);white-space:nowrap;z-index:2;pointer-events:none;\">Starting Point</div>
                  </div>
                `
              })}
            />
          )}

          {/* Zoom Out button at bottom center */}
          {showZoomOut && (
            <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 80, display: 'flex', justifyContent: 'center', zIndex: 1200 }}>
              <button
                style={{ background: '#fff', color: '#1976d2', border: '2px solid #1976d2', borderRadius: 8, padding: '10px 28px', fontSize: 16, fontWeight: 'bold', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', cursor: 'pointer' }}
                onClick={() => {
                  fitTrail();
                  setShowViewList(false);
                  setShowZoomOut(false);
                  setFocusedGroup(null);
                }}
              >
                Zoom Out
              </button>
            </Box>
          )}
        </MapContainer>
      )}
    </Box>
  );
};