import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SimulationConfigContextType {
  isSimulationConfigMode: boolean;
  setSimulationConfigMode: (mode: boolean) => void;
}

const SimulationConfigContext = createContext<SimulationConfigContextType | undefined>(undefined);

export const useSimulationConfigMode = () => {
  const context = useContext(SimulationConfigContext);
  if (context === undefined) {
    throw new Error('useSimulationConfigMode must be used within a SimulationConfigProvider');
  }
  return context;
};

export const SimulationConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isSimulationConfigMode, setIsSimulationConfigMode] = useState(false);

  useEffect(() => {
    // Check URL for simulation config mode parameter
    const searchParams = new URLSearchParams(location.search);
    const modeParam = searchParams.get('mode');
    const isSimConfig = modeParam === 'sim' || modeParam === 'simconfig' || location.pathname.startsWith('/simconfig/') || location.pathname === '/simconfig';
    setIsSimulationConfigMode(isSimConfig);
  }, [location]);

  return (
    <SimulationConfigContext.Provider value={{ isSimulationConfigMode, setSimulationConfigMode: setIsSimulationConfigMode }}>
      {children}
    </SimulationConfigContext.Provider>
  );
}; 