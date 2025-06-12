import axios from 'axios';
import { POI } from '../types/index';

const BASE_URL = '';

export const getPOIs = async (): Promise<POI[]> => {
  try {
    const response = await axios.get(`/api/pois`, {
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
