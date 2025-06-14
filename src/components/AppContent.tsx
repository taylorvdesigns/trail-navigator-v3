import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { AppLayout } from './Layout/AppLayout';
import { MapView } from './MapView/MapView';
import { NavView } from './NavView/NavView';
import { ListView } from './ListView/ListView';
import { TrailView } from '../views/TrailView';
import { NotFoundView } from '../views/NotFoundView';
import { ViewMode, LocomotionMode, WordPressTrailConfig, TrailConfig } from '../types/index';
import { usePOIs } from '../hooks/usePOIs';
import { useLocation as useGeoLocation } from '../hooks/useLocation';
import { useDevMode } from '../contexts/DevContext';
import { DevPanel } from './DevPanel/DevPanel';
import { EntryPointModal } from './EntryPointModal/EntryPointModal';
import { useWordPressConfig } from '../hooks/useWordPressConfig';
import { useTrailsData } from '../hooks/useTrailsData';

// Convert WordPress trail config to TrailConfig
const convertToTrailConfig = (wpTrail: WordPressTrailConfig, trailData?: { endpoints: { start: [number, number], end: [number, number] } }): TrailConfig => {
  return {
    ...wpTrail,
    id: wpTrail.routeId,
    endpoint1: trailData?.endpoints.start || [0, 0],
    endpoint2: trailData?.endpoints.end || [0, 0],
  };
};

export const AppContent: React.FC = () => {
  const [locomotionMode, setLocomotionMode] = useState<LocomotionMode>('walking');
  const { pois, loading: poisLoading, error: poisError } = usePOIs();
  const { data: wpConfig, isLoading: wpLoading, error: wpError } = useWordPressConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLocation, entryPoint } = useGeoLocation();
  const { isDevMode } = useDevMode();

  // Get trail data from RideWithGPS
  const { data: trailData, isLoading: trailDataLoading } = useTrailsData(
    wpConfig?.trails?.map(t => convertToTrailConfig(t)) || []
  );

  // Convert WordPress trails to TrailConfig with endpoints
  const trails = wpConfig?.trails?.map((wpTrail, index) => 
    convertToTrailConfig(wpTrail, trailData?.[index])
  ) || [];

  // Only use devTab to force DevPanel view when route is /dev
  const [devTab, setDevTab] = useState<boolean>(false);

  // Entry point modal state
  const [entryModalOpen, setEntryModalOpen] = useState(false);

  // Show entry point modal if no entry point is set and not in dev mode
  useEffect(() => {
    if (!entryPoint && !isDevMode) {
      setEntryModalOpen(true);
    } else {
      setEntryModalOpen(false);
    }
  }, [entryPoint, isDevMode]);

  // Determine current view
  let currentView: ViewMode;
  if (isDevMode && (devTab || location.pathname === '/dev')) {
    currentView = 'dev';
  } else {
    currentView = location.pathname === '/nav' ? 'nav'
      : location.pathname === '/list' ? 'list'
      : 'map';
  }

  // Get map center and zoom from navigation state if present
  const state = location.state as { center?: [number, number], zoom?: number } | undefined;
  const mapCenter: [number, number] = (state && Array.isArray(state.center) && state.center.length === 2)
    ? [Number(state.center[0]), Number(state.center[1])] as [number, number]
    : [34.8526, -82.3940];
  const mapZoom = (state && typeof state.zoom === 'number') ? state.zoom : 13;

  // Track if we've used the navigation state to center/zoom the map
  const [usedNavState, setUsedNavState] = React.useState(false);

  React.useEffect(() => {
    if (state && (state.center || state.zoom) && !usedNavState) {
      setUsedNavState(true);
    }
  }, [state, usedNavState]);

  // Reset devTab if dev mode is exited
  React.useEffect(() => {
    if (!isDevMode && devTab) {
      setDevTab(false);
    }
  }, [isDevMode, devTab]);

  if (poisLoading || wpLoading || trailDataLoading) {
    return <div>Loading...</div>;
  }

  if (poisError || wpError) {
    return <div>Error loading data</div>;
  }

  const handleViewChange = (view: ViewMode) => {
    if (view === 'dev' && !isDevMode) return;
    // Preserve ?mode=dev if present
    const searchParams = new URLSearchParams(location.search);
    const modeParam = searchParams.get('mode');
    const devQuery = modeParam === 'dev' ? '?mode=dev' : '';
    if (isDevMode && view === 'dev') {
      setDevTab(true);
      navigate('/dev' + devQuery);
      return;
    } else {
      setDevTab(false);
    }
    switch(view) {
      case 'map':
        navigate('/map' + devQuery, { 
          state: { 
            center: mapCenter,
            zoom: mapZoom
          }
        });
        break;
      case 'nav':
        navigate('/nav' + devQuery);
        break;
      case 'list':
        navigate('/list' + devQuery);
        break;
    }
  };

  return (
    <AppLayout currentView={currentView} onViewChange={handleViewChange}>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <EntryPointModal open={entryModalOpen} onClose={() => setEntryModalOpen(false)} />
        {currentView === 'dev' ? (
          <DevPanel />
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/map" replace />} />
            <Route path="/map" element={<MapView trails={trails} pois={pois} center={mapCenter} zoom={mapZoom} currentLocation={currentLocation || undefined} />} />
            <Route path="/nav" element={<NavView trailConfig={trails[0]} onLocomotionChange={setLocomotionMode} locomotionMode={locomotionMode} onChangeEntryPoint={() => setEntryModalOpen(true)} />} />
            <Route path="/list" element={<ListView pois={pois} onPoiClick={() => {}} currentLocation={currentLocation || undefined} />} />
            <Route path="/trail/:id" element={<TrailView />} />
            <Route path="*" element={<NotFoundView />} />
          </Routes>
        )}
      </Box>
    </AppLayout>
  );
}; 