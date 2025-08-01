import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPersonWalking, faArrowUp, faPersonRunning, faPersonBiking } from '@fortawesome/free-solid-svg-icons';

import { LocomotionMode } from '../../types/index';

interface NavContextCardProps {
  destination: string;
  trail: string;
  distanceMiles: number;
  description: string;
  mode: LocomotionMode;
  amenities: Array<'food' | 'water' | 'restroom' | 'cafe' | 'store' | 'accessible'>;
  onLocomotionChange?: (mode: LocomotionMode) => void;
  entryPointDistanceMiles?: number | null;
  preciseNetworkDistanceMiles?: number | null;
  onChangeEntryPoint?: () => void;
  borderColor?: string;
  highlightColor?: string;
  noCardBackground?: boolean;
}

const modeIconMap = {
  walking: faPersonWalking,
  running: faPersonRunning,
  biking: faPersonBiking,
};







export const NavContextCard: React.FC<NavContextCardProps> = ({
  destination,
  trail,
  distanceMiles,
  description,
  mode,
  amenities,
  onLocomotionChange,
  entryPointDistanceMiles,
  preciseNetworkDistanceMiles,
  onChangeEntryPoint,
  borderColor = '#39FF14',
  highlightColor = '#39FF14',
  noCardBackground = false,
}) => {

  return (
    <Paper
      elevation={4}
      sx={{
        borderRadius: noCardBackground ? 0 : 10,
        border: 'none',
        background: noCardBackground ? 'none' : 'rgba(255,255,255,0.97)',
        boxShadow: noCardBackground ? 'none' : '0 4px 16px rgba(0,0,0,0.12)',
        p: { xs: 2, sm: 3 }, // Responsive padding
        mt: 0.5, // Reduce top margin
        mb: 0.5, // Reduce bottom margin
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: '100vw',
        mx: 'auto',
        position: 'relative',
        justifyContent: 'center',
        boxSizing: 'border-box',
        overflowX: 'hidden', // Prevent horizontal overflow
        wordBreak: 'break-word', // Prevent long content overflow
        minWidth: 0, // Allow shrinking
        flexShrink: 1, // Allow shrinking
      }}
    >
      {/* Heading - two lines */}
      <Typography variant="subtitle2" sx={{ textAlign: 'center', fontWeight: 700, letterSpacing: 1, fontSize: '0.8rem', color: '#888', whiteSpace: 'nowrap', mb: 0, textTransform: 'uppercase', width: '100%' }}>
        HEADING TOWARDS
      </Typography>
      <Box sx={{ width: '100%', mb: 1, mt: 0, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', justifyItems: 'center' }}>
        <Box sx={{ justifySelf: 'end', pr: 1 }}>
          <Box sx={{ bgcolor: highlightColor, color: '#fff', px: 2, py: 0.5, borderRadius: 99, fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: 1, display: 'inline-block', whiteSpace: 'nowrap' }}>
            {destination}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Typography component="span" sx={{ color: '#888', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', lineHeight: 1 }}>
            ON
          </Typography>
          <Typography component="span" sx={{ color: '#888', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', lineHeight: 1 }}>
            THE
          </Typography>
        </Box>
        <Box sx={{ justifySelf: 'start', pl: 1 }}>
          <Box sx={{ bgcolor: highlightColor, color: '#fff', px: 2, py: 0.5, borderRadius: 99, fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: 1, display: 'inline-block', whiteSpace: 'nowrap' }}>
            {trail}
          </Box>
        </Box>
      </Box>
      {/* 3-column grid for main content */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', width: '100%', alignItems: 'center', flex: 1 }}>
        {/* Left: Entry Point Distance and Change Button */}
        <Box sx={{ textAlign: 'left', maxWidth: 140, justifySelf: 'start', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          {typeof preciseNetworkDistanceMiles === 'number' ? (
            <>
              <Typography variant="body2" sx={{ color: '#222', fontWeight: 500, mb: 0.5 }}>
                You are {preciseNetworkDistanceMiles.toFixed(2)} miles from where you started on the trail.
              </Typography>
              {onChangeEntryPoint && (
                <Box sx={{ mt: 0.5 }}>
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#e91e63',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontSize: 13,
                      padding: 0,
                      fontWeight: 500
                    }}
                    onClick={onChangeEntryPoint}
                  >
                    Change starting location?
                  </button>
                </Box>
              )}
            </>
          ) : typeof entryPointDistanceMiles === 'number' ? (
            <>
              <Typography variant="body2" sx={{ color: '#222', fontWeight: 500, mb: 0.5 }}>
                You are {entryPointDistanceMiles.toFixed(2)} miles from where you started on the trail.
              </Typography>
              {onChangeEntryPoint && (
                <Box sx={{ mt: 0.5 }}>
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#e91e63',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontSize: 13,
                      padding: 0,
                      fontWeight: 500
                    }}
                    onClick={onChangeEntryPoint}
                  >
                    Change starting location?
                  </button>
                </Box>
              )}
            </>
          ) : null}
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
            border: `4px solid ${highlightColor}`,
          }}
        >
          {/* Up arrow */}
          <Box sx={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)' }}>
            <FontAwesomeIcon icon={faArrowUp} style={{ fontSize: 38, color: highlightColor }} />
          </Box>
          {/* Locomotion icons: active in center, inactive on sides */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', mt: 6, gap: 2 }}>
            {(['walking', 'running', 'biking'] as const).map((m) => {
              const isActive = mode === m;
              return (
                <Box
                  key={m}
                  sx={{
                    cursor: onLocomotionChange ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: isActive ? 32 : 25,
                    height: isActive ? 32 : 25,
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => onLocomotionChange && onLocomotionChange(m)}
                >
                  <FontAwesomeIcon 
                    icon={modeIconMap[m]} 
                    style={{ 
                      fontSize: isActive ? 32 : 25,
                      color: isActive ? highlightColor : '#888',
                      transition: 'all 0.2s ease'
                    }} 
                  />
                </Box>
              );
            })}
          </Box>
          <Typography variant="subtitle2" sx={{ color: '#fff', mt: 1, fontWeight: 700, letterSpacing: 1 }}>
            {mode.toUpperCase()}
          </Typography>
        </Box>
        {/* Right: Elevation description */}
        <Box sx={{ textAlign: 'right', maxWidth: 140, justifySelf: 'end', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <Typography variant="body2" sx={{ color: '#222', fontWeight: 500, mb: 0.5 }}>
            {description}
          </Typography>
        </Box>
      </Box>

      {/* Bottom: Amenity icons */}
      {/* HIDDEN FOR TESTING - will re-enable with category filtering later */}
      {/* <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 0.5, width: '100%' }}>
        {CATEGORIES.map((category) => (
          <Box key={category.slug} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesomeIcon icon={category.icon} style={{ fontSize: 18 }} />
          </Box>
        ))}
      </Box> */}
    </Paper>
  );
}; 