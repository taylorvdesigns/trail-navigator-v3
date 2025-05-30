import axios from 'axios';
import { POI } from '../types';

const BASE_URL = 'http://localhost:3001';

export const getPOIs = async (): Promise<POI[]> => {
  const response = await axios.get(`${BASE_URL}/api/pois`);
  return response.data;
};
