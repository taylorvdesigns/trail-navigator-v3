import React, { useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPersonWalking, faArrowUp, faPersonRunning, faPersonBiking } from '@fortawesome/free-solid-svg-icons';

import { LocomotionMode } from '../../types/index';

interface NavContextCardV2Props {
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
  accessible: faPersonWalking, // Use walking icon for accessible mode
};

// SVG component for sawtooth zigzag decorative lines
const ZigzagLine: React.FC<{ width?: number; height?: number; color?: string }> = ({ 
  width = 200, 
  height = 8, 
  color = '#fff' 
}) => {
  // Create a more dramatic sawtooth pattern with larger amplitude
  const segments = 16; // More segments for closer zigzags
  const segmentWidth = width / segments;
  const points = [];
  
  for (let i = 0; i <= segments; i++) {
    const x = i * segmentWidth;
    // Create more dramatic peaks - alternate between very top and very bottom
    const y = i % 2 === 0 ? 1 : height - 1; // Use 1 and height-1 for sharper peaks
    points.push(`${x},${y}`);
  }
  
  const pathData = `M ${points.join(' L ')}`;
  
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <path
        d={pathData}
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
};

export const NavContextCardV2: React.FC<NavContextCardV2Props> = ({
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
  // State for locomotion modal
  const [isLocomotionModalOpen, setIsLocomotionModalOpen] = useState(false);

  // Get distance value (prefer precise network distance, fallback to entry point distance)
  const distanceValue = typeof preciseNetworkDistanceMiles === 'number' 
    ? preciseNetworkDistanceMiles 
    : typeof entryPointDistanceMiles === 'number' 
    ? entryPointDistanceMiles 
    : null;

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 0,  // Remove rounded corners
          border: 'none',
          background: 'none',  // Remove background color - make transparent
          boxShadow: 'none',
          px: { xs: 1, sm: 2 },  // Keep horizontal padding
          pb: 0,  // Remove bottom padding
          pt: 0,  // Remove all top padding
          mt: 0,  // No top margin
          mb: 0,  // Remove bottom margin
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          width: '100%',
          maxWidth: '100vw',
          mx: 'auto',
          position: 'relative',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          overflowX: 'hidden',
          wordBreak: 'break-word',
          minWidth: 0,
          flexShrink: 1,
          gap: 2,
        }}
      >
        {/* Left Section - Locomotion & Direction Indicator */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          minWidth: 120,
          position: 'relative',
          py: 0.5,  // Reduced vertical padding
          // height: 200, // Removed fixed height for flexibility
        }}>
          {/* AHEAD OF YOU pill */}
          <Box sx={{
            backgroundColor: highlightColor,
            color: '#242424',
            px: 2,
            py: 0.5,
            borderRadius: 99,
            fontWeight: 700,
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            zIndex: 2,
            position: 'relative'
          }}>
            AHEAD OF YOU
          </Box>

          {/* Up arrow - now green */}
          <Box sx={{ 
            position: 'relative', 
            zIndex: 2,
            my: 1
          }}>
            <FontAwesomeIcon 
              icon={faArrowUp} 
              style={{ 
                fontSize: 24, 
                color: highlightColor // Changed to green
              }} 
            />
          </Box>

          {/* Locomotion icon circle - perfect circle with white stroke */}
          <Box 
            sx={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: '#e91e63', // Pink color
              border: '3px solid #fff', // White stroke
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 2,
              my: 1,
              flexShrink: 0, // Prevent oval shape
              cursor: 'pointer', // Add pointer cursor
              transition: 'transform 0.2s ease, opacity 0.2s ease', // Add hover effects
              '&:hover': {
                transform: 'scale(1.05)',
                opacity: 0.9,
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
            }}
            onClick={() => setIsLocomotionModalOpen(true)} // Open modal on click
          >
            <FontAwesomeIcon 
              icon={modeIconMap[mode]} 
              style={{ 
                fontSize: 30, 
                color: '#fff' 
              }} 
            />
          </Box>

          {/* WALKING text - better spacing */}
          <Typography variant="subtitle2" sx={{ 
            color: '#fff', 
            fontWeight: 700, 
            letterSpacing: 1,
            textTransform: 'uppercase',
            zIndex: 2,
            position: 'relative',
            mb: 1 // Add margin to prevent overlap
          }}>
            {mode.toUpperCase()}
          </Typography>

          {/* BEHIND YOU pill */}
          <Box sx={{
            backgroundColor: highlightColor,
            color: '#242424',
            px: 2,
            py: 0.5,
            borderRadius: 99,
            fontWeight: 700,
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            zIndex: 2,
            position: 'relative'
          }}>
            BEHIND YOU
          </Box>
        </Box>

        {/* Right Section - Heading & Location Information */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1,
          justifyContent: 'space-between',
          position: 'relative',
          // height: 200, // Removed fixed height for flexibility
        }}>
          {/* Top Sub-Section - Heading Towards */}
          <Box sx={{ mb: 2 }}>
            {/* Top zigzag line */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, mt: 0, pt: '11px', pb: '5px' }}>
              <ZigzagLine width={220} height={10} color="#63686e" />
            </Box>

            {/* YOU ARE HEADING TOWARDS - single line */}
            <Typography variant="body2" sx={{ 
              color: '#fff', 
              fontSize: '0.7rem',
              mb: 1,
              textTransform: 'uppercase',
              textAlign: 'center'
            }}>
              YOU ARE HEADING TOWARDS
            </Typography>

            {/* Destination and Trail pills in a row */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
              <Box sx={{
                backgroundColor: highlightColor,
                color: '#242424',  // Changed from '#fff' to background color
                px: 2,
                py: 0.5,
                borderRadius: 99,
                fontWeight: 700,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                textAlign: 'center',  // Center the text
              }}>
                {destination}
              </Box>
              <Typography variant="body2" sx={{ 
                color: '#fff', 
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                textAlign: 'center',  // Center the text
              }}>
                ON THE
              </Typography>
              <Box sx={{
                backgroundColor: highlightColor,
                color: '#242424',  // Changed from '#fff' to background color
                px: 2,
                py: 0.5,
                borderRadius: 99,
                fontWeight: 700,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                textAlign: 'center',  // Center the text
              }}>
                {trail}
              </Box>
            </Box>
          </Box>

          {/* YOU ARE HERE pill */}
          <Box sx={{ 
            display: 'flex', 
            mb: 2 
          }}>
            <Box sx={{
              backgroundColor: '#fff',
              color: '#000',
              px: 2,
              py: 1,  // Increased from 0.5 to 1 for more padding
              borderRadius: 99,
              fontWeight: 700,
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              whiteSpace: 'nowrap',
              lineHeight: 1,
              width: '100%',
              textAlign: 'center',
            }}>
              YOU ARE HERE
            </Box>
          </Box>

          {/* Bottom Sub-Section - Current Location & Distance */}
          <Box sx={{ position: 'relative' }}>
            {/* Distance information */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              mt: 2
            }}>
              {distanceValue !== null && (
                <>
                  <Box sx={{
                    backgroundColor: highlightColor,
                    color: '#242424',  // Changed from '#fff' to background color
                    px: 1.5,
                    py: 0.25,
                    borderRadius: 99,
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: 0.3,
                  }}>
                    {distanceValue.toFixed(1)} mi
                  </Box>
                  <Typography variant="body2" sx={{ 
                    color: '#fff', 
                    fontSize: '0.7rem',
                    textTransform: 'uppercase'
                  }}>
                    FROM STARTING POINT
                  </Typography>
                </>
              )}
            </Box>

            {/* Bottom zigzag line */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, pb: '11px' }}>
              <ZigzagLine width={220} height={10} color="#63686e" />
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Locomotion Selection Modal */}
      {isLocomotionModalOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setIsLocomotionModalOpen(false)} // Close modal when clicking backdrop
        >
          <Box
            sx={{
              backgroundColor: '#242424',
              borderRadius: 2,
              padding: 3,
              maxWidth: 300,
              width: '90%',
              textAlign: 'center',
              border: `2px solid ${highlightColor}`,
            }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
          >
            <Typography variant="h6" sx={{ color: '#fff', mb: 3, fontWeight: 700 }}>
              Select Transportation Mode
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.entries(modeIconMap).map(([modeKey, icon]) => (
                <Box
                  key={modeKey}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    padding: 2,
                    borderRadius: 1,
                    backgroundColor: mode === modeKey ? highlightColor : 'transparent',
                    border: `2px solid ${mode === modeKey ? highlightColor : '#666'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: mode === modeKey ? highlightColor : 'rgba(255, 255, 255, 0.1)',
                      borderColor: highlightColor,
                    },
                  }}
                  onClick={() => {
                    if (onLocomotionChange) {
                      onLocomotionChange(modeKey as LocomotionMode);
                    }
                    setIsLocomotionModalOpen(false);
                  }}
                >
                  <FontAwesomeIcon 
                    icon={icon} 
                    style={{ 
                      fontSize: 24, 
                      color: mode === modeKey ? '#242424' : '#fff' 
                    }} 
                  />
                  <Typography 
                    sx={{ 
                      color: mode === modeKey ? '#242424' : '#fff',
                      fontWeight: mode === modeKey ? 700 : 500,
                      textTransform: 'capitalize',
                    }}
                  >
                    {modeKey}
                  </Typography>
                </Box>
              ))}
            </Box>
            
            <Box
              sx={{
                marginTop: 3,
                padding: 1.5,
                borderRadius: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
              }}
              onClick={() => setIsLocomotionModalOpen(false)}
            >
              <Typography sx={{ color: '#fff', fontWeight: 500 }}>
                Cancel
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
}; 