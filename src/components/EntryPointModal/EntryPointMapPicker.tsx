import React, { useState } from 'react';
import ReactDOMServer from 'react-dom/server';
import { Box, Button, CircularProgress } from '@mui/material';
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

import { TrailConfig } from '../../types/index';
import { useTrailsData } from '../../hooks/useTrailsData';
import { GrayscaleMapLayer } from '../MapView/GrayscaleMapLayer';

interface EntryPointMapPickerProps {
  trails: TrailConfig[];
  onConfirm: (location: [number, number]) => void;
  onCancel: () => void;
}

// Create a simple entry point marker
const EntryPointMarker = () => (
  <div style={{
    width: '16px',
    height: '16px',
    background: '#4CAF50',
    border: '2px solid #fff',
    borderRadius: '50%',
    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
    zIndex: 2
  }} />
);

const startIcon = new L.DivIcon({
  className: 'entry-point-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  html: ReactDOMServer.renderToString(<EntryPointMarker />)
});

export const EntryPointMapPicker: React.FC<EntryPointMapPickerProps> = ({ trails, onConfirm, onCancel }) => {
  const { data: trailsData, isLoading } = useTrailsData(trails);
  // Flatten all trail points
  const allTrailPoints = trailsData && trailsData.length > 0
    ? trailsData.flatMap(trail => trail.points.map(pt => [pt.latitude, pt.longitude] as [number, number]))
    : [];
  // Default center: first trail point or Greenville
  const defaultCenter: [number, number] = allTrailPoints[0] || [34.8526, -82.3940];
  const [selected, setSelected] = useState<[number, number] | null>(null);

  // Map click handler: snap to nearest trail point
  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        // Find nearest trail point
        let minDist = Infinity;
        let nearest: [number, number] = allTrailPoints[0];
        for (const pt of allTrailPoints) {
          const d = Math.hypot(pt[0] - e.latlng.lat, pt[1] - e.latlng.lng);
          if (d < minDist) {
            minDist = d;
            nearest = pt;
          }
        }
        setSelected(nearest);
      }
    });
    return null;
  };

  if (isLoading) {
    return <Box sx={{ width: '100%', height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ width: '100%', height: '80vh', display: 'flex', flexDirection: 'column', mb: 2 }}>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <MapContainer
          center={defaultCenter}
          zoom={14}
          style={{ width: '100%', height: '100%', borderRadius: 12 }}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <GrayscaleMapLayer />
          {allTrailPoints.length > 0 && (
            <Polyline positions={allTrailPoints} color="#39FF14" weight={5} />
          )}
          {selected && (
            <Marker position={selected} icon={startIcon}>
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '100%',
                transform: 'translate(-50%, 8px)',
                background: '#fff',
                color: '#4CAF50',
                fontWeight: 700,
                borderRadius: 8,
                padding: '2px 8px',
                fontSize: 13,
                boxShadow: '0 1px 4px rgba(0,0,0,0.10)'
              }}>
                Starting point
              </div>
            </Marker>
          )}
          <MapClickHandler />
        </MapContainer>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button variant="outlined" color="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={() => selected && onConfirm(selected)} disabled={!selected}>
          Confirm
        </Button>
      </Box>
    </Box>
  );
}; 