import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { AppLayout } from './Layout/AppLayout';
import { MapView } from './MapView/MapView';
import { NavView } from './NavView/NavView';
import { ListView } from './ListView/ListView';
import { TrailView } from '../views/TrailView';
import { NotFoundView } from '../views/NotFoundView';
import { ViewMode, LocomotionMode } from '../types';
import { TRAIL_ROUTES } from '../config/routes.config';
import { usePOIs } from '../hooks/usePOIs';
import { useLocation as useGeoLocation } from '../hooks/useLocation';

export const AppContent: React.FC = () => {
  const [locomotionMode, setLocomotionMode] = useState<LocomotionMode>('walking');
  const { pois, loading, error } = usePOIs();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLocation } = useGeoLocation();
  
  const currentView: ViewMode = location.pathname === '/nav' ? 'nav' 
    : location.pathname === '/list' ? 'list' 
    : 'map';

  // Calculate current position in meters from start of trail
  const currentPosition = React.useMemo(() => {
    if (!currentLocation) return 0;
    // This is a placeholder - in reality, you'd calculate the actual distance along the trail
    return 1000; // 1km from start for testing
  }, [currentLocation]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  const handleViewChange = (view: ViewMode) => {
    switch(view) {
      case 'map':
        navigate('/');
        break;
      case 'nav':
        navigate('/nav');
        break;
      case 'list':
        navigate('/list');
        break;
    }
  };

  return (
    <AppLayout currentView={currentView} onViewChange={handleViewChange}>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route 
            path="/" 
            element={
              <MapView
                trails={TRAIL_ROUTES}
                pois={pois}
                currentLocation={currentLocation || undefined}
              />
            } 
          />
          <Route 
            path="/nav" 
            element={
              <NavView
                trailConfig={TRAIL_ROUTES[0]}
                locomotionMode={locomotionMode}
                onLocomotionChange={setLocomotionMode}
              />
            } 
          />
          <Route path="/trail/:trailId" element={<TrailView />} />
          <Route path="/list" element={
            <ListView 
              pois={pois}
              onPoiClick={(poi) => {
                navigate('/', { state: { center: [poi.coordinates[1], poi.coordinates[0]], zoom: 17 } });
              }}
              currentLocation={currentLocation || undefined}
            />
          } />
          <Route path="/404" element={<NotFoundView />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Box>
    </AppLayout>
  );
}; 