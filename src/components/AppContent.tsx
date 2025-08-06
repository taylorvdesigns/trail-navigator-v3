/**
 * AppContent Component
 * 
 * Main application content component that handles routing, view management, and global state coordination.
 * This is the core component that manages the overall application flow and view switching.
 * 
 * Features:
 * - Route management and navigation
 * - View mode switching (Map, List, Nav)
 * - POI and trail data management
 * - Location tracking and simulation mode
 * - WordPress configuration integration
 * - Analytics tracking
 * - Development mode features
 * - Entry point selection
 * - Trail network visualization
 */

// Main application content component
// Handles routing, view management, and global state coordination
import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation as useRouterLocation, useParams } from 'react-router-dom';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Place as PlaceIcon } from '@mui/icons-material';
import { AppLayout } from './Layout/AppLayout';
import { MapView } from './MapView/MapView';
import { NavViewV2 } from './NavViewV2';
import { ListView } from './ListView/ListView';
import { TrailView } from '../views/TrailView';
import { NotFoundView } from '../views/NotFoundView';
import { ViewMode, WordPressTrailConfig, TrailConfig, POI } from '../types/index';
import { usePOIs } from '../hooks/usePOIs';
import { useLocation } from '../contexts/LocationContext';
import { useSimulationConfigMode } from '../contexts/SimulationConfigContext';
import { useUser } from '../contexts/UserContext';
import { SimulationConfigPanel } from './SimulationConfigPanel/SimulationConfigPanel';
import { EntryPointModal } from './EntryPointModal/EntryPointModal';
import { useWordPressConfig } from '../hooks/useWordPressConfig';
import { useTrailsData } from '../hooks/useTrailsData';
import { useTrailJunctions } from '../hooks/useTrailJunctions';
import { useNavViewV3 } from '../hooks/useNavViewV3';
import DebugTrailStructure from './Simulation/DebugTrailStructure';
import { getPOIsByTag, slugToTagName } from '../utils/poi';
import LoadingScreen from './LoadingScreen';
import { GooglePlacesModal } from './GooglePlacesModal/GooglePlacesModal';
import { AnalyticsProvider } from '../contexts/AnalyticsContext';
import { Analytics } from '@vercel/analytics/react';

/**
 * Convert WordPress trail config to TrailConfig format
 * Transforms WordPress API data into the internal trail configuration format
 * 
 * @param wpTrail - WordPress trail configuration from API
 * @param trailData - Optional trail data with endpoints
 * @returns TrailConfig object for internal use
 */
export const convertToTrailConfig = (wpTrail: WordPressTrailConfig, trailData?: { endpoints: { start: [number, number], end: [number, number] } }): TrailConfig => {
  return {
    ...wpTrail,
    id: wpTrail.routeId,
    endpoint1: trailData?.endpoints.start || [0, 0],
    endpoint2: trailData?.endpoints.end || [0, 0],
    endpointNames: [wpTrail.endpoint1_name || `${wpTrail.name} Start`, wpTrail.endpoint2_name || `${wpTrail.name} End`]
  };
};

/**
 * Utility function: Check if user is near any trail (within specified threshold)
 * Used to determine if user should be prompted for simulation mode
 * 
 * @param currentLocation - User's current GPS coordinates
 * @param allTrailData - Array of all trail data
 * @param threshold - Distance threshold in meters (default: 100m)
 * @returns true if user is within threshold distance of any trail
 */
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

/**
 * SimulationModeModal: Prompts user to use simulation mode if not on trail
 * Modal component that appears when user is not near any trail
 */
const SimulationModeModal: React.FC<{ open: boolean; onClose: () => void; onSimulate: () => void }> = ({ open, onClose, onSimulate }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle sx={{ color: 'white', bgcolor: '#222' }}>Not on the Trail</DialogTitle>
    <DialogContent sx={{ color: 'white', bgcolor: '#222' }}>
      <Typography variant="body1" sx={{ color: 'white' }}>
        You're not currently on the trail. Would you like to use Simulation Mode to test the app?
      </Typography>
    </DialogContent>
    <DialogActions sx={{ bgcolor: '#222' }}>
      <Button onClick={onSimulate} color="success" variant="contained">Yes, use Simulation Mode</Button>
      <Button onClick={onClose} color="inherit" variant="outlined">No, I'll wait</Button>
    </DialogActions>
  </Dialog>
);

/**
 * Main AppContent component that manages the overall application state and routing
 */
