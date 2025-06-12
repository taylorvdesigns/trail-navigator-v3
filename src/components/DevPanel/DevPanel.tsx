import React, { useEffect, useState } from 'react';
import { Box, Typography, Divider, FormControlLabel, Switch, ToggleButton, ToggleButtonGroup, Button } from '@mui/material';
import { useLocation } from '../../hooks/useLocation';
import { TEST_LOCATIONS } from '../../config/appSettings';
import { TRAIL_ROUTES } from '../../config/routes.config';
import { useTrailsData } from '../../hooks/useTrailsData';
import { useUser } from '../../contexts/UserContext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';

const SPEED_MULTIPLIERS = [1, 2, 4];
const SPEED_LABELS = { 1: '1x', 2: '2x', 4: '4x' };
const BASE_SPEEDS = {
  walking: 1.4,
  running: 3.0,
  biking: 4.5,
  accessible: 1.0
};

export const DevPanel: React.FC = () => {
  const { 
    currentLocation, 
    setCurrentLocation, 
    setTestLocation, 
    simDirection, 
    setSimDirection, 
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
    setSimTrailPoints
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
      // Use a small tolerance for floating-point comparison
      const TOL = 1e-5;
      const idx = TEST_LOCATIONS.findIndex(loc =>
        Math.abs(loc.coordinates[0] - currentLocation[0]) < TOL &&
        Math.abs(loc.coordinates[1] - currentLocation[1]) < TOL
      );
      if (idx !== -1) setSelectedLocation(idx);
    }
  }, [currentLocation]);

  // Find the main trail polyline (first trail)
  const trailPoints = trailsData && trailsData[0]?.points ? trailsData[0].points : [];

  // Find the closest trail point index to currentLocation
  useEffect(() => {
    if (!currentLocation || !trailPoints.length) return;
    let minDist = Infinity;
    let minIdx = 0;
    for (let i = 0; i < trailPoints.length; i++) {
      const d = Math.hypot(
        trailPoints[i].latitude - currentLocation[0],
        trailPoints[i].longitude - currentLocation[1]
      );
      if (d < minDist) {
        minDist = d;
        minIdx = i;
      }
    }
    if (simIndex !== minIdx) {
      setSimIndex(minIdx);
    }
  }, [currentLocation, trailPoints, simIndex, setSimIndex]);

  // Keep simulation trail points in sync with context
  useEffect(() => {
    setSimTrailPoints(trailPoints);
  }, [trailPoints, setSimTrailPoints]);

  // Simulation movement logic
  useEffect(() => {
    if (!isSimPlaying || !trailPoints.length || simIndex == null) return;
    const baseSpeed = BASE_SPEEDS[locomotionMode] || 1.4;
    const speed = baseSpeed * simSpeedMultiplier; // meters per second
    const intervalMs = 1000 / simSpeedMultiplier; // faster updates for higher speeds
    let idx = simIndex;
    function step() {
      // Move forward or backward depending on simDirection
      let nextIdx = simDirection === 'top' ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= trailPoints.length) {
        setIsSimPlaying(false);
        return;
      }
      idx = nextIdx;
      setSimIndex(idx);
      // Update currentLocation to this trail point
      const pt = trailPoints[idx];
      if (pt) {
        console.log('[SimLocomotion] index:', idx, 'coords:', [pt.latitude, pt.longitude], 'playing:', isSimPlaying);
        setCurrentLocation([pt.latitude, pt.longitude]);
      }
    }
    const timer = setInterval(step, intervalMs);
    return () => clearInterval(timer);
  }, [isSimPlaying, simSpeedMultiplier, locomotionMode, simDirection, trailPoints, simIndex, setCurrentLocation, setIsSimPlaying]);

  // Play, Pause, Reset handlers
  const handlePlay = () => setIsSimPlaying(true);
  const handlePause = () => {
    setIsSimPlaying(false);
  };
  const handleReset = () => {
    setIsSimPlaying(false);
    // Reset to selected test location
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
  }, []);

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <Box sx={{ 
        p: 3, 
        maxWidth: 400, 
        margin: '0 auto',
        overflowY: 'auto',
        flex: 1,
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#1a1a1a',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#39FF14',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#32CD32',
        }
      }}>
        <Typography variant="h5" sx={{ mb: 2, color: '#39FF14', textAlign: 'center' }}>
          Development Mode
        </Typography>
        <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Current Location:
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {currentLocation ? `${currentLocation[0]}, ${currentLocation[1]}` : 'Not set'}
          </Typography>
        </Box>
        {/* Vertical ToggleButtonGroup for locations */}
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Select Test Location:
          </Typography>
          <ToggleButtonGroup
            value={selectedLocation}
            exclusive
            onChange={handleLocationChange}
            orientation="vertical"
            aria-label="Test Location"
            fullWidth
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
        <FormControlLabel
          control={
            <Switch
              checked={simDirection === 'top'}
              onChange={e => setSimDirection(e.target.checked ? 'top' : 'bottom')}
              sx={{
                '& .MuiSwitch-track': {
                  backgroundColor: '#666666'
                },
                '& .MuiSwitch-thumb': {
                  backgroundColor: '#FFFFFF'
                }
              }}
            />
          }
          label={<Typography sx={{ color: '#FFFFFF', fontSize: '0.9rem' }}>Direction: {simDirection === 'top' ? 'Top' : 'Bottom'}</Typography>}
          sx={{ mt: 2 }}
        />
        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />
        {/* Entry Point Selection */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Set Entry Point (Test Locations):
          </Typography>
          <Box sx={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #444', borderRadius: 2, p: 1, background: '#222' }}>
            {TEST_LOCATIONS.map((loc, idx) => {
              const isCurrent = entryPoint && entryPoint[0] === loc.coordinates[0] && entryPoint[1] === loc.coordinates[1];
              return (
                <Button
                  key={idx}
                  variant={isCurrent ? 'contained' : 'outlined'}
                  color={isCurrent ? 'primary' : 'secondary'}
                  size="small"
                  sx={{
                    mb: 1,
                    mr: 1,
                    minWidth: 0,
                    fontSize: 12,
                    fontWeight: isCurrent ? 700 : 400,
                    bgcolor: isCurrent ? '#e91e63' : undefined,
                    color: isCurrent ? '#fff' : '#e91e63',
                    borderColor: '#e91e63',
                    '&:hover': { bgcolor: isCurrent ? '#d81b60' : '#fce4ec' }
                  }}
                  onClick={() => setEntryPoint([loc.coordinates[0], loc.coordinates[1]])}
                >
                  {loc.name}
                </Button>
              );
            })}
          </Box>
        </Box>
        <Button variant="outlined" color="secondary" fullWidth onClick={clearEntryPoint}>
          Reset Entry Point
        </Button>
        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />
        {/* Simulated Locomotion Controls */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Simulated Locomotion:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Button onClick={handlePlay} disabled={isSimPlaying} startIcon={<PlayArrowIcon />} variant="contained" color="success">Play</Button>
            <Button onClick={handlePause} disabled={!isSimPlaying} startIcon={<PauseIcon />} variant="contained" color="warning">Pause</Button>
            <Button onClick={handleReset} startIcon={<ReplayIcon />} variant="contained" color="secondary">Reset</Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ color: '#fff' }}>Speed:</Typography>
            <ToggleButtonGroup
              value={simSpeedMultiplier}
              exclusive
              onChange={(_e, v) => v && setSimSpeedMultiplier(v)}
              size="small"
              aria-label="Speed Multiplier"
            >
              {SPEED_MULTIPLIERS.map(mult => (
                <ToggleButton key={mult} value={mult} sx={{ color: '#fff', borderColor: '#39FF14', '&.Mui-selected': { bgcolor: '#39FF14', color: '#000' } }}>
                  {SPEED_LABELS[mult as keyof typeof SPEED_LABELS]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
          <Typography variant="body2" sx={{ color: '#fff', mt: 1 }}>
            State: {isSimPlaying ? 'Playing' : 'Paused'} | Speed: {simSpeedMultiplier}x | Mode: {locomotionMode}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}; 