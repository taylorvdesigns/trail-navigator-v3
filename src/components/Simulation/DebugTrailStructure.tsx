import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Chip, Button, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { useLocation } from '../../contexts/LocationContext';
import { useTrailsData } from '../../hooks/useTrailsData';
import { usePOIs } from '../../hooks/usePOIs';
import { useWordPressConfig } from '../../hooks/useWordPressConfig';
import { TRAIL_ROUTES } from '../../config/routes.config';
import { findNearestTrailPoint } from '../../utils/trail';
import { metersToMiles } from '../../utils/distance';
import { useTrailJunctions } from '../../hooks/useTrailJunctions';
import { getPOIsForTrail } from '../../utils/poi';
import { PlayArrow as PlayArrowIcon, Pause as PauseIcon, Replay as ReplayIcon } from '@mui/icons-material';
import he from 'he';

interface Stop {
  id: string;
  type: 'poi' | 'junction' | 'endpoint' | 'user';
  name: string;
  distance: number;
  metadata: {
    position: [number, number];
    trails?: string[];
    branches?: string[];
    poiId?: string;
    description?: string;
    post_tags?: { name: string }[];
    groupName?: string;
    groupCount?: number;
  };
}

// Helper to group POIs by their primary tag
function groupPOIsByTag(pois: Stop[]): Stop[] {
  const groups: Record<string, Stop[]> = {};
  const ungrouped: Stop[] = [];

  pois.forEach(poi => {
    const tag = poi.metadata?.post_tags?.[0]?.name || null;
    if (poi.type === 'poi' && tag) {
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(poi);
    } else {
      ungrouped.push(poi);
    }
  });

  // Create group stops
  const groupStops: Stop[] = Object.entries(groups).map(([groupName, groupPOIs]) => {
    // Use the first POI's position and distance for the group stop
    const firstPOI = groupPOIs[0];
    return {
      id: `group-${groupName}`,
      type: 'poi',
      name: groupName,
      distance: firstPOI.distance,
      metadata: {
        ...firstPOI.metadata,
        groupName,
        groupCount: groupPOIs.length,
        position: firstPOI.metadata.position,
        post_tags: firstPOI.metadata.post_tags
      }
    };
  });

  return [...groupStops, ...ungrouped.filter(poi => poi.type !== 'poi' || !poi.metadata?.post_tags?.[0]?.name)];
}

// Separate hook for simulation logic
function useSimulation(selectedTrail: any, isSimulationMode: boolean) {
  const [simulatedLocation, setSimulatedLocation] = useState<[number, number] | null>(null);
  const [isSimPlaying, setIsSimPlaying] = useState(false);
  const [simIndex, setSimIndex] = useState(0);
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState(1);
  const [simDirection, setSimDirection] = useState<'top' | 'bottom'>('top');

  // Reset simulation when trail changes
  useEffect(() => {
    if (selectedTrail?.points && isSimulationMode) {
      setSimIndex(0);
      setSimulatedLocation([selectedTrail.points[0].latitude, selectedTrail.points[0].longitude]);
    }
  }, [selectedTrail, isSimulationMode]);

  // Handle simulation updates
  useEffect(() => {
    if (!isSimulationMode || !selectedTrail?.points || !isSimPlaying) return;

    const interval = setInterval(() => {
      setSimIndex(prevIndex => {
        const nextIndex = simDirection === 'top' ? prevIndex + 1 : prevIndex - 1;
        if (nextIndex < 0 || nextIndex >= selectedTrail.points.length) {
          setIsSimPlaying(false);
          return prevIndex;
        }
        return nextIndex;
      });
    }, 1000 / simSpeedMultiplier);

    return () => clearInterval(interval);
  }, [isSimulationMode, isSimPlaying, simDirection, simSpeedMultiplier, selectedTrail]);

  // Update location based on index
  useEffect(() => {
    if (!isSimulationMode || !selectedTrail?.points) return;
    
    const point = selectedTrail.points[simIndex];
    if (point) {
      setSimulatedLocation([point.latitude, point.longitude]);
    }
  }, [isSimulationMode, simIndex, selectedTrail]);

  const handlePlay = useCallback(() => setIsSimPlaying(true), []);
  const handlePause = useCallback(() => setIsSimPlaying(false), []);
  const handleReset = useCallback(() => {
    setIsSimPlaying(false);
    if (selectedTrail?.points) {
      setSimIndex(0);
      setSimulatedLocation([selectedTrail.points[0].latitude, selectedTrail.points[0].longitude]);
    }
  }, [selectedTrail]);

  return {
    simulatedLocation,
    isSimPlaying,
    simSpeedMultiplier,
    simDirection,
    handlePlay,
    handlePause,
    handleReset,
    setSimSpeedMultiplier,
    setSimDirection
  };
}

