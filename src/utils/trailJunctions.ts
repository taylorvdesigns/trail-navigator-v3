import { TrailPoint } from '../types';

interface Junction {
  location: [number, number]; // [longitude, latitude]
  trails: string[]; // Array of trail IDs that meet at this junction
}

// Calculate distance between two points in meters
function calculateDistance(point1: [number, number], point2: [number, number]): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = point1[1] * Math.PI/180;
  const φ2 = point2[1] * Math.PI/180;
  const Δφ = (point2[1] - point1[1]) * Math.PI/180;
  const Δλ = (point2[0] - point1[0]) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Find junctions between trails
export function findJunctions(
  trails: { id: string; points: TrailPoint[] }[],
  threshold = 10 // Distance threshold in meters
): Junction[] {
  const junctions: Junction[] = [];
  const processedPairs = new Set<string>();

  // Compare each trail with every other trail
  for (let i = 0; i < trails.length; i++) {
    for (let j = i + 1; j < trails.length; j++) {
      const pairKey = `${trails[i].id}-${trails[j].id}`;
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const trail1 = trails[i];
      const trail2 = trails[j];

      // Check each point in trail1 against each point in trail2
      for (const point1 of trail1.points) {
        for (const point2 of trail2.points) {
          const distance = calculateDistance(
            [point1.longitude, point1.latitude],
            [point2.longitude, point2.latitude]
          );

          // If points are close enough, they form a junction
          if (distance <= threshold) {
            // Check if we already have a junction nearby
            const existingJunction = junctions.find(junction => 
              calculateDistance(junction.location, [point1.longitude, point1.latitude]) <= threshold
            );

            if (existingJunction) {
              // Add trails to existing junction if not already present
              if (!existingJunction.trails.includes(trail1.id)) {
                existingJunction.trails.push(trail1.id);
              }
              if (!existingJunction.trails.includes(trail2.id)) {
                existingJunction.trails.push(trail2.id);
              }
            } else {
              // Create new junction
              junctions.push({
                location: [point1.longitude, point1.latitude],
                trails: [trail1.id, trail2.id]
              });
            }
          }
        }
      }
    }
  }

  return junctions;
}

// Group nearby junctions to avoid duplicates, preferring endpoint locations
export function consolidateJunctions(
  junctions: Junction[],
  threshold = 10,
  endpoints: [number, number][] = []
): Junction[] {
  const consolidated: Junction[] = [];

  for (const junction of junctions) {
    const nearbyJunction = consolidated.find(existing => 
      calculateDistance(existing.location, junction.location) <= threshold
    );

    if (nearbyJunction) {
      // Merge trails from both junctions
      const uniqueTrails = Array.from(new Set([...nearbyJunction.trails, ...junction.trails]));
      // Prefer endpoint location if any are close
      const closeEndpoints = endpoints.filter(endpoint =>
        calculateDistance(endpoint, junction.location) <= threshold ||
        calculateDistance(endpoint, nearbyJunction.location) <= threshold
      );
      if (closeEndpoints.length > 0) {
        // Use the first close endpoint as the marker location
        nearbyJunction.location = closeEndpoints[0];
      } else {
        // Otherwise, average the locations
        const avgLat = (nearbyJunction.location[1] + junction.location[1]) / 2;
        const avgLng = (nearbyJunction.location[0] + junction.location[0]) / 2;
        nearbyJunction.location = [avgLng, avgLat];
      }
      nearbyJunction.trails = uniqueTrails;
    } else {
      consolidated.push({ ...junction });
    }
  }

  return consolidated;
} 