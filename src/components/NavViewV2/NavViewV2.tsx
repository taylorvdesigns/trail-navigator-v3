import React, { useMemo, useContext, useRef, useState, useEffect, useLayoutEffect } from 'react';
import { Box, Paper, Typography, styled } from '@mui/material';
import { LocomotionMode, Stop, TrailConfig, POI, TrailPoint } from '../../types';
import { Junction, getNavViewSplitData, NavViewSplitData } from '../../utils/navViewSplit';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPersonWalking, faArrowUp, faPersonRunning, faPersonBiking, faUtensils, faBeerMugEmpty, faIceCream, faMapPin, faChildReaching, faRightLong } from '@fortawesome/free-solid-svg-icons';
import { Restaurant, LocalCafe, Store, Wc } from '@mui/icons-material';
import { useNavViewV3 } from '../../hooks/useNavViewV3';
import { LocationContext } from '../../contexts/LocationContext';
import { metersToMiles } from '../../utils/distance';
import { calculateETA } from '../../utils/eta';
import { NavContextCard } from '../NavView/NavContextCard';
import { findNearestTrailPoint } from '../../utils/trail';
import { useTrailGraph } from '../../hooks/useTrailGraph';
import { calculatePreciseNetworkDistance } from '../../utils/trailGraph';
import { useNavigate } from 'react-router-dom';
import Split from 'react-split';
import { determineTrailHeading, getEndpointNameForHeading } from '../../utils/trailHeading';
import './NavViewV2.css';


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

const StopContainer = styled(Box)({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  padding: '8px 0',
  minHeight: 52,
});

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

const StopMetrics = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  width: 50, // Fixed width for alignment
  marginRight: 20 // Space between metrics and line
});

const StopDetails = styled(Box)({
  paddingLeft: 80 // Space for metrics and line
});

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

const StopInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%'
}));

const ContextCard = styled(Paper)(({ theme }) => ({
  borderRadius: 32,
  background: '#fff',
  padding: theme.spacing(3),
  margin: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  position: 'relative',
  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: '#39FF14',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32
  }
}));

const CircularMode = styled(Box)(({ theme }) => ({
  width: 110,
  height: 110,
  borderRadius: '50%',
  backgroundColor: '#222',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(2)
}));

const AmenityIcon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  color: theme.palette.text.secondary,
  fontSize: '0.75rem'
}));

const StopTime = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  width: 50, // Fixed width for alignment
  marginLeft: 20 // Space between line and time
});

// Add a new styled component for the 4-column layout
const StopRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'stretch',
  minHeight: 52,
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

const CATEGORIES = [
  { slug: 'food', icon: faUtensils, title: 'Food' },
  { slug: 'drink', icon: faBeerMugEmpty, title: 'Drink' },
  { slug: 'ice-cream', icon: faIceCream, title: 'Ice Cream' },
  { slug: 'landmark', icon: faMapPin, title: 'Landmark' },
  { slug: 'playground', icon: faChildReaching, title: 'Playground' }
];

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

