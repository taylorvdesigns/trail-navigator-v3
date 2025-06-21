import React, { useMemo } from 'react';
import { Box, Paper, Typography, styled } from '@mui/material';
import { LocomotionMode, Stop, TrailConfig, POI } from '../../types';
import { Junction, getNavViewSplitData } from '../../utils/navViewSplit';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPersonWalking, faArrowUp, faPersonRunning, faPersonBiking, faUtensils, faBeerMugEmpty, faIceCream, faMapPin, faChildReaching } from '@fortawesome/free-solid-svg-icons';
import { Restaurant, LocalCafe, Store, Wc } from '@mui/icons-material';
import { useNavViewV3 } from '../../hooks/useNavViewV3';
import { metersToMiles } from '../../utils/distance';
import { calculateETA } from '../../utils/eta';

// Styled components
const SubwayLine = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'color',
})<{ color?: string }>(({ theme, color }) => ({
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 24,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: color || '#39FF14',
  },
}));

const StopMarker = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'color',
})<{ color?: string }>(({ theme, color }) => ({
  position: 'relative',
  paddingLeft: 48,
  marginBottom: theme.spacing(1),
  minHeight: 44,
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 20,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: color || '#39FF14',
  },
  '&:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2
  }
}));

const StopInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%'
}));

const StopDetails = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column'
}));

const StopMetrics = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end'
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

interface NavViewSplitData {
  beforeJunction: Stop[];
  junction: Junction | null;
  branches: { [trailId: string]: Stop[] };
  afterJunction: Stop[];
  junctionStop?: Stop;
}

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
  const { stops, userStop, activeTrailId, loading, error } = useNavViewV3({
    allTrails,
    junctions,
    pois,
  });

  // Calculate split view data with memoization
  const { aheadStops, behindStops, aheadSplitData, behindSplitData } = useMemo(() => {
    // Find user stop by type instead of by index
    const userStopIndex = stops.findIndex(stop => stop.type === 'user');
    
    if (userStopIndex === -1) return { 
      aheadStops: [] as Stop[], 
      behindStops: [] as Stop[], 
      aheadSplitData: {} as NavViewSplitData, 
      behindSplitData: {} as NavViewSplitData 
    };

    const ahead = stops.slice(userStopIndex + 1);
    const behind = stops.slice(0, userStopIndex).reverse();
    
    // Get split view data for ahead section
    const aheadSplit = getNavViewSplitData(
      trailConfig.id,
      ahead,
      stops,
      allTrails,
      junctions,
      10000 // 10km threshold - increased to find junctions further ahead
    );

    // Get split view data for behind section
    const behindSplit = getNavViewSplitData(
      trailConfig.id,
      behind,
      stops,
      allTrails,
      junctions,
      10000 // 10km threshold - increased to find junctions further behind
    );

    return {
      aheadStops: ahead.reverse(), // Reverse ahead stops so closest appear at bottom
      behindStops: behind,
      aheadSplitData: aheadSplit,
      behindSplitData: behindSplit
    };
  }, [stops, trailConfig.id, junctions, allTrails]);

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
  if (!aheadStops.length && !behindStops.length) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>No current location available</Typography>
      </Box>
    );
  }

  const renderStop = (stop: Stop, color?: string) => {
    return (
      <StopMarker key={stop.id} color={color} role="listitem" tabIndex={0} aria-label={`${stop.name} stop`}>
        <StopInfo>
          <StopDetails>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: color || 'text.primary' }}>
              {stop.type === 'junction' ? 'Junction' : stop.name}
              {stop.metadata.groupCount && ` (${stop.metadata.groupCount})`}
            </Typography>
          </StopDetails>
        </StopInfo>
      </StopMarker>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Ahead Section */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2 }}>
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.secondary', textAlign: 'center' }}>
          Destinations Ahead
        </Typography>
        {aheadSplitData.junction ? (
          <>
            <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                  Continue on {trailConfig.name}
                </Typography>
                <SubwayLine color={trailConfig.color}>
                  {aheadSplitData.afterJunction.reverse().map((stop: Stop) => renderStop(stop, trailConfig.color))}
                </SubwayLine>
              </Box>
              {Object.entries(aheadSplitData.branches).map(([trailId, branchData]) => (
                <Box key={trailId} sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: branchData.color }}>
                    {branchData.name}
                  </Typography>
                  <SubwayLine color={branchData.color}>
                    {branchData.stops.slice().reverse().map((stop: Stop) => renderStop(stop, branchData.color))}
                  </SubwayLine>
                </Box>
              ))}
            </Box>
            {aheadSplitData.junctionStop && renderStop(aheadSplitData.junctionStop, trailConfig.color)}
            <SubwayLine color={trailConfig.color}>
              {aheadSplitData.beforeJunction.reverse().map((stop: Stop) => renderStop(stop, trailConfig.color))}
            </SubwayLine>
          </>
        ) : (
          <SubwayLine color={trailConfig.color}>
            {aheadStops.map((stop: Stop) => renderStop(stop, trailConfig.color))}
          </SubwayLine>
        )}
      </Box>

      {/* Middle Section - Current Location */}
      <Box sx={{ my: 4 }}>
        <ContextCard>
          <CircularMode>
            <Box sx={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)' }}>
              <FontAwesomeIcon icon={faArrowUp} style={{ fontSize: 38, color: '#39FF14' }} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 6 }}>
              {(['walking', 'running', 'biking'] as const).map((mode) => (
                <Box
                  key={mode}
                  onClick={() => onLocomotionChange(mode)}
                  sx={{
                    cursor: 'pointer',
                    opacity: mode === locomotionMode ? 1 : 0.3,
                    transition: 'opacity 0.2s'
                  }}
                >
                  <FontAwesomeIcon
                    icon={
                      mode === 'walking'
                        ? faPersonWalking
                        : mode === 'running'
                        ? faPersonRunning
                        : faPersonBiking
                    }
                    style={{ fontSize: mode === locomotionMode ? 35 : 28, color: '#39FF14' }}
                  />
                </Box>
              ))}
            </Box>
          </CircularMode>
          <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
            {CATEGORIES.map((category) => (
              <Box key={category.slug} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FontAwesomeIcon icon={category.icon} style={{ fontSize: 18 }} />
              </Box>
            ))}
          </Box>
        </ContextCard>
      </Box>

      {/* Behind Section */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', textAlign: 'center' }}>
          Behind You
        </Typography>
        {behindSplitData.junction ? (
          <>
            <SubwayLine color={trailConfig.color}>
              {behindSplitData.beforeJunction.map((stop: Stop) => renderStop(stop, trailConfig.color))}
            </SubwayLine>
            {behindSplitData.junctionStop && renderStop(behindSplitData.junctionStop, trailConfig.color)}
            <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                  Main Trail
                </Typography>
                <SubwayLine color={trailConfig.color}>
                  {behindSplitData.afterJunction.map((stop: Stop) => renderStop(stop, trailConfig.color))}
                </SubwayLine>
              </Box>
              {Object.entries(behindSplitData.branches).map(([trailId, branchData]) => (
                <Box key={trailId} sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: branchData.color }}>
                    {branchData.name}
                  </Typography>
                  <SubwayLine color={branchData.color}>
                    {branchData.stops.slice().reverse().map((stop: Stop) => renderStop(stop, branchData.color))}
                  </SubwayLine>
                </Box>
              ))}
            </Box>
          </>
        ) : (
          <SubwayLine color={trailConfig.color}>
            {behindStops.map((stop: Stop) => renderStop(stop, trailConfig.color))}
          </SubwayLine>
        )}
      </Box>
    </Box>
  );
}; 