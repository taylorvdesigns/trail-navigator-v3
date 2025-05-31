import React from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemText, Divider, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { LocomotionMode, POI, TrailConfig } from '../../types/index';
import { 
  DirectionsWalk, 
  DirectionsRun, 
  DirectionsBike, 
  Place as PlaceIcon,
  Restaurant,
  LocalCafe,
  Store,
  Park,
  WaterDrop,
  Wc,
  NavigationOutlined
} from '@mui/icons-material';
import { useTrailData } from '../../hooks/useTrailData';
import { sortPOIsByLocation } from '../../utils/trail';
import { useLocation } from '../../hooks/useLocation';
import { metersToMiles } from '../../utils/distance';
import { NavContextCard } from './NavContextCard';
import { usePOIs } from '../../hooks/usePOIs';
import { findNearestTrailPoint } from '../../utils/trail';
import { calculateETA } from '../../utils/eta';

// Standard list row (full-width)
const StandardRow = styled(Box)(({ theme }) => ({
  height: 30,
  padding: theme.spacing(1),
  '& .MuiTypography-root': {
    fontSize: 14,
    lineHeight: 1.2
  }
}));

// Split view row (for branches)
const SplitRow = styled(Box)(({ theme }) => ({
  height: 40,
  padding: theme.spacing(1),
  '& .MuiTypography-root': {
    fontSize: 11,
    lineHeight: 1.2
  }
}));

const TimelineContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: '100%',
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 24,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: theme.palette.divider
  }
}));

const TimelineItem = styled(Box)(({ theme }) => ({
  position: 'relative',
  paddingLeft: 48,
  marginBottom: theme.spacing(1),
  minHeight: 44, // Minimum touch target size
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 20,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: 'currentColor'
  }
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
    backgroundColor: 'currentColor',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32
  }
}));

const CircularMode = styled(Box)(({ theme }) => ({
  width: 160,
  height: 160,
  borderRadius: '50%',
  backgroundColor: '#2C2C2C',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  margin: theme.spacing(3),
  position: 'relative'
}));

const CategoryToggle = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(3),
  marginTop: theme.spacing(2),
  '& .MuiSvgIcon-root': {
    fontSize: 32,
    color: theme.palette.text.secondary,
    cursor: 'pointer',
    '&:hover': {
      color: theme.palette.primary.main
    }
  }
}));

const DestinationSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  flex: 1,
  overflow: 'auto',
  '& .MuiTypography-h6': {
    fontSize: '0.875rem',
    fontWeight: 600,
    letterSpacing: 1,
    marginBottom: theme.spacing(2),
    color: theme.palette.text.secondary
  }
}));

const TimeDisplay = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'baseline',
  minWidth: 60,
  '& .distance': {
    fontSize: '1rem',
    fontWeight: 600,
    marginRight: theme.spacing(0.5)
  },
  '& .time': {
    fontSize: '0.875rem',
    color: theme.palette.text.secondary
  }
}));

const AmenityIcon = styled(Box)(({ theme }) => ({
  minWidth: 44, // Minimum touch target size
  minHeight: 44, // Minimum touch target size
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '& .MuiSvgIcon-root': {
    fontSize: 24,
    color: theme.palette.text.secondary
  }
}));

const TRAIL_COLOR = '#39FF14';

// Subway-style list container
const SubwayList = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  paddingTop: 8,
  paddingBottom: 8,
}));

const SubwayLine = styled(Box)(({ theme }) => ({
  position: 'absolute',
  left: 45 + (15 / 2) - 2, // 45px (col 1) + 7.5px (center of col 2) - 2px (half line width)
  top: 0,
  bottom: 0,
  width: 4,
  background: TRAIL_COLOR,
  zIndex: 0,
}));

// SubwayStop: flex row with four columns
const SubwayStop = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  minHeight: 48,
  width: '100%',
  position: 'relative',
  zIndex: 1,
  borderBottom: '1px solid #000',
}));

