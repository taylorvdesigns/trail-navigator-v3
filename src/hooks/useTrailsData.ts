import { useQueries, UseQueryResult } from '@tanstack/react-query';
import { TrailConfig, TrailPoint } from '../types/index';

interface TrailData {
  id: string;
  points: TrailPoint[];
  color: string;
  endpoints: {
    start: [number, number];
    end: [number, number];
  };
}

const BASE_URL = ''; // Empty string means it will use the same origin (localhost:3000)

export const useTrailsData = (trails: TrailConfig[]) => {
  const results = useQueries({
    queries: trails.map((trail) => ({
      queryKey: ['trail', trail.routeId],
      queryFn: async () => {
        try {
          const url = `${BASE_URL}/api/ridewithgps.js?id=${trail.routeId}`;
          const response = await fetch(url);
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch trail data: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const data = await response.json();
          
          if (!data.route || !data.route.track_points) {
            throw new Error('Invalid trail data format');
          }

          const points = data.route.track_points.map((point: any) => ({
            latitude: point.y,
            longitude: point.x,
            distance: point.d || 0
          }));

          // Get the first and last points as endpoints
          const startPoint = points[0];
          const endPoint = points[points.length - 1];

          const trailData = {
            id: trail.routeId,
            points,
            color: trail.color,
            endpoints: {
              start: [startPoint.longitude, startPoint.latitude] as [number, number],
              end: [endPoint.longitude, endPoint.latitude] as [number, number]
            }
          } as TrailData;

          return trailData;
        } catch (error) {
          throw error;
        }
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