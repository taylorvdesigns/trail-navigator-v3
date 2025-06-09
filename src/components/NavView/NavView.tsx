import React from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemText, Divider, IconButton, Button } from '@mui/material';
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
import he from 'he';

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
  onChangeEntryPoint?: () => void;
}

export const NavView: React.FC<NavViewProps> = ({
  trailConfig,
  onLocomotionChange,
  locomotionMode,
  onChangeEntryPoint
}) => {
  const { data: trailData } = useTrailData(trailConfig.routeId);
  const { currentLocation, isSimulationMode, simDirection, entryPoint, clearEntryPoint } = useLocation();
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

  // Filter groups based on the first POI in each group
  const filteredGroups = Object.entries(groupedPOIs).filter(([groupName, pois]) => {
    if (!trailData?.points || !currentLocation) {
      return false;
    }
    const firstPOI = pois[0];
    if (!firstPOI) return false;
    // Convert POI coordinates to [latitude, longitude] format (POIs are [lng, lat])
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
    // Convert current location to [latitude, longitude] format
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
    // AHEAD: top = poi > user, bottom = poi < user
    return simDirection === 'top' ? poiPosition > userPosition : poiPosition < userPosition;
  });

  // Get the filtered POIs for destinations ahead
  const filteredPOIs = filteredGroups.flatMap(([_, pois]) => pois);

  // Get the filtered POIs for destinations behind (opposite of ahead)
  const behindGroups = Object.entries(groupedPOIs).filter(([groupName, pois]) => {
    if (!trailData?.points || !currentLocation) return false;
    const firstPOI = pois[0];
    if (!firstPOI) return false;
    // Convert POI coordinates to [latitude, longitude] format (POIs are [lng, lat])
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
    // Convert current location to [latitude, longitude] format
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
    // BEHIND: top = poi < user, bottom = poi > user
    return simDirection === 'top' ? poiPosition < userPosition : poiPosition > userPosition;
  });

  // Helper to find the closest POI in a group to the user
  function getClosestPOIAndDistance(
    pois: POI[],
    trailPoints: { latitude: number; longitude: number; distance: number }[],
    userCoords: [number, number]
  ) {
    let minDistance = Infinity;
    let closestPOI: POI | null = null;
    let closestTrailPoint: any = null;
    pois.forEach((poi: POI) => {
      const poiCoords: [number, number] = [poi.coordinates[1], poi.coordinates[0]];
      const poiTrailPoint = findNearestTrailPoint(
        poiCoords,
        trailPoints.map((p: { latitude: number; longitude: number; distance: number }) => ({
          latitude: p.latitude,
          longitude: p.longitude,
          distance: p.distance || 0
        }))
      );
      const userTrailPoint = findNearestTrailPoint(
        userCoords,
        trailPoints.map((p: { latitude: number; longitude: number; distance: number }) => ({
          latitude: p.latitude,
          longitude: p.longitude,
          distance: p.distance || 0
        }))
      );
      if (poiTrailPoint && userTrailPoint) {
        const userDistance = userTrailPoint.point?.distance ?? 0;
        const poiDistance = poiTrailPoint.point?.distance ?? 0;
        const absDist = Math.abs(poiDistance - userDistance);
        if (absDist < minDistance) {
          minDistance = absDist;
          closestPOI = poi;
          closestTrailPoint = poiTrailPoint;
        }
      }
    });
    return { closestPOI, minDistance, closestTrailPoint };
  }

  // Build array of group info with calculated distance and eta for ahead destinations
  const groupEntries = filteredGroups.map(([groupName, groupPois]) => {
    let distanceMeters = 0;
    let etaSeconds = 0;
    let closestPOI = null;
    if (trailData?.points && currentLocation) {
      const userCoords: [number, number] = [currentLocation[0], currentLocation[1]];
      // Ensure distance is always a number
      const safeTrailPoints = trailData.points.map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
        distance: typeof p.distance === 'number' ? p.distance : 0
      }));
      const { closestPOI: poi, minDistance, closestTrailPoint } = getClosestPOIAndDistance(groupPois, safeTrailPoints, userCoords);
      if (poi && closestTrailPoint) {
        distanceMeters = minDistance;
        etaSeconds = calculateETA(distanceMeters, locomotionMode);
        closestPOI = poi;
      }
    }
    return {
      groupName,
      groupPois,
      distanceMeters,
      etaSeconds,
      closestPOI
    };
  });

  // Build array of group info with calculated distance and eta for behind destinations
  const behindGroupEntries = behindGroups.map(([groupName, groupPois]) => {
    let distanceMeters = 0;
    let etaSeconds = 0;
    let closestPOI = null;
    if (trailData?.points && currentLocation) {
      const userCoords: [number, number] = [currentLocation[0], currentLocation[1]];
      // Ensure distance is always a number
      const safeTrailPoints = trailData.points.map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
        distance: typeof p.distance === 'number' ? p.distance : 0
      }));
      const { closestPOI: poi, minDistance, closestTrailPoint } = getClosestPOIAndDistance(groupPois, safeTrailPoints, userCoords);
      if (poi && closestTrailPoint) {
        distanceMeters = minDistance;
        etaSeconds = calculateETA(distanceMeters, locomotionMode);
        closestPOI = poi;
      }
    }
    return {
      groupName,
      groupPois,
      distanceMeters,
      etaSeconds,
      closestPOI
    };
  });

  // Sort ahead: furthest at top, closest at bottom
  groupEntries.sort((a, b) => b.distanceMeters - a.distanceMeters);
  // Sort behind: closest at top, furthest at bottom
  behindGroupEntries.sort((a, b) => a.distanceMeters - b.distanceMeters);

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

  // Helper to generate a short elevation description
  function getElevationDescription(
    userTrailPoint: any,
    poiTrailPoint: any
  ): string {
    if (!userTrailPoint || !poiTrailPoint) return '';
    const startElev = userTrailPoint.point?.elevation ?? userTrailPoint.point?.e ?? null;
    const endElev = poiTrailPoint.point?.elevation ?? poiTrailPoint.point?.e ?? null;
    if (startElev == null || endElev == null) return '';
    
    const delta = endElev - startElev;
    const absDelta = Math.abs(delta);
    
    // Get distance between points
    const startDist = userTrailPoint.point?.distance ?? userTrailPoint.point?.d ?? 0;
    const endDist = poiTrailPoint.point?.distance ?? poiTrailPoint.point?.d ?? 0;
    const distance = Math.abs(endDist - startDist);
    
    // Calculate grade (elevation change per distance)
    // Grade is typically expressed as a percentage
    const grade = (absDelta / distance) * 100;
    
    // For urban trails, we'll use more conservative thresholds
    if (absDelta < 1 || grade < 0.5) return 'Flat';
    if (grade < 2) return delta > 0 ? 'Slight incline' : 'Slight decline';
    if (grade < 4) return delta > 0 ? 'Gradual climb' : 'Gradual downhill';
    if (grade < 6) return delta > 0 ? 'Moderate climb' : 'Moderate downhill';
    return delta > 0 ? 'Steep climb' : 'Steep downhill';
  }

  // Find the closest-ahead group (bottom of groupEntries)
  const closestAheadGroup = groupEntries.length > 0 ? groupEntries[groupEntries.length - 1] : null;
  let elevationDescription = '';
  if (closestAheadGroup && trailData?.points && currentLocation) {
    // Find nearest trail point to user
    const userCoords: [number, number] = [currentLocation[0], currentLocation[1]];
    const userTrailPoint = findNearestTrailPoint(userCoords, trailData.points);
    // Find nearest trail point to the closest-ahead POI in the group
    const closestPOI: POI | null = closestAheadGroup.closestPOI as POI | null;
    let poiTrailPoint = null;
    if (closestPOI) {
      const poiCoords: [number, number] = [closestPOI.coordinates[1], closestPOI.coordinates[0]];
      poiTrailPoint = findNearestTrailPoint(poiCoords, trailData.points);
    }
    const desc = getElevationDescription(userTrailPoint, poiTrailPoint);
    if (desc) {
      elevationDescription = `${desc} to ${closestAheadGroup.groupName}`;
    } else {
      elevationDescription = 'Enjoy the trail!';
    }
  } else {
    elevationDescription = 'Enjoy the trail!';
  }

  // Entry point distance calculation
  let entryPointDistanceMiles: number | null = null;
  if (entryPoint && currentLocation && trailData?.points) {
    // Find nearest trail point to entryPoint and currentLocation
    const entryCoords = [entryPoint[0], entryPoint[1]] as [number, number];
    const userCoords = [currentLocation[0], currentLocation[1]] as [number, number];
    const entryTrailPoint = findNearestTrailPoint(
      entryCoords,
      trailData.points.map(p => ({ latitude: p.latitude, longitude: p.longitude, distance: p.distance || 0 }))
    );
    const userTrailPoint = findNearestTrailPoint(
      userCoords,
      trailData.points.map(p => ({ latitude: p.latitude, longitude: p.longitude, distance: p.distance || 0 }))
    );
    if (entryTrailPoint && userTrailPoint) {
      const distMeters = Math.abs((userTrailPoint.point?.distance ?? 0) - (entryTrailPoint.point?.distance ?? 0));
      entryPointDistanceMiles = metersToMiles(distMeters);
    }
  }

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
                        {groupPois.map(poi => he.decode(poi.title.rendered)).join(', ')}<Box component="span" sx={{ color: '#fff' }}>{'\u00A0'}({groupPois.length})</Box>
                      </>
                    : <>
                        {he.decode(groupName)}<Box component="span" sx={{ color: '#fff' }}>{'\u00A0'}({groupPois.length})</Box>
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
          {groupEntries.length > 0 ? (
            <NavContextCard
              destination={groupEntries[0].groupName.toUpperCase()}
              trail={trailConfig.name.toUpperCase()}
              distanceMiles={metersToMiles(trailData.distance || 0)}
              description={elevationDescription}
              mode={locomotionMode}
              amenities={['food', 'water', 'restroom', 'cafe', 'store']}
              onLocomotionChange={onLocomotionChange}
              entryPointDistanceMiles={entryPointDistanceMiles}
              onChangeEntryPoint={onChangeEntryPoint}
            />
          ) : (
            <NavContextCard
              destination={"END OF THE TRAIL"}
              trail={""}
              distanceMiles={metersToMiles(trailData.distance || 0)}
              description={"Enjoy the trail!"}
              mode={locomotionMode}
              amenities={[]}
              onLocomotionChange={onLocomotionChange}
              entryPointDistanceMiles={entryPointDistanceMiles}
              onChangeEntryPoint={onChangeEntryPoint}
            />
          )}
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
                          {groupPois.map(poi => he.decode(poi.title.rendered)).join(', ')}<Box component="span" sx={{ color: '#fff' }}>{'\u00A0'}({groupPois.length})</Box>
                        </>
                      : <>
                          {he.decode(groupName)}<Box component="span" sx={{ color: '#fff' }}>{'\u00A0'}({groupPois.length})</Box>
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
