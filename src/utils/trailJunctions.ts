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
  threshold = 20 // Distance threshold in meters, increased from 10
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

      // Find the closest points between the two trails
      let minDistance = Infinity;
      let closestPoint1: TrailPoint | null = null;
      let closestPoint2: TrailPoint | null = null;

      // Check every 5th point instead of every 10th point
      for (let k = 0; k < trail1.points.length; k += 5) {
        const point1 = trail1.points[k];
        for (let l = 0; l < trail2.points.length; l += 5) {
          const point2 = trail2.points[l];
          const distance = calculateDistance(
            [point1.longitude, point1.latitude],
            [point2.longitude, point2.latitude]
          );

          if (distance < minDistance) {
            minDistance = distance;
            closestPoint1 = point1;
            closestPoint2 = point2;
          }
        }
      }

      // If the trails are close enough, create a junction
      if (minDistance <= threshold && closestPoint1 && closestPoint2) {
        // Check if the closest points are endpoints of their respective trails.
        const isPoint1Endpoint = 
          (closestPoint1.latitude === trail1.points[0].latitude && closestPoint1.longitude === trail1.points[0].longitude) ||
          (closestPoint1.latitude === trail1.points[trail1.points.length - 1].latitude && closestPoint1.longitude === trail1.points[trail1.points.length - 1].longitude);

        const isPoint2Endpoint = 
          (closestPoint2.latitude === trail2.points[0].latitude && closestPoint2.longitude === trail2.points[0].longitude) ||
          (closestPoint2.latitude === trail2.points[trail2.points.length - 1].latitude && closestPoint2.longitude === trail2.points[trail2.points.length - 1].longitude);

        // Only create a junction if at least one of the points is NOT an endpoint.
        // This prevents creating junctions for trails that simply start/end at the same location.
        if (isPoint1Endpoint && isPoint2Endpoint) {
          // Both are endpoints, so we skip creating a junction here.
          continue; 
        }

        // Check if we already have a junction nearby
        const existingJunction = junctions.find(junction => 
          calculateDistance(junction.location, [closestPoint1!.longitude, closestPoint1!.latitude]) <= threshold * 2
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
          // Create new junction using the midpoint between the closest points
          const avgLat = (closestPoint1.latitude + closestPoint2.latitude) / 2;
          const avgLng = (closestPoint1.longitude + closestPoint2.longitude) / 2;
          
          // Check if any other trails pass through this junction point
          const otherTrails = trails
            .filter(t => t.id !== trail1.id && t.id !== trail2.id)
            .filter(t => {
              // Find the closest point on this trail to the junction
              let minDist = Infinity;
              for (let m = 0; m < t.points.length; m += 5) {
                const point = t.points[m];
                const dist = calculateDistance(
                  [avgLng, avgLat],
                  [point.longitude, point.latitude]
                );
                minDist = Math.min(minDist, dist);
              }
              return minDist <= threshold;
            })
            .map(t => t.id);
          
          junctions.push({
            location: [avgLng, avgLat],
            trails: Array.from(new Set([trail1.id, trail2.id, ...otherTrails]))
          });
        }
      }
    }
  }

  return junctions;
}

// Group nearby junctions to avoid duplicates, preferring endpoint locations
export function consolidateJunctions(
  junctions: Junction[],
  threshold = 20, // Increased from 10 to match findJunctions
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