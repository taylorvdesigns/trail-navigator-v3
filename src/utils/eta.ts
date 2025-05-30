import { LocomotionMode } from '../types';

const SPEEDS = {
  walking: 1.4, // meters per second (5 km/h)
  running: 2.8, // meters per second (10 km/h)
  biking: 4.2,  // meters per second (15 km/h)
};

export const calculateETA = (
  distanceInMeters: number,
  mode: LocomotionMode
): number => {
  const speedMps = SPEEDS[mode];
  return distanceInMeters / speedMps; // Returns seconds
};
