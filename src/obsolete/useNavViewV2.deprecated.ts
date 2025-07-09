// DEPRECATED FILE - DO NOT USE
// This file is kept for reference only and is not part of the active codebase
// All code commented out to prevent TypeScript compilation errors

// Empty export to make this a module
export {};

/*
interface UseNavViewV2Props {
  trailConfig: TrailConfig;
  junctions: Junction[];
  pois: POI[];
  locomotionMode: LocomotionMode;
}

interface UseNavViewV2Result {
  stops: Stop[];
  loading: boolean;
  error: Error | null;
}

// Helper to group POIs by their primary tag
function groupPOIsByTag(pois: POI[], trailId: string): Stop[] {
  const groups: Record<string, POI[]> = {};
  const ungrouped: POI[] = [];

  // First pass: group POIs by their primary tag
  pois.forEach(poi => {
    const tag = poi.post_tags?.[0]?.name;
    if (tag) {
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(poi);
    } else {
      ungrouped.push(poi);
    }
  });

  // Second pass: create stops for each group and ungrouped POIs
  const stops: Stop[] = [];

  // Add grouped stops
  Object.entries(groups).forEach(([tag, groupPois]) => {
    if (groupPois.length > 1) {
      // Create a group stop
      const firstPoi = groupPois[0];
      stops.push({
        id: `poi-group-${tag}`,
        type: 'poi',
        name: tag,
        trailId,
        metadata: {
          coordinates: [firstPoi.coordinates[1], firstPoi.coordinates[0]],
          description: `${groupPois.length} ${tag.toLowerCase()} stops`,
          post_tags: [{ name: tag }],
          amenities: Array.from(new Set(groupPois.flatMap(p => p.amenities || []))),
          groupName: tag,
          groupCount: groupPois.length
        }
      });
    } else {
      // Add single POI as individual stop
      const poi = groupPois[0];
      stops.push({
        id: `poi-${poi.id}`,
        type: 'poi',
        name: poi.title.rendered || 'Unnamed POI',
        trailId,
        metadata: {
          coordinates: [poi.coordinates[1], poi.coordinates[0]],
          description: poi.description,
          post_tags: poi.post_tags,
          amenities: poi.amenities
        }
      });
    }
  });

  // Add ungrouped stops
  ungrouped.forEach(poi => {
    stops.push({
      id: `poi-${poi.id}`,
      type: 'poi',
      name: poi.title.rendered || 'Unnamed POI',
      trailId,
      metadata: {
        coordinates: [poi.coordinates[1], poi.coordinates[0]],
        description: poi.description,
        post_tags: poi.post_tags,
        amenities: poi.amenities
      }
    });
  });

  return stops;
}

export function useNavViewV2({ trailConfig, junctions, pois, locomotionMode }: UseNavViewV2Props): UseNavViewV2Result {
  const { currentLocation } = useLocation();
  const { graph, isLoading: graphLoading, error: graphError } = useTrailGraph();
  
  // Get all overlapping trails and their data
  const overlappingTrails = junctions
    .flatMap(j => j.trails)
    .filter((id): id is string => Boolean(id) && id !== trailConfig.id);
  const uniqueTrailIds = Array.from(new Set([trailConfig.id, ...overlappingTrails]));
  
  // Get trail data for all relevant trails
  const allTrailConfigs = useMemo(() => uniqueTrailIds.map(id => ({ 
    id, 
    routeId: id,
    name: id === trailConfig.id ? trailConfig.name : `Trail ${id}`,
    color: id === trailConfig.id ? trailConfig.color : '#666',
    type: id === trailConfig.id ? trailConfig.type : 'spur',
    endpoint1: [0, 0] as [number, number],
    endpoint2: [0, 0] as [number, number]
  })), [uniqueTrailIds, trailConfig.id, trailConfig.name, trailConfig.color, trailConfig.type]);
  const { data: allTrailData, isLoading: mainTrailLoading } = useTrailsData(allTrailConfigs);
  
  // Get points from all trails
  const allTrailPoints = allTrailData?.map(trail => trail.points || []) || [];
  const mainTrailPoints = allTrailData?.find(t => t.id === trailConfig.id)?.points || [];

  // Determine the user's active trail
  const { activeTrailId, userPointOnTrail } = useMemo(() => {
    if (!currentLocation || !allTrailData) {
      return { activeTrailId: trailConfig.id, userPointOnTrail: null };
    }

    let closestMatch = {
      trailId: trailConfig.id,
      point: null as TrailPoint | null,
      distance: Infinity,
    };

    allTrailData.forEach(trail => {
      const nearestPoint = findNearestTrailPoint(currentLocation, trail.points);
      if (nearestPoint && nearestPoint.distance < closestMatch.distance) {
        closestMatch = {
          trailId: trail.id,
          point: nearestPoint.point,
          distance: nearestPoint.distance,
        };
      }
    });

    return { activeTrailId: closestMatch.trailId, userPointOnTrail: closestMatch.point };
  }, [currentLocation, allTrailData, trailConfig.id]);

  // Build all stops
  const stops = useMemo(() => {
    if (!trailConfig.id || !mainTrailPoints.length) return [];
    const allStops: Stop[] = [];
    const addedJunctionIds = new Set<string>(); // Track added junctions to prevent duplicates
    const addedEndpointIds = new Set<string>(); // Track added endpoints to prevent duplicates

    console.log('useNavViewV2 - Processing data:', {
      trailConfigId: trailConfig.id,
      mainTrailPointsLength: mainTrailPoints.length,
      poisLength: pois.length,
      junctionsLength: junctions.length,
      allTrailDataLength: allTrailData?.length || 0
    });

    // 1. Add user's current location if available
    if (currentLocation && userPointOnTrail) {
      allStops.push({
        id: 'user-location',
        type: 'user',
        name: "Current Location",
        trailId: activeTrailId,
        metadata: {
          coordinates: currentLocation,
          distance: userPointOnTrail.distance || 0,
          eta: 0 // Current location has no ETA
        }
      });
    }

    // 2. Process all trails to get POIs and endpoints
    for (let i = 0; i < allTrailData.length; i++) {
      const trail = allTrailConfigs[i];
      const trailData = allTrailData[i];
      if (!trail || !trailData) continue;
      const trailPoints = trailData.points;
      
      // Add endpoints
      if (trailData.endpoints) {
        const { start, end } = trailData.endpoints;

        // For the MAIN trail, add both endpoints if they aren't junctions
        if (trail.id === trailConfig.id) {
          const startIsJunction = junctions.some(j => haversine(j.location, start) < 10);
          const endIsJunction = junctions.some(j => haversine(j.location, end) < 10);

          if (!startIsJunction) {
            const startEndpointId = `endpoint-${trail.id}-start`;
            if (!addedEndpointIds.has(startEndpointId)) {
              allStops.push({
                id: startEndpointId, type: 'endpoint', name: `${trail.name} Start`, trailId: trail.id,
                metadata: { coordinates: [start[1], start[0]], distance: 0, trails: [trail.id] }
              });
              addedEndpointIds.add(startEndpointId);
            }
          }
          if (!endIsJunction) {
            const endEndpointId = `endpoint-${trail.id}-end`;
            if (!addedEndpointIds.has(endEndpointId)) {
              const trailLength = trailData.points[trailData.points.length - 1]?.distance || 0;
              allStops.push({
                id: endEndpointId, type: 'endpoint', name: `${trail.name} End`, trailId: trail.id,
                metadata: { coordinates: [end[1], end[0]], distance: trailLength, trails: [trail.id] }
              });
              addedEndpointIds.add(endEndpointId);
            }
          }
        }
        // For a BRANCH trail, add only the terminus endpoint (the one opposite the junction)
        else {
          const connectingJunction = junctions.find(j => j.trails.includes(trail.id) && j.trails.includes(trailConfig.id));
          if (connectingJunction) {
            const distStartToJunction = haversine(start, connectingJunction.location);
            const distEndToJunction = haversine(end, connectingJunction.location);

            const terminusCoords = distStartToJunction < distEndToJunction ? end : start;
            const terminusEndpointId = `endpoint-${trail.id}-terminus`;
            const trailLength = trailData.points[trailData.points.length - 1]?.distance || 0;

            if (!addedEndpointIds.has(terminusEndpointId)) {
               allStops.push({
                id: terminusEndpointId, type: 'endpoint', name: `${trail.name} End`, trailId: trail.id,
                metadata: { coordinates: [terminusCoords[1], terminusCoords[0]], distance: trailLength, trails: [trail.id] }
              });
              addedEndpointIds.add(terminusEndpointId);
            }
          }
        }
      }
      
      // Add POIs for this trail
      const trailPOIs = getPOIsForTrail(pois, [{ id: trail.id, points: trailPoints }], trail.id, 100);
      const poiStops = groupPOIsByTag(trailPOIs, trail.id);
      
      poiStops.forEach(stop => {
        const poiPoint = findNearestTrailPoint(stop.metadata.coordinates, trailPoints);
        if (poiPoint?.point) {
          stop.metadata.distance = poiPoint.point.distance || 0;
          stop.metadata.eta = calculateETA(poiPoint.point.distance || 0, locomotionMode);
        }
        allStops.push(stop);
      });
      
      // Add junctions (only once per junction)
      junctions.forEach(junction => {
        if (!junction?.location) return;
        const junctionId = junction.id;
        
        // Skip if we've already added this junction
        if (addedJunctionIds.has(junctionId)) return;
        
        const junctionPoint = findNearestTrailPoint([junction.location[1], junction.location[0]], trailPoints);
        if (junctionPoint?.point) {
          allStops.push({
            id: `junction-${junctionId}`,
            type: 'junction',
            name: `Junction ${junctionId}`,
            trailId: trail.id,
            metadata: {
              coordinates: [junction.location[1], junction.location[0]],
              distance: junctionPoint.point.distance || 0,
              eta: junctionPoint.point.distance ? calculateETA(junctionPoint.point.distance, locomotionMode) : undefined,
              trails: junction.trails
            }
          });
          addedJunctionIds.add(junctionId);
        }
      });
    }

    // 3. Calculate a comparable distance for sorting all stops
    const stopsWithComparableDistance = allStops.map(stop => {
      // For stops on the main trail, the comparable distance is just their distance along the trail
      if (stop.trailId === trailConfig.id) {
        stop.metadata.comparable_distance = stop.metadata.distance;
        return stop;
      }

      // For stops on a branch trail, find the junction and add its distance on the main trail
      const connectingJunction = junctions.find(j => j.trails.includes(stop.trailId));
      if (connectingJunction) {
        const junctionDistanceOnMain = connectingJunction.position;
        const stopDistanceOnBranch = stop.metadata.distance || 0;
        stop.metadata.comparable_distance = junctionDistanceOnMain + stopDistanceOnBranch;
      } else {
        // If no junction is found, treat its distance as its own (fallback)
        stop.metadata.comparable_distance = stop.metadata.distance;
      }
      return stop;
    });

    // 4. Sort stops by the new comparable distance
    const sortedStops = stopsWithComparableDistance.sort((a, b) => {
      const distA = a.metadata.comparable_distance || 0;
      const distB = b.metadata.comparable_distance || 0;
      return distA - distB;
    });

    // 5. Recalculate all distances and ETAs to be relative to the user's location
    const userStop = sortedStops.find(s => s.type === 'user');
    const userDistanceOnActiveTrail = userStop?.metadata.distance || 0;
    const userActiveTrailId = userStop?.trailId || trailConfig.id;

    const finalStopsWithRelativeDistance = sortedStops.map(stop => {
      if (stop.type === 'user') {
        stop.metadata.distance = 0;
        stop.metadata.eta = 0;
        return stop;
      }

      let distanceFromUser: number;

      // Stop is on the same trail as the user
      if (stop.trailId === userActiveTrailId) {
        const stopDistanceOnTrail = stop.metadata.distance || 0;
        distanceFromUser = Math.abs(stopDistanceOnTrail - userDistanceOnActiveTrail);
      } 
      // Stop is on a different trail (main or branch)
      else {
        // Find the junction that connects the user's trail and the stop's trail
        const connectingJunction = junctions.find(j => j.trails.includes(userActiveTrailId) && j.trails.includes(stop.trailId));

        if (connectingJunction) {
          // Find junction's distance on the user's trail
          const junctionPointOnUserTrail = findNearestTrailPoint([connectingJunction.location[1], connectingJunction.location[0]], allTrailData.find(t => t.id === userActiveTrailId)?.points || []);
          const junctionDistanceOnUserTrail = junctionPointOnUserTrail?.point.distance || 0;
          
          const distUserToJunction = Math.abs(junctionDistanceOnUserTrail - userDistanceOnActiveTrail);
          const distJunctionToStop = stop.metadata.distance || 0; // This is distance from start of its own trail
          
          distanceFromUser = distUserToJunction + distJunctionToStop;
        } else {
          // Fallback if no direct junction is found
          distanceFromUser = stop.metadata.distance || 0;
        }
      }

      stop.metadata.distance = distanceFromUser;
      stop.metadata.eta = calculateETA(distanceFromUser, locomotionMode);
      return stop;
    });

    console.log('useNavViewV2 - Final stops:', {
      totalStops: finalStopsWithRelativeDistance.length,
      stopTypes: finalStopsWithRelativeDistance.map(s => s.type),
      stopNames: finalStopsWithRelativeDistance.map(s => s.name)
    });

    return finalStopsWithRelativeDistance;
  }, [trailConfig.id, mainTrailPoints, currentLocation, junctions, pois, locomotionMode, allTrailData, allTrailConfigs, activeTrailId, userPointOnTrail]);

  return {
    stops,
    loading: graphLoading || mainTrailLoading,
    error: graphError
  };
}
*/ 