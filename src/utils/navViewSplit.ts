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

/**
 * Determines how to split the navigation view when approaching a trail junction.
 * 
 * This function handles two main scenarios:
 * 1. User is on a branch trail approaching a main trail (shows Left/Right options)
 * 2. User is on a main trail approaching a branch (shows Continue/Turn options)
 * 
 * The function also includes smart logic to handle cases where trail data
 * is ordered "backwards" from the user's perspective at junctions.
 */
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
  // STEP 1: Find the junction either by ID or by searching nearby stops
  let junctionIndex = -1;
  let foundJunction: Junction | null = null;
  let junctionStop: Stop | null = null;

  if (junctionId) {
    // Direct lookup by junction ID (used for testing or specific scenarios)
    junctionIndex = stopsSubset.findIndex(s => s.type === 'junction' && s.id === `junction-${junctionId}`);
    if (junctionIndex > -1) {
      junctionStop = stopsSubset[junctionIndex];
    }
    foundJunction = junctions.find(j => j.id === junctionId) || null;
  } else {
    // Search the first few stops ahead for a junction
    // This is the normal case when user is approaching a junction
    for (let i = 0; i < Math.min(stopsSubset.length, maxStopsAhead); i++) {
      const stop = stopsSubset[i];
      const junction = junctions.find(j => {
        // Match junction by comparing GPS coordinates (more reliable than position)
        // Note: Junction coordinates are stored as [lat, lng] but we compare as [lng, lat]
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

  // STEP 2: Split the stops based on junction type and user's perspective
  let beforeJunction: Stop[] = [];
  let afterJunction: Stop[] = [];
  let leftBranch: BranchData | undefined;
  let rightBranch: BranchData | undefined;

  if (junctionIndex >= 0 && foundJunction && junctionStop) {
    // We found a junction - split the view
    beforeJunction = stopsSubset.slice(0, junctionIndex);
    
    // --- Determine Junction Type from User's Perspective ---
    // We need to know if the user's current trail terminates at this junction
    // or continues through it. This affects whether we show Left/Right or Continue/Turn.
    const currentTrailData = allTrailData?.find(t => t.id === currentTrailId);
    if (!currentTrailData || currentTrailData.points.length === 0) {
      // Cannot determine junction type without trail data, so don't show a split.
      afterJunction = stopsSubset.filter((s, idx) => idx > junctionIndex);
      return { beforeJunction, junctionStop, junction: foundJunction, afterJunction };
    }
    
    const trailLength = currentTrailData.points[currentTrailData.points.length - 1].distance || 0;
    const junctionDistanceOnTrail = junctionStop.metadata.distance || 0;
    const tolerance = 50; // 50 meters tolerance for endpoint check

    // Check if user's trail ends near this junction (within 50m of start or end)
    const userTrailTerminates = junctionDistanceOnTrail <= tolerance || junctionDistanceOnTrail >= trailLength - tolerance;

    if (userTrailTerminates && userLocation) {
      // SCENARIO 1: User is on a BRANCH trail approaching a MAIN trail
      // Show Left/Right turn options based on user's current heading
      const otherTrailId = foundJunction.trails.find(id => id !== currentTrailId);
      if (otherTrailId) {
        const otherTrailConfig = allTrails.find(t => t.id === otherTrailId);
        const otherTrailStops = allStops.filter(s => s.trailId === otherTrailId);
        
        // Use directional logic to determine which stops are left vs right
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
      // SCENARIO 2: User is on a MAIN trail approaching a BRANCH
      // Show Continue Straight (on current trail) vs Turn (onto branch trail)
      
      // The "Continue Straight" path includes all stops on current trail after the junction
      const continuePathStops = stopsSubset.filter((s, idx) => idx > junctionIndex);
      leftBranch = {
        stops: continuePathStops,
        name: `Continue on ${allTrails.find(t => t.id === currentTrailId)?.name || 'Trail'}`,
        color: allTrails.find(t => t.id === currentTrailId)?.color || '#808080'
      };

      // The "Turn" path shows all stops on the branch trail
      const turnPathTrailId = foundJunction.trails.find(id => id !== currentTrailId);
      if (turnPathTrailId) {
        const turnTrailConfig = allTrails.find(t => t.id === turnPathTrailId);
        let branchTrailStops = allStops.filter(s => s.trailId === turnPathTrailId);

        // --- SMART REVERSAL LOGIC ---
        // This handles cases where trail data is ordered "backwards" from the user's perspective.
        // Some trails have their coordinate data ordered in the opposite direction from how
        // the user experiences them at junctions. This logic detects and corrects for that.
        if (branchTrailStops.length > 0 && foundJunction) {
          // Find where this junction appears on the branch trail
          const junctionOnBranch = branchTrailStops.find(s => s.type === 'junction' && s.id.startsWith(`junction-${foundJunction!.id}-`));
          const junctionDistOnBranch = junctionOnBranch?.metadata.distance || 0;
          
          // Get the total length of the branch trail
          const branchTotalLength = branchTrailStops[branchTrailStops.length - 1].metadata.distance || 0;

          // If the junction appears more than halfway down the trail,
          // it means the trail data is ordered "backwards" from our perspective.
          // We reverse the list so stops appear in the intuitive order.
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
    // No junction found - show all stops normally
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