// Utility to robustly order POIs, junctions, and endpoints along a trail
import { POI, TrailConfig } from '../types/trail';
import { Junction } from '../types/junction';
import { Graph, GraphNode } from '../types/graph';
import { Position } from '../types/position';
import { haversine } from './distance';

// Helper: Find the closest point on a line segment
export function getClosestPointOnLine(point: [number, number], line: [number, number][]): { point: [number, number]; index: number } {
  let minDist = Infinity;
  let closestPoint: [number, number] = [0, 0];
  let closestIndex = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const start = line[i];
    const end = line[i + 1];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) continue;
    const px = point[0] - start[0];
    const py = point[1] - start[1];
    const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (length * length)));
    const cx = start[0] + t * dx;
    const cy = start[1] + t * dy;
    const dist = Math.sqrt(
      Math.pow(point[0] - cx, 2) +
      Math.pow(point[1] - cy, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      closestPoint = [cx, cy];
      closestIndex = i;
    }
  }
  return { point: closestPoint, index: closestIndex };
}

// Order POIs by projected distance along the trail
export function getOrderedPOIs(pois: POI[], trail: TrailConfig): (POI & { distance: number; minDistanceToTrail: number })[] {
  // Use start and end coordinates to create a line segment
  const coordinates: [number, number][] = [
    trail.start.coordinates,
    trail.end.coordinates
  ];
  
  return pois
    .map(poi => {
      const closestPoint = getClosestPointOnLine(poi.position, coordinates);
      const distance = haversine(poi.position, closestPoint.point);
      return {
        ...poi,
        distance,
        minDistanceToTrail: distance
      };
    })
    .sort((a, b) => a.distance - b.distance);
}

// Order all stops (endpoints, POIs, junctions) by projected distance along the trail
export function getOrderedStops({
  trail,
  pois,
  junctions,
  endpoint1Id,
  endpoint2Id
}: {
  trail: TrailConfig;
  pois: POI[];
  junctions: Junction[];
  endpoint1Id: string;
  endpoint2Id: string;
}): Array<{ type: 'endpoint' | 'poi' | 'junction'; id: string; distance: number; poi?: POI; junction?: Junction }> {
  // Use start and end coordinates to create a line segment
  const coordinates: [number, number][] = [
    trail.start.coordinates,
    trail.end.coordinates
  ];
  
  const orderedPOIs = getOrderedPOIs(pois, trail);
  const poiEntries = orderedPOIs.map(poi => ({ type: 'poi' as const, id: `poi-${poi.id}`, poi, distance: poi.distance }));
  const endpoint1 = { type: 'endpoint' as const, id: endpoint1Id, distance: 0 };
  const endpoint2 = { type: 'endpoint' as const, id: endpoint2Id, distance: Infinity };
  const junctionEntries = (junctions || []).map(junction => {
    // Convert Position to [number, number]
    const junctionPos: [number, number] = [junction.position.lng, junction.position.lat];
    const closestPoint = getClosestPointOnLine(junctionPos, coordinates);
    let distance = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];
      if (curr[0] === closestPoint.point[0] && curr[1] === closestPoint.point[1]) {
        distance += haversine(prev, curr);
        break;
      }
      distance += haversine(prev, curr);
    }
    return { type: 'junction' as const, id: junction.id, junction, distance };
  });

  return [...poiEntries, endpoint1, endpoint2, ...junctionEntries].sort((a, b) => a.distance - b.distance);
}

export function calculateAheadStops(
  graph: Graph,
  currentNode: GraphNode,
  currentPosition: Position,
  junctions: GraphNode[],
  maxStops: number = 5
): GraphNode[] {
  const stops: GraphNode[] = [];
  let currentId = currentNode.id;
  let count = 0;

  while (count < maxStops) {
    const edges = graph.edges[currentId] || [];
    if (edges.length === 0) break;

    // Get the next node (assuming first edge is the forward direction)
    const nextEdge = edges[0];
    const nextNode = graph.nodes[nextEdge.to];
    if (!nextNode) break;

    stops.push(nextNode);
    currentId = nextNode.id;
    count++;
  }

  return stops;
}

export function calculateBehindStops(
  graph: Graph,
  currentNode: GraphNode,
  currentPosition: Position,
  aheadStops: GraphNode[],
  junctions: GraphNode[],
  maxStops: number = 3
): GraphNode[] {
  const stops: GraphNode[] = [];
  let currentId = currentNode.id;
  let count = 0;

  while (count < maxStops) {
    const edges = graph.edges[currentId] || [];
    if (edges.length === 0) break;

    // Get the previous node (assuming second edge is the backward direction)
    const prevEdge = edges[1];
    if (!prevEdge) break;

    const prevNode = graph.nodes[prevEdge.to];
    if (!prevNode) break;

    stops.push(prevNode);
    currentId = prevNode.id;
    count++;
  }

  return stops;
}

export function findNextJunction(stops: GraphNode[], junctions: GraphNode[]): GraphNode | null {
  return stops.find(stop => junctions.some(j => j.id === stop.id)) || null;
}

export function calculateBranches(graph: Graph, junction: GraphNode): GraphNode[][] {
  const branches: GraphNode[][] = [];

  if (!junction.branches) return branches;

  for (const branchId of junction.branches) {
    const branchStops: GraphNode[] = [];
    let currentId = junction.id;
    let count = 0;

    while (count < 5) { // Limit to 5 stops per branch
      const edges = graph.edges[currentId] || [];
      const nextEdge = edges.find(edge => edge.trailId === branchId);
      if (!nextEdge) break;

      const nextNode = graph.nodes[nextEdge.to];
      if (!nextNode) break;

      branchStops.push(nextNode);
      currentId = nextNode.id;
      count++;
    }

    branches.push(branchStops);
  }

  return branches;
} 