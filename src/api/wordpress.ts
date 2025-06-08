import axios from 'axios';
import { POI } from '../types/index';

const BASE_URL = 'http://localhost:4000';

export const getPOIs = async (): Promise<POI[]> => {
  const response = await axios.get(`${BASE_URL}/api/pois`);
  return response.data;
};
