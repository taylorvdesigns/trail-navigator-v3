import React from 'react';
import { useTrailsData } from '../hooks/useTrailsData';
import { useTrailJunctions } from '../hooks/useTrailJunctions';
import { usePOIs } from '../hooks/usePOIs';
import { POI } from '../types/trail';
import { Junction } from '../utils/navViewSplit';
import { TRAIL_ROUTES } from '../config/routes.config';

const DebugPOIList: React.FC = () => {
  const { data: trailsData = [] } = useTrailsData(TRAIL_ROUTES);
  const junctions = useTrailJunctions(trailsData);
  const { pois, loading: poisLoading } = usePOIs();

  if (poisLoading) {
    return <div>Loading POIs...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Debug POI List</h2>
      <div>
        <h3>POIs ({pois.length})</h3>
        <ul>
          {pois.map(poi => (
            <li key={poi.id}>
              {poi.title.rendered} - {poi.coordinates.join(', ')}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3>Junctions ({junctions.length})</h3>
        <ul>
          {junctions.map((junction: Junction) => (
            <li key={junction.id}>
              {junction.id} - Position: {junction.position} - Location: {junction.location.join(', ')} - Trails: {junction.trails.join(', ')}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DebugPOIList; 