import React, { createContext, useState, useEffect } from 'react';
import { TEST_LOCATIONS } from '../config/appSettings';
import { TestLocation } from '../types/index';

export interface LocationContextType {
  currentLocation: [number, number] | null;
  setCurrentLocation: (location: [number, number]) => void;
  isSimulationMode: boolean;
  setSimulationMode: (mode: boolean) => void;
  setTestLocation: (index: number) => void;
  simDirection: 'top' | 'bottom';
  setSimDirection: (dir: 'top' | 'bottom') => void;
  entryPoint: [number, number] | null;
  setEntryPoint: (location: [number, number]) => void;
  clearEntryPoint: () => void;
}

export const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [isSimulationMode, setSimulationMode] = useState(false);
  const [simDirection, setSimDirection] = useState<'top' | 'bottom'>('top');
  const [entryPoint, setEntryPointState] = useState<[number, number] | null>(null);

  // Load entry point from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('entryPoint');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === 2) {
          setEntryPointState(parsed as [number, number]);
        }
      } catch {}
    }
    // Load currentLocation from localStorage on mount
    const storedLoc = localStorage.getItem('currentLocation');
    if (storedLoc) {
      try {
        const parsedLoc = JSON.parse(storedLoc);
        if (Array.isArray(parsedLoc) && parsedLoc.length === 2) {
          setCurrentLocation(parsedLoc as [number, number]);
        }
      } catch {}
    }
  }, []);

  // Persist entry point to localStorage
  useEffect(() => {
    if (entryPoint) {
      localStorage.setItem('entryPoint', JSON.stringify(entryPoint));
    } else {
      localStorage.removeItem('entryPoint');
    }
  }, [entryPoint]);

  // Persist currentLocation to localStorage
  useEffect(() => {
    if (currentLocation) {
      localStorage.setItem('currentLocation', JSON.stringify(currentLocation));
    } else {
      localStorage.removeItem('currentLocation');
    }
  }, [currentLocation]);

  const setEntryPoint = (location: [number, number]) => {
    setEntryPointState(location);
  };

  const clearEntryPoint = () => {
    setEntryPointState(null);
  };

  // Handle real-time GPS tracking when not in simulation mode
  useEffect(() => {
    if (!isSimulationMode) {
      if ("geolocation" in navigator) {
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            setCurrentLocation([position.coords.longitude, position.coords.latitude]);
          },
          (error) => {
            console.error('Error getting location:', error);
            // If location access is denied, prompt to enter simulation mode
            if (error.code === error.PERMISSION_DENIED) {
              setSimulationMode(true);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        );

        return () => {
          navigator.geolocation.clearWatch(watchId);
        };
      } else {
        console.log('Geolocation is not supported by this browser');
        setSimulationMode(true);
      }
    }
  }, [isSimulationMode]);

  // Initialize with first test location when simulation mode is enabled
  useEffect(() => {
    if (isSimulationMode) {
      const firstLocation = TEST_LOCATIONS[0];
      if (firstLocation) {
        // Convert [lat, lng] to [lng, lat] for consistency
        setCurrentLocation([firstLocation.coordinates[1], firstLocation.coordinates[0]]);
      }
    }
  }, [isSimulationMode]);

  const setTestLocation = (index: number) => {
    const location = TEST_LOCATIONS[index];
    if (location) {
      setCurrentLocation([location.coordinates[0], location.coordinates[1]]);
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
        setSimDirection,
        entryPoint,
        setEntryPoint,
        clearEntryPoint
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
