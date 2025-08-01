/**
 * Trail Graph Utilities
 * 
 * Utility module for building and using a trail network graph for navigation.
 * This module does NOT fetch data; it only organizes and processes already-loaded 
 * trail, POI, and junction data to create a navigable graph structure.
 * 
 * Features:
 * - Graph construction from trail configurations
 * - Pathfinding algorithms for trail navigation
 * - Distance calculations using trail network
 * - POI and junction integration
 * - Network-based distance calculations
 * - Point projection onto trail segments
 * - Junction connectivity analysis
 */

// trailGraph.ts
// Utility for building and using a trail network graph for navigation
// This module does NOT fetch data; it only organizes and processes already-loaded trail, POI, and junction data.

import { TrailConfig, POI } from '../types/trail';
import { Graph, GraphNode, GraphEdge } from '../types/graph';
import { haversine } from './distance';

/**
 * The full trail network graph interface
 * Represents the complete navigable trail system as a graph structure
 */
export interface TrailGraph {
  nodes: Record<string, GraphNode>;  // All nodes in the graph (endpoints, junctions, POIs)
  edges: GraphEdge[];                // All edges connecting nodes
}

/**
 * Builds a graph from trail configurations
 * Creates a navigable graph structure from trail data including endpoints, junctions, and POIs
 * 
 * @param trails - Array of trail configurations to build the graph from
 * @returns Graph object representing the trail network
 */
export function buildTrailGraph(trails: TrailConfig[]): Graph {
  const nodes: Record<string, GraphNode> = {};
  const edges: Record<string, GraphEdge[]> = {};

  // Add endpoints for each trail
  trails.forEach(trail => {
    const endpoint1: GraphNode = {
      id: `endpoint-${trail.id}-1`,
      type: 'endpoint',
      name: `${trail.name} Start`,
      position: trail.start.coordinates,
      trails: [trail.id]
    };

    const endpoint2: GraphNode = {
      id: `endpoint-${trail.id}-2`,
      type: 'endpoint',
      name: `${trail.name} End`,
      position: trail.end.coordinates,
      trails: [trail.id]
    };

    nodes[endpoint1.id] = endpoint1;
    nodes[endpoint2.id] = endpoint2;
  });

  // Add junctions (intersection points between trails)
  trails.forEach(trail => {
    trail.junctions.forEach(junction => {
      const junctionNode: GraphNode = {
        id: junction.id,
        type: 'junction',
        name: junction.name || `Junction ${junction.id}`,
        position: junction.coordinates,
        trails: [trail.id],
        branches: junction.branches || []
      };
      nodes[junction.id] = junctionNode;
    });
  });

  // Add POIs (Points of Interest) along trails
  trails.forEach(trail => {
    trail.pois.forEach(poi => {
      const poiNode: GraphNode = {
        id: poi.id,
        type: 'poi',
        name: poi.name,
        position: poi.position,
        trails: [trail.id],
        poiId: poi.id
      };
      nodes[poi.id] = poiNode;
    });
  });

  // Add edges (connections between nodes along trails)
  trails.forEach(trail => {
    const trailNodes = Object.values(nodes).filter(node => 
      node.trails?.includes(trail.id)
    );

    // Sort nodes by distance along trail from start point
    trailNodes.sort((a, b) => {
      const distA = haversine(trail.start.coordinates, a.position);
      const distB = haversine(trail.start.coordinates, b.position);
      return distA - distB;
    });

    // Add edges between consecutive nodes along the trail
    for (let i = 0; i < trailNodes.length - 1; i++) {
      const source = trailNodes[i];
      const target = trailNodes[i + 1];
      const distance = haversine(source.position, target.position);

      const edge: GraphEdge = {
        from: source.id,
        to: target.id,
        trailId: trail.id,
        distance
      };

      if (!edges[source.id]) edges[source.id] = [];
      edges[source.id].push(edge);

      // Add reverse edge for bidirectional trails
      const reverseEdge: GraphEdge = {
        from: target.id,
        to: source.id,
        trailId: trail.id,
        distance
      };

      if (!edges[target.id]) edges[target.id] = [];
      edges[target.id].push(reverseEdge);
    }
  });

  return { nodes, edges };
}

/**
 * Get nodes ahead of the current position
 */
