import React, { useEffect, useState } from 'react';
import { Box, Typography, Divider, FormControlLabel, Switch, ToggleButton, ToggleButtonGroup, Button } from '@mui/material';

import { useLocation } from '../../contexts/LocationContext';
import { TEST_LOCATIONS } from '../../config/appSettings';
import { TRAIL_ROUTES } from '../../config/routes.config';
import { useTrailsData } from '../../hooks/useTrailsData';
import { useUser } from '../../contexts/UserContext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';

const SPEED_MULTIPLIERS = [1, 2, 4];
const SPEED_LABELS = { 1: '1x', 2: '2x', 4: '4x' };

export const DevPanel: React.FC = () => {
  const { 
    currentLocation, 
    setTestLocation, 
    setSimulationMode, 
    clearEntryPoint, 
    setEntryPoint, 
    entryPoint,
    isSimPlaying,
    setIsSimPlaying,
    simSpeedMultiplier,
    setSimSpeedMultiplier,
    simIndex,
    setSimIndex,
    setSimTrailPoints,
    simLoop,
    setSimLoop,
    simDirection,
    setSimDirection
  } = useLocation();
  const [selectedLocation, setSelectedLocation] = useState(0);
  const { data: trailsData } = useTrailsData(TRAIL_ROUTES);
  const { locomotionMode } = useUser();

  // Automatically enable simulation mode when DevPanel mounts
  useEffect(() => {
    setSimulationMode(true);
  }, [setSimulationMode]);

  // Update selectedLocation when test location changes
  useEffect(() => {
    if (currentLocation) {
      const TOL = 1e-5;
      const idx = TEST_LOCATIONS.findIndex(loc =>
        Math.abs(loc.coordinates[0] - currentLocation[1]) < TOL &&
        Math.abs(loc.coordinates[1] - currentLocation[0]) < TOL
      );
      if (idx !== -1) setSelectedLocation(idx);
    }
  }, [currentLocation]);

  // Find the main trail polyline (first trail)
  const trailPoints = trailsData && trailsData[0]?.points ? trailsData[0].points : [];

  // Find the closest trail point index to currentLocation
  useEffect(() => {
    if (!currentLocation || !trailPoints.length || isSimPlaying) return;
    
    let minDist = Infinity;
    let minIdx = 0;
    for (let i = 0; i < trailPoints.length; i++) {
      const d = Math.hypot(
        trailPoints[i].latitude - currentLocation[1],
        trailPoints[i].longitude - currentLocation[0]
      );
      if (d < minDist) {
        minDist = d;
        minIdx = i;
      }
    }
    if (simIndex !== minIdx) {
      setSimIndex(minIdx);
    }
  }, [currentLocation, trailPoints, simIndex, isSimPlaying, setSimIndex]);

  // Keep simulation trail points in sync with context
  useEffect(() => {
    if (!isSimPlaying) {
      setSimTrailPoints(trailPoints);
    }
  }, [trailPoints, isSimPlaying, setSimTrailPoints]);

  // Simple control handlers
  const handlePlay = () => {
    // Starting simulation
    setIsSimPlaying(true);
  };

  const handlePause = () => {
    // Pausing simulation
    setIsSimPlaying(false);
  };

  const handleReset = () => {
    // Resetting simulation
    setIsSimPlaying(false);
    setTestLocation(selectedLocation);
  };

  const handleLocationChange = (_event: React.MouseEvent<HTMLElement>, newValue: number) => {
    if (typeof newValue === 'number' && newValue !== selectedLocation) {
      setTestLocation(newValue);
      setSelectedLocation(newValue);
    }
  };

  // Ensure default speed is 1x
  useEffect(() => {
    if (![1, 2, 4].includes(simSpeedMultiplier)) {
      setSimSpeedMultiplier(1);
    }
  }, [simSpeedMultiplier, setSimSpeedMultiplier]);

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      bgcolor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Box sx={{ 
        p: 4, 
        maxWidth: 420, 
        margin: '32px auto',
        overflowY: 'auto',
        flex: 1,
        bgcolor: 'rgba(34, 34, 34, 0.98)',
        borderRadius: 4,
        boxShadow: '0 4px 24px 0 rgba(0,0,0,0.25)',
        border: '1px solid #222',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#222',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#444',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#666',
        },
      }}>
        <Typography variant="h5" sx={{ mb: 3, color: '#39FF14', textAlign: 'center', fontWeight: 700 }}>
          Development Mode
        </Typography>
        <Divider sx={{ mb: 3, borderColor: 'rgba(255,255,255,0.1)' }} />
        
        {/* Test Location Selection */}
        <Box sx={{ mt: 2, mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#fff' }}>
            Select Test Location:
          </Typography>
          <ToggleButtonGroup
            value={selectedLocation}
            exclusive
            onChange={handleLocationChange}
            orientation="vertical"
            aria-label="Test Location"
            fullWidth
            sx={{ gap: 1 }}
          >
            {TEST_LOCATIONS.map((location, index) => (
              <ToggleButton
                key={index}
                value={index}
                aria-label={location.name}
                sx={{
                  justifyContent: 'flex-start',
                  color: '#fff',
                  borderColor: '#39FF14',
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: '#39FF14',
                    color: '#000',
                  },
                  fontWeight: 600,
                  fontSize: 13,
                  py: 1.5,
                  px: 2,
                  mb: 1
                }}
              >
                {location.name}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Direction Control */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#fff' }}>
            Direction:
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, color: '#ccc', fontSize: '0.8rem' }}>
            Change the direction you are headed on the trail.
          </Typography>
          <ToggleButtonGroup
            value={simDirection}
            exclusive
            onChange={(_event, newValue) => {
              if (newValue !== null) {
                setSimDirection(newValue);
              }
            }}
            aria-label="Simulation Direction"
            fullWidth
            sx={{ gap: 1 }}
          >
            <ToggleButton
              value="top"
              aria-label="Northbound"
              sx={{
                color: '#fff',
                borderColor: '#e91e63',
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: '#e91e63',
                  color: '#fff',
                },
                fontWeight: 600,
                fontSize: 13,
                py: 1.5,
                px: 2
              }}
            >
              Northbound
            </ToggleButton>
            <ToggleButton
              value="bottom"
              aria-label="Southbound"
              sx={{
                color: '#fff',
                borderColor: '#e91e63',
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: '#e91e63',
                  color: '#fff',
                },
                fontWeight: 600,
                fontSize: 13,
                py: 1.5,
                px: 2
              }}
            >
              Southbound
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

        {/* Entry Point Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#fff' }}>
            Set Entry Point (Test Locations):
          </Typography>
          <ToggleButtonGroup
            value={(() => {
              if (!entryPoint) return null;
              return TEST_LOCATIONS.findIndex(loc => entryPoint[0] === loc.coordinates[0] && entryPoint[1] === loc.coordinates[1]);
            })()}
            exclusive
            onChange={(_event, newValue) => {
              if (typeof newValue === 'number') {
                const loc = TEST_LOCATIONS[newValue];
                setEntryPoint([loc.coordinates[0], loc.coordinates[1]]);
              }
            }}
            orientation="vertical"
            aria-label="Entry Point Location"
            fullWidth
            sx={{ gap: 1, mb: 2 }}
          >
            {TEST_LOCATIONS.map((location, index) => (
              <ToggleButton
                key={index}
                value={index}
                aria-label={location.name}
                sx={{
                  justifyContent: 'flex-start',
                  color: '#fff',
                  borderColor: '#e91e63',
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: '#e91e63',
                    color: '#fff',
                  },
                  fontWeight: 600,
                  fontSize: 13,
                  py: 1.5,
                  px: 2,
                  mb: 1
                }}
              >
                {location.name}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Button variant="outlined" color="secondary" fullWidth onClick={clearEntryPoint} sx={{ borderRadius: 2, py: 1, fontWeight: 600 }}>
            Reset Entry Point
          </Button>
        </Box>

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

        {/* Simulation Controls */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#fff' }}>
            Simulation Controls:
          </Typography>
          
          {/* Play/Pause/Reset Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Button 
              onClick={handlePlay} 
              disabled={isSimPlaying} 
              startIcon={<PlayArrowIcon />} 
              variant="contained" 
              color="success" 
              sx={{ borderRadius: 2, minWidth: 90 }}
            >
              Play
            </Button>
            <Button 
              onClick={handlePause} 
              disabled={!isSimPlaying} 
              startIcon={<PauseIcon />} 
              variant="contained" 
              color="warning" 
              sx={{ borderRadius: 2, minWidth: 90 }}
            >
              Pause
            </Button>
            <Button 
              onClick={handleReset} 
              startIcon={<ReplayIcon />} 
              variant="contained" 
              color="secondary" 
              sx={{ borderRadius: 2, minWidth: 90 }}
            >
              Reset
            </Button>
          </Box>

          {/* Speed Control */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#fff' }}>Speed:</Typography>
            <ToggleButtonGroup
              value={simSpeedMultiplier}
              exclusive
              onChange={(_e, v) => v && setSimSpeedMultiplier(v)}
              size="small"
              aria-label="Speed Multiplier"
              sx={{ gap: 1 }}
            >
              {SPEED_MULTIPLIERS.map(mult => (
                <ToggleButton 
                  key={mult} 
                  value={mult} 
                  sx={{ 
                    color: '#fff', 
                    borderColor: '#39FF14', 
                    borderRadius: 2, 
                    '&.Mui-selected': { bgcolor: '#39FF14', color: '#000' } 
                  }}
                >
                  {SPEED_LABELS[mult as keyof typeof SPEED_LABELS]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* Loop Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={simLoop}
                onChange={e => setSimLoop(e.target.checked)}
                sx={{
                  '& .MuiSwitch-track': {
                    backgroundColor: '#666666'
                  },
                  '& .MuiSwitch-thumb': {
                    backgroundColor: '#FFFFFF'
                  },
                  mr: 2
                }}
              />
            }
            label={<Typography sx={{ color: '#FFFFFF', fontSize: '0.9rem' }}>Loop Simulation</Typography>}
            sx={{ mt: 1, mb: 1, ml: 1 }}
          />

          {/* Status Display */}
          <Typography variant="body2" sx={{ color: '#fff', mt: 1 }}>
            State: {isSimPlaying ? 'Playing' : 'Paused'} | Speed: {simSpeedMultiplier}x | Mode: {locomotionMode} | Loop: {simLoop ? 'On' : 'Off'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}; 