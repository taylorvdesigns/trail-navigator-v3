// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Place as PlaceIcon } from '@mui/icons-material';
import { AppLayout } from './Layout/AppLayout';
import { MapView } from './MapView/MapView';
import { NavViewV2 } from './NavViewV2';
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
import { useTrailJunctions } from '../hooks/useTrailJunctions';
import { useNavViewV3 } from '../hooks/useNavViewV3';
import DebugTrailStructure from './Simulation/DebugTrailStructure';
import { getPOIsByTag, slugToTagName } from '../utils/poi';
import LoadingScreen from './LoadingScreen';

// Convert WordPress trail config to TrailConfig
export const convertToTrailConfig = (wpTrail: WordPressTrailConfig, trailData?: { endpoints: { start: [number, number], end: [number, number] } }): TrailConfig => {
  return {
    ...wpTrail,
    id: wpTrail.routeId,
    endpoint1: trailData?.endpoints.start || [0, 0],
    endpoint2: trailData?.endpoints.end || [0, 0],
    endpointNames: [wpTrail.endpoint1_name, wpTrail.endpoint2_name]
  };
};

// Utility: Check if user is near any trail (within 100m)
function isUserNearAnyTrail(currentLocation: [number, number] | null, allTrailData: any[] | null, threshold = 100): boolean {
  if (!currentLocation || !allTrailData) return false;
  for (const trail of allTrailData) {
    if (!trail?.points) continue;
    // Find the nearest point on the trail to the user
    const nearest = require('../utils/trail').findNearestTrailPoint(currentLocation, trail.points);
    if (nearest && nearest.distance <= threshold) {
      return true;
    }
  }
  return false;
}

// SimulationModeModal: prompts user to use simulation mode if not on trail
const SimulationModeModal: React.FC<{ open: boolean; onClose: () => void; onSimulate: () => void }> = ({ open, onClose, onSimulate }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle sx={{ color: 'white', bgcolor: '#222' }}>Not on the Trail</DialogTitle>
    <DialogContent sx={{ color: 'white', bgcolor: '#222' }}>
      <Typography variant="body1" sx={{ color: 'white' }}>
        You’re not currently on the trail. Would you like to use Simulation Mode to test the app?
      </Typography>
    </DialogContent>
    <DialogActions sx={{ bgcolor: '#222' }}>
      <Button onClick={onSimulate} color="success" variant="contained">Yes, use Simulation Mode</Button>
      <Button onClick={onClose} color="inherit" variant="outlined">No, I’ll wait</Button>
    </DialogActions>
  </Dialog>
);

