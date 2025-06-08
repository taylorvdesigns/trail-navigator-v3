/**
 * Calculate the convex hull of a set of points using the Graham scan algorithm
 */
export const convexHull = (points: [number, number][]): [number, number][] => {
  if (points.length <= 3) return points;

  // Find the point with the lowest y-coordinate (and leftmost if tied)
  const start = points.reduce((lowest, point) => {
    if (point[1] < lowest[1] || (point[1] === lowest[1] && point[0] < lowest[0])) {
      return point;
    }
    return lowest;
  }, points[0]);

  // Sort points by polar angle with start point
  const sortedPoints = points
    .filter(point => point !== start)
    .sort((a, b) => {
      const angleA = Math.atan2(a[1] - start[1], a[0] - start[0]);
      const angleB = Math.atan2(b[1] - start[1], b[0] - start[0]);
      if (angleA === angleB) {
        // If angles are equal, sort by distance
        const distA = Math.hypot(a[0] - start[0], a[1] - start[1]);
        const distB = Math.hypot(b[0] - start[0], b[1] - start[1]);
        return distA - distB;
      }
      return angleA - angleB;
    });

  // Graham scan
  const hull: [number, number][] = [start];
  for (const point of sortedPoints) {
    while (hull.length >= 2 && !isLeftTurn(hull[hull.length - 2], hull[hull.length - 1], point)) {
      hull.pop();
    }
    hull.push(point);
  }

  return hull;
};

/**
 * Check if three points make a left turn
 */
const isLeftTurn = (p1: [number, number], p2: [number, number], p3: [number, number]): boolean => {
  return (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]) > 0;
};

/**
 * Expand a convex hull by a fixed amount
 */
export const expandHullFixed = (hull: [number, number][], buffer: number): [number, number][] => {
  if (hull.length < 3) return hull;

  const expanded: [number, number][] = [];
  for (let i = 0; i < hull.length; i++) {
    const prev = hull[(i - 1 + hull.length) % hull.length];
    const curr = hull[i];
    const next = hull[(i + 1) % hull.length];

    // Calculate vectors
    const v1 = [prev[0] - curr[0], prev[1] - curr[1]];
    const v2 = [next[0] - curr[0], next[1] - curr[1]];

    // Normalize vectors
    const len1 = Math.hypot(v1[0], v1[1]);
    const len2 = Math.hypot(v2[0], v2[1]);
    const n1 = [v1[0] / len1, v1[1] / len1];
    const n2 = [v2[0] / len2, v2[1] / len2];

    // Calculate bisector
    const bisector = [n1[0] + n2[0], n1[1] + n2[1]];
    const bisectorLen = Math.hypot(bisector[0], bisector[1]);
    const normalizedBisector = [bisector[0] / bisectorLen, bisector[1] / bisectorLen];

    // Calculate expanded point
    const expandedPoint: [number, number] = [
      curr[0] + normalizedBisector[0] * buffer,
      curr[1] + normalizedBisector[1] * buffer
    ];

    expanded.push(expandedPoint);
  }

  return expanded;
};

/**
 * Expand a convex hull outward from the centroid by a fixed amount
 */
export const expandHullFromCentroid = (hull: [number, number][], buffer: number): [number, number][] => {
  if (hull.length < 3) return hull;
  // Calculate centroid
  const centroid = hull.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
  centroid[0] /= hull.length;
  centroid[1] /= hull.length;
  // Move each point outward from centroid
  return hull.map(([x, y]) => {
    const dx = x - centroid[0];
    const dy = y - centroid[1];
    const len = Math.hypot(dx, dy);
    if (len === 0) return [x, y];
    const nx = dx / len;
    const ny = dy / len;
    return [x + nx * buffer, y + ny * buffer];
  });
};

/**
 * Find the farthest point on the hull from the centroid
 */
export const farthestHullPoint = (hull: [number, number][], centroid: [number, number]): [number, number] => {
  return hull.reduce((farthest, point) => {
    const distToFarthest = Math.hypot(farthest[0] - centroid[0], farthest[1] - centroid[1]);
    const distToPoint = Math.hypot(point[0] - centroid[0], point[1] - centroid[1]);
    return distToPoint > distToFarthest ? point : farthest;
  }, hull[0]);
};

/**
 * Find the nearest point on the hull to a given point
 */
export const nearestHullPoint = (hull: [number, number][], point: [number, number]): [number, number] => {
  return hull.reduce((nearest, hullPoint) => {
    const distToNearest = Math.hypot(nearest[0] - point[0], nearest[1] - point[1]);
    const distToPoint = Math.hypot(hullPoint[0] - point[0], hullPoint[1] - point[1]);
    return distToPoint < distToNearest ? hullPoint : nearest;
  }, hull[0]);
};

/**
 * Check if a box overlaps with any points
 */
export const pixelBoxOverlaps = (
  box: { x: number; y: number; width: number; height: number },
  hullPoints: { x: number; y: number }[],
  trailPoints: { x: number; y: number }[]
): boolean => {
  const boxRight = box.x + box.width;
  const boxBottom = box.y + box.height;

  // Check hull points
  for (const point of hullPoints) {
    if (
      point.x >= box.x &&
      point.x <= boxRight &&
      point.y >= box.y &&
      point.y <= boxBottom
    ) {
      return true;
    }
  }

  // Check trail points
  for (const point of trailPoints) {
    if (
      point.x >= box.x &&
      point.x <= boxRight &&
      point.y >= box.y &&
      point.y <= boxBottom
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Estimate the size of a label in pixels
 */
export const estimateLabelSize = (text: string): { width: number; height: number } => {
  // Rough estimate: 8px per character for width, 20px for height
  return {
    width: text.length * 8,
    height: 20
  };
}; 