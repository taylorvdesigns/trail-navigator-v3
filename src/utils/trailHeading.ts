import { TrailPoint } from '../types/index';
import { findNearestTrailPoint } from './trail';

/**
 * Determines which direction along a trail a user is heading
 * @param userLocation Current user location [longitude, latitude]
 * @param trailPoints Array of trail points with distance properties
 * @param previousLocation Previous user location (optional, for movement-based detection)
 * @returns 'toward_start' | 'toward_end' | null if unable to determine
 */
export function determineTrailHeading(
  userLocation: [number, number],
  trailPoints: TrailPoint[],
  previousLocation?: [number, number]
): 'toward_start' | 'toward_end' | null {
  if (!trailPoints || trailPoints.length === 0) {
    return null;
  }

  // Method 1: Movement-based detection (if we have previous location)
  if (previousLocation) {
    const movementDirection = detectMovementDirection(userLocation, previousLocation, trailPoints);
    if (movementDirection) {
      return movementDirection;
    }
  }

  // Method 2: Position-based detection (fallback)
  return detectPositionBasedDirection(userLocation, trailPoints);
}

/**
 * Detect heading based on user movement along the trail
 */
function detectMovementDirection(
  currentLocation: [number, number],
  previousLocation: [number, number],
  trailPoints: TrailPoint[]
): 'toward_start' | 'toward_end' | null {
  // Find the nearest trail points for both current and previous locations
  const currentNearest = findNearestTrailPoint(currentLocation, trailPoints);
  const previousNearest = findNearestTrailPoint(previousLocation, trailPoints);

  if (!currentNearest || !previousNearest) {
    return null;
  }

  // Calculate the distance change along the trail
  const currentDistance = currentNearest.point.distance || 0;
  const previousDistance = previousNearest.point.distance || 0;
  const distanceChange = currentDistance - previousDistance;

  // If the user moved more than 5 meters along the trail, use that direction
  if (Math.abs(distanceChange) > 5) {
    return distanceChange > 0 ? 'toward_end' : 'toward_start';
  }

  return null;
}

/**
 * Detect heading based on user's position relative to trail endpoints
 * This is a fallback when movement-based detection isn't available
 */
function detectPositionBasedDirection(
  userLocation: [number, number],
  trailPoints: TrailPoint[]
): 'toward_start' | 'toward_end' | null {
  const nearestPoint = findNearestTrailPoint(userLocation, trailPoints);
  if (!nearestPoint) {
    return null;
  }

  const userDistance = nearestPoint.point.distance || 0;
  const trailLength = trailPoints[trailPoints.length - 1]?.distance || 0;

  // If trail is very short, default to toward_end
  if (trailLength < 100) {
    return 'toward_end';
  }

  // Use the endpoint that's farther away as the likely destination
  // This assumes users typically want to go to the "destination" endpoint
  const distanceToStart = userDistance;
  const distanceToEnd = trailLength - userDistance;

  return distanceToEnd > distanceToStart ? 'toward_end' : 'toward_start';
}

/**
 * Get the appropriate endpoint name based on heading direction
 * @param headingDirection Direction the user is heading
 * @param endpointNames Array of [startName, endName]
 * @returns The name of the endpoint the user is heading toward
 */
export function getEndpointNameForHeading(
  headingDirection: 'toward_start' | 'toward_end' | null,
  endpointNames: [string, string] | undefined
): string {
  if (!headingDirection || !endpointNames) {
    return 'Unknown';
  }

  return headingDirection === 'toward_end' ? endpointNames[1] : endpointNames[0];
} 