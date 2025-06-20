import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useParams } from 'react-router-dom';
import { MapView } from '../MapView/MapView';
import { TRAIL_ROUTES } from '../../config/routes.config';
import { TrailPoint } from '../../types';
import { useTrailsData } from '../../hooks/useTrailsData';

export const TrailView: React.FC = () => {
  const { trailId } = useParams();
  
  const trail = TRAIL_ROUTES.find(t => t.id === trailId);
  
  const trailsQuery = useTrailsData(trail ? [trail] : []);
  
  const trailsData = trailsQuery.data;
  const isLoading = trailsQuery.isLoading;
  const isError = trailsQuery.isError;

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

  const trailsWithCoordinates = trailsData.map((trailData, index) => {
    const trailWithCoords = {
      ...TRAIL_ROUTES[index],
      coordinates: trailData.points.map((point: TrailPoint): [number, number] => [point.latitude, point.longitude])
    };
    return trailWithCoords;
  });

  const defaultCenter: [number, number] = [34.8526, -82.3940];
  const center = trailsWithCoordinates[0]?.coordinates[0] || defaultCenter;

  return (
    <Box sx={{ height: '100%' }}>
      <MapView
        trails={trailsWithCoordinates}
        center={center}
        zoom={13}
      />
    </Box>
  );
}; 