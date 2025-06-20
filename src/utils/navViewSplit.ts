import { Stop } from '../types/index';

export interface Junction {
  id: string;
  position: number;
  location: [number, number];
  trails: string[]; // branch trail IDs
}

interface NavViewSplitData {
  beforeJunction: Stop[];
  junctionStop: Stop | null;
  junction: Junction | null;
  branches: { [trailId: string]: Stop[] };
  afterJunction: Stop[];
}

export function getNavViewSplitData(
  currentTrailId: string,
  stopsSubset: Stop[],
  allStops: Stop[],
  junctions: Junction[],
  maxStopsAhead = 2,
  junctionId?: string
): NavViewSplitData {
  // 1. Find the junction by ID if provided, otherwise use original logic
  let junctionIndex = -1;
  let foundJunction: Junction | null = null;
  let junctionStop: Stop | null = null;

  if (junctionId) {
    // Find the stop with this junctionId
    junctionIndex = stopsSubset.findIndex(s => s.type === 'junction' && s.id === `junction-${junctionId}`);
    if (junctionIndex > -1) {
      junctionStop = stopsSubset[junctionIndex];
    }
    foundJunction = junctions.find(j => j.id === junctionId) || null;
  } else {
    for (let i = 0; i < Math.min(stopsSubset.length, maxStopsAhead); i++) {
      const stop = stopsSubset[i];
      const junction = junctions.find(j => {
        // Find junction by comparing coordinates instead of position
        const junctionCoords = [j.location[1], j.location[0]];
        const stopCoords = stop.metadata.coordinates;
        return (
          Math.abs(junctionCoords[0] - stopCoords[0]) < 0.0001 && 
          Math.abs(junctionCoords[1] - stopCoords[1]) < 0.0001 &&
          j.trails.includes(stop.trailId)
        );
      });
      if (junction) {
        junctionIndex = i;
        foundJunction = junction;
        junctionStop = stop;
        break;
      }
    }
  }

  // 2. Split stops
  let beforeJunction: Stop[] = [];
  let afterJunction: Stop[] = [];
  let branches: { [trailId: string]: Stop[] } = {};

  if (junctionIndex >= 0 && foundJunction) {
    // All stops before the junction
    beforeJunction = stopsSubset.slice(0, junctionIndex);
    
    // For each branch trail, collect ALL stops that belong to that trail from the master list.
    // This is especially important for the 'behind' section, where we want to see the entire branch.
    foundJunction.trails.forEach(trailId => {
      if (trailId !== currentTrailId) {
        branches[trailId] = allStops.filter(s => s.trailId === trailId);
      }
    });

    // All stops after the junction that belong to the current trail
    afterJunction = stopsSubset.filter((s, idx) => idx > junctionIndex && s.trailId === currentTrailId);
  } else {
    beforeJunction = stopsSubset;
    foundJunction = null;
    branches = {};
    afterJunction = [];
  }

  return {
    beforeJunction,
    junctionStop,
    junction: foundJunction,
    branches,
    afterJunction
  };
} 