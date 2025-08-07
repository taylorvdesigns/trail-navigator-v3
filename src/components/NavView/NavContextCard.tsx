import React, { useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPersonWalking, faPersonRunning, faBiking, faPersonWalking as faPersonWalkingAccessible } from '@fortawesome/free-solid-svg-icons';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { LocomotionMode } from '../../types/index';

interface NavContextCardProps {
  destination: string;
  trail: string;
  distanceMiles: number;
  description: string;
  mode: any; // LocomotionMode
  amenities: Array<'food' | 'water' | 'restroom' | 'cafe' | 'store' | 'accessible'>;
  onLocomotionChange?: (mode: any) => void;
  entryPointDistanceMiles?: number | null;
  preciseNetworkDistanceMiles?: number | null;
  onChangeEntryPoint?: () => void;
  borderColor?: string;
  highlightColor?: string;
  noCardBackground?: boolean;
}

/**
 * NavContextCard Component (Formerly V3)
 * 
 * Design: Quadrant-based layout with clean grid structure
 * Features:
 * - Left column: YOU ARE HERE pill + locomotion icon + mode text
 * - Right column: 2x2 grid with directional arrow + info quadrants
 * - Clean typography with all uppercase text
 * - Green accent color for highlights and pills
 * - No decorative elements (unlike V2)
 */
export const NavContextCard: React.FC<NavContextCardProps> = ({
  destination,
  trail,
  distanceMiles,
  mode,
  onLocomotionChange,
  borderColor,
  preciseNetworkDistanceMiles,
  entryPointDistanceMiles
}) => {
  const [isLocomotionModalOpen, setIsLocomotionModalOpen] = useState(false);

  // Map locomotion modes to icons
  const modeIconMap = {
    walking: faPersonWalking,
    running: faPersonRunning,
    biking: faBiking,
    accessible: faPersonWalkingAccessible,
  };

  /**
   * Get distance value with fallback hierarchy:
   * 1. Precise network distance (most accurate)
   * 2. Entry point distance (legacy calculation)
   * 3. User's trail distance (fallback)
   */
  const distanceValue = typeof preciseNetworkDistanceMiles === 'number' 
    ? preciseNetworkDistanceMiles 
    : typeof entryPointDistanceMiles === 'number' 
    ? entryPointDistanceMiles 
    : distanceMiles; // fallback to user's trail distance

  // Dynamic accent color based on trail color (fallback to green)
  const highlightColor = borderColor || '#4CAF50';

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 0,
          border: 'none',
          background: 'none',
          boxShadow: 'none',
          px: { xs: 1, sm: 2 },
          pb: 0,
          pt: 0,
          mt: 0,
          mb: 0,
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
        {/* Left Column */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          minWidth: 120,
          flexShrink: 0,
          position: 'relative',
          py: 2,
        }}>
          {/* AHEAD OF YOU Pill */}
          <Box sx={{
            backgroundColor: '#666',
            color: '#242424',
            px: 2,
            py: 0.5,
            borderRadius: 99,
            fontWeight: 700,
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            whiteSpace: 'nowrap',
            lineHeight: 1,
            textAlign: 'center',
            width: '100%',
          }}>
            AHEAD OF YOU
          </Box>

          {/* Center Content */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            my: 1,
          }}>
            {/* Locomotion Icon */}
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
                flexShrink: 0,
                cursor: 'pointer',
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  opacity: 0.9,
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
              onClick={() => setIsLocomotionModalOpen(true)}
            >
              <FontAwesomeIcon
                icon={modeIconMap[mode as keyof typeof modeIconMap]}
                style={{
                  fontSize: 30,
                  color: '#fff'
                }}
              />
            </Box>

            {/* Locomotion Text */}
            <Typography sx={{
              color: '#fff',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              fontWeight: 600,
              letterSpacing: 0.5,
              textAlign: 'center',
            }}>
              {mode.toUpperCase()}
            </Typography>
          </Box>

          {/* BEHIND YOU Pill */}
          <Box sx={{
            backgroundColor: '#666',
            color: '#242424',
            px: 2,
            py: 0.5,
            borderRadius: 99,
            fontWeight: 700,
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            whiteSpace: 'nowrap',
            lineHeight: 1,
            textAlign: 'center',
            width: '100%',
          }}>
            BEHIND YOU
          </Box>
        </Box>

        {/* Right Column - Quadrant Grid */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
          position: 'relative',
          justifyContent: 'center',
        }}>
          {/* Grid Container */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: 0,
            minHeight: 140,
            position: 'relative',
          }}>
            {/* Top-Left Quadrant - Directional Arrow */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid #666',
              borderBottom: '1px solid #666',
              position: 'relative',
            }}>
              <FontAwesomeIcon
                icon={faArrowUp}
                style={{
                  fontSize: 40,
                  color: highlightColor,
                }}
              />
            </Box>

            {/* Top-Right Quadrant - Distance from Start */}
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid #666',
              p: 1,
            }}>
              <Typography sx={{
                color: '#fff',
                fontSize: '0.6rem',
                textTransform: 'uppercase',
                fontWeight: 600,
                letterSpacing: 0.3,
                textAlign: 'center',
                mb: 0.5,
              }}>
                DISTANCE FROM START
              </Typography>
              <Box sx={{
                backgroundColor: highlightColor,
                color: '#242424',
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
            </Box>

            {/* Bottom-Left Quadrant - Heading Towards */}
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid #666',
              p: 1,
            }}>
              <Typography sx={{
                color: '#fff',
                fontSize: '0.6rem',
                textTransform: 'uppercase',
                fontWeight: 600,
                letterSpacing: 0.3,
                textAlign: 'center',
                mb: 0.5,
              }}>
                HEADING TOWARDS
              </Typography>
              <Box sx={{
                backgroundColor: highlightColor,
                color: '#242424',
                px: 1.5,
                py: 0.25,
                borderRadius: 99,
                fontWeight: 700,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                textAlign: 'center',
              }}>
                {destination}
              </Box>
            </Box>

            {/* Bottom-Right Quadrant - Current Trail */}
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 1,
            }}>
              <Typography sx={{
                color: '#fff',
                fontSize: '0.6rem',
                textTransform: 'uppercase',
                fontWeight: 600,
                letterSpacing: 0.3,
                textAlign: 'center',
                mb: 0.5,
              }}>
                CURRENT TRAIL
              </Typography>
              <Box sx={{
                backgroundColor: highlightColor,
                color: '#242424',
                px: 1.5,
                py: 0.25,
                borderRadius: 99,
                fontWeight: 700,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: 0.3,
              }}>
                {trail}
              </Box>
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
          onClick={() => setIsLocomotionModalOpen(false)}
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
            onClick={(e) => e.stopPropagation()}
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