import { useMemo } from 'react';
import { findJunctions, consolidateJunctions } from '../utils/trailJunctions';
import { TrailPoint } from '../types';

interface Trail {
  id: string;
  points: TrailPoint[];
  endpoint1?: [number, number];
  endpoint2?: [number, number];
  type?: 'main' | 'spur';
}

export function useTrailJunctions(trails: Trail[], threshold = 10) {
  return useMemo(() => {
    if (!trails || trails.length < 2) return [];

    // 1. Spur endpoints as junctions
    const spurJunctions = trails
      .filter(trail => trail.type === 'spur' && trail.endpoint1)
      .map(trail => ({
        location: trail.endpoint1 as [number, number],
        trails: [trail.id]
      }));

    // 2. Overlap detection for all trails
    const overlapJunctions = findJunctions(trails, threshold);

    // 3. Merge spur endpoint junctions and overlap junctions, preferring spur endpoints if close
    const allJunctions = [...spurJunctions, ...overlapJunctions];
    // Gather all endpoints for consolidation
    const endpoints: [number, number][] = spurJunctions.map(j => j.location);
    return consolidateJunctions(allJunctions, threshold, endpoints);
  }, [trails, threshold]);
} 