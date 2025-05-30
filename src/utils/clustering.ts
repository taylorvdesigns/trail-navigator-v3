import { POI } from '../types';
import { calculateDistance as calcDistance } from './distance';

export const clusterPOIs = (pois: POI[], maxDistance: number = 50): POI[][] => {
  const clusters: POI[][] = [];
  const visited = new Set<string>();

  pois.forEach((poi) => {
    if (visited.has(poi.id.toString())) return;

    const cluster: POI[] = [poi];
    visited.add(poi.id.toString());

    pois.forEach((otherPoi) => {
      if (visited.has(otherPoi.id.toString())) return;

      const distance = calcDistance(
        poi.coordinates[0],
        poi.coordinates[1],
        otherPoi.coordinates[0],
        otherPoi.coordinates[1]
      );

      if (distance <= maxDistance) {
        cluster.push(otherPoi);
        visited.add(otherPoi.id.toString());
      }
    });

    clusters.push(cluster);
  });

  return clusters;
};

// Helper function to calculate distance between two points in meters
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2 - lat1) * Math.PI/180;
  const Δλ = (lon2 - lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};
