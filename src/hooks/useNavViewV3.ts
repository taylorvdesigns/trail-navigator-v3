import { useMemo } from 'react';
import { useLocation } from './useLocation';
import { POI, Stop, TrailConfig, LocomotionMode, TrailPoint } from '../types';
import { Junction } from '../utils/navViewSplit';
import { useTrailsData } from './useTrailsData';
import { findNearestTrailPoint } from '../utils/trail';
import { getPOIsForTrail } from '../utils/poi';
import { calculateDistance } from '../utils/distance';

interface UseNavViewV3Props {
  allTrails: TrailConfig[];
  junctions: Junction[];
  pois: POI[];
}

interface UseNavViewV3Result {
  stops: Stop[];
  userStop: Stop | null;
  activeTrailId: string;
  loading: boolean;
  error: Error | null;
  currentLocation: [number, number] | null;
  allTrailData: { id: string, points: TrailPoint[], endpoints: { start: [number, number], end: [number, number] } }[] | null;
}

// Helper to group POIs by their primary tag
function groupPOIsByTag(pois: POI[], trailId: string): Stop[] {
  const groups: Record<string, POI[]> = {};
  const ungrouped: POI[] = [];

  pois.forEach(poi => {
    const tag = poi.post_tags?.[0]?.name;
    if (tag) {
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(poi);
    } else {
      ungrouped.push(poi);
    }
  });

  const stops: Stop[] = [];

  Object.entries(groups).forEach(([tag, groupPois]) => {
    if (groupPois.length > 1) {
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

export function useNavViewV3({ allTrails, junctions, pois }: UseNavViewV3Props): UseNavViewV3Result {
  const { currentLocation } = useLocation();
  const { data: allTrailData, isLoading, isError } = useTrailsData(allTrails);

  const { activeTrailId, userPointOnTrail } = useMemo(() => {
    if (!currentLocation || !allTrailData) {
      return { activeTrailId: '', userPointOnTrail: null };
    }

    let closestMatch = {
      trailId: '',
      point: null as TrailPoint | null,
      distance: Infinity,
    };

    allTrailData.forEach(trail => {
      if(trail.points) {
        const nearestPoint = findNearestTrailPoint(currentLocation, trail.points);
        
        if (nearestPoint && nearestPoint.distance < closestMatch.distance) {
          closestMatch = {
            trailId: trail.id,
            point: nearestPoint.point,
            distance: nearestPoint.distance,
          };
        }
      }
    });

    return { activeTrailId: closestMatch.trailId, userPointOnTrail: closestMatch.point };
  }, [currentLocation, allTrailData, allTrails]);

  const { stops, userStop } = useMemo(() => {
    if (!allTrailData || !activeTrailId) return { stops: [], userStop: null };
    
    const allStops: Stop[] = [];

    // --- Step 1: Process all junctions first to create their stops ---
    junctions.forEach(junction => {
      junction.trails.forEach(trailId => {
        const trailData = allTrailData.find(td => td.id === trailId);
        const trailConfig = allTrails.find(tc => tc.id === trailId);
        if (trailData && trailData.points && trailConfig) {
          const junctionCoords: [number, number] = [junction.location[1], junction.location[0]];
          const nearestPoint = findNearestTrailPoint(junctionCoords, trailData.points);
          
          if (nearestPoint) {
            const otherTrailId = junction.trails.find(id => id !== trailId);
            const otherTrail = allTrails.find(t => t.id === otherTrailId || t.routeId === otherTrailId);
            const junctionName = otherTrail ? `${otherTrail.name} Junction` : `Junction ${junction.id}`;
            
            allStops.push({
              id: `junction-${junction.id}-${trailId}`,
              type: 'junction',
              name: junctionName,
              trailId: trailId,
              metadata: {
                coordinates: [junction.location[1], junction.location[0]],
                distance: nearestPoint.point.distance,
                trails: junction.trails,
                branchTrailIds: junction.trails.filter(id => id !== trailId)
              }
            });
          }
        }
      });
    });

    // --- Step 2: Process POIs and non-junction endpoints for all trails ---
    allTrailData.forEach(trailData => {
      const trail = allTrails.find(t => t.id === trailData.id);
      if (!trail || !trailData.points) return;

      const trailPoints = trailData.points;
      
      // Add endpoints, but ONLY if they aren't located at a known junction
      if (trailData.endpoints) {
        const { start, end } = trailData.endpoints;
        
        // An endpoint is a junction if it's within 25 meters of any junction's location.
        // This tolerance accounts for discrepancies between calculated junction points and configured endpoints.
        const startIsJunction = junctions.some(j => calculateDistance(start[1], start[0], j.location[1], j.location[0]) < 25);
        const endIsJunction = junctions.some(j => calculateDistance(end[1], end[0], j.location[1], j.location[0]) < 25);

        if (!startIsJunction) {
          allStops.push({
            id: `endpoint-${trail.id}-start`, type: 'endpoint', name: trail.endpointNames?.[0] || `${trail.name} Start`, trailId: trail.id,
            metadata: { coordinates: [start[1], start[0]], distance: 0 }
          });
        }
        
        const trailLength = trailPoints[trailPoints.length - 1]?.distance || 0;
        if (!endIsJunction) {
          allStops.push({
            id: `endpoint-${trail.id}-end`, type: 'endpoint', name: trail.endpointNames?.[1] || `${trail.name} End`, trailId: trail.id,
            metadata: { coordinates: [end[1], end[0]], distance: trailLength }
          });
        }
      }
      
      const trailPOIs = getPOIsForTrail(pois, [{ id: trail.id, points: trailPoints }], trail.id, 100);
      const poiStops = groupPOIsByTag(trailPOIs, trail.id);
      poiStops.forEach(stop => {
        const poiPoint = findNearestTrailPoint(stop.metadata.coordinates, trailPoints);
        if (poiPoint?.point) {
          stop.metadata.distance = poiPoint.point.distance || 0;
        }
        allStops.push(stop);
      });
    });

    // --- Step 3: Create the user's stop ---
    let finalUserStop: Stop | null = null;
    if (currentLocation && userPointOnTrail) {
      finalUserStop = {
        id: 'user-location',
        type: 'user',
        name: "Current Location",
        trailId: activeTrailId,
        metadata: {
          coordinates: currentLocation,
          distance: userPointOnTrail.distance || 0,
        }
      };
    }
    
    // --- Step 4: Filter stops to only those relevant to the active trail ---
    const userDist = finalUserStop?.metadata.distance || 0;

    // Find the closest junction ahead of the user on the active trail
    const closestJunctionAhead = allStops
      .filter(s => s.trailId === activeTrailId && s.type === 'junction' && (s.metadata.distance || 0) > userDist)
      .sort((a, b) => (a.metadata.distance || 0) - (b.metadata.distance || 0))[0];

    // Find the closest junction behind the user on the active trail
    const closestJunctionBehind = allStops
      .filter(s => s.trailId === activeTrailId && s.type === 'junction' && (s.metadata.distance || 0) < userDist)
      .sort((a, b) => (b.metadata.distance || 0) - (a.metadata.distance || 0))[0];

    const relevantTrailIds = new Set([activeTrailId]);
    if (closestJunctionAhead) {
      (closestJunctionAhead.metadata.trails || []).forEach(id => relevantTrailIds.add(id));
    }
    if (closestJunctionBehind) {
      (closestJunctionBehind.metadata.trails || []).forEach(id => relevantTrailIds.add(id));
    }

    const relevantStops = allStops.filter(stop => relevantTrailIds.has(stop.trailId));
    
    // Add the user stop to the relevant list
    if(finalUserStop) {
      relevantStops.push(finalUserStop);
    }
    
    // --- Step 5: Sort the final, relevant list of stops ---
    const sortedStops = relevantStops.sort((a, b) => {
      // Sort primarily by whether the stop is on the active trail or not
      const aIsActive = a.trailId === activeTrailId;
      const bIsActive = b.trailId === activeTrailId;
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      // If both are on the same trail (either active or a branch), sort by distance.
      return (a.metadata.distance || 0) - (b.metadata.distance || 0);
    });
    
    return { stops: sortedStops, userStop: finalUserStop };

  }, [allTrailData, allTrails, pois, junctions, currentLocation, userPointOnTrail, activeTrailId]);

  return {
    stops,
    userStop,
    activeTrailId,
    loading: isLoading,
    error: isError ? new Error('Error loading trail data') : null,
    currentLocation,
    allTrailData,
  };
} 