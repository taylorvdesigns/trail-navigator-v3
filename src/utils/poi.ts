import { POI } from '../types/index';

/**
 * Extracts unique, cleaned-up categories from an array of POIs
 * @param pois Array of POIs to extract categories from
 * @returns Array of unique, cleaned category names
 */
export const extractUniqueCategories = (pois: POI[]): string[] => {
  const categories = new Set<string>();
  
  pois.forEach(poi => {
    if (poi.post_category && Array.isArray(poi.post_category)) {
      poi.post_category.forEach(category => {
        if (category.name) {
          // Clean up: take text after dash, trim whitespace
          const cleanName = category.name.split('-').pop()?.trim() || category.name;
          categories.add(cleanName);
        }
      });
    }
  });

  return Array.from(categories).sort();
}; 