export const AppContent: React.FC = () => {
  // State management
  const { locomotionMode, setLocomotionMode } = useUser();
  const { pois, loading: poisLoading, error: poisError } = usePOIs();
  const { data: wpConfig, isLoading: wpLoading, error: wpError } = useWordPressConfig();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  
  // Get focused group from URL parameters for navigation state
  const searchParams = new URLSearchParams(routerLocation.search);
  const focusedGroup = searchParams.get('group');
  
  // Debug: Monitor location changes (commented out for production)
  useEffect(() => {
    // console.log('Pathname changed to:', routerLocation.pathname);
    // console.log('Search params:', routerLocation.search);
  }, [routerLocation.pathname, routerLocation.search]);
  
  // Location and simulation config mode context
  const { currentLocation, entryPoint } = useLocation();
  const { isSimulationConfigMode } = useSimulationConfigMode();

  /**
   * Memoize the trails configuration to prevent unnecessary re-renders
   * Converts WordPress trail configs to internal format
   */
  const trailConfigs = useMemo(() => 
    wpConfig?.trails?.map(t => convertToTrailConfig(t)) || [],
    [wpConfig?.trails]
  );

  // Get trail data from RideWithGPS API
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

  // Only use simConfigTab to force SimulationConfigPanel view when route is /simconfig
  const [simConfigTab, setSimConfigTab] = useState<boolean>(false);

  // Entry point modal state
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [distanceTrackingModalOpen, setDistanceTrackingModalOpen] = useState(false);

  // Track if the user has confirmed their entry point this session
  const [hasConfirmedEntryPointThisSession, setHasConfirmedEntryPointThisSession] = useState(false);

  // State for simulation modal
  const [showSimModal, setShowSimModal] = useState(false);
  const [hasChosenSimulationMode, setHasChosenSimulationMode] = useState(false);

  // State for POI modals
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [googlePlacesModalOpen, setGooglePlacesModalOpen] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>('');
  const [selectedPoiName, setSelectedPoiName] = useState<string>('');


  const handlePoiClick = (poi: POI) => {
    if (poi.google_place_id) {
      // Open Google Places modal
      setSelectedPlaceId(poi.google_place_id);
      setSelectedPoiName(poi.title.rendered);
      setGooglePlacesModalOpen(true);
    } else {
      // Open regular POI modal
      setSelectedPOI(poi);
    }
  };



  // Show entry point modal if no entry point is set and not in sim config mode and user hasn't chosen simulation mode
  useEffect(() => {
          // Check if we're on the sim config route (additional check for timing issues)
    const searchParams = new URLSearchParams(routerLocation.search);
    const modeParam = searchParams.get('mode');
    const isOnSimConfigRoute = modeParam === 'simconfig' || routerLocation.pathname.startsWith('/simconfig/');
    const isSimulationModeInURL = modeParam === 'sim';
    

    
    // Don't show entry point modal if:
    // 1. User has an entry point, OR
    // 2. User is in simulation config mode, OR  
    // 3. User has chosen simulation mode, OR
          // 4. User is on sim config route, OR
    // 5. URL contains ?mode=sim (simulation mode in URL)
    if (entryPoint || isSimulationConfigMode || hasChosenSimulationMode || isOnSimConfigRoute || isSimulationModeInURL) {
      setEntryModalOpen(false);
    } else {
      setEntryModalOpen(true);
    }
  }, [entryPoint, isSimulationConfigMode, hasChosenSimulationMode, routerLocation.pathname, routerLocation.search]);

  // Show distance tracking modal if user is on trail but no distance tracking entry point is set
  useEffect(() => {
    // Check if simulation mode is in URL
    const searchParams = new URLSearchParams(routerLocation.search);
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
    if ((isSimulationConfigMode || routerLocation.pathname === '/nav') && !hasConfirmedEntryPointThisSession) {
      setDistanceTrackingModalOpen(true);
    } else {
      setDistanceTrackingModalOpen(false);
    }
  }, [currentLocation, entryPoint, isSimulationConfigMode, routerLocation.pathname, hasConfirmedEntryPointThisSession, hasChosenSimulationMode]);

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
      if (isSimulationConfigMode && (simConfigTab || routerLocation.pathname === '/simconfig' || routerLocation.pathname === '/simconfig')) {
      currentView = 'simconfig';
    } else {
    currentView = routerLocation.pathname === '/nav' ? 'nav'
      : routerLocation.pathname === '/list' ? 'list'
      : 'map';
  }
  
  // console.log('Current pathname:', location.pathname);
  // console.log('Current view determined as:', currentView);
  // console.log('isDevMode:', isDevMode);
  // console.log('devTab:', devTab);

  // Get map center and zoom from navigation state if present
  const state = routerLocation.state as { center?: [number, number], zoom?: number } | undefined;
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

  // Reset simConfigTab if simulation config mode is exited
  React.useEffect(() => {
    if (!isSimulationConfigMode && simConfigTab) {
      setSimConfigTab(false);
    }
  }, [isSimulationConfigMode, simConfigTab]);

  // Check if user is near any trail
  const isOnTrail = useMemo(() => isUserNearAnyTrail(currentLocation, trailData), [currentLocation, trailData]);

  // Show simulation modal ONLY if ?mode=sim is in URL and user is not on trail
  useEffect(() => {
    // Check if simulation mode is in URL
    const searchParams = new URLSearchParams(routerLocation.search);
    const modeParam = searchParams.get('mode');
    const isSimulationModeInURL = modeParam === 'sim';
    

    
    // Only show simulation modal if ?mode=sim is in URL AND user is not on trail
    if (isSimulationModeInURL && !isOnTrail && !isSimulationConfigMode && !hasChosenSimulationMode) {
      setShowSimModal(true);
    } else {
      setShowSimModal(false);
    }
  }, [isOnTrail, isSimulationConfigMode, hasChosenSimulationMode, routerLocation.search]);

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
    
    if (view === 'simconfig' && !isSimulationConfigMode) {
      return;
    }
    
    // Preserve ?mode=sim if present
    const searchParams = new URLSearchParams(routerLocation.search);
    const modeParam = searchParams.get('mode');
    const devQuery = modeParam === 'sim' ? '?mode=sim' : '';
    
    if (isSimulationConfigMode && view === 'simconfig') {
      setSimConfigTab(true);
      const targetPath = '/simconfig' + devQuery;
      navigate(targetPath);
      return;
    } else {
      setSimConfigTab(false);
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
    <AnalyticsProvider>
      <AppLayout 
        currentView={currentView} 
        onViewChange={handleViewChange}
        title={focusedGroup || undefined}
      >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <SimulationModeModal open={showSimModal} onClose={() => setShowSimModal(false)} onSimulate={handleSimulate} />
        <EntryPointModal 
          open={entryModalOpen || distanceTrackingModalOpen} 
          onClose={() => {
            setEntryModalOpen(false);
            setDistanceTrackingModalOpen(false);
          }} 
          pois={pois}
          trails={trails}
          onConfirmEntryPoint={() => {
            setHasConfirmedEntryPointThisSession(true);
            setEntryModalOpen(false);
            setDistanceTrackingModalOpen(false);
          }}
        />

        {currentView === 'simconfig' ? (
          <SimulationConfigPanel />
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/map" replace />} />
            <Route path="/map" element={<MapView trails={trails} pois={pois} center={mapCenter} zoom={mapZoom} currentLocation={currentLocation || undefined} onPoiClick={handlePoiClick} />} />
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
            <Route path="/simconfig" element={<SimulationConfigPanel />} />
            <Route path="/debug-trail-structure" element={<DebugTrailStructure />} />
            <Route path="*" element={<NotFoundView />} />
          </Routes>
        )}
      </Box>
      
    </AppLayout>
    
    {/* POI Modal */}
    <Dialog
      open={!!selectedPOI}
      onClose={() => setSelectedPOI(null)}
      maxWidth="sm"
      fullWidth
      sx={{
        zIndex: 9999999,
        '& .MuiDialog-paper': {
          zIndex: 9999999
        },
        '& .MuiBackdrop-root': {
          zIndex: 9999998
        }
      }}
    >
      <DialogTitle>
        {selectedPOI?.title.rendered}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {selectedPOI?.content.rendered || selectedPOI?.description}
        </Typography>
        {selectedPOI?.featured_image && (
          <Box sx={{ mt: 2 }}>
            <img 
              src={selectedPOI.featured_image} 
              alt={selectedPOI.title.rendered}
              style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSelectedPOI(null)}>Close</Button>
      </DialogActions>
    </Dialog>

    {/* Google Places Modal */}
    <GooglePlacesModal
      open={googlePlacesModalOpen}
      onClose={() => setGooglePlacesModalOpen(false)}
      placeId={selectedPlaceId}
      poiName={selectedPoiName}
    />
    

    
    <Analytics />
    


      </AnalyticsProvider>
  );
}; 

// Component for places-based map view
const PlacesMapView: React.FC<{ trails: TrailConfig[], pois: POI[], currentLocation?: [number, number] }> = ({ trails, pois, currentLocation }) => {
  const { placeName } = useParams<{ placeName: string }>();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const [mapZoom, setMapZoom] = React.useState<number>(15);
  const [fitBounds, setFitBounds] = React.useState<[number, number][] | null>(null);

  // Memoize the POIs and center to prevent infinite re-renders
  const { pois: placePOIs, center } = React.useMemo(() => {
    return getPOIsByTag(pois, placeName || '');
  }, [pois, placeName]);

  // Use a ref to track if we've already processed the fitBounds from state
  const hasProcessedState = React.useRef(false);

  React.useEffect(() => {
    if (!hasProcessedState.current && routerLocation.state && routerLocation.state.fitBounds) {
      setFitBounds(routerLocation.state.fitBounds);
      // Remove fitBounds from state after using it (so it doesn't re-trigger on re-render)
      navigate(routerLocation.pathname, { replace: true, state: {} });
      hasProcessedState.current = true;
    } else if (placePOIs.length > 0 && !fitBounds) {
      // If no fitBounds in state, but we have POIs, fit to their bounds
      const coords = placePOIs
        .filter(poi => poi.coordinates)
        .map(poi => [poi.coordinates[1], poi.coordinates[0]] as [number, number]);
      setFitBounds(coords);
    }
  }, [placePOIs, navigate, routerLocation.state, fitBounds]);
  
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