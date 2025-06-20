import React from 'react';
import { GraphNode } from '../../types/graph';

interface NavViewContextCardProps {
  currentPosition: [number, number];
  currentNode: GraphNode;
}

export const NavViewContextCard: React.FC<NavViewContextCardProps> = ({
  currentPosition,
  currentNode
}) => {
  return (
    <div className="nav-view-context-card">
      <h3>Current Location</h3>
      <p>Latitude: {currentPosition[0].toFixed(6)}</p>
      <p>Longitude: {currentPosition[1].toFixed(6)}</p>
      {currentNode.type === 'junction' && (
        <p>At junction: {currentNode.name || 'Unnamed Junction'}</p>
      )}
    </div>
  );
}; 