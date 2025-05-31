import { LocomotionMode } from '../types/index';

const SPEEDS = {
  walking: 1.4, // meters per second (average walking speed)
  running: 3.0, // meters per second (average running speed)
  biking: 4.5,  // meters per second (average biking speed)
  accessible: 1.0 // meters per second (average speed for accessible mode)
};

export const calculateETA = (
  distanceInMeters: number,
  mode: LocomotionMode
): number => {
  const speedMps = SPEEDS[mode];
  return distanceInMeters / speedMps; // Returns seconds
};
