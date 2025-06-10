import axios from 'axios';
import { POI } from '../types/index';

const BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:4000'  // Development backend
  : '';  // Production - use relative URL for Vercel API routes

export const getPOIs = async (): Promise<POI[]> => {
  try {
    console.log('Fetching POIs from:', `${BASE_URL}/api/pois`);
    const response = await axios.get(`${BASE_URL}/api/pois`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log('POIs response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching POIs:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
    }
    throw error;
  }
};
