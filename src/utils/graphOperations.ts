import { Graph, GraphNode, GraphEdge, Position } from '../types/graph';
import { POI } from '../types/trail';

// Calculate distance between two points using Haversine formula
export function calculateDistance(pos1: [number, number], pos2: [number, number]): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (pos1[1] * Math.PI) / 180;
  const φ2 = (pos2[1] * Math.PI) / 180;
  const Δφ = ((pos2[1] - pos1[1]) * Math.PI) / 180;
  const Δλ = ((pos2[0] - pos1[0]) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find the nearest node to a given position
export function findNearestNode(graph: Graph, position: [number, number]): GraphNode | null {
  if (!graph.nodes) return null;
  let minDist = Infinity;
  let nearest: GraphNode | null = null;
  for (const node of Object.values(graph.nodes)) {
    const dist = calculateDistance(node.position, position);
    if (dist < minDist) {
      minDist = dist;
      nearest = node;
    }
  }
  return nearest;
}

// Find the nearest POI to a given position
export function findNearestPOI(pois: POI[], position: [number, number]): POI | null {
  let minDist = Infinity;
  let nearest: POI | null = null;
  for (const poi of pois) {
    const dist = calculateDistance(poi.position, position);
    if (dist < minDist) {
      minDist = dist;
      nearest = poi;
    }
  }
  return nearest;
}

// Find the next junction in the path
export function findNextJunction(
  aheadStops: GraphNode[],
  junctions: GraphNode[]
): GraphNode | null {
  for (const stop of aheadStops) {
    const junction = junctions.find(j => j.id === stop.id);
    if (junction) {
      return junction;
    }
  }
  return null;
}

// Count stops between current position and junction
export function countStopsToJunction(
  currentPosition: Position,
  junction: GraphNode,
  aheadStops: GraphNode[]
): number {
  let count = 0;
  let foundJunction = false;

  for (const stop of aheadStops) {
    if (stop.id === junction.id) {
      foundJunction = true;
      break;
    }
    count++;
  }

  return foundJunction ? count : Infinity;
}

// Check if split view should be shown
export function shouldShowSplitView(
  currentPosition: Position,
  aheadStops: GraphNode[],
  junctions: GraphNode[]
): boolean {
  const nextJunction = findNextJunction(aheadStops, junctions);
  if (!nextJunction) return false;

  const stopsToJunction = countStopsToJunction(currentPosition, nextJunction, aheadStops);
  return stopsToJunction <= 2;
}

// Find shortest path using Dijkstra's algorithm
export function findShortestPath(graph: Graph, startId: string, endId: string): string[] {
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>(Object.keys(graph.nodes));

  for (const nodeId of Object.keys(graph.nodes)) {
    distances.set(nodeId, Infinity);
    previous.set(nodeId, null);
  }
  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let currentId: string | null = null;
    let minDist = Infinity;
    for (const nodeId of Array.from(unvisited)) {
      const dist = distances.get(nodeId) || Infinity;
      if (dist < minDist) {
        minDist = dist;
        currentId = nodeId;
      }
    }

    if (currentId === null || currentId === endId) break;
    unvisited.delete(currentId);
    const edges = graph.edges[currentId] || [];
    for (const edge of edges) {
      if (!unvisited.has(edge.to)) continue;
      const distance = (distances.get(currentId) || 0) + 1; // Use 1 as default step distance
      if (distance < (distances.get(edge.to) || Infinity)) {
        distances.set(edge.to, distance);
        previous.set(edge.to, currentId);
      }
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let current = endId;
  while (current) {
    path.unshift(current);
    current = previous.get(current) || '';
  }
  return path;
} 