export function getNodesAhead(
  graph: Graph,
  startId: string,
  targetId: string | null,
  maxNodes: number = 5
): { path: GraphNode[] } | null {
  if (!graph.nodes || !graph.edges) return null;
  const visited = new Set<string>();
  const path: GraphNode[] = [];

  let currentId = startId;
  while (path.length < maxNodes) {
    if (currentId === targetId) break;
    if (visited.has(currentId)) break;

    visited.add(currentId);
    const currentNode = graph.nodes[currentId];
    if (!currentNode) break;

    path.push(currentNode);

    const edges = graph.edges[currentId] || [];
    if (edges.length === 0) break;

    const nextEdge = edges[0];
    currentId = nextEdge.to;
  }

  return path.length > 0 ? { path } : null;
}

/**
 * Get nodes behind the current position
 */
export function getNodesBehind(
  graph: Graph,
  startId: string,
  targetId: string | null,
  maxNodes: number = 3
): { path: GraphNode[] } | null {
  if (!graph.nodes || !graph.edges) return null;
  const visited = new Set<string>();
  const path: GraphNode[] = [];

  let currentId = startId;
  while (path.length < maxNodes) {
    if (currentId === targetId) break;
    if (visited.has(currentId)) break;

    visited.add(currentId);
    const currentNode = graph.nodes[currentId];
    if (!currentNode) break;

    path.push(currentNode);

    const edges = graph.edges[currentId] || [];
    if (edges.length === 0) break;

    const prevEdge = edges[1];
    if (!prevEdge) break;

    currentId = prevEdge.to;
  }

  return path.length > 0 ? { path } : null;
}

/**
 * Find the shortest path between two nodes in the graph using Dijkstra's algorithm.
 * Returns an object with the path (array of node IDs) and total distance, or null if no path exists.
 */
