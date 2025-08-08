import React, { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import { Box, Paper, Typography, styled } from '@mui/material';
import { LocomotionMode, Stop, TrailConfig, POI, TrailPoint } from '../../types';
import { Junction, getNavViewSplitData } from '../../utils/navViewSplit';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightLong, faMapPin, faCircleArrowRight } from '@fortawesome/free-solid-svg-icons';

import { useNavViewV3 } from '../../hooks/useNavViewV3';
import { useLocation } from '../../contexts/LocationContext';
import { metersToMiles } from '../../utils/distance';
import { calculateETA } from '../../utils/eta';
import { MiddleCardVariant } from '../NavView/MiddleCardVariant';

import { useTrailGraph } from '../../hooks/useTrailGraph';
import { calculatePreciseNetworkDistance } from '../../utils/trailGraph';
import { useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import Split from 'react-split';
import { determineTrailHeading, getEndpointNameForHeading } from '../../utils/trailHeading';
import './NavViewV2.css';
import { useTrailColors } from '../../hooks/useTrailColors';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useColorToken } from '../../hooks/useColorToken';


// Component loaded

// Styled components
const SectionHeader = styled(Box)(({ theme }) => ({
  display: 'inline-block',
  margin: '0 auto',
  padding: theme.spacing(0.5, 2),
  borderRadius: 20,
  backgroundColor: theme.palette.grey[300],
  color: theme.palette.text.primary,
  textAlign: 'center',
  textTransform: 'uppercase',
  fontWeight: 'bold',
  letterSpacing: 1,
  fontSize: '0.75rem',
  marginBottom: theme.spacing(1)
}));

const SubwayLine = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'color',
})<{ color?: string }>(({ theme, color }) => ({
  position: 'absolute',
  left: '50%',
  top: 0,
  bottom: 0,
  width: 4,
  transform: 'translateX(-50%)',
  backgroundColor: color || theme.palette.primary.main
}));

const StopMarker = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'color',
})<{ color?: string }>(({ theme, color }) => ({
  position: 'absolute',
  left: 62, // Fine-tuned for 4px line at 60px
  top: '50%',
  transform: 'translate(-50%, -50%)',
  width: 16,
  height: 16,
  borderRadius: '50%',
  backgroundColor: color || theme.palette.primary.main,
  border: `2px solid ${theme.palette.background.default}`,
  zIndex: 1,
}));

const TrailEndCard = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'color'
})<{ color?: string }>(({ theme, color }) => ({
  backgroundColor: color || theme.palette.primary.main,
  color: theme.palette.getContrastText(color || theme.palette.primary.main),
  padding: theme.spacing(0.5, 2),
  borderRadius: 50,
  textAlign: 'left',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
}));

const TrailEndMarker = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'color'
})<{ color?: string }>(({ color }) => ({
  width: 16,
  height: 16,
  borderRadius: '50%',
  backgroundColor: color || '#242424',
}));





// Add a new styled component for the 4-column layout
const StopRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'stretch',
  minHeight: 40,  // Reduced from 52 to 40
  width: '100%',
  position: 'relative',
});

const StopCol = styled(Box)<{ width?: number | string; direction?: 'row' | 'column' }>(({ width, direction }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: width || 'auto',
  position: 'relative',
  flexDirection: direction || 'row',
}));

interface NavViewV2Props {
  trailConfig: TrailConfig;
  allTrails: TrailConfig[];
  allTrailData: { id: string, points: TrailPoint[], endpoints: { start: [number, number], end: [number, number] } }[] | null;
  junctions: Junction[];
  pois: POI[];
  locomotionMode: LocomotionMode;
  onLocomotionChange: (mode: LocomotionMode) => void;
  onChangeEntryPoint?: () => void;
}



// Utility to classify elevation difference
function getElevationDescription(delta: number, nextStopName: string): string {
  if (isNaN(delta)) return 'Elevation data unavailable.';
  if (delta <= -20) return `Steep descent to ${nextStopName}`;
  if (delta <= -8) return `Steady descent to ${nextStopName}`;
  if (delta <= -2) return `Gentle decline to ${nextStopName}`;
  if (delta < 2) return `Flat to ${nextStopName}`;
  if (delta < 8) return `Gentle incline to ${nextStopName}`;
  if (delta < 20) return `Steady climb to ${nextStopName}`;
  return `Steep climb to ${nextStopName}`;
}



// Add SplitView component at the top (after imports, before NavViewV2)

interface SplitViewProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  leftAlign?: 'flex-start' | 'flex-end' | 'center';
  rightAlign?: 'flex-start' | 'flex-end' | 'center';
  rightColWidth?: string;
  leftColWidth?: string;
  slidingTransform?: string;
  onLeftClick?: () => void;
  onRightClick?: () => void;
  leftSwipeHandlers?: any;
  rightSwipeHandlers?: any;
  showCloseButton?: boolean;
  onClose?: () => void;
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch';
}

