import { POI } from './trail';

export interface Position {
  lat: number;
  lng: number;
}

export interface GraphNode {
  id: string;
  type: 'poi' | 'junction' | 'endpoint';
  position: [number, number];
  name: string;
  trailId?: string;
  branches?: string[];
  trails?: string[];
  distance?: number;
  closestPOI?: any;
  coordinates?: [number, number];
  poiId?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  trailId: string;
  distance: number;
  isBidirectional?: boolean;
}

export interface Graph {
  nodes: Record<string, GraphNode>;
  edges: Record<string, GraphEdge[]>;
}

export interface NavViewState {
  currentPosition: Position;
  currentNode: GraphNode;
  ahead: Array<GraphNode | POI>;
  behind: Array<GraphNode | POI>;
  shouldShowSplit: boolean;
} 