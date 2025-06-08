import { faUtensils, faBeerMugEmpty, faIceCream, faMapPin, faChildReaching, faStore } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

// Canonical FontAwesome category icon utility
const CATEGORY_ICON_MAP: Record<string, any> = {
  'food': faUtensils,
  'drink': faBeerMugEmpty,
  'ice cream': faIceCream,
  'landmark': faMapPin,
  'playground': faChildReaching,
  'business': faStore,
};

export function getCategoryIcon(category: string, size: number = 20) {
  const icon = CATEGORY_ICON_MAP[category?.toLowerCase?.() || ''] || faMapPin;
  return <FontAwesomeIcon icon={icon} style={{ fontSize: size }} />;
} 