import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useParams } from 'react-router-dom';
import { MapView } from '../MapView/MapView';
import { TRAIL_ROUTES } from '../../config/routes.config';
import { TrailPoint } from '../../types';
import { useTrailsData } from '../../hooks/useTrailsData';

export const TrailView: React.FC = () => {
  const { trailId } = useParams();
  console.log('TrailView - trailId from params:', trailId);
  
  const trail = TRAIL_ROUTES.find(t => t.id === trailId);
  console.log('TrailView - Found trail in TRAIL_ROUTES:', trail);
  console.log('TrailView - All available trails:', TRAIL_ROUTES);
  
  const trailsQuery = useTrailsData(trail ? [trail] : []);
  console.log('TrailView - trailsQuery:', {
    isLoading: trailsQuery.isLoading,
    isError: trailsQuery.isError,
    data: trailsQuery.data
  });
  
  const trailsData = trailsQuery.data;
  const isLoading = trailsQuery.isLoading;
  const isError = trailsQuery.isError;

  if (!trail) {
    console.log('TrailView - No trail found for id:', trailId);
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Trail not found</Typography>
      </Box>
    );
  }

  if (isLoading) {
    console.log('TrailView - Loading trail data...');
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    console.log('TrailView - Error loading trail data');
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
    console.log(`TrailView - Trail ${index} with coordinates:`, {
      id: trailWithCoords.id,
      name: trailWithCoords.name,
      color: trailWithCoords.color,
      coordinateCount: trailWithCoords.coordinates.length,
      firstCoordinate: trailWithCoords.coordinates[0]
    });
    return trailWithCoords;
  });

  const defaultCenter: [number, number] = [34.8526, -82.3940];
  const center = trailsWithCoordinates[0]?.coordinates[0] || defaultCenter;
  console.log('TrailView - Map center:', center);

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