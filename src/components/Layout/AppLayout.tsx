import React from 'react';
import { Box, AppBar, Toolbar, Typography, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { Map, Navigation, List } from '@mui/icons-material';
import { ViewMode } from '../../types';

interface AppLayoutProps {
  children: React.ReactNode;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, currentView, onViewChange }) => {
  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.default'
    }}>
      <AppBar position="sticky" sx={{ bgcolor: 'background.paper' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, textAlign: 'center' }}>
            SWAMP RABBIT TRAIL NAVIGATOR
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {children}
      </Box>

      <BottomNavigation
        value={currentView}
        onChange={(_event: React.SyntheticEvent, newValue: ViewMode) => onViewChange(newValue)}
        sx={{
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider'
        }}
      >
        <BottomNavigationAction
          label="MAP"
          value="map"
          icon={<Map />}
        />
        <BottomNavigationAction
          label="NAV"
          value="nav"
          icon={<Navigation />}
        />
        <BottomNavigationAction
          label="LIST"
          value="list"
          icon={<List />}
        />
      </BottomNavigation>
    </Box>
  );
}; 