export function findShortestPath(
  graph: Graph,
  startId: string,
  endId: string
): { path: string[]; distance: number } | null {
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const visited: Set<string> = new Set();
  const queue: { id: string; dist: number }[] = [];

  // Initialize distances
  for (const nodeId in graph.nodes) {
    distances[nodeId] = Infinity;
    previous[nodeId] = null;
  }
  distances[startId] = 0;
  queue.push({ id: startId, dist: 0 });

  while (queue.length > 0) {
    // Get node with smallest distance
    queue.sort((a, b) => a.dist - b.dist);
    const { id: currentId } = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    if (currentId === endId) break;

    // For each neighbor (iterate over all edges from currentId)
    const edges = graph.edges[currentId] || [];
    for (const edge of edges) {
      const neighborId = edge.to;
      const alt = distances[currentId] + edge.distance;
      if (alt < distances[neighborId]) {
        distances[neighborId] = alt;
        previous[neighborId] = currentId;
        queue.push({ id: neighborId, dist: alt });
      }
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let u: string | null = endId;
  if (previous[u] !== null || u === startId) {
    while (u) {
      path.unshift(u);
      u = previous[u];
    }
    return { path, distance: distances[endId] };
  }
  
  return null;
}

/**
 * Get all branch/junction nodes connected to a given node.
 * Returns an array of node IDs for all directly connected junctions/branches.
 */
export function getConnectedJunctions(
  graph: TrailGraph,
  nodeId: string
): string[] {
  const connected: Set<string> = new Set();
  for (const edge of graph.edges) {
    if (edge.from === nodeId && graph.nodes[edge.to]?.type === 'junction') {
      connected.add(edge.to);
    }
    if (edge.to === nodeId && graph.nodes[edge.from]?.type === 'junction') {
      connected.add(edge.from);
    }
  }
  return Array.from(connected);
}

export function findNearestNode(graph: Graph, position: [number, number]): GraphNode | null {
  if (!graph.nodes) return null;
  let minDist = Infinity;
  let nearestNode: GraphNode | null = null;
  for (const node of Object.values(graph.nodes)) {
    const dist = haversine(node.position, position);
    if (dist < minDist) {
      minDist = dist;
      nearestNode = node;
    }
  }
  return nearestNode;
}

export function buildGraph(trailConfig: TrailConfig): Graph {
  const nodes: Record<string, GraphNode> = {};
  const edgeArr: GraphEdge[] = [];

  // Add junction nodes
  trailConfig.junctions.forEach((junction) => {
    nodes[junction.id] = {
      id: junction.id,
      type: 'junction',
      position: junction.coordinates,
      name: junction.name || 'Junction',
      branches: junction.branches || [],
    };
  });

  // Add endpoint nodes
  trailConfig.trails.forEach((trail) => {
    const endpoint1: GraphNode = {
      id: `${trail.id}_start`,
      type: 'endpoint',
      position: trail.start.coordinates,
      name: trail.start.name || 'Start',
      trails: [trail.id],
    };
    const endpoint2: GraphNode = {
      id: `${trail.id}_end`,
      type: 'endpoint',
      position: trail.end.coordinates,
      name: trail.end.name || 'End',
      trails: [trail.id],
    };
    nodes[endpoint1.id] = endpoint1;
    nodes[endpoint2.id] = endpoint2;
  });

  // Add POI nodes
  trailConfig.pois.forEach((poi) => {
    nodes[poi.id] = {
      id: poi.id,
      type: 'poi',
      position: poi.position,
      name: poi.name,
      trails: poi.trails || [],
    };
  });

  // Add edges
  trailConfig.trails.forEach((trail) => {
    const startNode = nodes[`${trail.id}_start`];
    const endNode = nodes[`${trail.id}_end`];
    if (startNode && endNode) {
      edgeArr.push({
        from: startNode.id,
        to: endNode.id,
        trailId: trail.id,
        distance: haversine(startNode.position, endNode.position),
      });
    }
  });

  // Convert edgeArr to Record<string, GraphEdge[]>
  const edges: Record<string, GraphEdge[]> = {};
  for (const edge of edgeArr) {
    if (!edges[edge.from]) edges[edge.from] = [];
    edges[edge.from].push(edge);
  }

  return { nodes, edges };
}

export function buildSingleTrailGraph(trail: TrailConfig, pois: POI[]): Graph {
  const nodes: Record<string, GraphNode> = {};
  const edges: Record<string, GraphEdge[]> = {};

  // Add endpoints for each trail
  trail.trails.forEach(trail => {
    const endpoint1: GraphNode = {
      id: `endpoint-${trail.id}-1`,
      type: 'endpoint',
      name: `${trail.name} Start`,
      position: trail.start.coordinates,
      trails: [trail.id]
    };

    const endpoint2: GraphNode = {
      id: `endpoint-${trail.id}-2`,
      type: 'endpoint',
      name: `${trail.name} End`,
      position: trail.end.coordinates,
      trails: [trail.id]
    };

    nodes[endpoint1.id] = endpoint1;
    nodes[endpoint2.id] = endpoint2;
  });

  // Add junctions
  trail.junctions.forEach(junction => {
    const junctionNode: GraphNode = {
      id: junction.id,
      type: 'junction',
      name: junction.name || `Junction ${junction.id}`,
      position: junction.coordinates,
      trails: [trail.id],
      branches: junction.branches || []
    };
    nodes[junction.id] = junctionNode;
  });

  // Add POIs
  pois.forEach(poi => {
    const poiNode: GraphNode = {
      id: poi.id,
      type: 'poi',
      name: poi.name,
      position: poi.position,
      trails: [trail.id],
      poiId: poi.id
    };
    nodes[poi.id] = poiNode;
  });

  // Create edges between nodes
  for (const node of Object.values(nodes)) {
    edges[node.id] = [];
  }

  // Add edges between consecutive nodes
  for (let i = 0; i < Object.values(nodes).length - 1; i++) {
    const node1 = Object.values(nodes)[i];
    const node2 = Object.values(nodes)[i + 1];
    const distance = haversine(node1.position, node2.position);
    
    const edge1: GraphEdge = {
      from: node1.id,
      to: node2.id,
      trailId: trail.id,
      distance,
      isBidirectional: true
    };
    
    const edge2: GraphEdge = {
      from: node2.id,
      to: node1.id,
      trailId: trail.id,
      distance,
      isBidirectional: true
    };
    
    edges[node1.id].push(edge1);
    edges[node2.id].push(edge2);
  }

  return { nodes, edges: edges as unknown as Record<string, GraphEdge[]> } as unknown as Graph;
}

/**
 * Given a point and a graph, find the nearest edge (segment between two nodes),
 * project the point onto it, and return the edge's node IDs, the projection point,
 * and the distance from the start node to the projection (along the segment).
 */
export function projectPointOntoGraphEdge(
  graph: Graph,
  point: [number, number]
): {
  from: string;
  to: string;
  projection: [number, number];
  distanceFromStart: number;
  edgeLength: number;
} | null {
  let minDist = Infinity;
  let result: {
    from: string;
    to: string;
    projection: [number, number];
    distanceFromStart: number;
    edgeLength: number;
  } | null = null;

  for (const edgeList of Object.values(graph.edges)) {
    for (const edge of edgeList) {
      const fromNode = graph.nodes[edge.from];
      const toNode = graph.nodes[edge.to];
      if (!fromNode || !toNode) continue;
      const start = fromNode.position;
      const end = toNode.position;
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const lengthSq = dx * dx + dy * dy;
      if (lengthSq === 0) continue;
      const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSq));
      const proj: [number, number] = [start[0] + t * dx, start[1] + t * dy];
      const distFromStart = haversine(start, proj);
      const distToPoint = haversine(proj, point);
      const edgeLen = haversine(start, end);
      if (distToPoint < minDist) {
        minDist = distToPoint;
        result = {
          from: edge.from,
          to: edge.to,
          projection: proj,
          distanceFromStart: distFromStart,
          edgeLength: edgeLen
        };
      }
    }
  }
  return result;
}

