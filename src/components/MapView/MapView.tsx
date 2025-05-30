import React from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, CircularProgress } from '@mui/material';
import { POI, TrailConfig, TrailPoint } from '../../types';
import L from 'leaflet';
import { useTrailsData } from '../../hooks/useTrailsData';
import { useLocation } from '../../hooks/useLocation';
import { GrayscaleMapLayer } from './GrayscaleMapLayer';
import { SimulationControl } from '../SimulationControl/SimulationControl';

interface TrailData {
  points: TrailPoint[];
  color: string;
}

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png'
});

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
  pois = [],
  onPoiClick,
  center = [34.8526, -82.3940], // Default to Greenville, SC
  zoom = 13,
  currentLocation
}) => {
  const { data: trailsData, isLoading } = useTrailsData(trails);

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <GrayscaleMapLayer />
        <SimulationControl />
        
        {trailsData?.map((trail: TrailData, index: number) => (
          <Polyline
            key={`trail-${index}`}
            positions={trail.points.map((point: TrailPoint) => [point.latitude, point.longitude])}
            color={trail.color}
          />
        ))}

        {pois.map((poi) => (
          <Marker
            key={poi.id}
            position={[poi.coordinates[1], poi.coordinates[0]]}
            eventHandlers={{
              click: () => onPoiClick?.(poi)
            }}
          />
        ))}

        {currentLocation && (
          <Marker
            position={currentLocation}
            icon={L.divIcon({
              className: 'current-location-marker',
              html: '<div class="ripple"></div>',
              iconSize: [20, 20]
            })}
          />
        )}
      </MapContainer>
    </Box>
  );
};
