import React from 'react';
import { POI } from '../../types/trail';
import { GraphNode } from '../../types/graph';
import { haversine } from '../../utils/distance';

interface NavViewCardProps {
  stop: POI | GraphNode;
  position: [number, number];
}

export const NavViewCard: React.FC<NavViewCardProps> = ({ stop, position }) => {
  // Use stop.position if available, otherwise fallback to [0,0]
  const stopPos = (stop as any).position || [0, 0];
  const distance = haversine(position, stopPos);
  const formattedDistance = `${distance.toFixed(2)} meters`;

  return (
    <div className="nav-view-card">
      <h3>{'name' in stop ? stop.name : 'Unnamed Stop'}</h3>
      <p>{formattedDistance}</p>
      {('type' in stop && stop.type === 'poi' && 'description' in stop && (stop as any).description) && (
        <p>{String((stop as any).description)}</p>
      )}
    </div>
  );
};

function calculateDistance(pos1: [number, number], pos2: [number, number]): number {
  const [lat1, lon1] = pos1;
  const [lat2, lon2] = pos2;
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
} 