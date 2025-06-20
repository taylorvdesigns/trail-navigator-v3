import React from 'react';
import { POI } from '../../types/trail';
import { GraphNode } from '../../types/graph';
import { NavViewCard } from './NavViewCard';

interface NavViewSplitProps {
  ahead: Array<POI | GraphNode>;
  behind: Array<POI | GraphNode>;
  currentPosition: [number, number];
}

export const NavViewSplit: React.FC<NavViewSplitProps> = ({
  ahead,
  behind,
  currentPosition
}) => {
  return (
    <div className="nav-view-split">
      <div className="nav-view-split-ahead">
        <h3>Ahead</h3>
        {ahead.map((stop, index) => (
          <NavViewCard
            key={`ahead-${index}`}
            stop={stop}
            position={currentPosition}
          />
        ))}
      </div>
      <div className="nav-view-split-behind">
        <h3>Behind</h3>
        {behind.map((stop, index) => (
          <NavViewCard
            key={`behind-${index}`}
            stop={stop}
            position={currentPosition}
          />
        ))}
      </div>
    </div>
  );
}; 