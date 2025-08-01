import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useUser } from '../../contexts/UserContext';
import { useCategories } from '../../hooks/useCategories';
import { parseFontAwesomeIcon } from '../../utils/fontAwesomeParser';

export const CategoryToggle: React.FC = () => {
  const { selectedCategories, toggleCategory } = useUser();
  const { categories: wpCategories, loading } = useCategories();

  const handleCategoryChange = (
    event: React.MouseEvent<HTMLElement>,
    newCategories: string[]
  ) => {
    // Find which category was toggled by comparing the new selection with the current selection
    const currentCategories = new Set(selectedCategories);
    const newCategoriesSet = new Set(newCategories);
    
    // Find the category that was added or removed
    let toggledCategory: string | null = null;
    
    // Check if a category was added
    for (const category of newCategories) {
      if (!currentCategories.has(category)) {
        toggledCategory = category;
        break;
      }
    }
    
    // Check if a category was removed
    if (!toggledCategory) {
      for (const category of selectedCategories) {
        if (!newCategoriesSet.has(category)) {
          toggledCategory = category;
          break;
        }
      }
    }
    
    if (toggledCategory) {
      toggleCategory(toggledCategory);
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        bgcolor: 'background.paper',
        borderRadius: 1,
        p: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 40,
        '@keyframes pulse': {
          '0%, 100%': {
            opacity: 0.4,
          },
          '50%': {
            opacity: 1,
          },
        },
      }}>
        <Box sx={{ 
          display: 'flex', 
          gap: 1,
          opacity: 0.6
        }}>
          {[1, 2, 3, 4].map((i) => (
            <Box
              key={i}
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                bgcolor: 'grey.300',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}
            />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      bgcolor: 'background.paper',
      borderRadius: 1,
      p: 1
    }}>
      <ToggleButtonGroup
        value={selectedCategories}
        onChange={handleCategoryChange}
        aria-label="category filter"
        size="small"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          '& .MuiToggleButton-root': {
            flex: '0 0 auto',
            minWidth: 'fit-content'
          }
        }}
      >
        {wpCategories.map((category) => {
          const iconComponent = parseFontAwesomeIcon(category.fa_icon);
          
          return (
            <ToggleButton
              key={category.slug}
              value={category.name}
              aria-label={category.name}
              sx={{
                borderRadius: '4px !important', // 2px rounded corners (4px = 2px in Material-UI)
                border: 'none !important',
                '&.Mui-selected': {
                  bgcolor: 'white',
                  color: '#63686e',
                  '&:hover': {
                    bgcolor: '#f5f5f5'
                  },
                  '& .MuiSvgIcon-root, & svg': {
                    color: '#63686e !important'
                  }
                },
                '&:not(.Mui-selected)': {
                  bgcolor: '#63686e',
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#7a7f85'
                  },
                  '& .MuiSvgIcon-root, & svg': {
                    color: 'white !important'
                  }
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FontAwesomeIcon 
                  icon={iconComponent} 
                  style={{ 
                    fontSize: 16
                  }} 
                />
                <span style={{ fontSize: '12px', fontWeight: 500 }}>
                  {category.name}
                </span>
              </Box>
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>
    </Box>
  );
}; 