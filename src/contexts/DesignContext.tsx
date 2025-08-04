import React, { createContext, useContext, useState } from 'react';

type MiddleCardVariant = 'default' | 'v2';

interface DesignContextType {
  middleCardVariant: MiddleCardVariant;
  setMiddleCardVariant: (variant: MiddleCardVariant) => void;
}

const DesignContext = createContext<DesignContextType | undefined>(undefined);

export const DesignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [middleCardVariant, setMiddleCardVariant] = useState<MiddleCardVariant>('default');

  return (
    <DesignContext.Provider value={{ middleCardVariant, setMiddleCardVariant }}>
      {children}
    </DesignContext.Provider>
  );
};

export const useDesign = () => {
  const context = useContext(DesignContext);
  if (context === undefined) {
    throw new Error('useDesign must be used within a DesignProvider');
  }
  return context;
}; 