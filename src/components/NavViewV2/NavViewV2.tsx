import React, { useMemo } from 'react';
import { Box, Paper, Typography, styled } from '@mui/material';
import { LocomotionMode, Stop, TrailConfig, POI } from '../../types';
import { Junction, getNavViewSplitData } from '../../utils/navViewSplit';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPersonWalking, faArrowUp, faPersonRunning, faPersonBiking, faUtensils, faBeerMugEmpty, faIceCream, faMapPin, faChildReaching } from '@fortawesome/free-solid-svg-icons';
import { Restaurant, LocalCafe, Store, Wc } from '@mui/icons-material';
import { useNavViewV2 } from '../../hooks/useNavViewV2';
import { metersToMiles } from '../../utils/distance';

// Styled components
const SubwayLine = styled(Box)(({ theme }) => ({
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 24,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#39FF14'
  }
}));

const StopMarker = styled(Box)(({ theme }) => ({
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
    backgroundColor: '#39FF14'
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
  junctions,
  pois,
  locomotionMode,
  onLocomotionChange,
  onChangeEntryPoint
}) => {
  const { stops, loading, error } = useNavViewV2({
    trailConfig,
    junctions,
    pois,
    locomotionMode
  });

  // Calculate split view data with memoization
  const { aheadStops, behindStops, aheadSplitData, behindSplitData } = useMemo(() => {
    const currentIndex = stops.findIndex(stop => stop.type === 'user');
    if (currentIndex === -1) return { 
      aheadStops: [] as Stop[], 
      behindStops: [] as Stop[], 
      aheadSplitData: {} as NavViewSplitData, 
      behindSplitData: {} as NavViewSplitData 
    };

    const ahead = stops.slice(currentIndex + 1);
    const behind = stops.slice(0, currentIndex).reverse();

    // Get split view data for ahead section
    const aheadSplit = getNavViewSplitData(
      trailConfig.id,
      ahead,
      stops,
      junctions,
      10000 // 10km threshold - increased to find junctions further ahead
    );

    // Get split view data for behind section
    const behindSplit = getNavViewSplitData(
      trailConfig.id,
      behind,
      stops,
      junctions,
      10000 // 10km threshold - increased to find junctions further behind
    );

    return {
      aheadStops: ahead.reverse(), // Reverse ahead stops so closest appear at bottom
      behindStops: behind,
      aheadSplitData: aheadSplit,
      behindSplitData: behindSplit
    };
  }, [stops, trailConfig.id, junctions]);

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

  const renderStop = (stop: Stop) => {
    return (
      <StopMarker key={stop.id} role="listitem" tabIndex={0} aria-label={`${stop.name} stop`}>
        <StopInfo>
          <StopDetails>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {stop.name}
              {stop.metadata.groupCount && (
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }} aria-label={`Contains ${stop.metadata.groupCount} stops`}>
                  ({stop.metadata.groupCount} stops)
                </Typography>
              )}
            </Typography>
            {stop.metadata.description && (
              <Typography variant="body2" color="text.secondary" aria-label="Stop description">
                {stop.metadata.description}
              </Typography>
            )}
            {stop.metadata.amenities && stop.metadata.amenities.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }} role="list" aria-label="Available amenities">
                {stop.metadata.amenities.map((amenity, index) => (
                  <AmenityIcon key={`${stop.id}-${amenity}-${index}`}>
                    {amenity === 'food' && <Restaurant sx={{ fontSize: 16 }} />}
                    {amenity === 'cafe' && <LocalCafe sx={{ fontSize: 16 }} />}
                    {amenity === 'store' && <Store sx={{ fontSize: 16 }} />}
                    {amenity === 'restroom' && <Wc sx={{ fontSize: 16 }} />}
                  </AmenityIcon>
                ))}
              </Box>
            )}
          </StopDetails>
          <StopMetrics>
            <Typography variant="body2" color="text.secondary">
              {metersToMiles(stop.metadata.distance || 0).toFixed(1)} mi
            </Typography>
            {stop.metadata.eta !== undefined && (
              <Typography variant="body2" color="text.secondary">
                {Math.round(stop.metadata.eta)} min
              </Typography>
            )}
          </StopMetrics>
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
                  Continue on Trail
                </Typography>
                <SubwayLine>
                  {aheadSplitData.afterJunction.reverse().map(renderStop)}
                </SubwayLine>
              </Box>
              {Object.entries(aheadSplitData.branches).map(([trailId, branchStops]) => (
                <Box key={trailId} sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                    Branch Trail
                  </Typography>
                  <SubwayLine>
                    {(branchStops as Stop[]).map(renderStop)}
                  </SubwayLine>
                </Box>
              ))}
            </Box>
            {aheadSplitData.junctionStop && renderStop(aheadSplitData.junctionStop)}
            <SubwayLine>
              {aheadSplitData.beforeJunction.reverse().map(renderStop)}
            </SubwayLine>
          </>
        ) : (
          <SubwayLine>
            {aheadStops.map(renderStop)}
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
            <SubwayLine>
              {behindSplitData.beforeJunction.map(renderStop)}
            </SubwayLine>
            {behindSplitData.junctionStop && renderStop(behindSplitData.junctionStop)}
            <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                  Main Trail
                </Typography>
                <SubwayLine>
                  {behindSplitData.afterJunction.map(renderStop)}
                </SubwayLine>
              </Box>
              {Object.entries(behindSplitData.branches).map(([trailId, branchStops]) => (
                <Box key={trailId} sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                    Branch Trail
                  </Typography>
                  <SubwayLine>
                    {(branchStops as Stop[]).map(renderStop)}
                  </SubwayLine>
                </Box>
              ))}
            </Box>
          </>
        ) : (
          <SubwayLine>
            {behindStops.map(renderStop)}
          </SubwayLine>
        )}
      </Box>
    </Box>
  );
}; 