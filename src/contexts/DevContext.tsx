import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface DevContextType {
  isDevMode: boolean;
  setDevMode: (mode: boolean) => void;
}

const DevContext = createContext<DevContextType | undefined>(undefined);

export const useDevMode = () => {
  const context = useContext(DevContext);
  if (context === undefined) {
    throw new Error('useDevMode must be used within a DevProvider');
  }
  return context;
};

export const DevProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    // Check URL for dev mode parameter
    const searchParams = new URLSearchParams(location.search);
    const modeParam = searchParams.get('mode');
    const isDev = modeParam === 'dev' || location.pathname.startsWith('/dev/');
    setIsDevMode(isDev);
  }, [location]);

  return (
    <DevContext.Provider value={{ isDevMode, setDevMode: setIsDevMode }}>
      {children}
    </DevContext.Provider>
  );
}; 