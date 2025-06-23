import { Stop } from '../types';

interface DirectionalStops {
  left: Stop[];
  right: Stop[];
}

/**
 * Calculates the 2D cross product of two vectors.
 * A positive result means v2 is to the "left" of v1 (counter-clockwise).
 * A negative result means v2 is to the "right" of v1 (clockwise).
 */
function crossProduct(v1: {x: number, y: number}, v2: {x: number, y: number}): number {
  return v1.x * v2.y - v1.y * v2.x;
}

/**
 * Takes a list of stops for a main trail and splits them into "left" and "right" paths
 * relative to a user approaching a junction from a branch trail.
 * 
 * When in simulation mode, the simDirection parameter can be used to simulate
 * the user traveling in the opposite direction, which will flip the left/right
 * determination.
 */
export function getDirectionalStops(
  mainTrailStops: Stop[],
  junctionStop: Stop, // This is the junction stop from the *branch* trail
  userLocation: [number, number], // [latitude, longitude]
  simDirection?: 'top' | 'bottom'
): DirectionalStops {
  // The ID is structured like `junction-${rawJunctionId}-${trailId}`.
  // We need to find the corresponding junction stop on the main trail.
  const junctionIdParts = junctionStop.id.split('-');
  if (junctionIdParts[0] !== 'junction' || junctionIdParts.length < 3) {
    return { left: [], right: [] };
  }
  const rawJunctionId = junctionIdParts[1];

  // Now find the junction stop in the main trail list that shares the same raw ID.
  const mainTrailJunctionStop = mainTrailStops.find(s => s.type === 'junction' && s.id.startsWith(`junction-${rawJunctionId}-`));

  if (!mainTrailJunctionStop) {
    return { left: [], right: [] };
  }

  // Use the index of the junction *on the main trail* to split the stops.
  const junctionIndex = mainTrailStops.findIndex(s => s.id === mainTrailJunctionStop.id);

  if (junctionIndex === -1) {
    // This should not happen if mainTrailJunctionStop was found.
    return { left: [], right: [] };
  }

  // Path 1 is the part of the main trail *before* the junction stop.
  // It must be reversed to be ordered from the junction outwards.
  const path1 = mainTrailStops.slice(0, junctionIndex).reverse();
  
  // Path 2 is the part of the main trail *after* the junction stop.
  const path2 = mainTrailStops.slice(junctionIndex + 1);

  if (path1.length === 0 || path2.length === 0) {
    // This isn't a T-junction where a split is needed, so return empty.
    return { left: [], right: [] };
  }

  // Determine the user's approach vector to the junction.
  // Coords are [latitude, longitude], but we use [lon, lat] for [x, y] geometry.
  const junctionCoords = mainTrailJunctionStop.metadata.coordinates;
  const approachVector = {
    x: junctionCoords[1] - userLocation[1], // lon
    y: junctionCoords[0] - userLocation[0], // lat
  };

  // If in simulation mode and traveling in the opposite direction, flip the approach vector
  // This simulates the user approaching the junction from the opposite direction
  if (simDirection === 'bottom') {
    approachVector.x = -approachVector.x;
    approachVector.y = -approachVector.y;
  }

  // Determine the vector for the first path away from the junction.
  const path1StartCoords = path1[0].metadata.coordinates;
  const path1Vector = {
    x: path1StartCoords[1] - junctionCoords[1],
    y: path1StartCoords[0] - junctionCoords[0],
  };

  // Use the cross product to determine if path1 is to the left or right.
  const cross = crossProduct(approachVector, path1Vector);

  if (cross > 0) {
    // Path1 is to the left of the user's approach.
    return { left: path1, right: path2 };
  } else {
    // Path1 is to the right (or straight), so path2 must be the left turn.
    return { left: path2, right: path1 };
  }
} 