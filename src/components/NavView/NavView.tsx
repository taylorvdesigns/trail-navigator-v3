import React from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemText, Divider, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { LocomotionMode, POI, TrailConfig } from '../../types';
import { 
  DirectionsWalk, 
  DirectionsRun, 
  DirectionsBike, 
  Place as PlaceIcon,
  Restaurant,
  LocalCafe,
  Store,
  Park,
  WaterDrop,
  Wc,
  NavigationOutlined
} from '@mui/icons-material';
import { useTrailData } from '../../hooks/useTrailData';
import { sortPOIsByLocation } from '../../utils/trail';
import { useLocation } from '../../hooks/useLocation';
import { metersToMiles } from '../../utils/distance';

// Standard list row (full-width)
const StandardRow = styled(Box)(({ theme }) => ({
  height: 30,
  padding: theme.spacing(1),
  '& .MuiTypography-root': {
    fontSize: 14,
    lineHeight: 1.2
  }
}));

// Split view row (for branches)
const SplitRow = styled(Box)(({ theme }) => ({
  height: 40,
  padding: theme.spacing(1),
  '& .MuiTypography-root': {
    fontSize: 11,
    lineHeight: 1.2
  }
}));

const TimelineContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: '100%',
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 24,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: theme.palette.divider
  }
}));

const TimelineItem = styled(Box)(({ theme }) => ({
  position: 'relative',
  paddingLeft: 48,
  marginBottom: theme.spacing(1),
  minHeight: 44, // Minimum touch target size
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 20,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: 'currentColor'
  }
}));

const ContextCard = styled(Paper)(({ theme }) => ({
  borderRadius: 32,
  background: '#fff',
  padding: theme.spacing(3),
  margin: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  position: 'relative',
  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: 'currentColor',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32
  }
}));

const CircularMode = styled(Box)(({ theme }) => ({
  width: 160,
  height: 160,
  borderRadius: '50%',
  backgroundColor: '#2C2C2C',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  margin: theme.spacing(3),
  position: 'relative'
}));

const CategoryToggle = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(3),
  marginTop: theme.spacing(2),
  '& .MuiSvgIcon-root': {
    fontSize: 32,
    color: theme.palette.text.secondary,
    cursor: 'pointer',
    '&:hover': {
      color: theme.palette.primary.main
    }
  }
}));

const DestinationSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  flex: 1,
  overflow: 'auto',
  '& .MuiTypography-h6': {
    fontSize: '0.875rem',
    fontWeight: 600,
    letterSpacing: 1,
    marginBottom: theme.spacing(2),
    color: theme.palette.text.secondary
  }
}));

const TimeDisplay = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'baseline',
  minWidth: 60,
  '& .distance': {
    fontSize: '1rem',
    fontWeight: 600,
    marginRight: theme.spacing(0.5)
  },
  '& .time': {
    fontSize: '0.875rem',
    color: theme.palette.text.secondary
  }
}));

const AmenityIcon = styled(Box)(({ theme }) => ({
  minWidth: 44, // Minimum touch target size
  minHeight: 44, // Minimum touch target size
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '& .MuiSvgIcon-root': {
    fontSize: 24,
    color: theme.palette.text.secondary
  }
}));

interface NavViewProps {
  trailConfig: TrailConfig;
  onLocomotionChange: (mode: LocomotionMode) => void;
  locomotionMode: LocomotionMode;
}

export const NavView: React.FC<NavViewProps> = ({
  trailConfig,
  onLocomotionChange,
  locomotionMode
}) => {
  const { data: trailData } = useTrailData(trailConfig.routeId);
  const { currentLocation } = useLocation();

  const getLocomotionIcon = (mode: LocomotionMode) => {
    switch (mode) {
      case 'walking':
        return <DirectionsWalk />;
      case 'running':
        return <DirectionsRun />;
      case 'biking':
        return <DirectionsBike />;
    }
  };

  if (!trailData || !currentLocation) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading trail data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6">{trailConfig.name}</Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          {(['walking', 'running', 'biking'] as LocomotionMode[]).map((mode) => (
            <IconButton
              key={mode}
              onClick={() => onLocomotionChange(mode)}
              color={locomotionMode === mode ? 'primary' : 'default'}
            >
              {getLocomotionIcon(mode)}
            </IconButton>
          ))}
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">Current Progress</Typography>
        <Typography>
          {metersToMiles(trailData.distance || 0).toFixed(1)} miles total
        </Typography>
      </Box>
    </Box>
  );
};
