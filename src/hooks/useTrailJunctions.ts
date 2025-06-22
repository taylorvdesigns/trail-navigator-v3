import { useMemo } from 'react';
import { findJunctions, consolidateJunctions } from '../utils/trailJunctions';
import { TrailPoint } from '../types';
import { Junction } from '../utils/navViewSplit';
import { calculateDistance } from '../utils/distance';

interface Trail {
  id: string;
  points: TrailPoint[];
  endpoint1?: [number, number];
  endpoint2?: [number, number];
  type?: 'main' | 'spur';
}

function getClosestTrailPointDistance(location: [number, number], trailPoints: TrailPoint[]): number {
  let minDist = Infinity;
  let closestDistance = 0;
  for (const p of trailPoints) {
    const dist = Math.sqrt(
      Math.pow(location[0] - p.longitude, 2) +
      Math.pow(location[1] - p.latitude, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      closestDistance = p.distance || 0;
    }
  }
  return closestDistance;
}

export function useTrailJunctions(trails: Trail[], threshold = 20): Junction[] {
  return useMemo(() => {
    if (!trails || trails.length < 2) return [];
    const mainTrail = trails[0];
    const mainTrailPoints = mainTrail?.points || [];

    // Overlap detection for all trails
    const overlapJunctionsRaw = findJunctions(trails, threshold);
    const overlapJunctions: Junction[] = overlapJunctionsRaw.map((j, idx) => {
      const position = getClosestTrailPointDistance(j.location, mainTrailPoints);
      return {
        id: `junction-overlap-${idx}`,
        position,
        location: j.location,
        trails: j.trails
      };
    });

    // Merge overlap junctions
    const consolidated = consolidateJunctions(overlapJunctions, 100);
    const finalJunctions = consolidated.map((j, idx) => {
      // Get all trail IDs from junctions that were consolidated into this one
      const nearbyJunctions = overlapJunctions.filter(aj => 
        calculateDistance(
          aj.location[1], // latitude
          aj.location[0], // longitude
          j.location[1], // latitude
          j.location[0] // longitude
        ) <= 100
      );
      const allTrailIds = Array.from(new Set(
        nearbyJunctions.flatMap(nj => nj.trails)
      ));
      
      return {
        ...j,
        id: `junction-${idx}`,
        position: (j as any).position ?? idx,
        trails: allTrailIds
      };
    });

    // A junction is only a true junction if it connects two or more trails.
    return finalJunctions.filter(j => j.trails.length > 1);
  }, [trails, threshold]);
} 