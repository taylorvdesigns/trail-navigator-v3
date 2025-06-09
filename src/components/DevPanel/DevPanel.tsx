import React, { useEffect, useState } from 'react';
import { Box, Typography, Divider, FormControlLabel, Switch, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useLocation } from '../../hooks/useLocation';
import { TEST_LOCATIONS } from '../../config/appSettings';

export const DevPanel: React.FC = () => {
  const { currentLocation, setTestLocation, simDirection, setSimDirection, setSimulationMode } = useLocation();
  const [selectedLocation, setSelectedLocation] = useState(0);

  // Automatically enable simulation mode when DevPanel mounts
  useEffect(() => {
    setSimulationMode(true);
  }, [setSimulationMode]);

  // Update selectedLocation when test location changes
  useEffect(() => {
    if (currentLocation) {
      const idx = TEST_LOCATIONS.findIndex(loc =>
        loc.coordinates[1] === currentLocation[0] &&
        loc.coordinates[0] === currentLocation[1]
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
    </Box>
  );
}; 