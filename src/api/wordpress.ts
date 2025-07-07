import axios from 'axios';
import { POI } from '../types/index';
import { API_CONFIG } from '../config/api';

export const getPOIs = async (): Promise<POI[]> => {
  try {
    const response = await axios.get(`${API_CONFIG.baseURL}/api/pois`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error;
    }
    throw error;
  }
};
