import { TestLocation } from '../types/index';

export const TEST_LOCATIONS: TestLocation[] = [
  { 
    name: "Between Swamp Rabbit Cafe and Unity",
    coordinates: [34.863381, -82.421034] as [number, number],
    description: "Test point along trail section"
  },
  { 
    name: "Between Downtown and Unity",
    coordinates: [34.848406, -82.404906] as [number, number],
    description: "Mid-way point on trail"
  },
  { 
    name: "Furman University",
    coordinates: [34.926555, -82.443180] as [number, number],
    description: "University section of trail"
  },
  { 
    name: "Greenville Tech",
    coordinates: [34.826607, -82.378538] as [number, number],
    description: "Tech campus trail entrance"
  }
];

export const MAP_CONFIG = {
  defaultCenter: [34.8526, -82.3940] as [number, number], // Greenville, SC
  defaultZoom: 13,
  tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
};
