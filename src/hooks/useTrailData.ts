import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { TrailData } from '../types';

const BASE_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '';

export const useTrailData = (routeId: string | undefined) => {
  return useQuery<TrailData | undefined>(['trail', routeId], async () => {
    if (!routeId) return undefined;
    const response = await fetch(`${BASE_URL}/api/ridewithgps/route.js?id=${routeId}`);
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
      color: data.route.color || undefined
    } as TrailData;
  }, {
    enabled: !!routeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
