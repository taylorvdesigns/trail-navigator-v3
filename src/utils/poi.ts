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
          // Filter out "Featured" category from the UI
          if (cleanName.toLowerCase() !== 'featured') {
            categories.add(cleanName);
          }
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
  const assignments = assignPOIsToTrails(pois, trails, proximityThreshold);
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

/**
 * Convert a tag name to a URL-friendly slug
 * @param tagName The tag name to convert
 * @returns URL-friendly slug
 */
export function tagNameToSlug(tagName: string): string {
  return tagName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
}

/**
 * Convert a slug back to the original tag name
 * @param pois Array of all POIs to search through
 * @param slug The slug to convert back
 * @returns Original tag name or null if not found
 */
export function slugToTagName(pois: POI[], slug: string): string | null {
  const uniqueTags = getUniqueTags(pois);
  return uniqueTags.find(tag => tagNameToSlug(tag) === slug) || null;
}

/**
 * Get POIs by tag name (supports both original name and slug)
 * @param pois Array of all POIs
 * @param tagNameOrSlug The tag name or slug to filter by
 * @returns Object containing filtered POIs and center coordinates
 */
export function getPOIsByTag(pois: POI[], tagNameOrSlug: string): { pois: POI[], center: [number, number] | null } {
  // First try to find by original tag name
  let tagName = tagNameOrSlug;
  
  // If not found, try to convert from slug
  if (!pois.some(poi => poi.post_tags.some(tag => tag.name === tagNameOrSlug))) {
    const foundTagName = slugToTagName(pois, tagNameOrSlug);
    if (foundTagName) {
      tagName = foundTagName;
    }
  }

  const filteredPOIs = pois.filter(poi => 
    poi.post_tags.some(tag => tag.name === tagName)
  );

  if (filteredPOIs.length === 0) {
    return { pois: [], center: null };
  }

  // Calculate center point from all POIs in the tag group
  const validCoordinates = filteredPOIs
    .filter(poi => poi.coordinates)
    .map(poi => [poi.coordinates[1], poi.coordinates[0]] as [number, number]);

  if (validCoordinates.length === 0) {
    return { pois: filteredPOIs, center: null };
  }

  const centerLat = validCoordinates.reduce((sum, coord) => sum + coord[0], 0) / validCoordinates.length;
  const centerLng = validCoordinates.reduce((sum, coord) => sum + coord[1], 0) / validCoordinates.length;

  return {
    pois: filteredPOIs,
    center: [centerLat, centerLng] as [number, number]
  };
}

/**
 * Get all unique tag names from POIs
 * @param pois Array of POIs
 * @returns Array of unique tag names
 */
export function getUniqueTags(pois: POI[]): string[] {
  const tags = new Set<string>();
  pois.forEach(poi => {
    poi.post_tags.forEach(tag => {
      tags.add(tag.name);
    });
  });
  return Array.from(tags).sort();
} 