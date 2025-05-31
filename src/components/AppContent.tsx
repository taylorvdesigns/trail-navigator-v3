import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { AppLayout } from './Layout/AppLayout';
import { MapView } from './MapView/MapView';
import { NavView } from './NavView/NavView';
import { ListView } from './ListView/ListView';
import { TrailView } from '../views/TrailView';
import { NotFoundView } from '../views/NotFoundView';
import { ViewMode, LocomotionMode } from '../types/index';
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

  // Get map center and zoom from navigation state if present
  const state = location.state as { center?: [number, number], zoom?: number } | undefined;
  const mapCenter: [number, number] = (state && Array.isArray(state.center) && state.center.length === 2)
    ? [Number(state.center[0]), Number(state.center[1])] as [number, number]
    : [34.8526, -82.3940];
  const mapZoom = (state && typeof state.zoom === 'number') ? state.zoom : 13;

  // Track if we've used the navigation state to center/zoom the map
  const [usedNavState, setUsedNavState] = React.useState(false);

  React.useEffect(() => {
    let timeout: NodeJS.Timeout | undefined;
    if (state && (state.center || state.zoom) && !usedNavState) {
      setUsedNavState(true);
      timeout = setTimeout(() => {
        navigate(location.pathname, { replace: true });
        setUsedNavState(false);
      }, 500);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [state, usedNavState, navigate, location.pathname]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  const handleViewChange = (view: ViewMode) => {
    switch(view) {
      case 'map':
        navigate('/', { 
          state: { 
            center: mapCenter,
            zoom: mapZoom
          }
        });
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
          <Route path="/" element={<Navigate to="/map" replace />} />
          <Route path="/map" element={<MapView trails={TRAIL_ROUTES} pois={pois} center={mapCenter} zoom={mapZoom} currentLocation={currentLocation || undefined} />} />
          <Route path="/nav" element={<NavView trailConfig={TRAIL_ROUTES[0]} onLocomotionChange={setLocomotionMode} locomotionMode={locomotionMode} />} />
          <Route path="/list" element={<ListView pois={pois} onPoiClick={() => {}} currentLocation={currentLocation || undefined} />} />
          <Route path="/trail/:id" element={<TrailView />} />
          <Route path="*" element={<NotFoundView />} />
        </Routes>
      </Box>
    </AppLayout>
  );
}; 