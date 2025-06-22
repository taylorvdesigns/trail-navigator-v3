import { Stop, TrailConfig } from '../types/index';
import { getDirectionalStops } from './directional';

export interface Junction {
  id: string;
  position: number;
  location: [number, number];
  trails: string[]; // branch trail IDs
}

export interface BranchData {
  stops: Stop[];
  name: string;
  color: string;
}

export interface NavViewSplitData {
  beforeJunction: Stop[];
  junctionStop: Stop | null;
  junction: Junction | null;
  leftBranch?: BranchData;
  rightBranch?: BranchData;
  afterJunction: Stop[];
}

export function getNavViewSplitData(
  currentTrailId: string,
  stopsSubset: Stop[],
  allStops: Stop[],
  allTrails: TrailConfig[],
  junctions: Junction[],
  userLocation: [number, number] | null,
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
    // Search the entire list for the first junction, not just the next few stops.
    for (let i = 0; i < stopsSubset.length; i++) {
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
  let leftBranch: BranchData | undefined;
  let rightBranch: BranchData | undefined;

  if (junctionIndex >= 0 && foundJunction && junctionStop) {
    beforeJunction = stopsSubset.slice(0, junctionIndex);
    
    const userIsOnBranch = foundJunction.trails.length > 1 && foundJunction.trails.includes(currentTrailId) && foundJunction.trails[0] !== currentTrailId;
    const userIsOnMain = foundJunction.trails.length > 1 && foundJunction.trails.includes(currentTrailId) && foundJunction.trails[0] === currentTrailId;

    if (userIsOnBranch && userLocation) {
      // User is on a branch approaching a main trail (current logic)
      const mainTrailId = foundJunction.trails.find(id => id !== currentTrailId);
      if (mainTrailId) {
        const mainTrailConfig = allTrails.find(t => t.id === mainTrailId);
        const mainTrailStops = allStops.filter(s => s.trailId === mainTrailId);
        const { left, right } = getDirectionalStops(mainTrailStops, junctionStop, userLocation);
        if (left.length > 0) {
          leftBranch = {
            stops: left,
            name: `Left on ${mainTrailConfig?.name || 'Trail'}`,
            color: mainTrailConfig?.color || '#808080'
          };
        }
        if (right.length > 0) {
          rightBranch = {
            stops: right,
            name: `Right on ${mainTrailConfig?.name || 'Trail'}`,
            color: mainTrailConfig?.color || '#808080'
          };
        }
      }
      // We might have stops after the junction on the current (branch) trail.
      afterJunction = stopsSubset.filter((s, idx) => idx > junctionIndex && s.trailId === currentTrailId);
    } else if (userIsOnMain) {
      // User is on the main trail approaching a branch.
      // One column is "continue straight", the other is the entire branch trail.

      // "Continue straight" on the main trail are the stops after the junction.
      const mainAhead = stopsSubset.filter((s, idx) => idx > junctionIndex && s.trailId === currentTrailId);
      leftBranch = {
        stops: mainAhead,
        name: `Continue on ${allTrails.find(t => t.id === currentTrailId)?.name || 'Trail'}`,
        color: allTrails.find(t => t.id === currentTrailId)?.color || '#808080'
      };
      
      const branchTrailId = foundJunction.trails.find(id => id !== currentTrailId);
      if (branchTrailId) {
        const branchTrailConfig = allTrails.find(t => t.id === branchTrailId);
        // For this scenario, the "branch" is simply all stops on that trail.
        const branchTrailStops = allStops.filter(s => s.trailId === branchTrailId);
        rightBranch = {
          stops: branchTrailStops,
          name: `View ${branchTrailConfig?.name || 'Branch'}`,
          color: branchTrailConfig?.color || '#808080'
        };
      }
      
      // Explicitly set afterJunction to empty to prevent duplication.
      afterJunction = []; 
    } else {
      // This is the case for a junction where we don't show a split view.
      // We should show the stops that come after it on the same trail.
      afterJunction = stopsSubset.filter((s, idx) => idx > junctionIndex && s.trailId === currentTrailId);
    }
  } else {
    beforeJunction = stopsSubset;
  }

  return {
    beforeJunction,
    junctionStop,
    junction: foundJunction,
    leftBranch,
    rightBranch,
    afterJunction
  };
} 