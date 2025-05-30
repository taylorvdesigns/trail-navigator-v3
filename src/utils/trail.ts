import { POI, TrailConfig } from '../types';

interface TrailPoint {
  x: number; // longitude
  y: number; // latitude
  d: number; // distance along trail
  e: number; // elevation
}

interface SortedPOIs {
  ahead: POI[];
  behind: POI[];
}

/**
 * Find the nearest point on the trail to a given location
 */
export const findNearestTrailPoint = (
  location: [number, number],
  trailPoints: TrailPoint[]
): { point: TrailPoint; distance: number; index: number } | null => {
  if (!trailPoints.length) return null;

  let nearestPoint = trailPoints[0];
  let minDistance = Infinity;
  let nearestIndex = 0;

  trailPoints.forEach((point, index) => {
    const distance = calculateDistance(
      location[0],
      location[1],
      point.y,
      point.x
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestPoint = point;
      nearestIndex = index;
    }
  });

  return {
    point: nearestPoint,
    distance: minDistance,
    index: nearestIndex
  };
};

/**
 * Calculate the distance between two points using the Haversine formula
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

/**
 * Sort POIs into ahead and behind based on current location and trail direction
 */
export const sortPOIsByLocation = (pois: POI[], currentPosition: number): SortedPOIs => {
  // First, ensure all POIs have a distance value
  const poisWithDistance = pois.map(poi => ({
    ...poi,
    distance: typeof poi.distance === 'number' ? poi.distance : 0
  }));

  const sorted = poisWithDistance.reduce<SortedPOIs>(
    (acc, poi) => {
      // Negative distance means the POI is behind the current position
      if (poi.distance < 0) {
        acc.behind.push(poi);
      } else {
        acc.ahead.push(poi);
      }
      return acc;
    },
    { ahead: [], behind: [] }
  );

  // Sort POIs by absolute distance from current position
  sorted.ahead.sort((a, b) => Math.abs(a.distance || 0) - Math.abs(b.distance || 0));
  sorted.behind.sort((a, b) => Math.abs(a.distance || 0) - Math.abs(b.distance || 0));

  return sorted;
}; 