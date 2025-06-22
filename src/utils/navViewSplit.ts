import { Stop, TrailConfig, TrailPoint } from '../types/index';
import { getDirectionalStops } from './directional';
import { calculateDistance } from './distance';

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
  allTrailData: { id: string, points: TrailPoint[] }[] | null,
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
    // Only search the first `maxStopsAhead` stops for a junction.
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
  let leftBranch: BranchData | undefined;
  let rightBranch: BranchData | undefined;

  if (junctionIndex >= 0 && foundJunction && junctionStop) {
    beforeJunction = stopsSubset.slice(0, junctionIndex);
    
    // --- Determine The Junction Type from the User's Perspective ---
    const currentTrailData = allTrailData?.find(t => t.id === currentTrailId);
    if (!currentTrailData || currentTrailData.points.length === 0) {
      // Cannot determine junction type without trail data, so don't show a split.
      afterJunction = stopsSubset.filter((s, idx) => idx > junctionIndex);
      return { beforeJunction, junctionStop, junction: foundJunction, afterJunction };
    }
    
    const trailLength = currentTrailData.points[currentTrailData.points.length - 1].distance || 0;
    const junctionDistanceOnTrail = junctionStop.metadata.distance || 0;
    const tolerance = 50; // 50 meters tolerance for endpoint check

    const userTrailTerminates = junctionDistanceOnTrail <= tolerance || junctionDistanceOnTrail >= trailLength - tolerance;

    if (userTrailTerminates && userLocation) {
      // SCENARIO 1: User's trail terminates (branch). Show Left/Right turns.
      // This happens when on a branch approaching the main trail.
      const otherTrailId = foundJunction.trails.find(id => id !== currentTrailId);
      if (otherTrailId) {
        const otherTrailConfig = allTrails.find(t => t.id === otherTrailId);
        const otherTrailStops = allStops.filter(s => s.trailId === otherTrailId);
        
        const { left, right } = getDirectionalStops(otherTrailStops, junctionStop, userLocation);

        if (left.length > 0) {
          leftBranch = {
            stops: left,
            name: `Left on ${otherTrailConfig?.name || 'Trail'}`,
            color: otherTrailConfig?.color || '#808080'
          };
        }
        if (right.length > 0) {
          rightBranch = {
            stops: right,
            name: `Right on ${otherTrailConfig?.name || 'Trail'}`,
            color: otherTrailConfig?.color || '#808080'
          };
        }
      }
      afterJunction = [];

    } else {
      // SCENARIO 2: User's trail continues (main). Show Straight/Turn.
      // The "Continue Straight" path are all stops in the subset after the junction.
      const continuePathStops = stopsSubset.filter((s, idx) => idx > junctionIndex);
      leftBranch = {
        stops: continuePathStops,
        name: `Continue on ${allTrails.find(t => t.id === currentTrailId)?.name || 'Trail'}`,
        color: allTrails.find(t => t.id === currentTrailId)?.color || '#808080'
      };

      // The "Turn" path is all stops on the other trail.
      const turnPathTrailId = foundJunction.trails.find(id => id !== currentTrailId);
      if (turnPathTrailId) {
        const turnTrailConfig = allTrails.find(t => t.id === turnPathTrailId);
        let branchTrailStops = allStops.filter(s => s.trailId === turnPathTrailId);

        // --- Smart Reversal Logic ---
        if (branchTrailStops.length > 0 && foundJunction) {
          // Find this junction's representation on the branch trail.
          const junctionOnBranch = branchTrailStops.find(s => s.type === 'junction' && s.id.startsWith(`junction-${foundJunction!.id}-`));
          const junctionDistOnBranch = junctionOnBranch?.metadata.distance || 0;
          
          // Get the total length of the branch trail from its last stop.
          const branchTotalLength = branchTrailStops[branchTrailStops.length - 1].metadata.distance || 0;

          // If the junction's distance is more than halfway down the trail,
          // it means the trail data is ordered "backwards" from our perspective.
          // We must reverse the list for it to display correctly.
          if (junctionDistOnBranch > branchTotalLength / 2) {
            branchTrailStops = branchTrailStops.slice().reverse();
          }
        }
        
        rightBranch = {
          stops: branchTrailStops,
          name: `View ${turnTrailConfig?.name || 'Branch'}`,
          color: turnTrailConfig?.color || '#808080'
        };
      }
      afterJunction = []; // Ensure no duplication
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