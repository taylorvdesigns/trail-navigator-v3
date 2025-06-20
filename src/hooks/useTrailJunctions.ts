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

    console.log('useTrailJunctions Debug:', {
      trailsCount: trails.length,
      trailIds: trails.map(t => t.id),
      mainTrailId: mainTrail?.id
    });

    // 1. Spur endpoints as junctions
    const spurJunctions: Junction[] = trails
      .filter(trail => trail.type === 'spur' && trail.endpoint1)
      .map((trail, idx) => {
        const position = getClosestTrailPointDistance(trail.endpoint1 as [number, number], mainTrailPoints);
        return {
          id: `junction-spur-${idx}`,
          position,
          location: trail.endpoint1 as [number, number],
          trails: [trail.id]
        };
      });

    console.log('Spur Junctions:', spurJunctions);

    // 2. Overlap detection for all trails
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

    console.log('Overlap Junctions:', overlapJunctions);

    // 3. Merge spur endpoint junctions and overlap junctions, preferring spur endpoints if close
    const allJunctions = [...spurJunctions, ...overlapJunctions];
    // Gather all endpoints for consolidation
    const endpoints: [number, number][] = spurJunctions.map(j => j.location);
    const consolidated = consolidateJunctions(allJunctions, 100, endpoints);
    const finalJunctions = consolidated.map((j, idx) => {
      // Get all trail IDs from junctions that were consolidated into this one
      const nearbyJunctions = allJunctions.filter(aj => 
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

    console.log('Final Junctions:', finalJunctions.map(j => ({
      id: j.id,
      trails: j.trails,
      location: j.location,
      position: j.position
    })));

    return finalJunctions;
  }, [trails, threshold]);
} 