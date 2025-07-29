import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { usePOIs } from '../../hooks/usePOIs';
import { useUser } from '../../contexts/UserContext';
import { extractUniqueCategories } from '../../utils/poi';
import { getCategoryIcon } from '../../utils/categoryIcons';

export const CategoryToggle: React.FC = () => {
  const { pois } = usePOIs();
  const { selectedCategories, toggleCategory } = useUser();
  
  const categories = React.useMemo(() => {
    return extractUniqueCategories(pois);
  }, [pois]);

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
      >
        {categories.map((category) => (
          <ToggleButton
            key={category}
            value={category}
            aria-label={category}
            sx={{
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              },
              '&:not(.Mui-selected)': {
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }
            }}
          >
            {getCategoryIcon(category, 20)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}; 