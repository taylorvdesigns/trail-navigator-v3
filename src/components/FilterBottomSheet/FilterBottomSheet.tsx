import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Divider,
  Chip,
  useTheme,
  useMediaQuery,
  Backdrop
} from '@mui/material';
import {
  FilterList as FilterIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { CategoryToggle } from '../CategoryToggle/CategoryToggle';
import { useUser } from '../../contexts/UserContext';

interface FilterBottomSheetProps {
  open: boolean;
  onClose: () => void;
  onToggle: () => void;
  title?: string;
  children?: React.ReactNode;
}

export const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  open,
  onClose,
  onToggle,
  title = "Filters",
  children
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { selectedCategories } = useUser();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300); // Match animation duration
  };

  const drawerHeight = isExpanded ? '60vh' : '200px';

  return (
    <>
      {/* Floating Action Button to open bottom sheet */}
      {!open && (
        <Box
          sx={{
            position: 'fixed',
            bottom: { xs: 'calc(56px + env(safe-area-inset-bottom, 0px) + 26px)', sm: '90px' },
            right: 16,
            zIndex: 1000,
          }}
        >
        <IconButton
          onClick={onToggle}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            width: 56,
            height: 56,
            boxShadow: 3,
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
                  >
            <FilterIcon />
          </IconButton>
        </Box>
      )}

      {/* Custom Bottom Sheet */}
      {open && (
        <>
          {/* Backdrop */}
          <Backdrop
            open={open}
            onClick={handleClose}
            sx={{
              zIndex: 2999,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
          />
          
          {/* Bottom Sheet */}
          <Box
            sx={{
              position: 'fixed',
              bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
              left: '10px',
              right: '10px',
              height: drawerHeight,
              bgcolor: '#242424',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              borderTop: `2px solid ${theme.palette.divider}`,
              zIndex: 3000,
              boxShadow: 3,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              transform: isClosing ? 'translateY(calc(100% + 56px + env(safe-area-inset-bottom, 0px)))' : 'translateY(0)',
              animation: isClosing ? 'none' : 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transition: isClosing ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
              '@keyframes slideUp': {
                '0%': {
                  transform: 'translateY(calc(100% + 56px + env(safe-area-inset-bottom, 0px)))',
                },
                '100%': {
                  transform: 'translateY(0)',
                },
              },
            }}
          >
        {/* Handle and Header */}
        <Box sx={{ p: 2, pb: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 4,
              bgcolor: 'grey.400',
              borderRadius: 2,
              mx: 'auto',
              mb: 1,
              cursor: 'pointer',
            }}
            onClick={handleToggle}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" component="h2">
              {title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton size="small" onClick={handleToggle}>
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <IconButton size="small" onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {/* Category Filters */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
              Filter by Category
            </Typography>
            <CategoryToggle />
            
            {/* Active Filters Summary */}
            {selectedCategories.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Active filters:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedCategories.map(category => (
                    <Chip
                      key={category}
                      label={category}
                      size="small"
                      color="primary"
                      variant="filled"
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'primary.dark'
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {/* Additional Filter Content */}
          {children && (
            <>
              <Divider sx={{ my: 2 }} />
              {children}
            </>
          )}
        </Box>
          </Box>
        </>
      )}
    </>
  );
}; 