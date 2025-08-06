import React from 'react';
import { Box, AppBar, Toolbar, Typography, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { Map, Navigation, List, Settings } from '@mui/icons-material';
import { ViewMode } from '../../types';
import { useSimulationConfigMode } from '../../contexts/SimulationConfigContext';

interface AppLayoutProps {
  children: React.ReactNode;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  title?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, currentView, onViewChange, title }) => {
  const { isSimulationConfigMode } = useSimulationConfigMode();
  const defaultTitle = "SWAMP RABBIT TRAIL NAVIGATOR";
  const displayTitle = title || defaultTitle;
  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.default'
    }}>
      <AppBar position="sticky" sx={{ bgcolor: 'background.paper' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, textAlign: 'center', color: 'white' }}>
            {displayTitle}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ 
        flex: 1, 
        minHeight: 0, 
        overflow: 'hidden',
        pb: 'calc(56px + env(safe-area-inset-bottom, 0px))', // Account for fixed bottom nav
      }}>
        {children}
      </Box>

      <BottomNavigation
        value={currentView}
        onChange={(_event: React.SyntheticEvent, newValue: ViewMode) => onViewChange(newValue)}
        sx={{
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 4000,
          pb: 'env(safe-area-inset-bottom, 0px)',
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
        {isSimulationConfigMode && (
          <BottomNavigationAction
            label="SIM"
            value="simconfig"
            icon={<Settings />}
          />
        )}
      </BottomNavigation>
    </Box>
  );
}; 