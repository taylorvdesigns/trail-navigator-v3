export interface TrailConfig {
  id: string;
  routeId: string;
  name: string;
  color: string;
  type: 'main' | 'spur';
  startPoint: [number, number];
  endPoint: [number, number];
  coordinates?: [number, number][];
  description?: string;
}

export interface WordPressTag {
  id: number;
  name: string;
  slug: string;
}

export interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
}

export interface POI {
  id: string;
  title: {
    rendered: string;
    raw?: string;
  };
  content: {
    rendered: string;
    raw?: string;
  };
  description?: string;
  coordinates: [number, number]; // [longitude, latitude]
  latitude: number;
  longitude: number;
  post_tags: WordPressTag[];
  post_category: WordPressCategory[];
  amenities?: string[];
  distance?: number; // Distance from current position in meters
  featured_image?: string | null; // URL of the featured image
}

export interface TestLocation {
  name: string;
  coordinates: [number, number];
  description: string;
}

export interface TrailPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  name?: string;
  distance?: number; // Distance along the trail in meters
}

export type LocomotionMode = 'walking' | 'running' | 'biking' | 'accessible';

export interface CategoryFilter {
  id: string;
  name: string;
  icon: string;
  isActive: boolean;
}

export type ViewMode = 'map' | 'nav' | 'list';

export interface TrailData {
  points: TrailPoint[];
  color: string;
} 