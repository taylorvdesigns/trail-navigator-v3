import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useParams } from 'react-router-dom';
import { MapView } from '../components/MapView/MapView';
import { useLocation } from '../hooks/useLocation';
import { TRAIL_ROUTES } from '../config/routes.config';
import { usePOIs } from '../hooks/usePOIs';
import axios from 'axios';

interface TrailData {
  type: 'route';
  route: {
    name: string;
    description: string;
    path: Array<[number, number]>; // [lat, lng] pairs
    track_points: Array<{
      x: number; // longitude
      y: number; // latitude
      d: number; // distance
      e: number; // elevation
    }>;
  };
}

export const TrailView: React.FC = () => {
  const { trailId } = useParams();
  const { currentLocation } = useLocation();
  const { pois, loading: poisLoading, error: poisError } = usePOIs();
  const [trailData, setTrailData] = useState<TrailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const trail = TRAIL_ROUTES.find(route => route.routeId === trailId);
  
  const BASE_URL = '';

  useEffect(() => {
    const fetchTrailData = async () => {
      if (!trailId) {
        return;
      }
      
      try {
        setLoading(true);
        const response = await axios.get<TrailData>(`${BASE_URL}/api/ridewithgps.js`, {
          params: { id: trailId }
        });
        setTrailData(response.data);
        setError(null);
      } catch (err: any) {
        if (err.response) {
          setError('Failed to load trail data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTrailData();
  }, [trailId]);

  if (!trail) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">Trail not found</Typography>
      </Box>
    );
  }

  if (loading || poisLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || poisError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error || poisError}</Typography>
      </Box>
    );
  }

  // Transform trail data for the map
  const trailWithCoordinates = {
    ...trail,
    coordinates: trailData?.route?.track_points?.map(point => [point.y, point.x] as [number, number]) || 
                trailData?.route?.path || []
  };

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <MapView
        trails={[trailWithCoordinates]}
        pois={pois}
        currentLocation={currentLocation || undefined}
      />
    </Box>
  );
};