const SplitView: React.FC<SplitViewProps> = ({
  leftContent,
  rightContent,
  leftAlign = 'flex-end',
  rightAlign = 'flex-end',
  rightColWidth = 'calc(50% + 20px)',
  leftColWidth = 'calc(50% - 85px)',
  slidingTransform = 'translateX(0)',
  onLeftClick,
  onRightClick,
  leftSwipeHandlers,
  rightSwipeHandlers,
  showCloseButton,
  onClose,
  alignItems = 'stretch',
}) => {
  const splitViewRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const rightContentRef = useRef<HTMLDivElement>(null);
  const [rightContentHeight, setRightContentHeight] = useState<number>(0);
  


  // Measure the right content height
  useLayoutEffect(() => {
    if (rightContentRef.current) {
      setRightContentHeight(rightContentRef.current.offsetHeight);
    }
  }, [rightContent]);

  useLayoutEffect(() => {
    // Layout effect for split view dimensions
  });
  return (
    <div
      ref={splitViewRef}
      className="split-slider"
      style={{
        width: '100%',
        overflowX: 'hidden',
        position: 'relative',
        marginBottom: 0,
        // borderBottom: '1px solid #333',
        // border: '3px solid blue', // DEBUG
      }}
    >
      <div
        className="split-columns"
        style={{
          display: 'flex',
          alignItems: 'stretch', // force columns to stretch vertically
          width: 'calc(200% - 30px)',
          transform: slidingTransform,
          transition: 'transform 0.3s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div
          ref={leftColRef}
          style={{
            width: leftColWidth,
            minWidth: 0,
            zIndex: 2,
            display: 'flex',
            alignSelf: 'stretch', // force stretch
            height: 'auto', // allow to grow with content
            // border: '3px solid green', // DEBUG
          }}
          onClick={onLeftClick}
          {...(leftSwipeHandlers || {})}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: leftAlign === 'flex-end' ? 'flex-end' : (leftAlign === 'center' ? 'center' : 'flex-start'),
            height: '100%',
            position: 'relative'
          }}>
            {leftContent}
          </div>
        </div>
        <div
          ref={rightColRef}
          style={{
            width: rightColWidth,
            minWidth: 0,
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignSelf: 'stretch', // stretch to match left column height
            height: 'auto', // allow to grow with content
            position: 'relative',
            paddingRight: '0',
            // border: '3px solid orange', // DEBUG
          }}
          onClick={onRightClick}
          {...(rightSwipeHandlers || {})}
        >
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            justifyContent: rightAlign === 'flex-end' ? 'flex-end' : (rightAlign === 'center' ? 'center' : 'flex-start'),
            height: '100%',
            position: 'relative'
          }}>
            <div style={{ paddingRight: 48 }}>
              <div ref={rightContentRef}>
                {rightContent}
              </div>
            </div>
            {showCloseButton && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onClose && onClose();
                }}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: rightAlign === 'flex-end' ? 'auto' : '10px',
                  bottom: rightAlign === 'flex-end' ? '10px' : 'auto',
                  height: rightContentHeight > 0 ? `${rightContentHeight}px` : 'auto',
                  width: 40,
                  background: '#35393d',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.9,
                  transition: 'opacity 0.2s',
                  color: 'white',
                  fontSize: '2rem',
                  fontWeight: 700
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.9')}
                aria-label="Close right column"
              >
                <FontAwesomeIcon icon={faRightLong} style={{ color: '#23272a', marginLeft: -11 }} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * NavViewV2 Component
 * 
 * Main navigation view that displays:
 * - POI list with distances and ETAs
 * - Middle card showing current status and entry point distance
 * - Split view for junction branches
 * - Entry point integration with consistent distance calculations
 * 
 * Features:
 * - Network distance calculations for accurate trail routing
 * - Entry point display with distinctive pin icon
 * - Responsive layout with draggable sections
 * - Real-time distance and ETA updates
 */
