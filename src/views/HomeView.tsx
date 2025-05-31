import React from 'react';
import { Box, Typography } from '@mui/material';
import { useLocation } from '../hooks/useLocation';
import { useUser } from '../contexts/UserContext';
import { MapView } from '../components/MapView/MapView';
import { TRAIL_ROUTES } from '../config/routes.config';
import { usePOIs } from '../hooks/usePOIs';
import { POI } from '../types/index';

export const HomeView: React.FC = () => {
  const { currentLocation } = useLocation();
  const { selectedCategories } = useUser();
  const { pois, loading: poisLoading } = usePOIs();

  const handlePoiClick = (poi: POI) => {
    console.log('POI clicked:', poi);
    // Add any POI click handling logic here
  };

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <MapView
        trails={TRAIL_ROUTES}
        pois={pois}
        onPoiClick={handlePoiClick}
        currentLocation={currentLocation || undefined}
      />
    </Box>
  );
};
