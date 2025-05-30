import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';

interface TabBarProps {
  value: number;
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
  tabs: Array<{
    label: string;
    icon?: React.ReactElement;
  }>;
}

export const TabBar: React.FC<TabBarProps> = ({ value, onChange, tabs }) => {
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs
        value={value}
        onChange={onChange}
        variant="fullWidth"
        indicatorColor="primary"
        textColor="primary"
      >
        {tabs.map((tab, index) => (
          <Tab
            key={index}
            label={tab.label}
            icon={tab.icon}
            iconPosition="start"
          />
        ))}
      </Tabs>
    </Box>
  );
};
