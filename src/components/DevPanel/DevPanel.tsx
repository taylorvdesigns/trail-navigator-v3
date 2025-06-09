import React, { useEffect, useState } from 'react';
import { Box, Typography, Divider, FormControlLabel, Switch, ToggleButton, ToggleButtonGroup, Button } from '@mui/material';
import { useLocation } from '../../hooks/useLocation';
import { TEST_LOCATIONS } from '../../config/appSettings';
import { TRAIL_ROUTES } from '../../config/routes.config';
import { useTrailsData } from '../../hooks/useTrailsData';

export const DevPanel: React.FC = () => {
  const { currentLocation, setTestLocation, simDirection, setSimDirection, setSimulationMode, clearEntryPoint, setEntryPoint, entryPoint } = useLocation();
  const [selectedLocation, setSelectedLocation] = useState(0);
  const { data: trailsData } = useTrailsData(TRAIL_ROUTES);

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

  const handleLocationChange = (_event: React.MouseEvent<HTMLElement>, newValue: number) => {
    if (typeof newValue === 'number' && newValue !== selectedLocation) {
      setTestLocation(newValue);
      setSelectedLocation(newValue);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 400, margin: '0 auto' }}>
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
    </Box>
  );
}; 