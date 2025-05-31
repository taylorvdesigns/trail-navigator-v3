import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Paper
} from '@mui/material';
import { useLocation } from '../../hooks/useLocation';
import { TEST_LOCATIONS } from '../../config/appSettings';

export const SimulationControl: React.FC = () => {
  const { isSimulationMode, setSimulationMode, setTestLocation, simDirection, setSimDirection } = useLocation();

  const handleLocationChange = (event: any) => {
    const index = event.target.value;
    setTestLocation(index);
  };

  return (
    <Paper 
      sx={{ 
        position: 'absolute', 
        top: 16, 
        right: 16, 
        zIndex: 1000,
        p: 2,
        minWidth: 200,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        boxShadow: 3,
        color: '#FFFFFF'
      }}
    >
      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={isSimulationMode}
              onChange={(e) => setSimulationMode(e.target.checked)}
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
          label={
            <Typography sx={{ color: '#FFFFFF', fontSize: '0.9rem' }}>
              Simulation Mode
            </Typography>
          }
        />
      </Box>
      
      {isSimulationMode && (
        <>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel sx={{ color: '#FFFFFF' }}>Location</InputLabel>
            <Select
              label="Location"
              onChange={handleLocationChange}
              defaultValue={0}
              sx={{
                color: '#FFFFFF',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.5)'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#43D633'
                },
                '& .MuiSvgIcon-root': {
                  color: '#FFFFFF'
                }
              }}
            >
              {TEST_LOCATIONS.map((location, index) => (
                <MenuItem 
                  key={index} 
                  value={index}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(67, 214, 51, 0.1)'
                    }
                  }}
                >
                  {location.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
        </>
      )}
    </Paper>
  );
}; 