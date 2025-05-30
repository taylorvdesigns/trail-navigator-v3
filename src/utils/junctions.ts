import { TrailPoint } from '../types';
import { calculateDistance } from './distance';

export const findNearestJunction = (
  point: TrailPoint,
  junctions: TrailPoint[],
  maxDistance: number = 100 // meters
): TrailPoint | null => {
  let nearest: TrailPoint | null = null;
  let minDistance = Infinity;

  junctions.forEach((junction) => {
    const distance = calculateDistance(
      point.latitude,
      point.longitude,
      junction.latitude,
      junction.longitude
    );

    if (distance < minDistance && distance <= maxDistance) {
      minDistance = distance;
      nearest = junction;
    }
  });

  return nearest;
};
