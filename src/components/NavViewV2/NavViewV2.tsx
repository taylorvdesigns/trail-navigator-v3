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

  const renderStop = (stop: Stop, color?: string, isLast: boolean = false) => {
    const stopColor = color || trailConfig.color;

    if (stop.type === 'endpoint') {
      return (
        <Box key={stop.id} sx={{ position: 'relative', pt: 1, pb: 1 }}>
          <TrailEndCard color={stopColor}>
            <TrailEndMarker color={stopColor} />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              TRAIL END {stop.name && `(${stop.name})`}
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
    const listColor = color || trailConfig.color;
    return stops.map((stop, index) => renderStop(stop, listColor, index === stops.length - 1));
  };
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Ahead Section */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2, textAlign: 'center' }}>
        <SectionHeader>
          Destinations Ahead
        </SectionHeader>
        {aheadSplitData.junction ? (
          <>
            <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                  Continue on {trailConfig.name}
                </Typography>
                {renderStopList(aheadSplitData.afterJunction.reverse(), trailConfig.color)}
              </Box>
              {Object.entries(aheadSplitData.branches).map(([trailId, branchData]) => (
                <Box key={trailId} sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: branchData.color }}>
                    {branchData.name}
                  </Typography>
                  {renderStopList(branchData.stops.slice().reverse(), branchData.color)}
                </Box>
              ))}
            </Box>
            {aheadSplitData.junctionStop && renderStop(aheadSplitData.junctionStop, trailConfig.color)}
            {renderStopList(aheadSplitData.beforeJunction.reverse(), trailConfig.color)}
          </>
        ) : (
          renderStopList(aheadStops, trailConfig.color)
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
      <Box sx={{ flex: 1, overflow: 'auto', px: 2, textAlign: 'center' }}>
        <SectionHeader>
          Behind You
        </SectionHeader>
        {behindSplitData.junction ? (
          <>
            {renderStopList(behindSplitData.beforeJunction, trailConfig.color)}
            {behindSplitData.junctionStop && renderStop(behindSplitData.junctionStop, trailConfig.color)}
            <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                  Main Trail
                </Typography>
                {renderStopList(behindSplitData.afterJunction, trailConfig.color)}
              </Box>
              {Object.entries(behindSplitData.branches).map(([trailId, branchData]) => (
                <Box key={trailId} sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: branchData.color }}>
                    {branchData.name}
                  </Typography>
                  {renderStopList(branchData.stops.slice().reverse(), branchData.color)}
                </Box>
              ))}
            </Box>
          </>
        ) : (
          renderStopList(behindStops, trailConfig.color)
        )}
      </Box>
    </Box>
  );
}; 