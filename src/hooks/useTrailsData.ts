import { useQueries, UseQueryResult } from '@tanstack/react-query';
import { TrailConfig, TrailPoint } from '../types/index';

interface TrailData {
  points: TrailPoint[];
  color: string;
}

const BASE_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '';

export const useTrailsData = (trails: TrailConfig[]) => {
  const results = useQueries({
    queries: trails.map((trail) => ({
      queryKey: ['trail', trail.routeId],
      queryFn: async () => {
        const response = await fetch(`${BASE_URL}/api/ridewithgps/route?id=${trail.routeId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch trail data');
        }
        const data = await response.json();
        
        if (!data.route || !data.route.track_points) {
          throw new Error('Invalid trail data format');
        }

        const trailData = {
          points: data.route.track_points.map((point: any) => ({
            latitude: point.y,
            longitude: point.x,
            distance: point.d || 0
          })),
          color: trail.color
        } as TrailData;

        return trailData;
      },
      enabled: !!trail.routeId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
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