import axios from 'axios';
import { POI } from '../types/index';
import { API_CONFIG } from '../config/api';

export const getPOIs = async (): Promise<POI[]> => {
  try {
    const response = await axios.get('/api/pois.js');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch POIs: ${error.message}`);
    }
    throw error;
  }
};
