import { POI, TrailPoint } from '../types/index';

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
      point.latitude,
      point.longitude
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
 * Find the nearest point on a trail polyline (considers line segments, not only vertices)
 * Returns the closest point on the polyline with planar approximation, sufficient for short distances
 */
export const findNearestPointOnPolyline = (
  location: [number, number],
  trailPoints: TrailPoint[]
): { point: { latitude: number; longitude: number }; distance: number; index: number; t: number } | null => {
  if (!trailPoints.length) return null;

  // Convert lat/lon to approximate planar meters using equirectangular projection
  const R = 6371e3;
  const toXY = (lat: number, lon: number, refLat: number) => {
    const rad = Math.PI / 180;
    const x = R * (lon * rad) * Math.cos(refLat * rad);
    const y = R * (lat * rad);
    return { x, y };
  };

  const { latitude: lat0Guess } = trailPoints[0];
  const refLat = lat0Guess;
  const p = toXY(location[0], location[1], refLat);

  let minDist = Infinity;
  let bestPoint = { latitude: trailPoints[0].latitude, longitude: trailPoints[0].longitude };
  let bestIndex = 0;
  let bestT = 0;

  for (let i = 0; i < trailPoints.length - 1; i++) {
    const a = trailPoints[i];
    const b = trailPoints[i + 1];
    const aXY = toXY(a.latitude, a.longitude, refLat);
    const bXY = toXY(b.latitude, b.longitude, refLat);

    const abx = bXY.x - aXY.x;
    const aby = bXY.y - aXY.y;
    const apx = p.x - aXY.x;
    const apy = p.y - aXY.y;

    const abLen2 = abx * abx + aby * aby;
    const t = abLen2 === 0 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLen2));
    const cx = aXY.x + t * abx;
    const cy = aXY.y + t * aby;
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < minDist) {
      minDist = dist;
      bestIndex = i;
      bestT = t;
      // Convert back to lat/lon approximately
      const lon = (cx / (R * Math.cos(refLat * (Math.PI / 180)))) / (Math.PI / 180);
      const lat = (cy / R) / (Math.PI / 180);
      bestPoint = { latitude: lat, longitude: lon };
    }
  }

  return { point: bestPoint, distance: minDist, index: bestIndex, t: bestT };
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

/**
 * Get a random point from a trail
 */
export const getRandomTrailPoint = (trailPoints: TrailPoint[]): TrailPoint | null => {
  if (!trailPoints.length) return null;
  
  const randomIndex = Math.floor(Math.random() * trailPoints.length);
  return trailPoints[randomIndex];
};

/**
 * Get a random point from multiple trails
 */
export const getRandomTrailPointFromMultiple = (allTrailData: any[]): { point: TrailPoint; trailIndex: number } | null => {
  if (!allTrailData.length) return null;
  
  // Filter out trails without points
  const trailsWithPoints = allTrailData.filter(trail => trail?.points?.length > 0);
  if (!trailsWithPoints.length) return null;
  
  // Select a random trail
  const randomTrailIndex = Math.floor(Math.random() * trailsWithPoints.length);
  const selectedTrail = trailsWithPoints[randomTrailIndex];
  
  // Get a random point from the selected trail
  const randomPoint = getRandomTrailPoint(selectedTrail.points);
  
  if (!randomPoint) return null;
  
  return {
    point: randomPoint,
    trailIndex: randomTrailIndex
  };
}; 