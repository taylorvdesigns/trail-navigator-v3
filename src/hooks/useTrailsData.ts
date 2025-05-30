import { useQueries, UseQueryResult } from '@tanstack/react-query';
import { TrailConfig, TrailPoint } from '../types';

interface TrailData {
  points: TrailPoint[];
  color: string;
}

export const useTrailsData = (trails: TrailConfig[]) => {
  const results = useQueries({
    queries: trails.map((trail) => ({
      queryKey: ['trail', trail.routeId],
      queryFn: async () => {
        const response = await fetch(`http://localhost:3001/api/ridewithgps/${trail.routeId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch trail data');
        }
        const data = await response.json();
        
        if (!data.route || !data.route.track_points) {
          throw new Error('Invalid trail data format');
        }

        return {
          points: data.route.track_points.map((point: any) => ({
            latitude: point.y,
            longitude: point.x,
            distance: point.d || 0
          })),
          color: trail.color
        } as TrailData;
      },
      enabled: !!trail.routeId
    }))
  });

  const isLoading = results.some((result: UseQueryResult<TrailData>) => result.isLoading);
  const isError = results.some((result: UseQueryResult<TrailData>) => result.isError);
  const data = results
    .map((result: UseQueryResult<TrailData>) => result.data)
    .filter((data: unknown): data is TrailData => data !== undefined && data !== null);

  return {
    data,
    isLoading,
    isError
  };
}; 