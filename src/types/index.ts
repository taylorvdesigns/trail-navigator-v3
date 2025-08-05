export interface WordPressTrailConfig {
  routeId: string;
  name: string;
  color: string;
  type: 'main' | 'spur';
  endpoint1_name?: string;
  endpoint2_name?: string;
}

export interface TrailConfig extends WordPressTrailConfig {
  id: string;
  routeId: string;
  name: string;
  color: string;
  type: 'main' | 'spur';
  endpointNames?: [string, string];
  endpoint1?: [number, number];
  endpoint2?: [number, number];
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
  post_tags: WordPressTag[];
  post_category: WordPressCategory[];
  amenities?: string[];
  distance?: number; // Distance from current position in meters
  featured_image?: string | null; // URL of the featured image
  google_place_id?: string; // Google Place ID for fetching additional details
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

export type ViewMode = 'map' | 'nav' | 'list' | 'dev';

export interface TrailData {
  points: TrailPoint[];
  color: string;
}

// Define stop types for navigation view
export interface StopMetadata {
  coordinates: [number, number];
  distance?: number;
  comparable_distance?: number;
  description?: string;
  post_tags?: { name: string }[];
  trails?: string[];
  amenities?: string[];
  groupName?: string;
  groupCount?: number;
  eta?: number;  // Estimated time of arrival in minutes
  branchTrailIds?: string[];
  isEntryPoint?: boolean;
}

export interface BaseStop {
  id: string;
  name: string;
  trailId: string;
  metadata: StopMetadata;
  distanceMeters?: number;
  trailPosition?: number;
}

export interface POIStop extends BaseStop {
  type: 'poi';
}

export interface JunctionStop extends BaseStop {
  type: 'junction';
}

export interface EndpointStop extends BaseStop {
  type: 'endpoint';
}

export interface UserStop extends BaseStop {
  type: 'user';
}

export interface EntryStop extends BaseStop {
  type: 'entry';
}

export type Stop = POIStop | JunctionStop | EndpointStop | UserStop | EntryStop; 