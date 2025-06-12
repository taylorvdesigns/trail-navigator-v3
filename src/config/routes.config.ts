import { TrailConfig } from '../types/index';

const trailColors = {
  green: '#43D633',
  blue: '#6995E8',
  orange: '#FFB134'
} as const;

export const TRAIL_ROUTES: TrailConfig[] = [
  {
    id: 'main-trail',
    routeId: '51203086',  // Green Line (main trail)
    name: 'Main Trail',
    color: trailColors.green,
    type: 'main',
    endpoint1: [34.8526, -82.3940], // Greenville, SC
    endpoint2: [34.9266, -82.4432]  // Furman University
  },
  {
    id: 'spur-trail',
    routeId: '51203084',  // Blue Line (spur)
    name: 'Spur Trail',
    color: trailColors.blue,
    type: 'spur',
    endpoint1: [34.8526, -82.3940], // Greenville, SC
    endpoint2: [34.8630, -82.4210]  // Unity Park
  },
  {
    id: 'orange-spur',
    routeId: '51203945',  // Orange Line (spur)
    name: 'Orange Spur',
    color: trailColors.orange,
    type: 'spur',
    endpoint1: [34.8526, -82.3940], // Greenville, SC
    endpoint2: [34.8630, -82.4210]  // Unity Park
  }
];
