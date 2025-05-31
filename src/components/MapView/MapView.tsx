import React, { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap, Popup } from 'react-leaflet';
import { Box, CircularProgress } from '@mui/material';
import { POI, TrailConfig, TrailPoint } from '../../types/index';
import L from 'leaflet';
import { useTrailsData } from '../../hooks/useTrailsData';
import { useLocation as useRouterLocation } from 'react-router-dom';
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
  const { isSimulationMode } = useAppLocation();
  const mapRef = useRef<L.Map>(null);
  const { data: trailData } = useTrailData(trails[0]?.routeId);
  const { locomotionMode } = useUser();

  console.log('MapView center:', center, 'zoom:', zoom);
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

  // Calculate ETA if we have trail data and current location
  const eta = React.useMemo(() => {
    if (!trailData || !currentLocation) return null;
    const nearestPoint = findNearestTrailPoint(currentLocation, trailData.points);
    if (!nearestPoint) return null;
    return calculateETA(nearestPoint.distance || 0, locomotionMode);
  }, [trailData, currentLocation, locomotionMode]);

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
          
          {trailsData?.map((trail: TrailData, index: number) => (
            <Polyline
              key={`trail-${index}`}
              positions={trail.points.map((point: TrailPoint) => [point.latitude, point.longitude])}
              color={trail.color}
            />
          ))}

          {pois?.map((poi) => (
            <Marker
              key={poi.id}
              position={[poi.latitude, poi.longitude]}
              icon={highlightPOI && 
                poi.latitude === highlightPOI[0] && 
                poi.longitude === highlightPOI[1] 
                ? highlightIcon 
                : defaultIcon}
              eventHandlers={{
                click: () => onPoiClick?.(poi)
              }}
            />
          ))}

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

const TrailLayer: React.FC<{ trail: TrailConfig }> = ({ trail }) => {
  const { data: trailData } = useTrailData(trail.routeId);
  const map = useMap();

  React.useEffect(() => {
    if (trailData?.points) {
      const bounds = trailData.points.map(point => [point.latitude, point.longitude]);
      map.fitBounds(bounds as [number, number][]);
    }
  }, [trailData, map]);

  if (!trailData?.points) return null;

  return (
    <Polyline
      positions={trailData.points.map(point => [point.latitude, point.longitude])}
      color={trail.color}
      weight={3}
    />
  );
};
