import { useMemo } from 'react';
import { findJunctions, consolidateJunctions } from '../utils/trailJunctions';
import { TrailPoint } from '../types';
import { Junction } from '../utils/navViewSplit';

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

export function useTrailJunctions(trails: Trail[], threshold = 10): Junction[] {
  return useMemo(() => {
    if (!trails || trails.length < 2) return [];
    const mainTrail = trails[0];
    const mainTrailPoints = mainTrail?.points || [];

    // 1. Spur endpoints as junctions
    const spurJunctions: Junction[] = trails
      .filter(trail => trail.type === 'spur' && trail.endpoint1)
      .map((trail, idx) => {
        const position = getClosestTrailPointDistance(trail.endpoint1 as [number, number], mainTrailPoints);
        return {
          id: `spur-${trail.id}-${idx}`,
          position,
          location: trail.endpoint1 as [number, number],
          trails: [trail.id]
        };
      });

    // 2. Overlap detection for all trails
    const overlapJunctionsRaw = findJunctions(trails, threshold);
    const overlapJunctions: Junction[] = overlapJunctionsRaw.map((j, idx) => {
      const position = getClosestTrailPointDistance(j.location, mainTrailPoints);
      return {
        id: `overlap-${idx}`,
        position,
        location: j.location,
        trails: j.trails
      };
    });

    // 3. Merge spur endpoint junctions and overlap junctions, preferring spur endpoints if close
    const allJunctions = [...spurJunctions, ...overlapJunctions];
    // Gather all endpoints for consolidation
    const endpoints: [number, number][] = spurJunctions.map(j => j.location);
    const consolidated = consolidateJunctions(allJunctions, threshold, endpoints);
    return consolidated.map((j, idx) => ({
      ...j,
      id: (j as any).id ?? `junction-${idx}`,
      position: (j as any).position ?? idx,
    }));
  }, [trails, threshold]);
} 