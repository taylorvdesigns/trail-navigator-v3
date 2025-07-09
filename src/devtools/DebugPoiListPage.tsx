// debug-poi-list.tsx
// Next.js page to debug and visualize all POIs, POI groups, and junctions in a single list

import React from 'react';
import { useTrailsData } from '../hooks/useTrailsData';
import { useTrailJunctions } from '../hooks/useTrailJunctions';
import { Box, Typography, Divider } from '@mui/material';
import { POI } from '../types/trail';
import { Junction } from '../utils/navViewSplit';

const DebugPOIListPage: React.FC = () => {
  // useTrailsData expects an array of TrailConfig, so pass an empty array for now
  const { data: trails = [], isLoading: trailsLoading } = useTrailsData([]);
  // useTrailJunctions expects an array of TrailConfig, but we only have TrailData here, so pass an empty array
  const junctions: Junction[] = useTrailJunctions([]);

  if (trailsLoading) {
    return <div>Loading...</div>;
  }

  // There are no POIs in TrailData, so just show trail IDs
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Debug POI List
      </Typography>

      {trails.map((trail, idx) => (
        <Box key={trail.id || idx} sx={{ mb: 2 }}>
          <Typography variant="h6">
            Trail {trail.id}
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Color: {trail.color}</li>
            <li>Points: {trail.points.length}</li>
          </ul>
        </Box>
      ))}

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6">
        Junctions
      </Typography>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {junctions.map((junction: Junction) => (
          <li key={junction.id}>
            Junction: {junction.id} at [{junction.location[0].toFixed(5)}, {junction.location[1].toFixed(5)}] (Trails: {junction.trails.join(', ')})
          </li>
        ))}
      </ul>
    </Box>
  );
};

export default DebugPOIListPage; 