export const AppContent: React.FC = () => {
  const [locomotionMode, setLocomotionMode] = useState<LocomotionMode>('walking');
  const { pois, loading: poisLoading, error: poisError } = usePOIs();
  const { data: wpConfig, isLoading: wpLoading, error: wpError } = useWordPressConfig();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Debug: Monitor location changes
  useEffect(() => {
    // console.log('Pathname changed to:', location.pathname);
    // console.log('Search params:', location.search);
  }, [location.pathname, location.search]);
  
  const { currentLocation, entryPoint } = useGeoLocation();
  const { isDevMode } = useDevMode();

  // Memoize the trails configuration
  const trailConfigs = useMemo(() => 
    wpConfig?.trails?.map(t => convertToTrailConfig(t)) || [],
    [wpConfig?.trails]
  );

  // Get trail data from RideWithGPS
  const { data: trailData, isLoading: trailDataLoading } = useTrailsData(trailConfigs);

  // Convert WordPress trails to TrailConfig with endpoints
  const trails = useMemo(() => 
    wpConfig?.trails?.map((wpTrail, index) => 
      convertToTrailConfig(wpTrail, trailData?.[index])
    ) || [],
    [wpConfig?.trails, trailData]
  );

  // Get real junctions from trail data
  const junctions = useTrailJunctions(trailData || []);

  const {
    activeTrailId,
    allTrailData: navViewTrailData // Rename to avoid conflict
  } = useNavViewV3({ allTrails: trails, allTrailData: trailData, junctions, pois });

  // Only use devTab to force DevPanel view when route is /dev
  const [devTab, setDevTab] = useState<boolean>(false);

  // Entry point modal state
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [distanceTrackingModalOpen, setDistanceTrackingModalOpen] = useState(false);

  // Track if the user has confirmed their entry point this session
  const [hasConfirmedEntryPointThisSession, setHasConfirmedEntryPointThisSession] = useState(false);

  // State for simulation modal
  const [showSimModal, setShowSimModal] = useState(false);
  const [hasChosenSimulationMode, setHasChosenSimulationMode] = useState(false);

  // Show entry point modal if no entry point is set and not in dev mode and user hasn't chosen simulation mode
  useEffect(() => {
    // Check if we're on the dev route (additional check for timing issues)
    const searchParams = new URLSearchParams(location.search);
    const modeParam = searchParams.get('mode');
    const isOnDevRoute = modeParam === 'dev' || location.pathname.startsWith('/dev/');
    const isSimulationModeInURL = modeParam === 'sim';
    

    
    // Don't show entry point modal if:
    // 1. User has an entry point, OR
    // 2. User is in dev mode, OR  
    // 3. User has chosen simulation mode, OR
    // 4. User is on dev route, OR
    // 5. URL contains ?mode=sim (simulation mode in URL)
    if (entryPoint || isDevMode || hasChosenSimulationMode || isOnDevRoute || isSimulationModeInURL) {
      setEntryModalOpen(false);
    } else {
      setEntryModalOpen(true);
    }
  }, [entryPoint, isDevMode, hasChosenSimulationMode, location.pathname, location.search]);

  // Show distance tracking modal if user is on trail but no distance tracking entry point is set
  useEffect(() => {
    // Check if simulation mode is in URL
    const searchParams = new URLSearchParams(location.search);
    const modeParam = searchParams.get('mode');
    const isSimulationModeInURL = modeParam === 'sim';
    

    
    // Don't show distance tracking modal if user has chosen simulation mode or if URL contains ?mode=sim
    if (hasChosenSimulationMode || isSimulationModeInURL) {
      setDistanceTrackingModalOpen(false);
      return;
    }
    
    if (entryPoint && hasConfirmedEntryPointThisSession) {
      setDistanceTrackingModalOpen(false);
      return;
    }
    if ((isDevMode || location.pathname === '/nav') && !hasConfirmedEntryPointThisSession) {
      setDistanceTrackingModalOpen(true);
    } else {
      setDistanceTrackingModalOpen(false);
    }
  }, [currentLocation, entryPoint, isDevMode, location.pathname, hasConfirmedEntryPointThisSession, hasChosenSimulationMode]);

  // For testing: allow resetting the distance tracking modal
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'r' && event.ctrlKey) {
        sessionStorage.removeItem('hasShownDistanceTracking');
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Determine current view
  let currentView: ViewMode;
  if (isDevMode && (devTab || location.pathname === '/dev' || location.pathname === '/simconfig')) {
    currentView = 'dev';
  } else {
    currentView = location.pathname === '/nav' ? 'nav'
      : location.pathname === '/list' ? 'list'
      : 'map';
  }
  
  // console.log('Current pathname:', location.pathname);
  // console.log('Current view determined as:', currentView);
  // console.log('isDevMode:', isDevMode);
  // console.log('devTab:', devTab);

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

  // Check if user is near any trail
  const isOnTrail = useMemo(() => isUserNearAnyTrail(currentLocation, trailData), [currentLocation, trailData]);

  // Show simulation modal if not on trail and not in dev mode
  useEffect(() => {
    // Check if simulation mode is in URL
    const searchParams = new URLSearchParams(location.search);
    const modeParam = searchParams.get('mode');
    const isSimulationModeInURL = modeParam === 'sim';
    
    if (!isOnTrail && !isDevMode && !hasChosenSimulationMode && !isSimulationModeInURL) {
      setShowSimModal(true);
    } else {
      setShowSimModal(false);
    }
  }, [isOnTrail, isDevMode, hasChosenSimulationMode, location.search]);

  // Handler for simulation mode
  const handleSimulate = () => {
    setShowSimModal(false);
    setHasChosenSimulationMode(true);
    navigate('/simconfig?mode=sim');
  };

  if (poisLoading || wpLoading || trailDataLoading) {
    return <LoadingScreen />;
  }

  if (poisError || wpError) {
    return <div>Error loading data</div>;
  }

  const handleViewChange = (view: ViewMode) => {
    // console.log('Attempting to change to view:', view);
    // console.log('Current location pathname:', location.pathname);
    // console.log('Current search params:', location.search);
    
    if (view === 'dev' && !isDevMode) {
      // console.log('Blocked: dev view requested but not in dev mode');
      return;
    }
    
    // Preserve ?mode=sim if present
    const searchParams = new URLSearchParams(location.search);
    const modeParam = searchParams.get('mode');
    const devQuery = modeParam === 'sim' ? '?mode=sim' : '';
    
    // console.log('Mode param:', modeParam);
    // console.log('Dev query:', devQuery);
    
    if (isDevMode && view === 'dev') {
      // console.log('Navigating to dev panel');
      setDevTab(true);
      const targetPath = '/simconfig' + devQuery;
      // console.log('Target path:', targetPath);
      navigate(targetPath);
      return;
    } else {
      setDevTab(false);
    }
    switch(view) {
      case 'map':
        // console.log('Navigating to map:', '/map' + devQuery);
        // console.log('About to call navigate()');
        navigate('/map' + devQuery, { 
          state: { 
            center: mapCenter,
            zoom: mapZoom
          }
        });
        break;
      case 'nav':
        // console.log('Navigating to nav:', '/nav' + devQuery);
        // console.log('About to call navigate()');
        navigate('/nav' + devQuery);
        break;
      case 'list':
        // console.log('Navigating to list:', '/list' + devQuery);
        // console.log('About to call navigate()');
        navigate('/list' + devQuery);
        break;
    }
    
    // console.log('Navigation call completed');
  };

  return (
    <AppLayout currentView={currentView} onViewChange={handleViewChange}>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <SimulationModeModal open={showSimModal} onClose={() => setShowSimModal(false)} onSimulate={handleSimulate} />
        <EntryPointModal open={entryModalOpen} onClose={() => setEntryModalOpen(false)} />
        <EntryPointModal 
          open={distanceTrackingModalOpen} 
          onClose={() => setDistanceTrackingModalOpen(false)} 
          showDistanceTracking={true}
          pois={pois}
          trails={trails}
          onConfirmEntryPoint={() => setHasConfirmedEntryPointThisSession(true)}
        />

        {currentView === 'dev' ? (
          <DevPanel />
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/map" replace />} />
            <Route path="/map" element={<MapView trails={trails} pois={pois} center={mapCenter} zoom={mapZoom} currentLocation={currentLocation || undefined} />} />
            <Route path="/places/:placeName" element={<PlacesMapView trails={trails} pois={pois} currentLocation={currentLocation || undefined} />} />
            <Route path="/nav" element={
              <NavViewV2 
                trailConfig={trails[0]}
                allTrails={trails}
                allTrailData={trailData}
                junctions={junctions} 
                pois={pois} 
                locomotionMode={locomotionMode}
                onLocomotionChange={setLocomotionMode}
                onChangeEntryPoint={() => {
                  setHasConfirmedEntryPointThisSession(false);
                  setDistanceTrackingModalOpen(true);
                }}
              />
            } />
            <Route path="/list" element={
              <ListView 
                pois={pois} 
                onPoiClick={() => {}} 
                currentLocation={currentLocation || undefined}
                activeTrailId={activeTrailId}
                allTrailData={navViewTrailData}
              />
            } />
            <Route path="/trail/:id" element={<TrailView />} />
            <Route path="/simconfig" element={<DevPanel />} />
            <Route path="/debug-trail-structure" element={<DebugTrailStructure />} />
            <Route path="*" element={<NotFoundView />} />
          </Routes>
        )}
      </Box>
    </AppLayout>
  );
}; 

