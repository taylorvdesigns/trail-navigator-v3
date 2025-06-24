import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { TrailData } from '../types';

const BASE_URL = '';

export const useTrailData = (routeId: string | undefined) => {
  return useQuery<TrailData | undefined>({
    queryKey: ['trail', routeId],
    queryFn: async () => {
      if (!routeId) return undefined;
      const response = await fetch(`${BASE_URL}/api/ridewithgps?id=${routeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trail data');
      }
      const data = await response.json();
      return {
        points: data.route.track_points.map((point: any) => {
          return {
            latitude: point.y,
            longitude: point.x,
            elevation: point.e,
            distance: point.d || 0
          };
        }),
        color: data.route.color || undefined
      } as TrailData;
    },
    enabled: !!routeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
