import axios from 'axios';
import { POI, TrailConfig } from '../types/index';
import { wordpressConfig, WordPressConfig } from './wordpressConfig';

const BASE_URL = '';

export const api = {
  async getRoute(routeId: string) {
    const response = await axios.get(`/api/ridewithgps.js`, {
      params: { id: routeId }
    });
    return response.data;
  },

  async getPOIs(): Promise<POI[]> {
    const response = await axios.get(`/api/pois.js`);
    return response.data;
  },

  async getWordPressConfig(): Promise<WordPressConfig> {
    return wordpressConfig.getConfig();
  },

  async getGooglePlacesDetails(placeId: string) {
    const response = await axios.get(`/api/google-places.js`, {
      params: { placeId }
    });
    return response.data;
  }
};

// Example trail configurations - will be replaced by WordPress config
export const TRAIL_ROUTES: TrailConfig[] = [
  {
    id: 'main-trail',
    routeId: '51203086',
    name: 'Main Trail',
    color: '#43D633',
    type: 'main',
    endpointNames: ['Greenville', 'Furman University'],
    endpoint1: [34.8526, -82.3940], // Greenville, SC
    endpoint2: [34.9266, -82.4432]  // Furman University
  },
  {
    id: 'spur-trail',
    routeId: '51203084',
    name: 'Spur Trail',
    color: '#6995E8',
    type: 'spur',
    endpointNames: ['Downtown Greenville', 'Unity Park'],
    endpoint1: [34.8526, -82.3940], // Downtown Greenville
    endpoint2: [34.8630, -82.4210]  // Unity Park
  },
  {
    id: 'orange-spur',
    routeId: '51203945',
    name: 'Orange Spur',
    color: '#FFB134',
    type: 'main',
    endpointNames: ['Unity Park', 'Furman University'],
    endpoint1: [34.8630, -82.4210], // Unity Park
    endpoint2: [34.9266, -82.4432]  // Furman University
  }
];

export default BASE_URL; 