import React from 'react';
import { NavContextCard } from './NavContextCard';
import { NavContextCardV2 } from './NavContextCardV2';
import { NavContextCardV3 } from './NavContextCardV3';
import { useDesign } from '../../contexts/DesignContext';

interface MiddleCardVariantProps {
  destination: string;
  trail: string;
  distanceMiles: number;
  description: string;
  mode: any; // LocomotionMode
  amenities: Array<'food' | 'water' | 'restroom' | 'cafe' | 'store' | 'accessible'>;
  onLocomotionChange?: (mode: any) => void;
  entryPointDistanceMiles?: number | null;
  preciseNetworkDistanceMiles?: number | null;
  onChangeEntryPoint?: () => void;
  borderColor?: string;
  highlightColor?: string;
  noCardBackground?: boolean;
}

export const MiddleCardVariant: React.FC<MiddleCardVariantProps> = (props) => {
  const { middleCardVariant } = useDesign();

  switch (middleCardVariant) {
    case 'v2':
      return <NavContextCardV2 {...props} />;
    case 'v3':
      return <NavContextCardV3 {...props} />; // Now shows the old V1 design
    case 'v1':
      return <NavContextCard {...props} />; // Now shows the old V3 design
    case 'default':
    default:
      return <NavContextCard {...props} />; // Default to the old V3 design
  }
}; 