export default function DebugTrailStructure() {
  const { currentLocation: realLocation } = useLocation();
  const [isSimulationMode, setSimulationMode] = useState(false);
  const { data: trailData } = useTrailsData(TRAIL_ROUTES);
  const { pois } = usePOIs();
  const { data: wpConfig } = useWordPressConfig();
  const [selectedTrailIndex, setSelectedTrailIndex] = useState(0);

  // Memoize selected trail data
  const selectedTrail = useMemo(() => trailData?.[selectedTrailIndex], [trailData, selectedTrailIndex]);
  const selectedTrailId = selectedTrail?.id;
  const selectedTrailName = useMemo(() => 
    wpConfig?.trails?.[selectedTrailIndex]?.name || `Trail ${selectedTrailIndex + 1}`,
    [wpConfig?.trails, selectedTrailIndex]
  );

  // Get simulation state
  const {
    simulatedLocation,
    isSimPlaying,
    simSpeedMultiplier,
    simDirection,
    handlePlay,
    handlePause,
    handleReset,
    setSimSpeedMultiplier,
    setSimDirection
  } = useSimulation(selectedTrail, isSimulationMode);

  // Use either real or simulated location based on mode
  const currentLocation = useMemo(() => 
    isSimulationMode ? simulatedLocation : realLocation,
    [isSimulationMode, simulatedLocation, realLocation]
  );

  // Memoize junctions calculation
  const junctions = useTrailJunctions(
    useMemo(() => 
      trailData?.map(data => ({
        id: data.id,
        points: data.points
      })) || [],
      [trailData]
    ),
    20
  );

  // Memoize the trail points mapping function
  const getTrailPoints = useCallback((trail: { points?: { latitude: number; longitude: number; distance?: number }[] }) => 
    trail?.points?.map(p => ({
      latitude: p.latitude,
      longitude: p.longitude,
      distance: p.distance || 0
    })) || [],
    []
  );

  // Memoize stops calculation to prevent unnecessary updates
  const orderedStops = useMemo(() => {
    if (!selectedTrail || !trailData) return [];

    const stops: Stop[] = [];

    // Add user's current location as a stop
    if (currentLocation) {
      const userPoint = findNearestTrailPoint(
        currentLocation,
        getTrailPoints(trailData[0])
      );
      if (userPoint?.point) {
        stops.push({
          id: 'user-location',
          type: 'user',
          name: '[USER\'S CURRENT LOCATION]',
          distance: userPoint.point.distance || 0,
          metadata: {
            position: currentLocation
          }
        });
      }
    }

    // Add POIs (grouped) - only those that belong to the selected trail
    const selectedTrailPOIs = selectedTrailId ? getPOIsForTrail(pois || [], trailData || [], selectedTrailId, 100) : [];
    const poiStops: Stop[] = [];
    selectedTrailPOIs.forEach(poi => {
      if (!poi?.coordinates) return;
      const poiPoint = findNearestTrailPoint(
        [poi.coordinates[1], poi.coordinates[0]],
        getTrailPoints(selectedTrail)
      );
      if (poiPoint?.point) {
        poiStops.push({
          id: `poi-${poi.id}`,
          type: 'poi',
          name: poi.title?.rendered || 'Unnamed POI',
          distance: poiPoint.point.distance || 0,
          metadata: {
            position: [poi.coordinates[1], poi.coordinates[0]],
            poiId: poi.id,
            description: poi.content?.rendered,
            post_tags: poi.post_tags
          }
        } as any);
      }
    });
    
    // Group POIs by tag
    const groupedPOIs = groupPOIsByTag(poiStops);
    stops.push(...groupedPOIs);

    // Add junctions (only those that connect to the selected trail)
    junctions?.forEach(junction => {
      if (!junction?.location) return;
      
      const junctionPoint = findNearestTrailPoint(
        [junction.location[1], junction.location[0]],
        getTrailPoints(selectedTrail)
      );
      if (junctionPoint?.point) {
        stops.push({
          id: `junction-${junction.id}`,
          type: 'junction',
          name: `Junction ${junction.id}`,
          distance: junctionPoint.point.distance || 0,
          metadata: {
            position: [junction.location[1], junction.location[0]],
            branches: junction.trails
          }
        });
      }
    });

    // Add endpoints (only for the selected trail)
    if (wpConfig?.trails?.[selectedTrailIndex]) {
      const trail = wpConfig.trails[selectedTrailIndex];
      const trailEndpoints = trailData?.[selectedTrailIndex]?.endpoints;
      const trailPoints = trailData?.[selectedTrailIndex]?.points;
      if (trailEndpoints) {

        // Use endpoint names from WordPress config if available
        let startName = `${trail.name} Endpoint: ${(trail as any).endpoint1_name || trail.name + ' Start'}`;
        let endName = `${trail.name} Endpoint: ${(trail as any).endpoint2_name || trail.name + ' End'}`;

        // Try to get endpoint names from trailData points (first and last)
        if (trailPoints && trailPoints.length > 0) {
          if (typeof trailPoints[0].name === 'string' && trailPoints[0].name) startName = String(trailPoints[0].name) || startName;
          if (typeof trailPoints[trailPoints.length - 1].name === 'string' && trailPoints[trailPoints.length - 1].name) endName = String(trailPoints[trailPoints.length - 1].name) || endName;
        }

        // Start endpoint
        const startPoint = findNearestTrailPoint(
          [trailEndpoints.start[1], trailEndpoints.start[0]],
          getTrailPoints(selectedTrail)
        );
        if (startPoint?.point) {
          stops.push({
            id: `endpoint-${trail.routeId}-start`,
            type: 'endpoint',
            name: startName,
            distance: startPoint.point.distance || 0,
            metadata: {
              position: [trailEndpoints.start[1], trailEndpoints.start[0]],
              trails: [trail.routeId]
            }
          });
        }

        // End endpoint
        const endPoint = findNearestTrailPoint(
          [trailEndpoints.end[1], trailEndpoints.end[0]],
          getTrailPoints(selectedTrail)
        );
        if (endPoint?.point) {
          stops.push({
            id: `endpoint-${trail.routeId}-end`,
            type: 'endpoint',
            name: endName,
            distance: endPoint.point.distance || 0,
            metadata: {
              position: [trailEndpoints.end[1], trailEndpoints.end[0]],
              trails: [trail.routeId]
            }
          });
        }
      }
    }

    return stops.sort((a, b) => a.distance - b.distance);
  }, [selectedTrail, currentLocation, pois, junctions, wpConfig, selectedTrailIndex, selectedTrailId, getTrailPoints, trailData]);

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto', overflowY: 'auto', height: '100vh' }}>
      <Typography component="h1" variant="h4" sx={{ mb: 3 }}>
        {selectedTrailName} Trail Structure (Endpoint 1 to Endpoint 2)
      </Typography>

      {/* Trail Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography component="h2" variant="h6" sx={{ mb: 1 }}>
          Select Trail
        </Typography>
        <ToggleButtonGroup
          value={selectedTrailIndex}
          exclusive
          onChange={(_e, v) => v !== null && setSelectedTrailIndex(v)}
          aria-label="Trail Selection"
        >
          {wpConfig?.trails?.map((trail, index) => (
            <ToggleButton key={trail.routeId} value={index}>
              {trail.name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography component="h2" variant="h6" sx={{ mb: 1 }}>
          Current State
        </Typography>
        <Typography component="div" variant="body2" color="text.secondary">
          Simulation Mode: {isSimulationMode ? 'Enabled' : 'Disabled'}
        </Typography>
        {currentLocation && (
          <Typography component="div" variant="body2" color="text.secondary">
            Current Location: [{currentLocation[0].toFixed(6)}, {currentLocation[1].toFixed(6)}]
          </Typography>
        )}
        {!isSimulationMode && (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => setSimulationMode(true)}
            sx={{ mt: 2 }}
          >
            Enable Simulation Mode
          </Button>
        )}
        {isSimulationMode && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Button onClick={handlePlay} disabled={isSimPlaying} startIcon={<PlayArrowIcon />} variant="contained" color="success">Play</Button>
              <Button onClick={handlePause} disabled={!isSimPlaying} startIcon={<PauseIcon />} variant="contained" color="warning">Pause</Button>
              <Button onClick={handleReset} startIcon={<ReplayIcon />} variant="contained" color="secondary">Reset</Button>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
              <Typography component="div" variant="body2" color="text.secondary">Speed:</Typography>
              <ToggleButtonGroup
                value={simSpeedMultiplier}
                exclusive
                onChange={(_e, v) => v && setSimSpeedMultiplier(v)}
                size="small"
                aria-label="Speed Multiplier"
              >
                <ToggleButton value={1}>1x</ToggleButton>
                <ToggleButton value={2}>2x</ToggleButton>
                <ToggleButton value={4}>4x</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
              <Typography component="div" variant="body2" color="text.secondary">Direction:</Typography>
              <ToggleButtonGroup
                value={simDirection}
                exclusive
                onChange={(_e, v) => v && setSimDirection(v)}
                size="small"
                aria-label="Direction"
              >
                <ToggleButton value="top">Top</ToggleButton>
                <ToggleButton value="bottom">Bottom</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        )}
      </Paper>

      <Typography component="h2" variant="h6" sx={{ mb: 2 }}>
        All Stops (Ordered by Distance from Endpoint 1)
      </Typography>
      <List>
        {orderedStops.map((stop) => (
          <ListItem
            key={stop.id}
            sx={{
              bgcolor: stop.type === 'user' ? 'rgba(57, 255, 20, 0.1)' : 'transparent',
              borderLeft: '4px solid',
              borderColor: {
                user: '#39FF14',
                poi: '#2196F3',
                junction: '#FF9800',
                endpoint: '#9C27B0'
              }[stop.type]
            }}
          >
            <ListItemText
              primaryTypographyProps={{ component: 'div' }}
              secondaryTypographyProps={{ component: 'div' }}
              primary={
                <Box component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" component="span" sx={{ fontWeight: 700, fontSize: 18, color: '#fff', mb: 0.5 }}>
                    {he.decode(stop.name)}
                  </Typography>
                  <Chip
                    label={stop.type}
                    size="small"
                    sx={{
                      bgcolor: {
                        user: '#39FF14',
                        poi: '#2196F3',
                        junction: '#FF9800',
                        endpoint: '#9C27B0'
                      }[stop.type],
                      color: 'white'
                    }}
                  />
                </Box>
              }
              secondary={
                <Box component="div" sx={{ mt: 1 }}>
                  <Typography component="div" variant="body2" color="text.secondary">
                    Distance: {metersToMiles(stop.distance).toFixed(2)} miles
                  </Typography>
                  <Typography component="div" variant="body2" color="text.secondary">
                    Position: [{stop.metadata.position[0].toFixed(6)}, {stop.metadata.position[1].toFixed(6)}]
                  </Typography>
                  {stop.metadata.branches && (
                    <Typography component="div" variant="body2" color="text.secondary">
                      Connected Branches: {stop.metadata.branches.join(', ')}
                    </Typography>
                  )}
                  {stop.metadata.trails && (
                    <Typography component="div" variant="body2" color="text.secondary">
                      Trails: {stop.metadata.trails.join(', ')}
                    </Typography>
                  )}
                  {stop.metadata.description && (
                    <Typography component="div" variant="body2" color="text.secondary">
                      Description: {stop.metadata.description}
                    </Typography>
                  )}
                  {stop.metadata.groupCount && (
                    <Typography component="div" variant="body2" color="text.secondary">
                      POIs in group: {stop.metadata.groupCount}
                    </Typography>
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
} 