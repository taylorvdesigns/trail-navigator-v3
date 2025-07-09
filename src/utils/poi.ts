import { POI } from '../types/index';
import { TrailPoint } from '../types/index';
import { findNearestTrailPoint } from './trail';

/**
 * Extracts unique, cleaned-up categories from an array of POIs
 * @param pois Array of POIs to extract categories from
 * @returns Array of unique, cleaned category names
 */
export const extractUniqueCategories = (pois: POI[]): string[] => {
  const categories = new Set<string>();
  
  pois.forEach(poi => {
    if (poi.post_category && Array.isArray(poi.post_category)) {
      poi.post_category.forEach((category: any) => {
        if (category.name) {
          // Clean up: take text after dash, trim whitespace
          const cleanName = category.name.split('-').pop()?.trim() || category.name;
          categories.add(cleanName);
        }
      });
    }
  });

  return Array.from(categories).sort();
};

interface TrailData {
  id: string;
  points: TrailPoint[];
}

/**
 * Assign POIs to trails based on proximity
 * @param pois Array of POIs to assign
 * @param trails Array of trail data with points
 * @param proximityThreshold Distance threshold in meters (default: 100m)
 * @returns Map of trail ID to array of POIs assigned to that trail
 */
export function assignPOIsToTrails(
  pois: POI[],
  trails: TrailData[],
  proximityThreshold: number = 100
): Map<string, POI[]> {
  const trailAssignments = new Map<string, POI[]>();
  
  // Initialize empty arrays for each trail
  trails.forEach(trail => {
    trailAssignments.set(trail.id, []);
  });
  
  pois.forEach(poi => {
    if (!poi.coordinates) return;
    
    const poiCoords: [number, number] = [poi.coordinates[1], poi.coordinates[0]];
    let closestTrailInfo = {
      trailId: '',
      distance: Infinity
    };
    
    // Find the single closest trail for this POI
    trails.forEach(trail => {
      if (trail.points.length === 0) return;
      
      const nearestPoint = findNearestTrailPoint(poiCoords, trail.points);
      
      if (nearestPoint && nearestPoint.distance < closestTrailInfo.distance) {
        closestTrailInfo = {
          trailId: trail.id,
          distance: nearestPoint.distance
        };
      }
    });
    
    // Assign the POI only to the closest trail, if it's within the threshold
    if (closestTrailInfo.trailId && closestTrailInfo.distance <= proximityThreshold) {
      const trailPOIs = trailAssignments.get(closestTrailInfo.trailId) || [];
      trailPOIs.push(poi);
      trailAssignments.set(closestTrailInfo.trailId, trailPOIs);
    }
  });
  
  return trailAssignments;
}

/**
 * Get POIs assigned to a specific trail
 * @param pois Array of all POIs
 * @param trails Array of trail data
 * @param targetTrailId The trail ID to get POIs for
 * @param proximityThreshold Distance threshold in meters (default: 100m)
 * @returns Array of POIs assigned to the specified trail
 */
export function getPOIsForTrail(
  pois: POI[],
  trails: TrailData[],
  targetTrailId: string,
  proximityThreshold: number = 100
): POI[] {
  console.log('DEBUG: getPOIsForTrail called with:', {
    poisCount: pois.length,
    trailsCount: trails.length,
    targetTrailId,
    proximityThreshold
  });
  
  const assignments = assignPOIsToTrails(pois, trails, proximityThreshold);
  
  console.log('DEBUG: getPOIsForTrail assignments:', {
    allAssignments: Array.from(assignments.entries()).map(([trailId, pois]) => ({
      trailId,
      poiCount: pois.length
    })),
    targetTrailPOIs: assignments.get(targetTrailId)?.length || 0
  });
  
  return assignments.get(targetTrailId) || [];
}

/**
 * Check if a POI belongs to a specific trail
 * @param poi The POI to check
 * @param trail The trail data
 * @param proximityThreshold Distance threshold in meters (default: 100m)
 * @returns True if POI is assigned to the trail
 */
export function isPOIOnTrail(
  poi: POI,
  trail: TrailData,
  proximityThreshold: number = 100
): boolean {
  if (!poi.coordinates || !trail.points) return false;
  
  const poiCoords: [number, number] = [poi.coordinates[1], poi.coordinates[0]]; // [lat, lng]
  
  const nearestPoint = findNearestTrailPoint(poiCoords, trail.points);
  
  return nearestPoint ? nearestPoint.distance <= proximityThreshold : false;
} 