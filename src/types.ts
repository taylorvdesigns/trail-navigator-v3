export interface TrailConfig {
  id: string;
  routeId: string;
  name: string;
  color: string;
  type: 'main' | 'spur';
  coordinates?: [number, number][];
  startPoint: [number, number];
  endPoint: [number, number];
}

export interface POI {
  id: number;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  coordinates: [number, number];
  distance?: number;
  description?: string;
  post_tags: {
    id: number;
    name: string;
  }[];
  post_category: {
    id: number;
    name: string;
  }[];
  amenities?: string[];
}

export interface TrailPoint {
  latitude: number;
  longitude: number;
  distance: number; // distance from start in meters
}

export interface TestLocation {
  name: string;
  coordinates: [number, number];
  description?: string;
}

export type ViewMode = 'map' | 'nav' | 'list';
export type LocomotionMode = 'walking' | 'running' | 'biking'; 