export const NavViewV2: React.FC<NavViewV2Props> = ({
  trailConfig,
  allTrails,
  allTrailData,
  junctions,
  pois,
  locomotionMode,
  onLocomotionChange,
  onChangeEntryPoint
}) => {
  // Controlled split state and refs (must be at the top, before any early returns)
  const [splitSizes, setSplitSizes] = useState([60, 40]);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startSizesRef = useRef([60, 40]);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useRouterLocation();
  const { stops, userStop, activeTrailId, currentLocation: navViewCurrentLocation } = useNavViewV3({
    allTrails,
    allTrailData,
    junctions,
    pois,
  });
  // Get trail graph for network distance calculations
  const { graph } = useTrailGraph();
  const getTrailColor = useTrailColors();
  const muiTheme = useMuiTheme();
  const getToken = useColorToken();
  
  // Get user location and entry point data
  const { entryPoint, currentLocation, previousLocation, simDirection, isSimulationMode } = useLocation();

  // Refs for layout management and debugging
  const splitPaneRef = useRef<HTMLDivElement>(null);
  const middleSectionRef = useRef<HTMLDivElement>(null);
  const navContextCardRef = useRef<HTMLDivElement>(null);

  // Convert precise network distance from meters to miles for display (legacy - now using entryPointDistanceMiles)
  const preciseNetworkDistanceMiles = null;


  const activeTrail = useMemo(() => {
    return allTrails.find(t => t.id === activeTrailId) || allTrails[0];
  }, [allTrails, activeTrailId]);

  // Correctly filter for stops ahead on the active trail
  const aheadStops = useMemo(() => {
    if (!userStop) return [];
    const userDistance = userStop.metadata.distance || 0;
    

    
    if (simDirection === 'bottom') {
      // When traveling "backwards", stops with smaller distance are ahead.
      // We need to reverse the list to sort them from closest to farthest.
      const stopsBehind = stops.filter(s => s.trailId === activeTrailId && (s.metadata.distance || 0) < userDistance);
      return stopsBehind.slice().reverse();
    } else {
      // Default "forwards" direction. Stops with greater distance are ahead.
      // The list is already sorted closest to farthest.
      const aheadStops = stops.filter(s => s.trailId === activeTrailId && (s.metadata.distance || 0) > userDistance);

      return aheadStops;
    }
  }, [stops, userStop, activeTrailId, simDirection, entryPoint]);

  // Correctly filter for stops behind on the active trail
  const behindStops = useMemo(() => {
    if (!userStop) return [];
    const userDistance = userStop.metadata.distance || 0;
    

    
    if (simDirection === 'bottom') {
      // When traveling "backwards", stops with greater distance are behind.
      // The list is already sorted closest to farthest.
      return stops.filter(s => s.trailId === activeTrailId && (s.metadata.distance || 0) > userDistance);
    } else {
      // Default "forwards" direction. Stops with smaller distance are behind.
      // We need to reverse the list to sort them from closest to farthest.
      const stopsBehind = stops.filter(s => s.trailId === activeTrailId && (s.metadata.distance || 0) < userDistance);
      const behindStops = stopsBehind.slice().reverse();

      return behindStops;
    }
  }, [stops, userStop, activeTrailId, simDirection, entryPoint]);
  
  // Get split view data for ahead section
  const aheadSplitData = useMemo(() => getNavViewSplitData(
    activeTrailId,
    aheadStops,
    stops,
    allTrails,
    junctions,
    navViewCurrentLocation,
    allTrailData,
    2,
    undefined,
    simDirection
  ), [activeTrailId, aheadStops, stops, allTrails, junctions, navViewCurrentLocation, allTrailData, simDirection]);



  // Get split view data for behind section
  // The behindStops list is now always correctly sorted (closest to farthest), so we no longer need to reverse it here.
  const behindSplitData = useMemo(() => getNavViewSplitData(
    activeTrailId,
    behindStops,
    stops,
    allTrails,
    junctions,
    navViewCurrentLocation,
    allTrailData,
    2,
    undefined,
    simDirection
  ), [activeTrailId, behindStops, stops, allTrails, junctions, navViewCurrentLocation, allTrailData, simDirection]);



  // Determine the correct endpoint name for the heading
  let endpointName = 'Unknown';
  
  if (activeTrail && allTrailData && currentLocation) {
    const trailData = allTrailData.find(t => t.id === activeTrail.id);
    if (trailData && activeTrail.endpointNames) {
      let headingDirection: 'toward_start' | 'toward_end' | null = null;
      
      if (isSimulationMode) {
        // Use simulation direction
        headingDirection = simDirection === 'top' ? 'toward_end' : 'toward_start';
      } else {
        // Use real heading detection
        headingDirection = determineTrailHeading(currentLocation!, trailData.points, previousLocation || undefined);
      }
      
      endpointName = getEndpointNameForHeading(headingDirection, activeTrail.endpointNames);
    }
  }

  // Find the next stop ahead (first in aheadStops)
  const nextStop = aheadStops.length > 0 ? aheadStops[0] : null;

  // Find user and next stop elevations
  let userElevation: number | undefined = undefined;
  let nextStopElevation: number | undefined = undefined;
  if (activeTrail && allTrailData) {
    const trailData = allTrailData.find(t => t.id === activeTrail.id);
    if (trailData && trailData.points) {
      // Find nearest trail point to user
      if (userStop) {
        const nearestUserPoint = trailData.points.reduce((closest, pt) => {
          const d = Math.abs((userStop.metadata.distance || 0) - (pt.distance || 0));
          return d < Math.abs((closest.distance || 0) - (userStop.metadata.distance || 0)) ? pt : closest;
        }, trailData.points[0]);
        userElevation = nearestUserPoint.elevation;
      }
      // Find nearest trail point to next stop
      if (nextStop) {
        const nearestNextPoint = trailData.points.reduce((closest, pt) => {
          const d = Math.abs((nextStop.metadata.distance || 0) - (pt.distance || 0));
          return d < Math.abs((closest.distance || 0) - (nextStop.metadata.distance || 0)) ? pt : closest;
        }, trailData.points[0]);
        nextStopElevation = nearestNextPoint.elevation;
      }
    }
  }
  let elevationDescription = 'Elevation data unavailable.';
  if (typeof userElevation === 'number' && typeof nextStopElevation === 'number' && nextStop) {
    elevationDescription = getElevationDescription(nextStopElevation - userElevation, nextStop.name);
  }

  // Calculate distance from entry point to current location using network distance
  let entryPointDistanceMiles: number | null = null;
  if (userStop && graph) {
    // Find the entry point stop from the stops list to get the correct coordinate format
    const entryPointStop = stops.find(stop => stop.type === 'entry');
    if (entryPointStop && entryPointStop.metadata?.coordinates) {

      
      // Log the actual distance calculation details
      if (entryPointStop && entryPointStop.metadata?.coordinates) {
        const userCoords: [number, number] = [userStop.metadata.coordinates[1], userStop.metadata.coordinates[0]];
        const entryCoords: [number, number] = [entryPointStop.metadata.coordinates[1], entryPointStop.metadata.coordinates[0]];
        const networkDistance = calculatePreciseNetworkDistance(graph, userCoords, entryCoords);

      }

      
      // Use the same coordinate conversion as getStopMetrics
      const userCoords: [number, number] = [userStop.metadata.coordinates[1], userStop.metadata.coordinates[0]];
      const entryCoords: [number, number] = [entryPointStop.metadata.coordinates[1], entryPointStop.metadata.coordinates[0]];
      const networkDistance = calculatePreciseNetworkDistance(graph, userCoords, entryCoords);
      if (networkDistance !== null) {
        entryPointDistanceMiles = metersToMiles(networkDistance);

      }
    }
  }

  // Helper to get network distance and ETA for a stop
  /**
   * Calculates distance and ETA from user's current location to a specific stop
   * Uses network distance calculation for accurate trail-based routing
   * 
   * @param stop - The stop (POI, junction, endpoint, or entry point) to calculate distance to
   * @returns Object containing distance in miles and ETA in minutes, or null if calculation fails
   */
  const getStopMetrics = (stop: Stop): { distanceMiles: number | null, etaMinutes: number | null } => {
    // Validate required data is available
    if (!graph || !userStop || !userStop.metadata?.coordinates || !stop.metadata?.coordinates) {
      return { distanceMiles: null, etaMinutes: null };
    }
    
    // Convert coordinates to [lng, lat] format for network distance calculation
    const userCoords: [number, number] = [userStop.metadata.coordinates[1], userStop.metadata.coordinates[0]];
    const stopCoords: [number, number] = [stop.metadata.coordinates[1], stop.metadata.coordinates[0]];
    
    // Calculate precise network distance using trail graph
    const networkDistance = calculatePreciseNetworkDistance(graph, userCoords, stopCoords);
    if (networkDistance === null) return { distanceMiles: null, etaMinutes: null };
    
    // Convert to miles and calculate ETA based on locomotion mode
    const distanceMiles = metersToMiles(networkDistance);
    const etaMinutes = calculateETA(networkDistance, locomotionMode);
    
    return { distanceMiles, etaMinutes };
  };

  /**
   * Memoized calculation of distance and ETA metrics for all stops
   * Includes stops from ahead/behind sections and all split branches
   * Optimized for performance to avoid recalculating on every render
   */
  const stopMetricsMap = useMemo(() => {
    if (!graph || !userStop || !userStop.metadata?.coordinates) return {};
    
    const metrics: Record<string, { distanceMiles: number | null, etaMinutes: number | null }> = {};
    
    // Gather all stops from ahead, behind, and all split branches for comprehensive metrics
    const allStops: Stop[] = [
      ...aheadStops,
      ...behindStops,
      ...(aheadSplitData.leftBranch?.stops || []),
      ...(aheadSplitData.rightBranch?.stops || []),
      ...(behindSplitData.leftBranch?.stops || []),
      ...(behindSplitData.rightBranch?.stops || []),
      ...(aheadSplitData.afterJunction || []),
      ...(aheadSplitData.beforeJunction || []),
      ...(behindSplitData.afterJunction || []),
      ...(behindSplitData.beforeJunction || []),
    ];


    
    // Calculate metrics for each stop
    allStops.forEach(stop => {
      metrics[stop.id] = getStopMetrics(stop);
    });
    
    return metrics;
  }, [graph, userStop, locomotionMode, aheadStops, behindStops, aheadSplitData, behindSplitData, entryPoint]);

  // Ref to measure ahead section height
  const aheadRef = useRef<HTMLDivElement>(null);
  const [aheadHeight, setAheadHeight] = useState(0);
  const MAX_AHEAD_HEIGHT = 400;
  
  // Measure ahead section height on render and resize
  React.useLayoutEffect(() => {
    function updateAheadHeight() {
      if (aheadRef.current) {
        setAheadHeight(aheadRef.current.offsetHeight);
      }
    }
    updateAheadHeight();
    window.addEventListener('resize', updateAheadHeight);
    return () => window.removeEventListener('resize', updateAheadHeight);
  }, [stops, aheadSplitData]);

  // Sticky mode debug refs
  const stickyContainerRef = useRef<HTMLDivElement>(null);
  const stickyMiddleSectionRef = useRef<HTMLDivElement>(null);
  const stickyNavContextCardRef = useRef<HTMLDivElement>(null);

  // Removed temporary layout debug warnings

  /**
   * Calculates and stores the precise network distance from entry point to user's current location
   * This distance is used by the middle card to show "distance from starting point"
   * Coordinates are converted from [lat, lng] to [lng, lat] format for consistency with POI calculations
   */


  // Sliding split view state for ahead and behind
  const [aheadFocus, setAheadFocus] = useState<'left' | 'right'>('left');
  const [behindFocus, setBehindFocus] = useState<'left' | 'right'>('left');

  // Helper: determine if the center junction pill should show the arrow
  const shouldShowJunctionArrow = (splitData: ReturnType<typeof getNavViewSplitData>): boolean => {
    // Show the arrow whenever a junctionStop is detected (i.e., split logic is triggered)
    return !!splitData.junctionStop;
  };

  // Preserve sliding state when split data changes but still exists
  // Only reset when split view disappears entirely
  React.useEffect(() => {
    const hasAheadSplit = !!(aheadSplitData.leftBranch || aheadSplitData.rightBranch);
    const hasBehindSplit = !!(behindSplitData.leftBranch || behindSplitData.rightBranch);
    

    
    // Only reset aheadFocus if split view disappears
    if (!hasAheadSplit) {
      setAheadFocus('left');
    }
    
    // Only reset behindFocus if split view disappears
    if (!hasBehindSplit) {
      setBehindFocus('left');
    }
  }, [aheadSplitData.leftBranch, aheadSplitData.rightBranch, behindSplitData.leftBranch, behindSplitData.rightBranch, aheadSplitData.beforeJunction.length, aheadFocus]);

  // Swipe/tap handlers for ahead split
  const handleAheadLeft = () => {
    setAheadFocus('left');
  };
  const handleAheadRight = () => {
    setAheadFocus('right');
  };
  const toggleAheadRight = () => {
    setAheadFocus(prev => (prev === 'right' ? 'left' : 'right'));
  };
  // Swipe/tap handlers for behind split
  const handleBehindLeft = () => {
    setBehindFocus('left');
  };
  const handleBehindRight = () => {
    setBehindFocus('right');
  };
  const toggleBehindRight = () => {
    setBehindFocus(prev => (prev === 'right' ? 'left' : 'right'));
  };

  // Close button handlers for split views
  const handleAheadClose = () => {
    setAheadFocus('left');
  };
  const handleBehindClose = () => {
    setBehindFocus('left');
  };

  // Touch swipe detection helpers
  function useSwipe(onLeft: () => void, onRight: () => void) {
    const touchStartX = useRef<number | null>(null);
    const threshold = 30; // px
    return {
      onTouchStart: (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
      },
      onTouchEnd: (e: React.TouchEvent) => {
        if (touchStartX.current !== null) {
          const deltaX = e.changedTouches[0].clientX - touchStartX.current;
          if (deltaX > threshold) {
            onLeft();
          } else if (deltaX < -threshold) {
            onRight();
          }
        }
        touchStartX.current = null;
      }
    };
  }

  const aheadLeftSwipe = useSwipe(handleAheadLeft, handleAheadRight);
  const aheadRightSwipe = useSwipe(handleAheadLeft, handleAheadRight);
  const behindLeftSwipe = useSwipe(handleBehindLeft, handleBehindRight);
  const behindRightSwipe = useSwipe(handleBehindLeft, handleBehindRight);

  // Auto-scroll ahead section to bottom to show closest POIs when the list is long
  // Only run this in split/drag mode where the ahead section is actually scrollable
  React.useEffect(() => {
    if (aheadRef.current && aheadHeight >= MAX_AHEAD_HEIGHT) {
      aheadRef.current.scrollTop = aheadRef.current.scrollHeight;
    }
  }, [aheadSplitData, aheadHeight]);

  const behindStickyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Height logging for debugging (removed)
  }, []);

  useLayoutEffect(() => {
    // Split pane layout effect (removed debug logging)
  });
  useLayoutEffect(() => {
    // Behind section layout effect (removed debug logging)
  });

  useLayoutEffect(() => {
    // Layout effect for behind section dimensions
  });



  // Check if we have a current location
  if (!userStop) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>No current location available</Typography>
      </Box>
    );
  }

  /**
   * Renders a single stop (POI, junction, endpoint, or entry point) in the navigation list
   * Uses a 4-column layout: Distance | Trail Line + Icon | ETA | Name
   * 
   * @param stop - The stop to render
   * @param color - Optional color override for the stop
   * @param isLast - Whether this is the last stop in the list
   * @returns JSX element for the stop
   */
  const renderStop = (
    stop: Stop,
    color?: string,
    isLast: boolean = false,
    opts?: { onJunctionRightClick?: () => void; showJunctionArrow?: boolean }
  ) => {
    let stopColor = color || getTrailColor(stop.trailId, activeTrail.color);
    const metrics = stopMetricsMap[stop.id] || { distanceMiles: null, etaMinutes: null };
    // For junctions, use the color of the trail it connects to (not the current trail)
    if (stop.type === 'junction' && stop.metadata.branchTrailIds && stop.metadata.branchTrailIds.length > 0) {
      const connectedTrailId = stop.metadata.branchTrailIds[0]; // Get the first connected trail
      const connectedTrail = allTrails.find(t => t.id === connectedTrailId);
      if (connectedTrail) {
        stopColor = getTrailColor(connectedTrail.id, connectedTrail.color);
      }
      // Render junction with special background.
      // Light mode: white content; Dark mode: content matches background for subtle contrast
      const junctionContentColor = (muiTheme as any).palette?.mode === 'dark'
        ? (muiTheme as any).palette?.background?.default || '#23272a'
        : '#fff';
      // Render junction pill
      return (
        <StopRow key={stop.id} sx={{ borderBottom: isLast ? 'none' : `1px solid ${(muiTheme as any).palette.divider}`, background: stopColor, borderRadius: 8 }}>
          {/* Distance (left) */}
          <StopCol width={36} direction="column">
            <Typography variant="caption" sx={{ lineHeight: 1, fontWeight: 500, color: junctionContentColor }}>
              {metrics.distanceMiles !== null ? metrics.distanceMiles.toFixed(1) : '--'}
            </Typography>
            <Typography variant="caption" sx={{ lineHeight: 1, fontSize: '0.75em', color: junctionContentColor }}>
              mi
            </Typography>
          </StopCol>
          {/* Subway line & dot (center) */}
          <StopCol width={36} sx={{ position: 'relative', minHeight: 52 }}>
            <SubwayLine color={junctionContentColor} />
            <StopMarker color={junctionContentColor} sx={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', position: 'absolute' }} />
          </StopCol>
          {/* ETA (right of line) */}
          <StopCol width={36} direction="column">
            {metrics.etaMinutes !== null && metrics.etaMinutes >= 60 ? (
              <>
                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
                  <Typography variant="caption" sx={{ lineHeight: 1, fontWeight: 500, color: junctionContentColor }}>
                    {Math.floor(Math.round(metrics.etaMinutes) / 60)}
                  </Typography>
                  <Typography variant="caption" sx={{ lineHeight: 1, fontSize: '0.75em', ml: 0.5, color: junctionContentColor }}>
                    hr
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
                  <Typography variant="caption" sx={{ lineHeight: 1, fontWeight: 500, color: junctionContentColor }}>
                    {Math.round(metrics.etaMinutes) % 60}
                  </Typography>
                  <Typography variant="caption" sx={{ lineHeight: 1, fontSize: '0.75em', ml: 0.5, color: junctionContentColor }}>
                    min
                  </Typography>
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
                <Typography variant="caption" sx={{ lineHeight: 1, fontWeight: 500, color: junctionContentColor }}>
                  {metrics.etaMinutes !== null ? Math.round(metrics.etaMinutes) : '--'}
                </Typography>
                <Typography variant="caption" sx={{ lineHeight: 1, fontSize: '0.75em', ml: 0.5, color: junctionContentColor }}>
                  min
                </Typography>
              </Box>
            )}
          </StopCol>
          {/* POI Name (rightmost, flexes) */}
          <StopCol sx={{ flex: 1, justifyContent: 'flex-start', pl: 1, pr: 4 }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 600, 
                color: junctionContentColor, 
                fontSize: '0.8rem',
                cursor: 'default',
              }}
            >
              {stop.name}
              {stop.metadata.groupCount && ` (${stop.metadata.groupCount})`}
            </Typography>
          </StopCol>
          {/* Right-side arrow icon inside the junction pill (single-column only) */}
          {opts?.showJunctionArrow && (
            <Box
              onClick={(e) => {
                e.stopPropagation();
                opts?.onJunctionRightClick && opts.onJunctionRightClick();
              }}
              sx={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                zIndex: 3
              }}
              aria-label="View right branch"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  opts?.onJunctionRightClick && opts.onJunctionRightClick();
                }
              }}
            >
              <FontAwesomeIcon icon={faCircleArrowRight} style={{ color: junctionContentColor, fontSize: 18 }} />
            </Box>
          )}
        </StopRow>
      );
    }

    // Special rendering for entry point with distinctive pin icon and styling
    if (stop.type === 'entry') {
      return (
        <StopRow key={stop.id} sx={{ borderBottom: isLast ? 'none' : `1px solid ${(muiTheme as any).palette.divider}` }}>
          {/* Distance from user to entry point (left column) */}
          <StopCol width={36} direction="column">
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontWeight: 500 }}>
              {metrics.distanceMiles !== null ? metrics.distanceMiles.toFixed(1) : '--'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontSize: '0.75em' }}>
              mi
            </Typography>
          </StopCol>
          {/* Trail line with centered pin icon (center column) */}
          <StopCol width={36} sx={{ position: 'relative', minHeight: 52 }}>
            <SubwayLine color={stopColor} />
            {/* Pin icon in circle with trail color background and outline */}
            <Box sx={{ 
              left: '50%', 
              top: '50%', 
              transform: 'translate(-50%, -50%)', 
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              backgroundColor: stopColor,
              borderRadius: '50%',
              border: (muiTheme as any).palette.mode === 'light' ? '2px solid #fff' : '2px solid #242424',
            }}>
              <FontAwesomeIcon 
                icon={faMapPin} 
                style={{ 
                  color: (muiTheme as any).palette.mode === 'light' ? '#fff' : '#242424', 
                  fontSize: '16px'
                }} 
              />
            </Box>
          </StopCol>
          {/* ETA (right of line) */}
          <StopCol width={36} direction="column">
            {metrics.etaMinutes !== null && metrics.etaMinutes >= 60 ? (
              <>
                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontWeight: 500 }}>
                    {Math.floor(Math.round(metrics.etaMinutes) / 60)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontSize: '0.75em', ml: 0.5 }}>
                    hr
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontWeight: 500 }}>
                    {Math.round(metrics.etaMinutes) % 60}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontSize: '0.75em', ml: 0.5 }}>
                    min
                  </Typography>
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontWeight: 500 }}>
                  {metrics.etaMinutes !== null ? Math.round(metrics.etaMinutes) : '--'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontSize: '0.75em', ml: 0.5 }}>
                  min
                </Typography>
              </Box>
            )}
          </StopCol>
          {/* Entry Point Name in pill-shaped container (rightmost column) */}
          <StopCol sx={{ flex: 1, justifyContent: 'flex-start', pl: 1 }}>
            <Box
              sx={{
                backgroundColor: stopColor,
                color: (muiTheme as any).palette.mode === 'light' ? '#fff' : getToken('entryPillText', '#242424'),
                borderRadius: '12px',
                padding: '4px 12px',
                display: 'inline-block',
                fontWeight: 600,
                fontSize: '0.75rem',
                cursor: 'default',
                border: (muiTheme as any).palette.mode === 'light' ? '2px solid #fff' : `2px solid ${getToken('entryPillText', '#242424')}`,
              }}
            >
              {stop.name}
            </Box>
          </StopCol>
        </StopRow>
      );
    }

    if (stop.type === 'endpoint') {
      const endpointContentColor = (muiTheme as any).palette?.mode === 'light'
        ? '#fff'
        : getToken('endpointPillText', '#242424');
      return (
        <Box key={stop.id} sx={{ position: 'relative', pt: 0, pb: 1 }}>
          <TrailEndCard elevation={0} color={stopColor} sx={{ background: stopColor, color: endpointContentColor, borderRadius: 50, display: 'flex', alignItems: 'center', padding: '0.5em 1.5em', boxShadow: 'none' }}>
            <TrailEndMarker color={endpointContentColor} />
            <Box sx={{ width: 180, flex: 1, minWidth: 0 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  width: '100%',
                  fontSize: 'clamp(10px, 2.5vw, 13px)',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: endpointContentColor, 
                  fontWeight: 700
                }}
              >
                {`TRAIL END: ${stop.name}`}
              </Typography>
            </Box>
          </TrailEndCard>
        </Box>
      );
    }

    return (
      <StopRow key={stop.id} sx={{ borderBottom: isLast ? 'none' : `1px solid ${(muiTheme as any).palette.divider}` }}>
        {/* Distance (left) */}
        <StopCol width={36} direction="column">
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontWeight: 500 }}>
            {metrics.distanceMiles !== null ? metrics.distanceMiles.toFixed(1) : '--'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontSize: '0.75em' }}>
            mi
          </Typography>
        </StopCol>
        {/* Subway line & dot (center) */}
        <StopCol width={36} sx={{ position: 'relative', minHeight: 52 }}>
          <SubwayLine color={stopColor} />
          <StopMarker color={stopColor} sx={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', position: 'absolute' }} />
        </StopCol>
        {/* ETA (right of line) */}
        <StopCol width={36} direction="column">
          {metrics.etaMinutes !== null && metrics.etaMinutes >= 60 ? (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontWeight: 500 }}>
                  {Math.floor(Math.round(metrics.etaMinutes) / 60)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontSize: '0.75em', ml: 0.5 }}>
                  hr
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontWeight: 500 }}>
                  {Math.round(metrics.etaMinutes) % 60}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontSize: '0.75em', ml: 0.5 }}>
                  min
                </Typography>
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontWeight: 500 }}>
                {metrics.etaMinutes !== null ? Math.round(metrics.etaMinutes) : '--'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontSize: '0.75em', ml: 0.5 }}>
                min
              </Typography>
            </Box>
          )}
        </StopCol>
        {/* POI Name (rightmost, flexes) */}
        <StopCol sx={{ flex: 1, justifyContent: 'flex-start', pl: 1 }}>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 600, 
              color: stopColor, 
              fontSize: '0.8rem',
              cursor: stop.type === 'poi' ? 'pointer' : 'default',
              textAlign: 'left',
              '&:hover': stop.type === 'poi' ? {
                textDecoration: 'underline',
                opacity: 0.8
              } : {}
            }}
            onClick={() => {
              if (stop.type === 'poi') {
                // Preserve simulation mode when navigating to list view
                const searchParams = new URLSearchParams();
                const modeParam = location.search.match(/mode=([^&]+)/)?.[1];
                if (modeParam === 'sim') {
                  searchParams.set('mode', 'sim');
                }
                searchParams.set('group', stop.name);
                
                const url = `/list?${searchParams.toString()}`;
                navigate(url, { state: { groupName: stop.name } });
              }
            }}
          >
            {stop.name}
            {stop.metadata.groupCount && ` (${stop.metadata.groupCount})`}
          </Typography>
        </StopCol>
      </StopRow>
    );
  };

  /**
   * Renders a list of stops with consistent styling and proper spacing
   * 
   * @param stops - Array of stops to render
   * @param color - Optional color override for all stops in the list
   * @returns Array of JSX elements for the stops
   */
  const renderStopList = (
    stops: Stop[],
    color?: string
  ) => {
    const listColor = color || activeTrail.color;
    

    
    return stops.map((stop, index) =>
      renderStop(stop, listColor, index === stops.length - 1)
    );
  };
  
  /**
   * Mouse/touch event handlers for dragging the middle section to resize ahead/behind areas
   * Enables user to adjust the split between navigation sections
   */
  const onMiddleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    // Store initial position for scroll detection
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    
    // Add a one-time touchmove listener to detect if this is a scroll gesture
    const detectScroll = (moveEvent: TouchEvent) => {
      const currentY = moveEvent.touches[0].clientY;
      const currentX = moveEvent.touches[0].clientX;
      const deltaY = Math.abs(currentY - startY);
      const deltaX = Math.abs(currentX - startX);
      
      // If this looks like a scroll gesture (more vertical than horizontal movement)
      if (deltaY > deltaX && deltaY > 5) {
        // This is likely a scroll, don't start dragging
        document.removeEventListener('touchmove', detectScroll);
        return;
      }
      
      // This is likely a drag gesture, start dragging
      document.removeEventListener('touchmove', detectScroll);
      draggingRef.current = true;
      startYRef.current = startY;
      startSizesRef.current = [...splitSizes];
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('touchmove', onDrag, { passive: false });
      document.addEventListener('mouseup', onDragEnd);
      document.addEventListener('touchend', onDragEnd);
    };
    
    // For mouse events, start dragging immediately
    if (!('touches' in e)) {
      draggingRef.current = true;
      startYRef.current = startY;
      startSizesRef.current = [...splitSizes];
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', onDragEnd);
    } else {
      // For touch events, add scroll detection
      document.addEventListener('touchmove', detectScroll, { passive: true });
      // Clean up if touch ends without movement
      const cleanup = () => {
        document.removeEventListener('touchmove', detectScroll);
        document.removeEventListener('touchend', cleanup);
      };
      document.addEventListener('touchend', cleanup);
    }
  };

  /**
   * Handles drag movement to resize the ahead/behind sections
   * Calculates new split sizes based on mouse/touch position
   * Enforces minimum sizes for usability
   */
  const onDrag = (e: MouseEvent | TouchEvent) => {
    if (!draggingRef.current || !containerRef.current) return;
    
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    const containerRect = containerRef.current.getBoundingClientRect();
    const totalHeight = containerRect.height;
    const deltaY = clientY - startYRef.current;
    
    // Calculate new heights based on drag delta
    let aheadHeight = (startSizesRef.current[0] / 100) * totalHeight + deltaY;
    let behindHeight = totalHeight - aheadHeight - 160; // 160px fixed middle height
    
    // Clamp to minimum sizes for usability
    const minAhead = 100;
    const minBehind = 200;
    aheadHeight = Math.max(minAhead, Math.min(totalHeight - minBehind - 160, aheadHeight));
    behindHeight = totalHeight - aheadHeight - 160;
    
    // Convert to percentages and update state
    const aheadPct = (aheadHeight / totalHeight) * 100;
    const behindPct = (behindHeight / totalHeight) * 100;
    setSplitSizes([aheadPct, behindPct]);
    e.preventDefault();
  };

  /**
   * Cleans up drag event listeners when dragging ends
   * Resets dragging state and removes document event listeners
   */
  const onDragEnd = () => {
    draggingRef.current = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchend', onDragEnd);
  };
  


  return (
    <div ref={containerRef} style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, background: (muiTheme as any).palette?.background?.default || undefined as any }}>
      {aheadHeight < MAX_AHEAD_HEIGHT ? (
        // Sticky mode: ahead section natural height, middle directly below, behind fills rest
        <>
          <div ref={stickyContainerRef}
            style={{
              borderRadius: 10,
              overflowX: 'hidden',
              overflowY: 'hidden',
              background: 'transparent',
              margin: '24px 0',
              marginLeft: 'auto',
              marginRight: 'auto',
              width: '100vw',
              maxWidth: '100vw',
              boxSizing: 'border-box',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div ref={aheadRef} style={{ 
              padding: '0 16px', 
              textAlign: 'center', 
              marginBottom: 0,  // Remove bottom margin
              flexShrink: 0
            }}>
              {renderStopList(aheadSplitData.afterJunction.slice().reverse(), activeTrail.color)}
              {(aheadSplitData.leftBranch || aheadSplitData.rightBranch) && (
                <SplitView
                  leftContent={renderStopList(aheadSplitData.leftBranch?.stops.slice().reverse() || [], aheadSplitData.leftBranch?.color)}
                  rightContent={renderStopList(aheadSplitData.rightBranch?.stops.slice().reverse() || [], aheadSplitData.rightBranch?.color)}
                  leftAlign="flex-end"
                  rightAlign="flex-end"
                  rightColWidth="calc(50% - 0px)"
                  leftColWidth="calc(50% - 85px)"
                  slidingTransform={aheadFocus === 'left' ? 'translateX(0)' : 'translateX(calc(-50% + 85px))'}
                  onLeftClick={handleAheadLeft}
                  onRightClick={handleAheadRight}
                  leftSwipeHandlers={aheadLeftSwipe}
                  rightSwipeHandlers={aheadRightSwipe}
                  showCloseButton={aheadFocus !== 'left'}
                  onClose={handleAheadClose}
                />
              )}
              {(() => {
                const showArrow = shouldShowJunctionArrow(aheadSplitData);
                return aheadSplitData.junctionStop && renderStop(
                  aheadSplitData.junctionStop,
                  activeTrail.color,
                  false,
                  { onJunctionRightClick: toggleAheadRight, showJunctionArrow: showArrow }
                );
              })()}
              {renderStopList(
                aheadSplitData.beforeJunction.slice().reverse(),
                activeTrail.color
              )}
            </div>
            {/* Middle Section - Current Location (Unified) */}
            <div ref={stickyMiddleSectionRef} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              minHeight: 160, 
              maxHeight: 'none', 
              flexShrink: 0, 
              width: '100vw', 
              maxWidth: '100vw', 
              overflowX: 'hidden', 
              overflowY: 'visible',
              boxSizing: 'border-box',
              padding: 0,
              margin: 0,
            }}>
              <div ref={stickyNavContextCardRef} style={{ 
                width: '100vw', 
                maxWidth: '100vw', 
                margin: 0, 
                boxSizing: 'border-box', 
                overflowX: 'hidden', 
                display: 'flex', 
                justifyContent: 'center' 
              }}>

                <MiddleCardVariant
                  destination={endpointName}
                  trail={activeTrail.name}
                  distanceMiles={userStop ? metersToMiles(userStop.metadata.distance || 0) : 0}
                  description={elevationDescription}
                  mode={locomotionMode}
                  amenities={['food', 'water', 'restroom', 'cafe', 'store', 'accessible']}
                  onLocomotionChange={onLocomotionChange}
                  onChangeEntryPoint={onChangeEntryPoint}
                  entryPointDistanceMiles={entryPointDistanceMiles}
                  preciseNetworkDistanceMiles={preciseNetworkDistanceMiles}
                  borderColor={activeTrail.color}
                  highlightColor={activeTrail.color}
                />
              </div>
            </div>
            <div ref={behindStickyRef} style={{ 
              padding: '0 16px', 
              textAlign: 'center', 
              marginTop: 0,  // Remove top margin
              overflowY: 'auto', // allow scrolling
              overflowX: 'hidden',
              flex: 1, // Take remaining space
              minHeight: 0, // Allow shrinking
            }}>

              {/* <SectionHeader>
                Behind You
              </SectionHeader> */}
              {/* Sliding split view for behind */}
              {renderStopList(
                behindSplitData.beforeJunction,
                activeTrail.color
              )}
              {(() => {
                const showArrow = shouldShowJunctionArrow(behindSplitData);
                return behindSplitData.junctionStop && renderStop(
                  behindSplitData.junctionStop,
                  activeTrail.color,
                  false,
                  { onJunctionRightClick: toggleBehindRight, showJunctionArrow: showArrow }
                );
              })()}
              {(behindSplitData.leftBranch || behindSplitData.rightBranch) ? (
                <div style={{ width: '100%' }}>

                  <SplitView
                    leftContent={renderStopList(behindSplitData.leftBranch?.stops || [], behindSplitData.leftBranch?.color)}
                    rightContent={renderStopList(behindSplitData.rightBranch?.stops || [], behindSplitData.rightBranch?.color)}
                    leftAlign="flex-start"
                    rightAlign="flex-start"
                    rightColWidth="calc(50% - 0px)"
                    leftColWidth="calc(50% - 85px)"
                    slidingTransform={behindFocus === 'left' ? 'translateX(0)' : 'translateX(calc(-50% + 85px))'}
                    onLeftClick={handleBehindLeft}
                    onRightClick={handleBehindRight}
                    leftSwipeHandlers={behindLeftSwipe}
                    rightSwipeHandlers={behindRightSwipe}
                    showCloseButton={behindFocus !== 'left'}
                    onClose={handleBehindClose}
                    alignItems="flex-start"
                  />
                </div>
              ) :
                null
              }
              {renderStopList(behindSplitData.afterJunction, activeTrail.color)}
            </div>
          </div>
        </>
      ) : (
        // Split/drag mode
        <>
          <div ref={splitPaneRef} style={{
            width: '100vw',
            maxWidth: '100vw',
            overflowX: 'visible', // DEBUG: allow overflow
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 80px)', // Account for bottom navigation bar
            // border: '3px solid magenta', // DEBUG
            // background: 'rgba(255,0,255,0.05)', // DEBUG
          }}>
            <Split
              direction="vertical"
              sizes={splitSizes}
              minSize={[100, 400]}
              gutterSize={0}
              snapOffset={0}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100vw',
                maxWidth: '100vw',
                overflowX: 'hidden',
                boxSizing: 'border-box',
                height: '100%',
              }}
              className="navview-split-pane"
            >
              {/* Ahead Section (capped at max height) */}
              <div ref={aheadRef} style={{ overflowY: 'auto', overflowX: 'hidden', padding: '16px 16px 0 16px', textAlign: 'center', maxHeight: MAX_AHEAD_HEIGHT, minHeight: 0, maxWidth: '100vw' }}>
                {renderStopList(aheadSplitData.afterJunction.slice().reverse(), activeTrail.color)}
                {(aheadSplitData.leftBranch || aheadSplitData.rightBranch) && (
                  <SplitView
                    leftContent={renderStopList(aheadSplitData.leftBranch?.stops.slice().reverse() || [], aheadSplitData.leftBranch?.color)}
                    rightContent={renderStopList(aheadSplitData.rightBranch?.stops.slice().reverse() || [], aheadSplitData.rightBranch?.color)}
                    leftAlign="flex-end"
                    rightAlign="flex-end"
                    rightColWidth="calc(50% - 0px)"
                    leftColWidth="calc(50% - 85px)"
                    slidingTransform={aheadFocus === 'left' ? 'translateX(0)' : 'translateX(calc(-50% + 85px))'}
                    onLeftClick={handleAheadLeft}
                    onRightClick={handleAheadRight}
                    leftSwipeHandlers={aheadLeftSwipe}
                    rightSwipeHandlers={aheadRightSwipe}
                    showCloseButton={aheadFocus !== 'left'}
                    onClose={handleAheadClose}
                  />
                )}
                {(() => {
                  const showArrow = shouldShowJunctionArrow(aheadSplitData);
                  return aheadSplitData.junctionStop && renderStop(
                    aheadSplitData.junctionStop,
                    activeTrail.color,
                    false,
                    { onJunctionRightClick: toggleAheadRight, showJunctionArrow: showArrow }
                  );
                })()}
                {renderStopList(
                  aheadSplitData.beforeJunction.slice().reverse(),
                  activeTrail.color
                )}
              </div>
              {/* Middle + Behind Section */}
              <div ref={middleSectionRef} style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100vw',
                maxWidth: '100vw',
                overflowX: 'hidden',
                boxSizing: 'border-box',
                flex: 1, // Allow to expand to fill available space
              }}>
                {/* Drag handle for split mode */}
                <div
                  style={{
                    width: 40,
                    height: 6,
                    borderRadius: 3,
                    background: '#ccc',
                    margin: '0 auto 8px auto',  // Remove top margin, keep bottom margin
                    cursor: 'row-resize',
                    opacity: 0.7,
                  }}
                />
                {/* Middle Section - Current Location (Unified) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 160,
                    maxHeight: 'none',
                    flexShrink: 0,
                    cursor: 'row-resize',
                    userSelect: draggingRef.current ? 'none' : 'auto',
                    width: '100vw',
                    maxWidth: '100vw',
                    boxSizing: 'border-box',
                    padding: 0,
                    margin: 0,
                    overflowX: 'hidden',
                    overflowY: 'visible',
                  }}
                  onMouseDown={onMiddleMouseDown}
                  onTouchStart={onMiddleMouseDown}
                >
                  {/* Attach ref to a wrapping div, not the NavContextCard component */}
                  <div ref={navContextCardRef} style={{ width: '100vw', maxWidth: '100vw', margin: 0, boxSizing: 'border-box', overflowX: 'hidden', display: 'flex', justifyContent: 'center' }}>
                    <MiddleCardVariant
                      destination={endpointName}
                      trail={activeTrail.name}
                      distanceMiles={userStop ? metersToMiles(userStop.metadata.distance || 0) : 0}
                      description={elevationDescription}
                      mode={locomotionMode}
                      amenities={['food', 'water', 'restroom', 'cafe', 'store', 'accessible']}
                      onLocomotionChange={onLocomotionChange}
                      onChangeEntryPoint={onChangeEntryPoint}
                      entryPointDistanceMiles={entryPointDistanceMiles}
                      preciseNetworkDistanceMiles={preciseNetworkDistanceMiles}
                      borderColor={activeTrail.color}
                      highlightColor={activeTrail.color}
                    />
                  </div>
                </div>
                {/* Behind Section */}
                <div
                  ref={behindStickyRef}
                  style={{
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: '0 16px 40px 16px', // Add bottom padding for navigation bar
                    textAlign: 'center',
                    marginTop: '-16px',  // Increased negative margin to eliminate remaining space
                    // maxHeight: MAX_BEHIND_HEIGHT, // Remove constraint in draggable mode
                    minHeight: 0,
                    maxWidth: '100vw',
                    flex: 1, // Take remaining space
                    // display: 'flex', // REMOVE flex for block layout
                    // flexDirection: 'column', // REMOVE for block layout
                    // alignItems: 'stretch', // REMOVE for block layout
                  }}
                >

                  {/* <SectionHeader>
                    Behind You
                  </SectionHeader> */}
                  {/* Sliding split view for behind */}
                  {renderStopList(
                    behindSplitData.beforeJunction,
                    activeTrail.color
                  )}
                  {(() => {
                    const showArrow = shouldShowJunctionArrow(behindSplitData);
                    return behindSplitData.junctionStop && renderStop(
                      behindSplitData.junctionStop,
                      activeTrail.color,
                      false,
                      { onJunctionRightClick: toggleBehindRight, showJunctionArrow: showArrow }
                    );
                  })()}
                  {(behindSplitData.leftBranch || behindSplitData.rightBranch) && (
                    <div style={{ width: '100%' }}>
                      <SplitView
                        leftContent={renderStopList(behindSplitData.leftBranch?.stops || [], behindSplitData.leftBranch?.color)}
                        rightContent={renderStopList(behindSplitData.rightBranch?.stops || [], behindSplitData.rightBranch?.color)}
                        leftAlign="flex-start"
                        rightAlign="flex-start"
                        rightColWidth="calc(50% - 0px)"
                        leftColWidth="calc(50% - 85px)"
                        slidingTransform={behindFocus === 'left' ? 'translateX(0)' : 'translateX(calc(-50% + 85px))'}
                        onLeftClick={handleBehindLeft}
                        onRightClick={handleBehindRight}
                        leftSwipeHandlers={behindLeftSwipe}
                        rightSwipeHandlers={behindRightSwipe}
                        showCloseButton={behindFocus !== 'left'}
                        onClose={handleBehindClose}
                      />
                    </div>
                  )}
                  {renderStopList(behindSplitData.afterJunction, activeTrail.color)}
                </div>
              </div>
            </Split>
          </div>
        </>
      )}
    </div>
  );
}; 