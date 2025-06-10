import { useQuery } from '@tanstack/react-query';
import { TrailPoint } from '../types/index';

interface TrailData {
  points: TrailPoint[];
  distance: number;
}

const BASE_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '';

export const useTrailData = (routeId: string) => {
  return useQuery<TrailData>({
    queryKey: ['trail', routeId],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/api/ridewithgps/route?id=${routeId}`);
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
          distance: point.d || 0,
          elevation: typeof point.e === 'number' ? point.e : undefined
        })),
        distance: data.route.distance || 0
      };
    },
    enabled: !!routeId
  });
};
