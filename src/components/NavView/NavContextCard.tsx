import React from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import { DirectionsWalk, DirectionsBike, Accessible, Restaurant, LocalCafe, Store, Wc } from '@mui/icons-material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPersonWalking, faArrowUp, faPersonRunning, faPersonBiking, faUtensils, faBeerMugEmpty, faIceCream, faMapPin, faChildReaching } from '@fortawesome/free-solid-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { LocomotionMode } from '../../types/index';

interface NavContextCardProps {
  destination: string;
  trail: string;
  distanceMiles: number;
  description: string;
  mode: LocomotionMode;
  amenities: Array<'food' | 'water' | 'restroom' | 'cafe' | 'store' | 'accessible'>;
  onLocomotionChange?: (mode: LocomotionMode) => void;
}

const modeIconMap = {
  walking: <FontAwesomeIcon icon={faPersonWalking} style={{ fontSize: 35, color: '#7FFF00' }} />,
  running: <FontAwesomeIcon icon={faPersonRunning} style={{ fontSize: 35, color: '#7FFF00' }} />,
  biking: <FontAwesomeIcon icon={faPersonBiking} style={{ fontSize: 35, color: '#7FFF00' }} />,
  accessible: <Accessible sx={{ fontSize: 48, color: '#7FFF00' }} />,
};

const fadedIconMap = {
  walking: [<FontAwesomeIcon icon={faPersonBiking} style={{ fontSize: 32, color: '#888', opacity: 0.3, marginRight: 16 }} key="bike" />, <Accessible sx={{ fontSize: 32, color: '#888', opacity: 0.3, marginLeft: 16 }} key="accessible" />],
  running: [<FontAwesomeIcon icon={faPersonWalking} style={{ fontSize: 32, color: '#888', opacity: 0.3, marginRight: 16 }} key="walk" />, <FontAwesomeIcon icon={faPersonBiking} style={{ fontSize: 32, color: '#888', opacity: 0.3, marginLeft: 16 }} key="bike" />],
  biking: [<FontAwesomeIcon icon={faPersonWalking} style={{ fontSize: 32, color: '#888', opacity: 0.3, marginRight: 16 }} key="walk" />, <Accessible sx={{ fontSize: 32, color: '#888', opacity: 0.3, marginLeft: 16 }} key="accessible" />],
  accessible: [<FontAwesomeIcon icon={faPersonWalking} style={{ fontSize: 32, color: '#888', opacity: 0.3, marginRight: 16 }} key="walk" />, <FontAwesomeIcon icon={faPersonBiking} style={{ fontSize: 32, color: '#888', opacity: 0.3, marginLeft: 16 }} key="bike" />],
};

const amenityIconMap = {
  food: <Restaurant sx={{ fontSize: 28 }} />,
  water: <LocalCafe sx={{ fontSize: 28 }} />,
  restroom: <Wc sx={{ fontSize: 28 }} />,
  cafe: <LocalCafe sx={{ fontSize: 28 }} />,
  store: <Store sx={{ fontSize: 28 }} />,
  accessible: <Accessible sx={{ fontSize: 28 }} />,
};

const CATEGORIES = [
  { slug: 'food', icon: faUtensils, title: 'Food' },
  { slug: 'drink', icon: faBeerMugEmpty, title: 'Drink' },
  { slug: 'ice-cream', icon: faIceCream, title: 'Ice Cream' },
  { slug: 'landmark', icon: faMapPin, title: 'Landmark' },
  { slug: 'playground', icon: faChildReaching, title: 'Playground' }
];

