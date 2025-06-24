import React, { useMemo, useContext } from 'react';
import { Box, Paper, Typography, styled } from '@mui/material';
import { LocomotionMode, Stop, TrailConfig, POI } from '../../types';
import { Junction, getNavViewSplitData, NavViewSplitData } from '../../utils/navViewSplit';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPersonWalking, faArrowUp, faPersonRunning, faPersonBiking, faUtensils, faBeerMugEmpty, faIceCream, faMapPin, faChildReaching } from '@fortawesome/free-solid-svg-icons';
import { Restaurant, LocalCafe, Store, Wc } from '@mui/icons-material';
import { useNavViewV3 } from '../../hooks/useNavViewV3';
import { LocationContext } from '../../contexts/LocationContext';
import { metersToMiles } from '../../utils/distance';
import { calculateETA } from '../../utils/eta';
import { NavContextCard } from '../NavView/NavContextCard';
import { findNearestTrailPoint } from '../../utils/trail';

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
  left: 60, // Adjust position to make space for metrics
  top: 0,
  bottom: 0,
  width: 4,
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
  left: 54, // Centered on the SubwayLine
  top: '50%',
  transform: 'translateY(-50%)',
  width: 16,
  height: 16,
  borderRadius: '50%',
  backgroundColor: color || theme.palette.primary.main,
  border: `2px solid ${theme.palette.background.default}`
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
})<{ color?: string }>(({ theme, color }) => ({
  width: 16,
  height: 16,
  borderRadius: '50%',
  backgroundColor: theme.palette.getContrastText(color || theme.palette.primary.main),
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

interface NavViewV2Props {
  trailConfig: TrailConfig;
  allTrails: TrailConfig[];
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

export const NavViewV2: React.FC<NavViewV2Props> = ({
  trailConfig,
  allTrails,
  junctions,
  pois,
  locomotionMode,
  onLocomotionChange,
  onChangeEntryPoint
}) => {
  const { stops, userStop, activeTrailId, loading, error, currentLocation, allTrailData } = useNavViewV3({
    allTrails,
    junctions,
    pois,
  });

  const { simDirection } = useContext(LocationContext) || { simDirection: 'top' };

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
    currentLocation,
    allTrailData,
    2,
    undefined,
    simDirection
  ), [activeTrailId, aheadStops, stops, allTrails, junctions, currentLocation, allTrailData, simDirection]);

  // Get split view data for behind section
  // The behindStops list is now always correctly sorted (closest to farthest), so we no longer need to reverse it here.
  const behindSplitData = useMemo(() => getNavViewSplitData(
    activeTrailId,
    behindStops,
    stops,
    allTrails,
    junctions,
    currentLocation,
    allTrailData,
    2,
    undefined,
    simDirection
  ), [activeTrailId, behindStops, stops, allTrails, junctions, currentLocation, allTrailData, simDirection]);

  // Determine the correct endpoint name for the heading
  const userDistance = userStop ? userStop.metadata.distance || 0 : 0;
  let endpointName = 'Unknown';
  if (activeTrail && allTrailData) {
    const trailData = allTrailData.find(t => t.id === activeTrail.id);
    if (trailData && activeTrail.endpointNames) {
      const startDist = 0;
      const endDist = trailData.points[trailData.points.length - 1]?.distance || 0;
      if (simDirection === 'top') {
        // Heading toward the end
        endpointName = userDistance < endDist / 2 ? activeTrail.endpointNames[1] : activeTrail.endpointNames[0];
      } else {
        // Heading toward the start
        endpointName = userDistance < endDist / 2 ? activeTrail.endpointNames[0] : activeTrail.endpointNames[1];
      }
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
      // Log a sample of trail points for elevation
      console.log('[Elevation Debug] Sample trail points:', trailData.points.slice(0, 5));
      // Find nearest trail point to user
      if (userStop) {
        const nearestUserPoint = trailData.points.reduce((closest, pt) => {
          const d = Math.abs((userStop.metadata.distance || 0) - (pt.distance || 0));
          return d < Math.abs((closest.distance || 0) - (userStop.metadata.distance || 0)) ? pt : closest;
        }, trailData.points[0]);
        userElevation = nearestUserPoint.elevation;
        console.log('[Elevation Debug] User nearest point:', nearestUserPoint);
      }
      // Find nearest trail point to next stop
      if (nextStop) {
        const nearestNextPoint = trailData.points.reduce((closest, pt) => {
          const d = Math.abs((nextStop.metadata.distance || 0) - (pt.distance || 0));
          return d < Math.abs((closest.distance || 0) - (nextStop.metadata.distance || 0)) ? pt : closest;
        }, trailData.points[0]);
        nextStopElevation = nearestNextPoint.elevation;
        console.log('[Elevation Debug] Next stop nearest point:', nearestNextPoint);
      }
    }
  }
  let elevationDescription = 'Elevation data unavailable.';
  if (typeof userElevation === 'number' && typeof nextStopElevation === 'number' && nextStop) {
    elevationDescription = getElevationDescription(nextStopElevation - userElevation, nextStop.name);
  }

  // Calculate distance from entry point to current location
  let entryPointDistanceMiles: number | null = null;
  const entryPoint = useContext(LocationContext)?.entryPoint;
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

  if (loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error">Error loading navigation data</Typography>
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

  const renderStop = (stop: Stop, color?: string, isLast: boolean = false) => {
    const stopColor = color || activeTrail.color;

    if (stop.type === 'endpoint') {
      return (
        <Box key={stop.id} sx={{ position: 'relative', pt: 1, pb: 1 }}>
          <TrailEndCard color={stopColor}>
            <TrailEndMarker color={stopColor} />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              TRAIL END ({stop.name})
            </Typography>
          </TrailEndCard>
        </Box>
      );
    }
    
    return (
      <StopContainer key={stop.id} sx={{ borderBottom: isLast ? 'none' : `1px solid #333`}}>
        <SubwayLine color={stopColor} />
        <StopMarker color={stopColor} />
        <StopMetrics>
          <Typography variant="caption" color="text.secondary">
            {metersToMiles(stop.metadata.distance || 0).toFixed(2)} mi
          </Typography>
          {stop.metadata.eta !== undefined && (
            <Typography variant="caption" color="text.secondary">
              {Math.round(stop.metadata.eta)} min
            </Typography>
          )}
        </StopMetrics>
        <StopDetails>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: stopColor }}>
            {stop.type === 'junction' ? 'Junction' : stop.name}
            {stop.metadata.groupCount && ` (${stop.metadata.groupCount})`}
          </Typography>
        </StopDetails>
      </StopContainer>
    );
  };

  const renderStopList = (stops: Stop[], color?: string) => {
    const listColor = color || activeTrail.color;
    return stops.map((stop, index) => renderStop(stop, listColor, index === stops.length - 1));
  };
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Ahead Section */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2, textAlign: 'center' }}>
        {/* Renders stops on the current trail after the junction (farthest away) */}
        {renderStopList(aheadSplitData.afterJunction.slice().reverse(), activeTrail.color)}

        {/* Renders the Left and Right split columns */}
        {(aheadSplitData.leftBranch || aheadSplitData.rightBranch) && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            {aheadSplitData.leftBranch && (
              <Box sx={{ flex: 1 }}>
                {renderStopList(aheadSplitData.leftBranch.stops.slice().reverse(), aheadSplitData.leftBranch.color)}
              </Box>
            )}
            {aheadSplitData.rightBranch && (
              <Box sx={{ flex: 1 }}>
                {renderStopList(aheadSplitData.rightBranch.stops.slice().reverse(), aheadSplitData.rightBranch.color)}
              </Box>
            )}
          </Box>
        )}

        {/* Renders the junction itself */}
        {aheadSplitData.junctionStop && renderStop(aheadSplitData.junctionStop, activeTrail.color)}
        
        {/* Renders stops on the current trail before the junction (closest) */}
        {renderStopList(aheadSplitData.beforeJunction.slice().reverse(), activeTrail.color)}
      </Box>

      {/* Middle Section - Current Location */}
      <Box sx={{ my: 4 }}>
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
          borderColor={activeTrail.color}
          highlightColor={activeTrail.color}
        />
      </Box>

      {/* Behind Section */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2, textAlign: 'center' }}>
        <SectionHeader>
          Behind You
        </SectionHeader>
        {renderStopList(behindSplitData.beforeJunction, activeTrail.color)}
        {behindSplitData.junctionStop && renderStop(behindSplitData.junctionStop, activeTrail.color)}
        
        {(behindSplitData.leftBranch || behindSplitData.rightBranch) && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            {behindSplitData.leftBranch && (
              <Box sx={{ flex: 1 }}>
                {renderStopList(behindSplitData.leftBranch.stops, behindSplitData.leftBranch.color)}
              </Box>
            )}
            {behindSplitData.rightBranch && (
              <Box sx={{ flex: 1 }}>
                {renderStopList(behindSplitData.rightBranch.stops, behindSplitData.rightBranch.color)}
              </Box>
            )}
          </Box>
        )}
        {renderStopList(behindSplitData.afterJunction, activeTrail.color)}
      </Box>
    </Box>
  );
}; 