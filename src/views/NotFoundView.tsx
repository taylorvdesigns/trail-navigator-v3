import React from 'react';
import { Box, Typography } from '@mui/material';

export const NotFoundView: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        textAlign: 'center',
        p: 3,
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        404 - Page Not Found
      </Typography>
      <Typography variant="body1">
        The page you're looking for doesn't exist or has been moved.
      </Typography>
    </Box>
  );
};
