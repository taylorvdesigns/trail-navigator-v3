import React from 'react';
import { Box, CircularProgress } from '@mui/material';

const LoadingScreen: React.FC = () => (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      bgcolor: 'rgba(20, 20, 20, 0.85)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <CircularProgress size={64} thickness={4} color="success" />
  </Box>
);

export default LoadingScreen; 