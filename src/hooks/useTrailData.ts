import { useQuery } from '@tanstack/react-query';
import { TrailPoint } from '../types';

interface TrailData {
  points: TrailPoint[];
  distance: number;
}

export const useTrailData = (routeId: string) => {
  return useQuery<TrailData>({
    queryKey: ['trail', routeId],
    queryFn: async () => {
      const response = await fetch(`/api/ridewithgps/${routeId}`);
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
        distance: data.route.distance || 0
      };
    },
    enabled: !!routeId
  });
};
