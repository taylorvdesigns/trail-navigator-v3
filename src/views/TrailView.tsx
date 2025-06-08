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
  
  console.log('TrailView render:', { trailId, trail, currentLocation, poisCount: pois.length });

  useEffect(() => {
    const fetchTrailData = async () => {
      if (!trailId) {
        console.log('No trailId provided');
        return;
      }
      
      try {
        console.log('Fetching trail data for ID:', trailId);
        setLoading(true);
        const response = await axios.get<TrailData>(`http://localhost:4000/api/ridewithgps/${trailId}`);
        console.log('Trail data response:', response.data);
        setTrailData(response.data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching trail data:', err.message);
        if (err.response) {
          console.error('Error response:', {
            status: err.response.status,
            data: err.response.data
          });
        }
        setError('Failed to load trail data');
      } finally {
        setLoading(false);
      }
    };

    fetchTrailData();
  }, [trailId]);

  if (!trail) {
    console.log('Trail not found in config');
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">Trail not found</Typography>
      </Box>
    );
  }

  if (loading || poisLoading) {
    console.log('Loading trail data or POIs...');
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || poisError) {
    console.log('Error state:', error || poisError);
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
  
  console.log('Rendering trail with coordinates:', {
    routeId: trail.routeId,
    coordinateCount: trailWithCoordinates.coordinates.length,
    hasTrackPoints: !!trailData?.route?.track_points,
    hasPath: !!trailData?.route?.path,
    sampleCoordinate: trailWithCoordinates.coordinates[0],
    firstFiveCoordinates: trailWithCoordinates.coordinates.slice(0, 5),
    sampleTrackPoint: trailData?.route?.track_points?.[0]
  });

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