// Component for places-based map view
const PlacesMapView: React.FC<{ trails: TrailConfig[], pois: POI[], currentLocation?: [number, number] }> = ({ trails, pois, currentLocation }) => {
  const { placeName } = useParams<{ placeName: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [mapZoom, setMapZoom] = React.useState<number>(15);
  const [fitBounds, setFitBounds] = React.useState<[number, number][] | null>(null);

  // Memoize the POIs and center to prevent infinite re-renders
  const { pois: placePOIs, center } = React.useMemo(() => {
    return getPOIsByTag(pois, placeName || '');
  }, [pois, placeName]);

  // Use a ref to track if we've already processed the fitBounds from state
  const hasProcessedState = React.useRef(false);

  React.useEffect(() => {
    if (!hasProcessedState.current && location.state && location.state.fitBounds) {
      setFitBounds(location.state.fitBounds);
      // Remove fitBounds from state after using it (so it doesn't re-trigger on re-render)
      navigate(location.pathname, { replace: true, state: {} });
      hasProcessedState.current = true;
    } else if (placePOIs.length > 0 && !fitBounds) {
      // If no fitBounds in state, but we have POIs, fit to their bounds
      const coords = placePOIs
        .filter(poi => poi.coordinates)
        .map(poi => [poi.coordinates[1], poi.coordinates[0]]);
      setFitBounds(coords);
    }
  }, [placePOIs, navigate, location.state, fitBounds]);
  
  // Get the original tag name for display
  const originalPlaceName = React.useMemo(() => {
    return slugToTagName(pois, placeName || '') || placeName || '';
  }, [pois, placeName]);
  
  // Use the calculated center or default center
  const mapCenter: [number, number] = React.useMemo(() => {
    return center || [34.8526, -82.3940];
  }, [center]);
  
  // Memoize the zoom change handler to prevent infinite re-renders
  const handleZoomChange = React.useCallback((zoom: number) => {
    setMapZoom(zoom);
  }, []);
  
  // If no POIs found, show a message
  if (placePOIs.length === 0) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ 
          p: 2, 
          bgcolor: 'primary.main', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <PlaceIcon />
          <Typography variant="h6">
            {originalPlaceName}
          </Typography>
        </Box>
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'background.default'
        }}>
          <Typography variant="h6" color="text.secondary">
            No places found in "{originalPlaceName}"
          </Typography>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Places Group Header */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'primary.main', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <PlaceIcon />
        <Typography variant="h6">
          Places in {originalPlaceName} ({placePOIs.length} locations)
        </Typography>
      </Box>
      {/* View List Button (only show if zoomed in) */}
      {mapZoom >= 15 && (
        <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 24, display: 'flex', justifyContent: 'center', zIndex: 1200 }}>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            sx={{ borderRadius: 8, fontWeight: 'bold', px: 4, py: 1.5, boxShadow: 2 }}
            onClick={() => navigate('/list', { state: { group: originalPlaceName, tag: placeName } })}
          >
            View List
          </Button>
        </Box>
      )}
      {/* Map View */}
      <Box sx={{ flex: 1 }}>
        <MapView 
          trails={trails} 
          pois={pois} 
          center={mapCenter} 
          zoom={mapZoom} 
          currentLocation={currentLocation}
          highlightedPOIs={placePOIs}
          onZoomChange={handleZoomChange}
          fitBounds={fitBounds}
        />
      </Box>
    </Box>
  );
}; 