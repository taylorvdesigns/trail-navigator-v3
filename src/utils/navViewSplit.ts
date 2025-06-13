import { Stop } from '../types/index';

export interface Junction {
  id: string;
  position: number;
  location: [number, number];
  trails: string[]; // branch trail IDs
}

interface NavViewSplitData {
  beforeJunction: Stop[];
  junction: Junction | null;
  branches: { [trailId: string]: Stop[] };
  afterJunction: Stop[];
}

export function getNavViewSplitData(
  currentTrailId: string,
  stops: Stop[],
  junctions: Junction[],
  maxStopsAhead = 2
): NavViewSplitData {
  console.log('[DEBUG][navViewSplit] Input stops:', stops.map(s => ({id: s.id, name: s.name, type: s.type, trailId: s.trailId, position: s.position})));
  // 1. Find the next junction within maxStopsAhead
  let junctionIndex = -1;
  let foundJunction: Junction | null = null;
  for (let i = 0; i < Math.min(stops.length, maxStopsAhead); i++) {
    const stop = stops[i];
    const junction = junctions.find(j => j.position === stop.position && j.trails.includes(stop.trailId));
    if (junction) {
      junctionIndex = i;
      foundJunction = junction;
      break;
    }
  }
  console.log('[DEBUG][navViewSplit] Found junction:', foundJunction, 'at index', junctionIndex);

  // 2. Split stops
  let beforeJunction: Stop[] = [];
  let afterJunction: Stop[] = [];
  let branches: { [trailId: string]: Stop[] } = {};

  if (junctionIndex >= 0 && foundJunction) {
    // All stops before the junction
    beforeJunction = stops.slice(0, junctionIndex);
    
    // For each branch trail, collect stops that belong to that trail
    foundJunction.trails.forEach(trailId => {
      if (trailId !== currentTrailId) {
        branches[trailId] = stops.filter(s => s.trailId === trailId);
      }
    });

    // All stops after the junction that belong to the current trail
    afterJunction = stops.filter((s, idx) => idx > junctionIndex && s.trailId === currentTrailId);
  } else {
    beforeJunction = stops;
    foundJunction = null;
    branches = {};
    afterJunction = [];
  }
  console.log('[DEBUG][navViewSplit] Split result:', {
    beforeJunction: beforeJunction.map(s => ({id: s.id, name: s.name, type: s.type, trailId: s.trailId, position: s.position})),
    afterJunction: afterJunction.map(s => ({id: s.id, name: s.name, type: s.type, trailId: s.trailId, position: s.position})),
    branches: Object.fromEntries(Object.entries(branches).map(([tid, stops]) => [tid, stops.map(s => ({id: s.id, name: s.name, type: s.type, trailId: s.trailId, position: s.position}))]))
  });
  return {
    beforeJunction,
    junction: foundJunction,
    branches,
    afterJunction
  };
} 