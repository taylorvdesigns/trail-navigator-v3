// trailGraph.ts
// Utility for building and using a trail network graph for navigation
// This module does NOT fetch data; it only organizes and processes already-loaded trail, POI, and junction data.

import { TrailConfig, POI } from '../types/trail';
import { Graph, GraphNode, GraphEdge } from '../types/graph';
import { haversine } from './distance';

/**
 * The full trail network graph
 */
export interface TrailGraph {
  nodes: Record<string, GraphNode>;
  edges: GraphEdge[];
}

function haversineDistance([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]): number {
  // Returns distance in meters between two [lon, lat] points
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function consolidateJunctionsWithIds(junctions: { id: string; position: [number, number] }[], threshold = 15) {
  // Agglomerative clustering: merge all points within threshold of any group centroid
  const groups: { ids: string[]; positions: [number, number][] }[] = [];
  for (const j of junctions) {
    let found = false;
    for (const group of groups) {
      // Compute centroid
      const centroid = group.positions.reduce(
        (acc, pos) => [acc[0] + pos[0], acc[1] + pos[1]],
        [0, 0]
      ).map((sum) => sum / group.positions.length) as [number, number];
      if (haversineDistance(j.position, centroid) < threshold) {
        group.ids.push(j.id);
        group.positions.push(j.position);
        found = true;
        break;
      }
    }
    if (!found) {
      groups.push({ ids: [j.id], positions: [j.position] });
    }
  }
  // Merge overlapping groups (transitive closure)
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        // If any point in group i is within threshold of any point in group j, merge
        if (groups[i].positions.some(pos1 => groups[j].positions.some(pos2 => haversineDistance(pos1, pos2) < threshold))) {
          groups[i].ids.push(...groups[j].ids);
          groups[i].positions.push(...groups[j].positions);
          groups.splice(j, 1);
          merged = true;
          break;
        }
      }
      if (merged) break;
    }
  }
  // Assign new IDs and average positions
  const mergedNodes: GraphNode[] = groups.map((group, idx) => {
    const avg = group.positions.reduce((acc, pos) => [acc[0] + pos[0], acc[1] + pos[1]], [0, 0]);
    const centroid: [number, number] = [avg[0] / group.positions.length, avg[1] / group.positions.length];
    return {
      id: `junction-${idx}`,
      name: `Junction ${idx}`,
      type: 'junction',
      position: centroid,
      branches: []
    };
  });
  // Map original IDs to new IDs
  const idMap: Record<string, string> = {};
  groups.forEach((group, idx) => {
    for (const id of group.ids) {
      idMap[id] = `junction-${idx}`;
    }
  });
  return { merged: mergedNodes, idMap };
}

// Merge nearby nodes
function mergeNearbyNodes(nodes: GraphNode[], threshold: number): GraphNode[] {
  const groups: { positions: [number, number][]; nodes: GraphNode[] }[] = [];
  
  for (const node of nodes) {
    let foundGroup = false;
    for (const group of groups) {
      const avg = group.positions.reduce((acc, pos) => [acc[0] + pos[0], acc[1] + pos[1]], [0, 0]);
      const centroid: [number, number] = [avg[0] / group.positions.length, avg[1] / group.positions.length];
      if (haversine(centroid, node.position) < threshold) {
        group.positions.push(node.position);
        group.nodes.push(node);
        foundGroup = true;
        break;
      }
    }
    if (!foundGroup) {
      groups.push({ positions: [node.position], nodes: [node] });
    }
  }
  
  // Assign new IDs and average positions
  const mergedNodes: GraphNode[] = groups.map((group, idx) => {
    const avg = group.positions.reduce((acc, pos) => [acc[0] + pos[0], acc[1] + pos[1]], [0, 0]);
    const centroid: [number, number] = [avg[0] / group.positions.length, avg[1] / group.positions.length];
    return {
      id: `node-${idx}`,
      name: group.nodes.map(n => n.name).join(', '),
      type: 'junction',
      position: centroid,
      branches: [],
      trails: group.nodes.flatMap(n => n.trails || [])
    };
  });
  
  return mergedNodes;
}

/**
 * Builds a graph from trail configurations
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

  // Add junctions
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

  // Add POIs
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

  // Add edges
  trails.forEach(trail => {
    const trailNodes = Object.values(nodes).filter(node => 
      node.trails?.includes(trail.id)
    );

    // Sort nodes by distance along trail
    trailNodes.sort((a, b) => {
      const distA = haversine(trail.start.coordinates, a.position);
      const distB = haversine(trail.start.coordinates, b.position);
      return distA - distB;
    });

    // Add edges between consecutive nodes
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
  graph: TrailGraph,
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

    // For each neighbor
    for (const edge of graph.edges) {
      if (edge.from === currentId) {
        const neighborId = edge.to;
        const alt = distances[currentId] + edge.distance;
        if (alt < distances[neighborId]) {
          distances[neighborId] = alt;
          previous[neighborId] = currentId;
          queue.push({ id: neighborId, dist: alt });
        }
      }
      // If the graph is undirected, also check edge.to === currentId
      if (edge.to === currentId) {
        const neighborId = edge.from;
        const alt = distances[currentId] + edge.distance;
        if (alt < distances[neighborId]) {
          distances[neighborId] = alt;
          previous[neighborId] = currentId;
          queue.push({ id: neighborId, dist: alt });
        }
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