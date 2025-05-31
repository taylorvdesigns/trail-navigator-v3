import { TrailConfig } from '../types/index';

const trailColors = {
  green: '#43D633',
  blue: '#6995E8',
  orange: '#FFB134'
} as const;

export const TRAIL_ROUTES: TrailConfig[] = [
  {
    id: 'main-trail',
    routeId: '50608713',  // Swamp Rabbit Trail route ID
    name: 'Main Trail',
    color: trailColors.green,
    type: 'main',
    startPoint: [34.8526, -82.3940], // Greenville, SC
    endPoint: [34.9266, -82.4432],  // Furman University
    coordinates: [
      [34.8526, -82.3940], // Start point
      [34.8896, -82.4186], // Midpoint
      [34.9266, -82.4432]  // End point
    ]
  }
];
