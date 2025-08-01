import { 
  faUtensils, 
  faBeerMugEmpty, 
  faIceCream, 
  faMapPin, 
  faChildReaching, 
  faStore,
  faBottleDroplet,
  faCameraRetro,
  faToilet,
  faSkull,
  faLandmark,
  faSquareParking,
  faStar
} from '@fortawesome/free-solid-svg-icons';

// Map FontAwesome class names to icon components
const FA_ICON_MAP: Record<string, any> = {
  'fa-solid fa-utensils': faUtensils,
  'fa-solid fa-beer-mug-empty': faBeerMugEmpty,
  'fa-solid fa-ice-cream': faIceCream,
  'fa-solid fa-map-pin': faMapPin,
  'fa-solid fa-child-reaching': faChildReaching,
  'fa-solid fa-store': faStore,
  'fa-solid fa-bottle-droplet': faBottleDroplet,
  'fa-solid fa-camera-retro': faCameraRetro,
  'fa-solid fa-toilet': faToilet,
  'fa-solid fa-skull': faSkull,
  'fa-solid fa-landmark': faLandmark,
  'fa-solid fa-square-parking': faSquareParking,
  'fa-solid fa-star': faStar,
};

// Fallback icon for unknown FontAwesome classes
const FALLBACK_ICON = faMapPin;

export const parseFontAwesomeIcon = (faClass: string | null): any => {
  if (!faClass) {
    return FALLBACK_ICON;
  }
  
  // Normalize the class name (remove extra spaces, ensure proper format)
  const normalizedClass = faClass.trim().toLowerCase();
  
  // Check if we have a direct match
  if (FA_ICON_MAP[normalizedClass]) {
    return FA_ICON_MAP[normalizedClass];
  }
  
  // Try to find a partial match (in case of slight variations)
  for (const [key, icon] of Object.entries(FA_ICON_MAP)) {
    if (normalizedClass.includes(key.replace('fa-solid fa-', ''))) {
      return icon;
    }
  }
  
  console.warn(`Unknown FontAwesome icon class: ${faClass}, using fallback`);
  return FALLBACK_ICON;
};

export const parseFontAwesomeColor = (color: string | null): string => {
  if (!color) {
    return '#63686e'; // Default accent color
  }
  
  // Remove any CSS color format and return the hex
  if (color.startsWith('#')) {
    return color;
  }
  
  // Handle other color formats if needed
  return color;
}; 