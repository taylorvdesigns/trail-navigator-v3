import { useMemo } from 'react';
import { useLocation } from './useLocation';
import { POI, Stop, TrailConfig, LocomotionMode, TrailPoint } from '../types';
import { Junction } from '../utils/navViewSplit';
import { useTrailsData } from './useTrailsData';
import { findNearestTrailPoint } from '../utils/trail';
import { getPOIsForTrail } from '../utils/poi';

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

    console.log('[DEBUG] Trail Detection - Current Location:', currentLocation);
    console.log('[DEBUG] Trail Detection - Available Trails:', allTrailData.map(t => ({ id: t.id, name: allTrails.find(at => at.id === t.id)?.name })));

    allTrailData.forEach(trail => {
      if(trail.points) {
        const nearestPoint = findNearestTrailPoint(currentLocation, trail.points);
        console.log(`[DEBUG] Trail ${trail.id} (${allTrails.find(t => t.id === trail.id)?.name}):`, {
          nearestPointDistance: nearestPoint?.distance,
          currentClosestDistance: closestMatch.distance,
          isCloser: nearestPoint && nearestPoint.distance < closestMatch.distance
        });
        
        if (nearestPoint && nearestPoint.distance < closestMatch.distance) {
          closestMatch = {
            trailId: trail.id,
            point: nearestPoint.point,
            distance: nearestPoint.distance,
          };
        }
      }
    });

    console.log('[DEBUG] Trail Detection - Final Result:', {
      selectedTrailId: closestMatch.trailId,
      selectedTrailName: allTrails.find(t => t.id === closestMatch.trailId)?.name,
      distance: closestMatch.distance
    });

    return { activeTrailId: closestMatch.trailId, userPointOnTrail: closestMatch.point };
  }, [currentLocation, allTrailData, allTrails]);

  const { stops, userStop } = useMemo(() => {
    if (!allTrailData) return { stops: [], userStop: null };
    
    let allStops: Stop[] = [];

    allTrailData.forEach(trailData => {
      const trail = allTrails.find(t => t.id === trailData.id);
      if (!trail || !trailData.points) return;

      const trailPoints = trailData.points;
      
      if (trailData.endpoints) {
        const { start, end } = trailData.endpoints;
        allStops.push({
          id: `endpoint-${trail.id}-start`, type: 'endpoint', name: `${trail.name} Start`, trailId: trail.id,
          metadata: { coordinates: [start[1], start[0]], distance: 0 }
        });
        const trailLength = trailPoints[trailPoints.length - 1]?.distance || 0;
        allStops.push({
          id: `endpoint-${trail.id}-end`, type: 'endpoint', name: `${trail.name} End`, trailId: trail.id,
          metadata: { coordinates: [end[1], end[0]], distance: trailLength }
        });
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
    
    junctions.forEach(junction => {
      if (!junction.trails || junction.trails.length < 1) return;
      junction.trails.forEach(trailId => {
        const trailData = allTrailData.find(td => td.id === trailId);
        const trailConfig = allTrails.find(tc => tc.id === trailId);
        if (trailData && trailData.points && trailConfig) {
          // Junction coordinates are [longitude, latitude], but findNearestTrailPoint expects [latitude, longitude]
          const junctionCoords: [number, number] = [junction.location[1], junction.location[0]];
          const nearestPoint = findNearestTrailPoint(junctionCoords, trailData.points);
          if (nearestPoint) {
            console.log(`[DEBUG] Junction: ${junction.id} on Trail: ${trailId}`, JSON.stringify({
              junctionLocation: junction.location,
              nearestTrailPointCoords: [nearestPoint.point.latitude, nearestPoint.point.longitude],
              calculatedDistance: nearestPoint.point.distance,
              trailPointsCount: trailData.points.length,
              firstTrailPoint: trailData.points[0],
              lastTrailPoint: trailData.points[trailData.points.length - 1],
              firstFewTrailPoints: trailData.points.slice(0, 3).map(p => ({ lat: p.latitude, lng: p.longitude, dist: p.distance }))
            }, null, 2));

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
                trails: junction.trails
              }
            });
          }
        }
      });
    });

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
      allStops.push(finalUserStop);
    }
    
    // Sort stops by distance within each trail
    const sortedStops = allStops.sort((a, b) => {
      // If stops are on different trails, maintain trail order
      if (a.trailId !== b.trailId) {
        return a.trailId.localeCompare(b.trailId);
      }
      // If stops are on the same trail, sort by distance
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
  };
} 