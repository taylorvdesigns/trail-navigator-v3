import { TrailPoint } from '../types/index';

// Convert meters to miles
export const metersToMiles = (meters: number): number => {
  return meters * 0.000621371;
};

// Calculate distance between two points in meters using the Haversine formula
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Calculate distance between two trail points
export const calculateTrailPointDistance = (point1: TrailPoint, point2: TrailPoint): number => {
  return calculateDistance(
    point1.latitude,
    point1.longitude,
    point2.latitude,
    point2.longitude
  );
};
