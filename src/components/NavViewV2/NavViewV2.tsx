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
          destination={aheadSplitData.afterJunction.length > 0 ? aheadSplitData.afterJunction[aheadSplitData.afterJunction.length - 1].name : 'Unknown'}
          trail={activeTrail.name}
          distanceMiles={userStop ? metersToMiles(userStop.metadata.distance || 0) : 0}
          description={"Slight decline in elevation to Unity Park"}
          mode={locomotionMode}
          amenities={['food', 'water', 'restroom', 'cafe', 'store', 'accessible']}
          onLocomotionChange={onLocomotionChange}
          onChangeEntryPoint={onChangeEntryPoint}
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