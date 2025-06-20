export interface TrailPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  name?: string;
  distance?: number; // Distance along the trail in meters
} 