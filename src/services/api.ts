import axios from 'axios';
import { POI, TrailConfig } from '../types/index';

const BASE_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:4000/api' : '/api';

export const api = {
  async getRoute(routeId: string) {
    const response = await axios.get(`${BASE_URL}/ridewithgps/route.js`, {
      params: { id: routeId }
    });
    return response.data;
  },

  async getPOIs(): Promise<POI[]> {
    const response = await axios.get(`${BASE_URL}/pois`);
    return response.data;
  }
};

// Example trail configurations
export const trailConfigs: TrailConfig[] = [
  {
    id: 'green-trail',
    routeId: '1234567',
    name: 'Green Trail',
    color: '#43D633',
    type: 'main',
    startPoint: [34.8526, -82.3940], // Greenville, SC
    endPoint: [34.9266, -82.4432]  // Furman University
  },
  {
    id: 'blue-trail',
    routeId: '7654321',
    name: 'Blue Trail',
    color: '#6995E8',
    type: 'spur',
    startPoint: [34.8526, -82.3940], // Downtown Greenville
    endPoint: [34.8630, -82.4210]  // Unity Park
  },
  {
    id: 'orange-trail',
    routeId: '9876543',
    name: 'Orange Trail',
    color: '#FFB134',
    type: 'main',
    startPoint: [34.8630, -82.4210], // Unity Park
    endPoint: [34.9266, -82.4432]  // Furman University
  }
];

export default BASE_URL; 