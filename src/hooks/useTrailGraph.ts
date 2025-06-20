// useTrailGraph.ts
// Hook to build and provide the trail network graph from loaded trail, POI, and junction data

import { useQuery } from '@tanstack/react-query';
import { Graph, GraphNode } from '../types/graph';

export { type Graph, type GraphNode };

export function useTrailGraph() {
  const { data: graph, isLoading, error } = useQuery<Graph>({
    queryKey: ['trailGraph'],
    queryFn: async () => {
      const response = await fetch('/api/trail-graph.js');
      if (!response.ok) {
        throw new Error('Failed to fetch trail graph');
      }
      return response.json();
    }
  });

  return { graph, isLoading, error };
} 