// Add this helper function near the top of the file
function formatETA(minutes: number | null): string {
  if (minutes === null || isNaN(minutes)) return '--';
  const min = Math.round(minutes);
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  const rem = min % 60;
  return rem === 0 ? `${hr} hr` : `${hr} hr ${rem} min`;
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
    if (splitViewRef.current) {
      console.log('[DEBUG] SplitView', {
        offsetHeight: splitViewRef.current.offsetHeight,
        scrollHeight: splitViewRef.current.scrollHeight,
        clientHeight: splitViewRef.current.clientHeight,
      });
    }
    if (leftColRef.current) {
      console.log('[DEBUG] SplitView LeftCol', {
        offsetHeight: leftColRef.current.offsetHeight,
        scrollHeight: leftColRef.current.scrollHeight,
        clientHeight: leftColRef.current.clientHeight,
      });
    }
    if (rightColRef.current) {
      console.log('[DEBUG] SplitView RightCol', {
        offsetHeight: rightColRef.current.offsetHeight,
        scrollHeight: rightColRef.current.scrollHeight,
        clientHeight: rightColRef.current.clientHeight,
        offsetWidth: rightColRef.current.offsetWidth,
        clientWidth: rightColRef.current.clientWidth,
        scrollWidth: rightColRef.current.scrollWidth,
      });
    }
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
            minWidth: 0,
            zIndex: 2,
            display: 'block',
            alignSelf: 'stretch', // force stretch
            height: 'auto', // allow to grow with content
            // border: '3px solid green', // DEBUG
          }}
          onClick={onLeftClick}
          {...(leftSwipeHandlers || {})}
        >
          {leftContent}
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
            justifyContent: rightAlign === 'flex-end' ? 'flex-end' : 'flex-start',
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
  const { stops, userStop, activeTrailId, loading, error, currentLocation: navViewCurrentLocation } = useNavViewV3({
    allTrails,
    allTrailData,
    junctions,
    pois,
  });
  const { graph, isLoading, error: trailGraphError } = useTrailGraph();
  const locationContext = useContext(LocationContext);
  const { entryPoint, currentLocation, previousLocation, simDirection, isSimulationMode } = locationContext || {};

  // --- DEBUG REFS FOR WIDTHS ---
  const splitPaneRef = useRef<HTMLDivElement>(null);
  const middleSectionRef = useRef<HTMLDivElement>(null);
  const navContextCardRef = useRef<HTMLDivElement>(null);

  const [preciseNetworkDistance, setPreciseNetworkDistance] = React.useState<number | null>(null);

  // Convert precise network distance from meters to miles
  const preciseNetworkDistanceMiles = preciseNetworkDistance ? preciseNetworkDistance / 1609.34 : null;


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
      return stops.filter(s => s.trailId === activeTrailId && (s.metadata.distance || 0) > userDistance);
    }
  }, [stops, userStop, activeTrailId, simDirection]);

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
      return stopsBehind.slice().reverse();
    }
  }, [stops, userStop, activeTrailId, simDirection]);
  
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

  // Calculate distance from entry point to current location
  let entryPointDistanceMiles: number | null = null;
  if (entryPoint && userStop && activeTrail && allTrailData) {
    const trailData = allTrailData.find(t => t.id === activeTrail.id);
    if (trailData && trailData.points) {
      const entryCoords = [entryPoint[0], entryPoint[1]] as [number, number];
      const userCoords = userStop.metadata.coordinates as [number, number];
      const entryTrailPoint = findNearestTrailPoint(entryCoords, trailData.points);
      const userTrailPoint = findNearestTrailPoint(userCoords, trailData.points);
      if (entryTrailPoint && userTrailPoint) {
        const distMeters = Math.abs((userTrailPoint.point?.distance ?? 0) - (entryTrailPoint.point?.distance ?? 0));
        entryPointDistanceMiles = metersToMiles(distMeters);
      }
    }
  }

  // Helper to get network distance and ETA for a stop
  const getStopMetrics = (stop: Stop): { distanceMiles: number | null, etaMinutes: number | null } => {
    if (!graph || !userStop || !userStop.metadata?.coordinates || !stop.metadata?.coordinates) {
      return { distanceMiles: null, etaMinutes: null };
    }
    const userCoords: [number, number] = [userStop.metadata.coordinates[1], userStop.metadata.coordinates[0]];
    const stopCoords: [number, number] = [stop.metadata.coordinates[1], stop.metadata.coordinates[0]];
    const networkDistance = calculatePreciseNetworkDistance(graph, userCoords, stopCoords);
    if (networkDistance === null) return { distanceMiles: null, etaMinutes: null };
    const distanceMiles = metersToMiles(networkDistance);
    const etaMinutes = calculateETA(networkDistance, locomotionMode);
    return { distanceMiles, etaMinutes };
  };

  // Memoize metrics for all stops for performance
  const stopMetricsMap = useMemo(() => {
    if (!graph || !userStop || !userStop.metadata?.coordinates) return {};
    const metrics: Record<string, { distanceMiles: number | null, etaMinutes: number | null }> = {};
    // Gather all stops from ahead, behind, and all split branches
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
    allStops.forEach(stop => {
      metrics[stop.id] = getStopMetrics(stop);
    });
    return metrics;
  }, [graph, userStop, locomotionMode, aheadStops, behindStops]);

  // Ref to measure ahead section height
  const aheadRef = useRef<HTMLDivElement>(null);
  const [aheadHeight, setAheadHeight] = useState(0);
  const MAX_AHEAD_HEIGHT = 400;
  // Define MAX_BEHIND_HEIGHT near MAX_AHEAD_HEIGHT if not already
  const MAX_BEHIND_HEIGHT = 400;
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

  React.useLayoutEffect(() => {
    // Split/drag mode
    if (
      splitPaneRef.current &&
      middleSectionRef.current &&
      navContextCardRef.current
    ) {
      // Check if any element is wider than viewport
      const viewportWidth = window.innerWidth;
      const splitPaneWidth = splitPaneRef.current.offsetWidth;
      const middleSectionWidth = middleSectionRef.current.offsetWidth;
      const navContextCardWidth = navContextCardRef.current.offsetWidth;
      
      if (splitPaneWidth > viewportWidth) {
        console.warn('DEBUG (split): Split pane is wider than viewport!', { splitPaneWidth, viewportWidth });
      }
      if (middleSectionWidth > viewportWidth) {
        console.warn('DEBUG (split): Middle section is wider than viewport!', { middleSectionWidth, viewportWidth });
      }
      if (navContextCardWidth > viewportWidth) {
        console.warn('DEBUG (split): NavContextCard is wider than viewport!', { navContextCardWidth, viewportWidth });
      }
    }
  }, [aheadHeight]);

  // Debug: Log precise network distance from entry point to user location
  React.useEffect(() => {
    if (graph && entryPoint && userStop && userStop.metadata?.coordinates) {
      const preciseDistance = calculatePreciseNetworkDistance(
        graph,
        [entryPoint[1], entryPoint[0]], // [lng, lat]
        [userStop.metadata.coordinates[1], userStop.metadata.coordinates[0]] // [lng, lat]
      );
      // Store the precise distance for display
      if (preciseDistance !== null) {
        setPreciseNetworkDistance(preciseDistance);
      }
    }
  }, [graph, entryPoint, userStop]);

  // Sliding split view state for ahead and behind
  const [aheadFocus, setAheadFocus] = useState<'left' | 'right'>('left');
  const [behindFocus, setBehindFocus] = useState<'left' | 'right'>('left');

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
  // Swipe/tap handlers for behind split
  const handleBehindLeft = () => {
    setBehindFocus('left');
  };
  const handleBehindRight = () => {
    setBehindFocus('right');
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
    function logHeight() {
      if (behindStickyRef.current) {
        console.log('[DEBUG] Behind section container height:', behindStickyRef.current.offsetHeight);
      }
    }
    logHeight();
    window.addEventListener('resize', logHeight);
    return () => window.removeEventListener('resize', logHeight);
  }, []);

  useLayoutEffect(() => {
    if (splitPaneRef.current) {
      console.log('[DEBUG] splitPaneRef', splitPaneRef.current.offsetHeight, splitPaneRef.current.clientHeight);
    }
  });
  useLayoutEffect(() => {
    const el = document.querySelector('[data-behind-section]');
    if (el) {
      // @ts-ignore
      console.log('[DEBUG] behind section', el.offsetHeight, el.clientHeight);
    }
  });

  useLayoutEffect(() => {
    if (behindStickyRef.current) {
      console.log('[DEBUG] Behind section', {
        offsetHeight: behindStickyRef.current.offsetHeight,
        scrollHeight: behindStickyRef.current.scrollHeight,
        clientHeight: behindStickyRef.current.clientHeight,
      });
    }
  });

  if (loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (trailGraphError) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error">Error loading trail graph</Typography>
      </Box>
    );
  }

  // Check if we have a current location
  if (!userStop) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>No current location available</Typography>
      </Box>
    );
  }

  // In renderStop, use the 4-column layout
  const renderStop = (stop: Stop, color?: string, isLast: boolean = false) => {
    let stopColor = color || activeTrail.color;
    const metrics = stopMetricsMap[stop.id] || { distanceMiles: null, etaMinutes: null };
    // For junctions, use the color of the trail it connects to (not the current trail)
    if (stop.type === 'junction' && stop.metadata.branchTrailIds && stop.metadata.branchTrailIds.length > 0) {
      const connectedTrailId = stop.metadata.branchTrailIds[0]; // Get the first connected trail
      const connectedTrail = allTrails.find(t => t.id === connectedTrailId);
      if (connectedTrail) {
        stopColor = connectedTrail.color;
      }
      // Render junction with special background and text/line/circle color
      return (
        <StopRow key={stop.id} sx={{ borderBottom: isLast ? 'none' : `1px solid #333`, background: stopColor, borderRadius: 8 }}>
          {/* Distance (left) */}
          <StopCol width={36} direction="column">
            <Typography variant="caption" color="#242424" sx={{ lineHeight: 1, fontWeight: 500 }}>
              {metrics.distanceMiles !== null ? metrics.distanceMiles.toFixed(1) : '--'}
            </Typography>
            <Typography variant="caption" color="#242424" sx={{ lineHeight: 1, fontSize: '0.75em' }}>
              mi
            </Typography>
          </StopCol>
          {/* Subway line & dot (center) */}
          <StopCol width={36} sx={{ position: 'relative', minHeight: 52 }}>
            <SubwayLine color={'#242424'} />
            <StopMarker color={'#242424'} sx={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', position: 'absolute' }} />
          </StopCol>
          {/* ETA (right of line) */}
          <StopCol width={36} direction="column">
            {metrics.etaMinutes !== null && metrics.etaMinutes >= 60 ? (
              <>
                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
                  <Typography variant="caption" color="#242424" sx={{ lineHeight: 1, fontWeight: 500 }}>
                    {Math.floor(Math.round(metrics.etaMinutes) / 60)}
                  </Typography>
                  <Typography variant="caption" color="#242424" sx={{ lineHeight: 1, fontSize: '0.75em', ml: 0.5 }}>
                    hr
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
                  <Typography variant="caption" color="#242424" sx={{ lineHeight: 1, fontWeight: 500 }}>
                    {Math.round(metrics.etaMinutes) % 60}
                  </Typography>
                  <Typography variant="caption" color="#242424" sx={{ lineHeight: 1, fontSize: '0.75em', ml: 0.5 }}>
                    min
                  </Typography>
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
                <Typography variant="caption" color="#242424" sx={{ lineHeight: 1, fontWeight: 500 }}>
                  {metrics.etaMinutes !== null ? Math.round(metrics.etaMinutes) : '--'}
                </Typography>
                <Typography variant="caption" color="#242424" sx={{ lineHeight: 1, fontSize: '0.75em', ml: 0.5 }}>
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
                color: '#242424', 
                fontSize: '0.8rem',
                cursor: 'default',
              }}
            >
              {stop.name}
              {stop.metadata.groupCount && ` (${stop.metadata.groupCount})`}
            </Typography>
          </StopCol>
        </StopRow>
      );
    }

    if (stop.type === 'endpoint') {
      return (
        <Box key={stop.id} sx={{ position: 'relative', pt: 1, pb: 1 }}>
          <TrailEndCard color={stopColor} sx={{ background: stopColor, color: '#242424', borderRadius: 50, display: 'flex', alignItems: 'center', padding: '0.5em 1.5em' }}>
            <TrailEndMarker color={'#242424'} />
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
                  color: '#242424',
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
      <StopRow key={stop.id} sx={{ borderBottom: isLast ? 'none' : `1px solid #333` }}>
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
                navigate('/list', { state: { groupName: stop.name } });
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

  const renderStopList = (stops: Stop[], color?: string) => {
    const listColor = color || activeTrail.color;
    console.log('[DEBUG] renderStopList called with:', { stops: stops.length, color: listColor });
    return stops.map((stop, index) => renderStop(stop, listColor, index === stops.length - 1));
  };
  
  // Mouse/touch event handlers for dragging the middle section
  const onMiddleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    draggingRef.current = true;
    startYRef.current = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startSizesRef.current = [...splitSizes];
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('touchmove', onDrag, { passive: false });
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchend', onDragEnd);
  };

  const onDrag = (e: MouseEvent | TouchEvent) => {
    if (!draggingRef.current || !containerRef.current) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    const containerRect = containerRef.current.getBoundingClientRect();
    const totalHeight = containerRect.height;
    const deltaY = clientY - startYRef.current;
    let aheadHeight = (startSizesRef.current[0] / 100) * totalHeight + deltaY;
    let behindHeight = totalHeight - aheadHeight - 160; // 160px fixed middle height
    // Clamp min/max
    const minAhead = 100;
    const minBehind = 200;
    aheadHeight = Math.max(minAhead, Math.min(totalHeight - minBehind - 160, aheadHeight));
    behindHeight = totalHeight - aheadHeight - 160;
    const aheadPct = (aheadHeight / totalHeight) * 100;
    const behindPct = (behindHeight / totalHeight) * 100;
    setSplitSizes([aheadPct, behindPct]);
    e.preventDefault();
  };

  const onDragEnd = () => {
    draggingRef.current = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchend', onDragEnd);
  };
  
  return (
    <div ref={containerRef} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#23272a', minHeight: 0, flex: 1 }}>
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
              marginBottom: 32,
              flexShrink: 0
            }}>
              {renderStopList(aheadSplitData.afterJunction.slice().reverse(), activeTrail.color)}
              {(aheadSplitData.leftBranch || aheadSplitData.rightBranch) && (
                <SplitView
                  leftContent={renderStopList(aheadSplitData.leftBranch?.stops.slice().reverse() || [], aheadSplitData.leftBranch?.color)}
                  rightContent={renderStopList(aheadSplitData.rightBranch?.stops.slice().reverse() || [], aheadSplitData.rightBranch?.color)}
                  leftAlign="flex-start"
                  rightAlign="flex-end"
                  rightColWidth="calc(50% - 0px)"
                  leftColWidth="calc(50% - 65px)"
                  slidingTransform={aheadFocus === 'left' ? 'translateX(0)' : 'translateX(calc(-50% + 31px))'}
                  onLeftClick={handleAheadLeft}
                  onRightClick={handleAheadRight}
                  leftSwipeHandlers={aheadLeftSwipe}
                  rightSwipeHandlers={aheadRightSwipe}
                  showCloseButton={aheadFocus !== 'left'}
                  onClose={handleAheadClose}
                />
              )}
              {aheadSplitData.junctionStop && renderStop(aheadSplitData.junctionStop, activeTrail.color)}
              {renderStopList(aheadSplitData.beforeJunction.slice().reverse(), activeTrail.color)}
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
                <NavContextCard
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
              marginTop: 16,
              overflowY: 'auto', // allow scrolling
              overflowX: 'hidden',
            }}>
              <SectionHeader>
                Behind You
              </SectionHeader>
              {/* Sliding split view for behind */}
              {renderStopList(behindSplitData.beforeJunction, activeTrail.color)}
              {behindSplitData.junctionStop && renderStop(behindSplitData.junctionStop, activeTrail.color)}
              {(behindSplitData.leftBranch || behindSplitData.rightBranch) ? (
                <div style={{ width: '100%' }}>
                  <SplitView
                    leftContent={renderStopList(behindSplitData.leftBranch?.stops || [], behindSplitData.leftBranch?.color)}
                    rightContent={renderStopList(behindSplitData.rightBranch?.stops || [], behindSplitData.rightBranch?.color)}
                    leftAlign="flex-start"
                    rightAlign="flex-start"
                    rightColWidth="calc(50% - 0px)"
                    leftColWidth="calc(50% - 65px)"
                    slidingTransform={behindFocus === 'left' ? 'translateX(0)' : 'translateX(calc(-50% + 31px))'}
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
            height: 'calc(100vh - 0px)', // adjust 0px if you have a header/footer
            // border: '3px solid magenta', // DEBUG
            // background: 'rgba(255,0,255,0.05)', // DEBUG
          }}>
            <Split
              direction="vertical"
              sizes={splitSizes}
              minSize={[100, 200]}
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
              <div ref={aheadRef} style={{ overflowY: 'auto', overflowX: 'hidden', padding: '0 16px', textAlign: 'center', maxHeight: MAX_AHEAD_HEIGHT, minHeight: 0, maxWidth: '100vw' }}>
                {renderStopList(aheadSplitData.afterJunction.slice().reverse(), activeTrail.color)}
                {(aheadSplitData.leftBranch || aheadSplitData.rightBranch) && (
                  <SplitView
                    leftContent={renderStopList(aheadSplitData.leftBranch?.stops.slice().reverse() || [], aheadSplitData.leftBranch?.color)}
                    rightContent={renderStopList(aheadSplitData.rightBranch?.stops.slice().reverse() || [], aheadSplitData.rightBranch?.color)}
                    leftAlign="flex-start"
                    rightAlign="flex-end"
                    rightColWidth="calc(50% - 0px)"
                    leftColWidth="calc(50% - 65px)"
                    slidingTransform={aheadFocus === 'left' ? 'translateX(0)' : 'translateX(calc(-50% + 31px))'}
                    onLeftClick={handleAheadLeft}
                    onRightClick={handleAheadRight}
                    leftSwipeHandlers={aheadLeftSwipe}
                    rightSwipeHandlers={aheadRightSwipe}
                    showCloseButton={aheadFocus !== 'left'}
                    onClose={handleAheadClose}
                  />
                )}
                {aheadSplitData.junctionStop && renderStop(aheadSplitData.junctionStop, activeTrail.color)}
                {renderStopList(aheadSplitData.beforeJunction.slice().reverse(), activeTrail.color)}
              </div>
              {/* Middle + Behind Section */}
              <div ref={middleSectionRef} style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100vw',
                maxWidth: '100vw',
                overflowX: 'hidden',
                boxSizing: 'border-box',
                height: 176, // 160px middle + 16px drag handle
              }}>
                {/* Drag handle for split mode */}
                <div
                  style={{
                    width: 40,
                    height: 6,
                    borderRadius: 3,
                    background: '#ccc',
                    margin: '8px auto',
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
                    <NavContextCard
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
                    padding: '0 16px',
                    textAlign: 'center',
                    maxHeight: MAX_BEHIND_HEIGHT,
                    minHeight: 0,
                    maxWidth: '100vw',
                    // display: 'flex', // REMOVE flex for block layout
                    // flexDirection: 'column', // REMOVE for block layout
                    // alignItems: 'stretch', // REMOVE for block layout
                  }}
                >
                  <SectionHeader>
                    Behind You
                  </SectionHeader>
                  {/* Sliding split view for behind */}
                  {renderStopList(behindSplitData.beforeJunction, activeTrail.color)}
                  {behindSplitData.junctionStop && renderStop(behindSplitData.junctionStop, activeTrail.color)}
                  {(behindSplitData.leftBranch || behindSplitData.rightBranch) && (
                    <div style={{ width: '100%' }}>
                      <SplitView
                        leftContent={renderStopList(behindSplitData.leftBranch?.stops || [], behindSplitData.leftBranch?.color)}
                        rightContent={renderStopList(behindSplitData.rightBranch?.stops || [], behindSplitData.rightBranch?.color)}
                        leftAlign="flex-start"
                        rightAlign="flex-start"
                        rightColWidth="calc(50% - 0px)"
                        leftColWidth="calc(50% - 65px)"
                        slidingTransform={behindFocus === 'left' ? 'translateX(0)' : 'translateX(calc(-50% + 31px))'}
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