export const NavContextCard: React.FC<NavContextCardProps> = ({
  destination,
  trail,
  distanceMiles,
  description,
  mode,
  amenities,
  onLocomotionChange,
}) => {
  const theme = useTheme();
  return (
    <Paper
      elevation={4}
      sx={{
        borderRadius: 6,
        border: '15px solid #39FF14',
        background: '#fff',
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: 480,
        mx: 'auto',
        position: 'relative',
        height: 300,
        justifyContent: 'center',
      }}
    >
      {/* Heading - two lines */}
      <Box sx={{ width: '100%', mb: 1, mt: 0 }}>
        <Typography variant="subtitle2" sx={{ textAlign: 'center', fontWeight: 700, letterSpacing: 1, fontSize: '0.8rem', color: '#888', whiteSpace: 'nowrap', mb: 0, textTransform: 'uppercase' }}>
          HEADING TOWARDS
        </Typography>
        <Typography variant="subtitle2" sx={{ textAlign: 'center', fontWeight: 700, letterSpacing: 1, fontSize: '0.8rem', whiteSpace: 'nowrap', mt: 0, textTransform: 'uppercase' }}>
          <span style={{ color: '#39FF14', fontWeight: 900 }}>{destination.toUpperCase()}</span>
          <span style={{ color: '#888', fontWeight: 700 }}> ON THE </span>
          <span style={{ color: '#39FF14', fontWeight: 700 }}>{trail.toUpperCase()} TRAIL</span>
        </Typography>
      </Box>

      {/* 3-column grid for main content */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', width: '100%', alignItems: 'center', flex: 1 }}>
        {/* Left: Distance */}
        <Box sx={{ textAlign: 'left', maxWidth: 120, justifySelf: 'start' }}>
          <Typography variant="body2" sx={{ color: '#222', fontWeight: 500 }}>
            YOU ARE
          </Typography>
          <Typography variant="h5" sx={{ color: '#222', fontWeight: 900, lineHeight: 1 }}>
            {distanceMiles.toFixed(1)} MILES
          </Typography>
          <Typography variant="caption" sx={{ color: '#222', fontWeight: 400 }}>
            FROM WHERE YOU STARTED ON THE TRAIL
          </Typography>
        </Box>
        {/* Center: Main circle */}
        <Box
          sx={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: '#222',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            mx: 'auto',
          }}
        >
          {/* Up arrow */}
          <Box sx={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)' }}>
            <FontAwesomeIcon icon={faArrowUp} style={{ fontSize: 38, color: '#39FF14' }} />
          </Box>
          {/* Locomotion icons: active in center, inactive on sides */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', mt: 6 }}>
            {(['walking', 'running', 'biking', 'accessible'] as const).map((m) => {
              const isActive = mode === m;
              return (
                <Box
                  key={m}
                  sx={{
                    mx: 1.5,
                    cursor: onLocomotionChange ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s, font-size 0.2s',
                  }}
                  onClick={() => onLocomotionChange && onLocomotionChange(m)}
                >
                  {m === 'walking' && (
                    <FontAwesomeIcon
                      icon={faPersonWalking}
                      style={{
                        fontSize: isActive ? 38 : 19,
                        color: isActive ? '#39FF14' : '#6B7280',
                        transition: 'color 0.2s, font-size 0.2s',
                      }}
                    />
                  )}
                  {m === 'running' && (
                    <FontAwesomeIcon
                      icon={faPersonRunning}
                      style={{
                        fontSize: isActive ? 38 : 19,
                        color: isActive ? '#39FF14' : '#6B7280',
                        transition: 'color 0.2s, font-size 0.2s',
                      }}
                    />
                  )}
                  {m === 'biking' && (
                    <FontAwesomeIcon
                      icon={faPersonBiking}
                      style={{
                        fontSize: isActive ? 38 : 19,
                        color: isActive ? '#39FF14' : '#6B7280',
                        transition: 'color 0.2s, font-size 0.2s',
                      }}
                    />
                  )}
                  {m === 'accessible' && (
                    <Accessible
                      sx={{
                        fontSize: isActive ? 38 : 19,
                        color: isActive ? '#39FF14' : '#6B7280',
                        transition: 'color 0.2s, font-size 0.2s',
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
          <Typography variant="subtitle2" sx={{ color: '#fff', mt: 1, fontWeight: 700, letterSpacing: 1 }}>
            {mode.toUpperCase()}
          </Typography>
        </Box>
        {/* Right: Description */}
        <Box sx={{ textAlign: 'right', maxWidth: 180, justifySelf: 'end' }}>
          <Typography variant="body2" sx={{ color: '#222', fontWeight: 500, textTransform: 'uppercase' }}>
            {description}
          </Typography>
        </Box>
      </Box>

      {/* Bottom: Amenity icons */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 0.5, width: '100%' }}>
        {CATEGORIES.map((category) => (
          <Box key={category.slug} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesomeIcon icon={category.icon} style={{ fontSize: 18 }} />
          </Box>
        ))}
      </Box>
    </Paper>
  );
}; 