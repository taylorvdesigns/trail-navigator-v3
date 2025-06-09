import axios from 'axios';
import { POI } from '../types/index';

const BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:4000'  // Development backend
  : '';  // Production - use relative URL for Vercel API routes

export const getPOIs = async (): Promise<POI[]> => {
  const response = await axios.get(`${BASE_URL}/api/pois`);
  return response.data;
};
