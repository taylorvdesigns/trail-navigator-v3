import React, { useMemo } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPersonWalking, faPersonRunning, faPersonBiking, faTimes } from '@fortawesome/free-solid-svg-icons';
import { POI } from '../../types/index';
import { useLocation } from '../../contexts/LocationContext';
import { useTrailGraph } from '../../hooks/useTrailGraph';
import { calculatePreciseNetworkDistance } from '../../utils/trailGraph';
import { calculateETA } from '../../utils/eta';
import { metersToMiles } from '../../utils/distance';

interface POIDistanceModalProps {
  poi: POI;
  onClose: () => void;
  onStartNavigation: () => void;
}

// Reuse the same ETA formatting function from NavViewV2
function formatETA(minutes: number | null): string {
  if (minutes === null || isNaN(minutes)) return '--';
  const min = Math.round(minutes);
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  const rem = min % 60;
  return rem === 0 ? `${hr} hr` : `${hr} hr ${rem} min`;
}

export const POIDistanceModal: React.FC<POIDistanceModalProps> = ({
  poi,
  onClose,
  onStartNavigation
}) => {
  const { currentLocation } = useLocation();
  const { graph } = useTrailGraph();

  // Calculate distance and travel times using the same logic as Nav View
  const distanceAndTimes = useMemo(() => {
    if (!currentLocation || !graph) {
      return {
        distanceMiles: null,
        walkingTime: null,
        runningTime: null,
        bikingTime: null
      };
    }

    // Convert coordinates to [lng, lat] format for trail graph
    const userCoords: [number, number] = [currentLocation[0], currentLocation[1]];
    const poiCoords: [number, number] = poi.coordinates ? [poi.coordinates[0], poi.coordinates[1]] : [0, 0];

    // Use the same precise network distance calculation as Nav View
    const networkDistance = calculatePreciseNetworkDistance(graph, userCoords, poiCoords);
    
    if (networkDistance === null) {
      return {
        distanceMiles: null,
        walkingTime: null,
        runningTime: null,
        bikingTime: null
      };
    }

    const distanceMiles = metersToMiles(networkDistance);
    
    // Calculate travel times using the same ETA function as Nav View
    const walkingTime = calculateETA(networkDistance, 'walking');
    const runningTime = calculateETA(networkDistance, 'running');
    const bikingTime = calculateETA(networkDistance, 'biking');

    return {
      distanceMiles,
      walkingTime,
      runningTime,
      bikingTime
    };
  }, [currentLocation, graph, poi.coordinates]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        p: 3
      }}
      onClick={onClose}
    >
      <Paper
        sx={{
          maxWidth: 420,
          width: '100%',
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          border: '1px solid #333'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <Box sx={{ 
          position: 'relative', 
          p: 3, 
          pb: 2,
          borderBottom: '1px solid #333'
        }}>
          <Button
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              minWidth: 'auto',
              p: 1,
              color: '#999',
              '&:hover': {
                color: '#fff',
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </Button>
          <Typography 
            variant="h6" 
            sx={{ 
              textAlign: 'center', 
              fontWeight: '600',
              color: '#fff',
              fontSize: '1.1rem',
              lineHeight: 1.3,
              pr: 4 // Space for close button
            }}
          >
            {typeof poi.title === 'object' && poi.title.rendered ? poi.title.rendered : String(poi.title)}
          </Typography>
        </Box>

        {/* Distance section */}
        <Box sx={{ p: 3, pt: 2 }}>
          <Box sx={{ 
            textAlign: 'center', 
            mb: 3,
            p: 2,
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            borderRadius: 2,
            border: '1px solid rgba(25, 118, 210, 0.3)'
          }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: '700', 
                color: '#1976d2',
                fontSize: '1.8rem',
                mb: 0.5
              }}
            >
              {distanceAndTimes.distanceMiles !== null
                ? `${distanceAndTimes.distanceMiles.toFixed(1)} miles`
                : '--'
              }
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#999',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
            >
              from your location
            </Typography>
          </Box>

          {/* Travel times section */}
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: '#ccc',
                mb: 2,
                fontWeight: '600',
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Travel Times
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 2.5,
              p: 1.5,
              borderRadius: 1.5,
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <FontAwesomeIcon 
                icon={faPersonWalking} 
                style={{ 
                  fontSize: 18, 
                  color: '#4caf50', 
                  marginRight: 16,
                  width: 20
                }} 
              />
              <Typography variant="body1" sx={{ color: '#fff', fontWeight: '500' }}>
                {formatETA(distanceAndTimes.walkingTime)} walking
              </Typography>
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 2.5,
              p: 1.5,
              borderRadius: 1.5,
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <FontAwesomeIcon 
                icon={faPersonRunning} 
                style={{ 
                  fontSize: 18, 
                  color: '#ff9800', 
                  marginRight: 16,
                  width: 20
                }} 
              />
              <Typography variant="body1" sx={{ color: '#fff', fontWeight: '500' }}>
                {formatETA(distanceAndTimes.runningTime)} running
              </Typography>
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              p: 1.5,
              borderRadius: 1.5,
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <FontAwesomeIcon 
                icon={faPersonBiking} 
                style={{ 
                  fontSize: 18, 
                  color: '#2196f3', 
                  marginRight: 16,
                  width: 20
                }} 
              />
              <Typography variant="body1" sx={{ color: '#fff', fontWeight: '500' }}>
                {formatETA(distanceAndTimes.bikingTime)} biking
              </Typography>
            </Box>
          </Box>

          {/* Start button */}
          <Button
            variant="contained"
            fullWidth
            onClick={onStartNavigation}
            sx={{
              py: 2,
              fontSize: '1.1rem',
              fontWeight: '700',
              backgroundColor: '#1976d2',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
              '&:hover': {
                backgroundColor: '#1565c0',
                boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            Start Navigation
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}; 