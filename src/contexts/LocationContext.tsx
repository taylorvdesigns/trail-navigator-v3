import React, { createContext, useState, useEffect } from 'react';
import { TEST_LOCATIONS } from '../config/appSettings';
import { TestLocation } from '../types/index';

interface LocationContextType {
  currentLocation: [number, number] | null;
  setCurrentLocation: (location: [number, number]) => void;
  isSimulationMode: boolean;
  setSimulationMode: (mode: boolean) => void;
  setTestLocation: (index: number) => void;
  simDirection: 'top' | 'bottom';
  setSimDirection: (dir: 'top' | 'bottom') => void;
}

export const LocationContext = createContext<LocationContextType | null>(null);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [isSimulationMode, setSimulationMode] = useState(false);
  const [simDirection, setSimDirection] = useState<'top' | 'bottom'>('top');

  // Initialize with first test location when simulation mode is enabled
  useEffect(() => {
    if (isSimulationMode) {
      const firstLocation = TEST_LOCATIONS[0];
      if (firstLocation) {
        setCurrentLocation(firstLocation.coordinates);
      }
    } else {
      // Reset location when simulation mode is disabled
      setCurrentLocation(null);
    }
  }, [isSimulationMode]);

  const setTestLocation = (index: number) => {
    if (isSimulationMode && TEST_LOCATIONS[index]) {
      const location = TEST_LOCATIONS[index];
      setCurrentLocation(location.coordinates);
    }
  };

  return (
    <LocationContext.Provider
      value={{
        currentLocation,
        setCurrentLocation,
        isSimulationMode,
        setSimulationMode,
        setTestLocation,
        simDirection,
        setSimDirection
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
