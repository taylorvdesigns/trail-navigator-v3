import React, { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Polygon, useMap, Popup } from 'react-leaflet';
import { Box, CircularProgress } from '@mui/material';
import { POI, TrailConfig, TrailPoint } from '../../types/index';
import L from 'leaflet';
import { useTrailsData } from '../../hooks/useTrailsData';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import { useLocation as useAppLocation } from '../../hooks/useLocation';
import { GrayscaleMapLayer } from './GrayscaleMapLayer';
import { SimulationControl } from '../SimulationControl/SimulationControl';
import StarIcon from '@mui/icons-material/Star';
import { useTrailData } from '../../hooks/useTrailData';
import { findNearestTrailPoint } from '../../utils/trail';
import { metersToMiles } from '../../utils/distance';
import { calculateETA } from '../../utils/eta';
import { useUser } from '../../contexts/UserContext';

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

export const MapView: React.FC<MapViewProps> = ({
  trails,
  pois,
  onPoiClick,
  center = [34.8526, -82.3940],
  zoom = 13,
  currentLocation
}) => {
  const { data: trailsData, isLoading } = useTrailsData(trails);
  const location = useRouterLocation();
  const navigate = useNavigate();
  const { isSimulationMode } = useAppLocation();
  const mapRef = useRef<L.Map>(null);
  const { locomotionMode } = useUser();

  console.log('MapView render:', { trails, trailsData, isLoading, pois });

  const safeCenter: [number, number] = (Array.isArray(center) && center.length === 2 && 
    typeof center[0] === 'number' && typeof center[1] === 'number')
    ? [center[0], center[1]]
    : [34.8526, -82.3940];

  // Determine if we should fit bounds (only if safeCenter/zoom are default)
  const shouldFitBounds =
    (safeCenter[0] === 34.8526 && safeCenter[1] === -82.3940 && zoom === 13) &&
    trailsData && trailsData.length > 0;

  // Gather all trail points for bounds
  const allTrailCoords: [number, number][] = shouldFitBounds
    ? trailsData.flatMap((trail: any) => trail.points.map((pt: any) => [pt.latitude, pt.longitude]))
    : [];

  // Get highlightPOI from navigation state
  const highlightPOI = (location.state as { highlightPOI?: [number, number] })?.highlightPOI;

  // Custom icon for highlighted POI
  const highlightIcon = new L.Icon({
    iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  // Default icon for regular POIs
  const defaultIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const greenCircleIcon = L.divIcon({
    className: 'custom-green-poi-marker',
    iconSize: [8, 8],
    iconAnchor: [4, 4],
    popupAnchor: [0, -4],
    html: `<div class="green-poi-marker"></div>`
  });

  // Calculate ETA if we have trail data and current location
  const eta = React.useMemo(() => {
    if (!trailsData?.[0]?.points || !currentLocation) return null;
    const nearestPoint = findNearestTrailPoint(currentLocation, trailsData[0].points);
    if (!nearestPoint) return null;
    return calculateETA(nearestPoint.distance || 0, locomotionMode);
  }, [trailsData, currentLocation, locomotionMode]);

  // Group POIs by first post_tag
  const groupedPOIs: Record<string, POI[]> = {};
  if (pois) {
    pois.forEach((poi) => {
      const group = poi.post_tags[0]?.name || 'Ungrouped';
      if (!groupedPOIs[group]) groupedPOIs[group] = [];
      groupedPOIs[group].push(poi);
    });
  }

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
    }
  }, []);

  return (
    <Box sx={{ 
      height: '100%', 
      width: '100%', 
      position: 'relative',
      minHeight: '400px' // Ensure minimum height
    }}>
      {isLoading ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%' 
        }}>
          <CircularProgress />
        </Box>
      ) : (
        <MapContainer
          center={safeCenter}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <GrayscaleMapLayer />
          <SimulationControl />
          {shouldFitBounds && allTrailCoords.length > 0 && (
            <FitBounds coordinates={allTrailCoords} />
          )}
          
          {/* Draw convex hull polygons for each POI group */}
          {Object.entries(groupedPOIs).map(([groupName, groupPOIs], idx) => {
            if (groupPOIs.length < 3) return null; // Need at least 3 points for a polygon
            const hull = convexHull(groupPOIs.map(poi => poi.coordinates));
            const expandedHull = expandHullFixed(hull, 0.002); // 0.002 degrees fixed buffer
            // Find rightmost point for label placement
            const rightmost = expandedHull.reduce((max, p) => (p[1] > max[1] ? p : max), expandedHull[0]);
            return (
              <React.Fragment key={groupName}>
                <Polygon
                  positions={expandedHull}
                  pathOptions={{
                    color: 'rgba(30,144,255,1)',
                    fillColor: 'rgba(30,144,255,0.3)',
                    fillOpacity: 0.3,
                    weight: 2
                  }}
                  eventHandlers={{
                    click: () => navigate('/list', { state: { group: groupName } })
                  }}
                />
                {/* Label to the right of the hull */}
                <Marker
                  position={[rightmost[0], rightmost[1] + 0.002]}
                  icon={L.divIcon({
                    className: 'group-label-marker',
                    iconAnchor: [0, 16],
                    html: `<div class='group-label-box'>${groupName}</div>`
                  })}
                  eventHandlers={{
                    click: () => navigate('/list', { state: { group: groupName } })
                  }}
                />
              </React.Fragment>
            );
          })}

          {trailsData?.map((trail: TrailData, index: number) => (
            <Polyline
              key={`trail-${index}`}
              positions={trail.points.map((point: TrailPoint) => [point.latitude, point.longitude])}
              color={trail.color}
              weight={3}
            />
          ))}

          {pois?.map((poi) => {
            console.log('Rendering POI:', poi);
            return (
              <Marker
                key={poi.id}
                position={poi.coordinates}
                icon={greenCircleIcon}
                eventHandlers={{
                  click: () => onPoiClick?.(poi)
                }}
              />
            );
          })}

          {currentLocation && (
            <Marker
              position={currentLocation}
              icon={isSimulationMode
                ? L.divIcon({
                    className: 'simulated-location-marker',
                    html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;background:orange;border-radius:50%;box-shadow:0 0 8px #ff9800;"><svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='white' viewBox='0 0 24 24'><path d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'/></svg></div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                  })
                : L.divIcon({
                    html: '<div class="ripple"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                    className: 'current-location-marker'
                  })
              }
            />
          )}
        </MapContainer>
      )}
    </Box>
  );
};

// Add CSS for group label box
// .group-label-box {
//   background: #fff;
//   border-radius: 6px;
//   padding: 2px 8px;
//   font-size: 14px;
//   color: #1e90ff;
//   font-weight: bold;
//   box-shadow: 0 1px 4px rgba(0,0,0,0.08);
//   border: 1px solid #1e90ff;
//   white-space: nowrap;
// }
