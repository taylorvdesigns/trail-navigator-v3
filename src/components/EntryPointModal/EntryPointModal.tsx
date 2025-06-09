import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Modal } from '../Modal/Modal';
import { useLocation } from '../../hooks/useLocation';
import { EntryPointMapPicker } from './EntryPointMapPicker';
import { TRAIL_ROUTES } from '../../config/routes.config';

interface EntryPointModalProps {
  open: boolean;
  onClose: () => void;
}

export const EntryPointModal: React.FC<EntryPointModalProps> = ({ open, onClose }) => {
  const { setEntryPoint } = useLocation();
  const [showMap, setShowMap] = useState(false);

  // Placeholder: Use current location (simulate with a fixed point for now)
  const handleUseCurrentLocation = () => {
    // TODO: Snap to nearest trail point
    setEntryPoint([-82.3940, 34.8526]); // Example: Greenville, SC
    onClose();
  };

  const handlePickOnMap = () => {
    setShowMap(true);
  };

  const handleMapConfirm = (location: [number, number]) => {
    setEntryPoint(location);
    setShowMap(false);
    onClose();
  };

  const handleMapCancel = () => {
    setShowMap(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Where did you get on the trail?">
      {showMap ? (
        <EntryPointMapPicker
          trails={TRAIL_ROUTES}
          onConfirm={handleMapConfirm}
          onCancel={handleMapCancel}
        />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 320 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUseCurrentLocation}
            sx={{ width: '100%' }}
          >
            Use My Current Location
          </Button>
          <Typography variant="body2" sx={{ color: '#888' }}>or</Typography>
          <Button
            variant="outlined"
            color="primary"
            onClick={handlePickOnMap}
            sx={{ width: '100%' }}
          >
            Pick on Map
          </Button>
        </Box>
      )}
    </Modal>
  );
}; 