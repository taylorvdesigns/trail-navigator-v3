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
    if (newCategories.length > 0) {
      // If a new category is selected, toggle it
      const lastSelected = newCategories[newCategories.length - 1];
      toggleCategory(lastSelected);
    }
  };

  return (
    <Box sx={{ 
      position: 'absolute', 
      top: 16, 
      right: 16, 
      zIndex: 1000,
      bgcolor: 'white',
      borderRadius: 1,
      boxShadow: 1,
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
          >
            {getCategoryIcon(category, 20)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}; 