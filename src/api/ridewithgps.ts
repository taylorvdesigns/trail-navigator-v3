import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

export interface RideWithGPSRoute {
  id: number;
  name: string;
  description: string;
  path: [number, number][];
}

export const getRideWithGPSRoute = async (routeId: string): Promise<RideWithGPSRoute> => {
  const response = await axios.get(`${BASE_URL}/api/ridewithgps/${routeId}`);
  return response.data;
};
