export interface Position {
  lat: number;
  lng: number;
}

export interface POI {
  id: string;
  name: string;
  position: [number, number];
  coordinates?: [number, number];
  trails?: string[];
  trailId?: string;
  distance?: number;
  closestPOI?: any;
}

export interface TrailConfig {
  id: string;
  name: string;
  start: {
    name: string;
    coordinates: [number, number];
  };
  end: {
    name: string;
    coordinates: [number, number];
  };
  junctions: Array<{
    id: string;
    name: string;
    coordinates: [number, number];
    branches?: string[];
  }>;
  pois: POI[];
  trails: Array<{
    id: string;
    name: string;
    start: {
      name: string;
      coordinates: [number, number];
    };
    end: {
      name: string;
      coordinates: [number, number];
    };
  }>;
} 