// Col 2: 15px wide, relative for stop indicator
const SubwayLineCol = styled(Box)(({ theme }) => ({
  width: 15,
  height: 48,
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

// Stop indicator: 15px wide, 2px thick, centered vertically, left: 0
const StopIndicator = styled(Box)(({ theme }) => ({
  width: 15,
  height: 2,
  background: TRAIL_COLOR,
  borderRadius: 1,
  position: 'absolute',
  left: 0,
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 2,
}));

interface NavViewProps {
  trailConfig: TrailConfig;
  onLocomotionChange: (mode: LocomotionMode) => void;
  locomotionMode: LocomotionMode;
}

export const NavView: React.FC<NavViewProps> = ({
  trailConfig,
  onLocomotionChange,
  locomotionMode
}) => {
  const { data: trailData } = useTrailData(trailConfig.routeId);
  const { currentLocation, isSimulationMode, simDirection } = useLocation();
  const { pois, loading: poisLoading, error: poisError } = usePOIs();

  // Group POIs by their tags
  const groupedPOIs = pois.reduce((groups, poi) => {
    const groupName = poi.post_tags[0]?.name || 'Ungrouped';
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(poi);
    return groups;
  }, {} as Record<string, typeof pois>);

  console.log('Initial POI Groups:', Object.keys(groupedPOIs).map(group => ({
    group,
    count: groupedPOIs[group].length,
    firstPOI: groupedPOIs[group][0]?.title.rendered
  })));

  // Filter groups based on the first POI in each group
  const filteredGroups = Object.entries(groupedPOIs).filter(([groupName, pois]) => {
    if (!trailData?.points || !currentLocation) {
      console.log('Skipping group:', groupName, '- Missing trail data or current location');
      return false;
    }

    const firstPOI = pois[0];
    if (!firstPOI) {
      console.log('Skipping group:', groupName, '- No POIs in group');
      return false;
    }

    const poiCoords: [number, number] = [firstPOI.coordinates[1], firstPOI.coordinates[0]];
    console.log('POI group:', groupName, 'POI coords:', poiCoords, 'POI raw:', firstPOI.coordinates);
    const poiPoint = findNearestTrailPoint(
      poiCoords,
      trailData.points.map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
        distance: p.distance || 0
      }))
    );
    if (!poiPoint) {
      console.log('Skipping group:', groupName, '- No trail point found for first POI');
      return false;
    }
    const poiToTrailDist = (poiPoint && poiPoint.distance) || null;
    console.log('Nearest trail point to POI:', poiPoint, 'Distance from POI to trail (m):', poiToTrailDist);

    const userCoords: [number, number] = [currentLocation[0], currentLocation[1]];
    console.log('User coords:', userCoords, 'User raw:', currentLocation);
    const userPoint = findNearestTrailPoint(
      userCoords,
      trailData.points.map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
        distance: p.distance || 0
      }))
    );
    if (!userPoint) {
      console.log('Skipping group:', groupName, '- No trail point found for user location');
      return false;
    }
    const userToTrailDist = (userPoint && userPoint.distance) || null;
    console.log('Nearest trail point to user:', userPoint, 'Distance from user to trail (m):', userToTrailDist);

    if (!userPoint?.point?.distance || !poiPoint?.point?.distance) {
      console.log('Skipping group:', groupName, '- Missing position data');
      return false;
    }

    const userPosition = userPoint.point?.distance ?? 0;
    const poiPosition = poiPoint.point?.distance ?? 0;

    console.log('Filtering group:', groupName, {
      userPosition,
      poiPosition,
      simDirection
    });

    const isAhead = simDirection === 'top' ? poiPosition > userPosition : poiPosition < userPosition;
    return isAhead;
  });

  console.log('Filtered Groups:', filteredGroups.map(([group]) => group));

  // Get the filtered POIs for destinations ahead
  const filteredPOIs = filteredGroups.flatMap(([_, pois]) => pois);
  console.log('Filtered POIs:', filteredPOIs.map(poi => ({
    name: poi.title.rendered,
    position: findNearestTrailPoint(
      [poi.coordinates[1], poi.coordinates[0]],
      trailData?.points.map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
        distance: p.distance || 0
      })) || []
    )?.point.distance
  })));

  // Get the filtered POIs for destinations behind (opposite of ahead)
  const behindGroups = Object.entries(groupedPOIs).filter(([groupName, pois]) => {
    if (!trailData?.points || !currentLocation) return false;

    const firstPOI = pois[0];
    if (!firstPOI) return false;

    const poiCoords: [number, number] = [firstPOI.coordinates[1], firstPOI.coordinates[0]];
    const poiPoint = findNearestTrailPoint(
      poiCoords,
      trailData.points.map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
        distance: p.distance || 0
      }))
    );
    if (!poiPoint) return false;

    const userCoords: [number, number] = [currentLocation[0], currentLocation[1]];
    const userPoint = findNearestTrailPoint(
      userCoords,
      trailData.points.map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
        distance: p.distance || 0
      }))
    );
    if (!userPoint) return false;

    const userPosition = userPoint.point?.distance ?? 0;
    const poiPosition = poiPoint.point?.distance ?? 0;

    return simDirection === 'top' ? poiPosition > userPosition : poiPosition < userPosition;
  });

  // Build array of group info with calculated distance and eta for ahead destinations
  const groupEntries = filteredGroups.map(([groupName, groupPois]) => {
    let distanceMeters = 0;
    let etaSeconds = 0;
    if (trailData?.points && currentLocation) {
      const userTrailPoint = findNearestTrailPoint(
        [currentLocation[0], currentLocation[1]],
        trailData.points.map(p => ({
          latitude: p.latitude,
          longitude: p.longitude,
          distance: p.distance || 0
        }))
      );
      const firstPOI = groupPois[0];
      const poiTrailPoint = findNearestTrailPoint(
        [firstPOI.coordinates[1], firstPOI.coordinates[0]],
        trailData.points.map(p => ({
          latitude: p.latitude,
          longitude: p.longitude,
          distance: p.distance || 0
        }))
      );
      if (userTrailPoint && poiTrailPoint) {
        const userDistance = userTrailPoint.point?.distance ?? 0;
        const poiDistance = poiTrailPoint.point?.distance ?? 0;
        distanceMeters = Math.abs(poiDistance - userDistance);
        etaSeconds = calculateETA(distanceMeters, locomotionMode);
      }
    }
    return {
      groupName,
      groupPois,
      distanceMeters,
      etaSeconds,
    };
  });

  // Build array of group info with calculated distance and eta for behind destinations
  const behindGroupEntries = behindGroups.map(([groupName, groupPois]) => {
    let distanceMeters = 0;
    let etaSeconds = 0;
    if (trailData?.points && currentLocation) {
      const userTrailPoint = findNearestTrailPoint(
        [currentLocation[0], currentLocation[1]],
        trailData.points.map(p => ({
          latitude: p.latitude,
          longitude: p.longitude,
          distance: p.distance || 0
        }))
      );
      const firstPOI = groupPois[0];
      const poiTrailPoint = findNearestTrailPoint(
        [firstPOI.coordinates[1], firstPOI.coordinates[0]],
        trailData.points.map(p => ({
          latitude: p.latitude,
          longitude: p.longitude,
          distance: p.distance || 0
        }))
      );
      if (userTrailPoint && poiTrailPoint) {
        const userDistance = userTrailPoint.point?.distance ?? 0;
        const poiDistance = poiTrailPoint.point?.distance ?? 0;
        distanceMeters = Math.abs(poiDistance - userDistance);
        etaSeconds = calculateETA(distanceMeters, locomotionMode);
      }
    }
    return {
      groupName,
      groupPois,
      distanceMeters,
      etaSeconds,
    };
  });

  const getLocomotionIcon = (mode: LocomotionMode) => {
    switch (mode) {
      case 'walking':
        return <DirectionsWalk />;
      case 'running':
        return <DirectionsRun />;
      case 'biking':
        return <DirectionsBike />;
    }
  };

  if (!trailData) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading trail data...</Typography>
      </Box>
    );
  }

  if (!currentLocation) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Select a location to begin navigation</Typography>
        <Typography variant="body2" color="textSecondary">
          Use Simulation Mode or enable location services to start.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* TRAIL END pill header */}
      <Box sx={{
        width: '100%',
        m: '10px 10px 0 10px', // keep top margin for separation from top, but no bottom margin
        pb: 0, // remove any bottom padding
      }}>
        <Box sx={{
          background: '#39FF14',
          borderRadius: '999px',
          color: '#000',
          fontWeight: 700,
          textTransform: 'uppercase',
          fontSize: '1.1rem',
          px: 3,
          py: 1,
          textAlign: 'center',
          width: '100%',
          maxWidth: '100%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Box sx={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#242424',
          }} />
          <Box sx={{
            pl: '32px',
            pr: '12px',
            width: '100%',
            textAlign: 'center',
            fontWeight: 700,
          }}>
            TRAIL END
          </Box>
        </Box>
      </Box>
      <SubwayList sx={{ pt: 0, mt: 0 }}>
        <SubwayLine />
        {/* Destinations Ahead Subway List */}
        {(() => {
          // Sort by distanceMeters descending (furthest at top, closest at bottom)
          groupEntries.sort((a, b) => b.distanceMeters - a.distanceMeters);
          return groupEntries.map(({ groupName, groupPois, distanceMeters, etaSeconds }) => {
            const etaMinutes = Math.round(etaSeconds / 60);
            let etaDisplay;
            if (etaMinutes >= 60) {
              const hours = Math.floor(etaMinutes / 60);
              const minutes = etaMinutes % 60;
              etaDisplay = (
                <>
                  {hours}
                  <Box component="span" sx={{ fontSize: 9, display: 'inline' }}>h</Box>
                  {minutes > 0 && (
                    <>
                      {'\u00A0'}
                      {minutes}
                      <Box component="span" sx={{ fontSize: 9, display: 'inline' }}>m</Box>
                    </>
                  )}
                </>
              );
            } else {
              etaDisplay = (
                <>
                  {etaMinutes}
                  <Box component="span" sx={{ fontSize: 9, display: 'inline' }}>m</Box>
                </>
              );
            }
            return (
              <SubwayStop key={groupName}>
                {/* Distance (col 1) */}
                <Box sx={{ width: 45, textAlign: 'right', fontSize: 12, color: 'text.secondary', pr: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end' }}>
                  {metersToMiles(distanceMeters).toFixed(2)}
                  <Box component="span" sx={{ fontSize: 9, ml: 0.5 }}>mi</Box>
                </Box>
                {/* Subway line + stop (col 2) */}
                <SubwayLineCol>
                  <StopIndicator />
                </SubwayLineCol>
                {/* Time (col 3) */}
                <Box sx={{ width: 45, textAlign: 'left', fontSize: 12, color: 'text.secondary', pl: 1, display: 'flex', alignItems: 'baseline', whiteSpace: 'nowrap' }}>
                  {etaDisplay}
                </Box>
                {/* Name (col 4, absolutely centered in row) */}
                <Box sx={{ position: 'absolute', left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: groupName === 'Ungrouped' ? '#fff' : TRAIL_COLOR, textAlign: 'center', pointerEvents: 'none', zIndex: 3 }}>
                  {groupName === 'Ungrouped'
                    ? <>
                        {groupPois.map(poi => poi.title.rendered).join(', ')}<Box component="span" sx={{ color: '#fff' }}>{'\u00A0'}({groupPois.length})</Box>
                      </>
                    : <>
                        {groupName}<Box component="span" sx={{ color: '#fff' }}>{'\u00A0'}({groupPois.length})</Box>
                      </>
                  }
                </Box>
              </SubwayStop>
            );
          });
        })()}
      </SubwayList>
      {/* Top heading and context card wrapper */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
        {/* Destinations Ahead Heading - no absolute positioning */}
        <Box
          sx={{
            px: 3,
            py: 0.5,
            borderRadius: 16,
            background: '#6B7280',
            color: '#242424',
            border: '2px solid #242424',
            fontWeight: 500,
            fontSize: '1rem',
            letterSpacing: 1,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            textAlign: 'center',
            minWidth: 180,
            textTransform: 'uppercase',
            zIndex: 2,
            mb: '0px', // Pull heading down to overlap card border
          }}
        >
          Destinations Ahead
        </Box>
        {/* Context card with matching positive margin-top */}
        <Box sx={{ width: '100%', mt: '-15px' }}>
          <NavContextCard
            destination={"Travelers Rest"}
            trail={trailConfig.name}
            distanceMiles={metersToMiles(trailData.distance || 0)}
            description={"Pretty flat to Swamp Rabbit Café & Groceries"}
            mode={locomotionMode}
            amenities={['food', 'water', 'restroom', 'cafe', 'store']}
            onLocomotionChange={onLocomotionChange}
          />
        </Box>
      </Box>
      {/* Destinations Behind Heading */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, position: 'relative', zIndex: 2 }}>
        <Box sx={{
          px: 3,
          py: 0.5,
          borderRadius: 16,
          background: '#6B7280',
          color: '#242424',
          border: '2px solid #242424',
          fontWeight: 500,
          fontSize: '1rem',
          letterSpacing: 1,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          textAlign: 'center',
          minWidth: 180,
          textTransform: 'uppercase',
          mt: '-32px',
          mb: '12px',
        }}>
          Destinations Behind
        </Box>
      </Box>

      {/* Destinations Behind Subway List */}
      <SubwayList sx={{ position: 'relative', width: '100%', paddingTop: 8, paddingBottom: 8 }}>
        {/* POI rows and subway line wrapper */}
        <Box sx={{ position: 'relative' }}>
          <SubwayLine sx={{ top: '-8px', bottom: 0, height: 'calc(100% + 8px)' }} />
          {(() => {
            // Sort by distanceMeters ascending (closest at top, furthest at bottom)
            behindGroupEntries.sort((a, b) => a.distanceMeters - b.distanceMeters);
            return behindGroupEntries.map(({ groupName, groupPois, distanceMeters, etaSeconds }, idx) => {
              const etaMinutes = Math.round(etaSeconds / 60);
              let etaDisplay;
              if (etaMinutes >= 60) {
                const hours = Math.floor(etaMinutes / 60);
                const minutes = etaMinutes % 60;
                etaDisplay = (
                  <>
                    {hours}
                    <Box component="span" sx={{ fontSize: 9, display: 'inline' }}>h</Box>
                    {minutes > 0 && (
                      <>
                        {'\u00A0'}
                        {minutes}
                        <Box component="span" sx={{ fontSize: 9, display: 'inline' }}>m</Box>
                      </>
                    )}
                  </>
                );
              } else {
                etaDisplay = (
                  <>
                    {etaMinutes}
                    <Box component="span" sx={{ fontSize: 9, display: 'inline' }}>m</Box>
                  </>
                );
              }
              // Only apply borderBottom to all but the last POI
              const isLast = idx === behindGroupEntries.length - 1;
              const isFirst = idx === 0;
              return (
                <SubwayStop key={groupName} sx={{ borderBottom: isLast ? 'none' : '1px solid #000', borderTop: isFirst ? '1px solid #000' : 'none' }}>
                  {/* Distance (col 1) */}
                  <Box sx={{ width: 45, textAlign: 'right', fontSize: 12, color: 'text.secondary', pr: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end' }}>
                    {metersToMiles(distanceMeters).toFixed(2)}
                    <Box component="span" sx={{ fontSize: 9, ml: 0.5 }}>mi</Box>
                  </Box>
                  {/* Subway line + stop (col 2) */}
                  <SubwayLineCol>
                    <StopIndicator />
                  </SubwayLineCol>
                  {/* Time (col 3) */}
                  <Box sx={{ width: 45, textAlign: 'left', fontSize: 12, color: 'text.secondary', pl: 1, display: 'flex', alignItems: 'baseline', whiteSpace: 'nowrap' }}>
                    {etaDisplay}
                  </Box>
                  {/* Name (col 4, absolutely centered in row) */}
                  <Box sx={{ position: 'absolute', left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: groupName === 'Ungrouped' ? '#fff' : TRAIL_COLOR, textAlign: 'center', pointerEvents: 'none', zIndex: 3 }}>
                    {groupName === 'Ungrouped'
                      ? <>
                          {groupPois.map(poi => poi.title.rendered).join(', ')}<Box component="span" sx={{ color: '#fff' }}>{'\u00A0'}({groupPois.length})</Box>
                        </>
                      : <>
                          {groupName}<Box component="span" sx={{ color: '#fff' }}>{'\u00A0'}({groupPois.length})</Box>
                        </>
                    }
                  </Box>
                </SubwayStop>
              );
            });
          })()}
        </Box>
        {/* Always show the TRAIL END pill at the bottom, flush with the last POI, and never with a divider above it */}
        <Box sx={{
          width: '100%',
          m: '0 10px 0 10px', // no top margin, flush with last POI
          borderTop: 'none', // ensure no border above
          paddingTop: 0, // ensure no padding above
        }}>
          <Box sx={{
            background: '#39FF14',
            borderRadius: '999px',
            color: '#000',
            fontWeight: 700,
            textTransform: 'uppercase',
            fontSize: '1.1rem',
            px: 3,
            py: 1,
            textAlign: 'center',
            width: '100%',
            maxWidth: '100%',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Box sx={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#242424',
            }} />
            <Box sx={{
              pl: '32px',
              pr: '12px',
              width: '100%',
              textAlign: 'center',
              fontWeight: 700,
            }}>
              TRAIL END
            </Box>
          </Box>
        </Box>
      </SubwayList>
    </Box>
  );
};
