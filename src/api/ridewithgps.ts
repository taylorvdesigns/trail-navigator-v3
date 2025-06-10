import axios from 'axios';

const BASE_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '';

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

export const getRoute = async (routeId: string): Promise<RideWithGPSRoute> => {
  const response = await axios.get(`${BASE_URL}/api/ridewithgps/route`, {
    params: { id: routeId }
  });
  return response.data;
};