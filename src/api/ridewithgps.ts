import axios from 'axios';

const BASE_URL = '';

export interface RideWithGPSRoute {
  route: {
    name: string;
    description: string;
    track_points: Array<{
      x: number;
      y: number;
      d: number;
      e: number;
    }>;
  };
}

export async function getRoute(routeId: string): Promise<RideWithGPSRoute> {
  const response = await axios.get(`/api/ridewithgps.js`, {
    params: { id: routeId }
  });
  return response.data;
}