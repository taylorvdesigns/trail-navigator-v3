import React, { createContext, useContext, useState } from 'react';
import { LocomotionMode } from '../types';

interface UserContextType {
  locomotionMode: LocomotionMode;
  setLocomotionMode: (mode: LocomotionMode) => void;
  selectedCategories: string[];
  toggleCategory: (category: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locomotionMode, setLocomotionMode] = useState<LocomotionMode>('walking');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(cat => cat !== category)
        : [...prev, category]
    );
  };

  return (
    <UserContext.Provider 
      value={{ 
        locomotionMode, 
        setLocomotionMode,
        selectedCategories,
        toggleCategory
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
