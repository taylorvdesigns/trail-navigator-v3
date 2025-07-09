import axios from 'axios';
import { POI } from '../types/index';
import { API_CONFIG } from '../config/api';

export const getPOIs = async (): Promise<POI[]> => {
  try {
    console.log('DEBUG: getPOIs called - fetching from /api/pois.js');
    const response = await axios.get(`/api/pois.js`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log('DEBUG: getPOIs response received:', response.data.length, 'POIs');
    return response.data;
  } catch (error) {
    console.error('DEBUG: getPOIs error:', error);
    if (axios.isAxiosError(error)) {
      console.error('DEBUG: Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      throw error;
    }
    throw error;
  }
};
