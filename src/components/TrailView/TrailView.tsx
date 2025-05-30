import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useTrailData } from '../../hooks/useTrailData';
import { MapView } from '../MapView/MapView';
import { TRAIL_ROUTES } from '../../config/trails';
import { TrailPoint } from '../../types';

export const TrailView: React.FC = () => {
  const { trailId } = useParams();
  const trail = TRAIL_ROUTES.find(t => t.id === trailId);
  const { data: trailData, isLoading, isError } = useTrailData(trail?.routeId || '');

  if (!trail) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Trail not found</Typography>
      </Box>
    );
  }

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

  const trailWithCoordinates = {
    ...trail,
    coordinates: trailData?.points.map((point: TrailPoint): [number, number] => [point.latitude, point.longitude]) || []
  };

  const defaultCenter: [number, number] = [34.8526, -82.3940];
  const center = trailWithCoordinates.coordinates[0] || defaultCenter;

  return (
    <Box sx={{ height: '100%' }}>
      <MapView
        trails={[trailWithCoordinates]}
        center={center}
        zoom={13}
      />
    </Box>
  );
}; 