/**
 * Calculates the true network distance between two arbitrary points along the trail graph,
 * using projection onto the nearest edges and Dijkstra for the path in between.
 * This is the core function for accurate trail-based distance calculations.
 * 
 * @param graph - The trail network graph
 * @param startPoint - Starting coordinates [lng, lat]
 * @param endPoint - Ending coordinates [lng, lat]
 * @returns Network distance in meters, or null if calculation is not possible
 */
export function calculatePreciseNetworkDistance(
  graph: Graph,
  startPoint: [number, number],
  endPoint: [number, number]
): number | null {
  const startProj = projectPointOntoGraphEdge(graph, startPoint);
  const endProj = projectPointOntoGraphEdge(graph, endPoint);
  
  if (!startProj || !endProj) {
    return null;
  }

  // If both points project onto the same edge (regardless of direction)
  if (
    (startProj.from === endProj.from && startProj.to === endProj.to) ||
    (startProj.from === endProj.to && startProj.to === endProj.from)
  ) {
    const distance = Math.abs(startProj.distanceFromStart - endProj.distanceFromStart);
    return distance;
  }

  // Otherwise, calculate the full network distance:
  const startToFrom = startProj.distanceFromStart;
  const startToTo = startProj.edgeLength - startProj.distanceFromStart;
  const startNearestNode = startToFrom < startToTo ? startProj.from : startProj.to;
  const startPartial = Math.min(startToFrom, startToTo);

  const endToFrom = endProj.distanceFromStart;
  const endToTo = endProj.edgeLength - endProj.distanceFromStart;
  const endNearestNode = endToFrom < endToTo ? endProj.from : endProj.to;
  const endPartial = Math.min(endToFrom, endToTo);

  // Use the existing findShortestPath (returns { path, distance })
  const pathResult = findShortestPath(graph, startNearestNode, endNearestNode);
  
  const pathDistance = pathResult && typeof pathResult.distance === 'number' ? pathResult.distance : null;
  if (pathDistance === null) {
    return null;
  }

  const totalDistance = startPartial + pathDistance + endPartial;
  return totalDistance;
} 

/**
 * Returns the network (along-trail) distance in meters between two points using the trail graph.
 * This is the main public interface for network distance calculations.
 * 
 * @param graph - The trail network graph
 * @param fromCoords - [lng, lat] of the starting point (e.g., user location)
 * @param toCoords - [lng, lat] of the destination (e.g., POI location)
 * @returns Network distance in meters, or null if not computable
 */
export function getNetworkDistanceBetweenPoints(
  graph: any,
  fromCoords: [number, number],
  toCoords: [number, number]
): number | null {
  if (!graph || !fromCoords || !toCoords) return null;
  return calculatePreciseNetworkDistance(graph, fromCoords, toCoords);
} 