import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { TEST_LOCATIONS } from '../config/appSettings';

export interface LocationContextType {
  currentLocation: [number, number] | null;
  previousLocation: [number, number] | null;
  setCurrentLocation: (location: [number, number]) => void;
  isSimulationMode: boolean;
  setSimulationMode: (mode: boolean) => void;
  setTestLocation: (index: number) => void;
  simDirection: 'top' | 'bottom';
  setSimDirection: (dir: 'top' | 'bottom') => void;
  entryPoint: [number, number] | null;
  setEntryPoint: (location: [number, number]) => void;
  clearEntryPoint: () => void;
  isSimPlaying: boolean;
  setIsSimPlaying: (playing: boolean) => void;
  simSpeedMultiplier: number;
  setSimSpeedMultiplier: (speed: number) => void;
  simIndex: number | null;
  setSimIndex: (index: number | null) => void;
  setSimTrailPoints: (points: any[]) => void;
  simAnimatedLocation: [number, number] | null;
  simLoop: boolean;
  setSimLoop: (loop: boolean) => void;
}

export const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [previousLocation, setPreviousLocation] = useState<[number, number] | null>(null);
  const [isSimulationMode, setSimulationMode] = useState(false);
  const [simDirection, setSimDirection] = useState<'top' | 'bottom'>('top');
  const [entryPoint, setEntryPoint] = useState<[number, number] | null>(null);
  const [isSimPlaying, setIsSimPlaying] = useState(false);
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState(1);
  const [simIndex, setSimIndex] = useState<number | null>(null);
  const [simTrailPoints, setSimTrailPoints] = useState<any[]>([]);
  const [simAnimatedLocation, setSimAnimatedLocation] = useState<[number, number] | null>(null);
  const [simLoop, setSimLoop] = useState(false);
  
  // Simple simulation timer ref
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update previous location when current location changes
  useEffect(() => {
    if (currentLocation) {
      setPreviousLocation(currentLocation);
    }
  }, [currentLocation]);

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

  // Set default test location when simulation mode is enabled
  useEffect(() => {
    if (isSimulationMode && !currentLocation) {
      const defaultIndex = 1; // 'Between Downtown and Unity'
      const defaultLocation = TEST_LOCATIONS[defaultIndex];
      if (defaultLocation) {
        setCurrentLocation([defaultLocation.coordinates[1], defaultLocation.coordinates[0]]);
      }
    }
  }, [isSimulationMode, currentLocation]);

  const setTestLocation = (index: number) => {
    const location = TEST_LOCATIONS[index];
    if (location) {
      setCurrentLocation([location.coordinates[1], location.coordinates[0]]);
    }
  };

  const clearEntryPoint = () => {
    setEntryPoint(null);
  };

  // Simple simulation logic
  useEffect(() => {
    // Clear any existing timer
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }

    // Don't start simulation if not playing or no trail points
    if (!isSimPlaying || !simTrailPoints.length || simIndex === null) {
      return;
    }

    console.log('[Simulation] Starting simple simulation:', {
      isSimPlaying,
      trailPointsLength: simTrailPoints.length,
      simIndex,
      simLoop,
      simSpeedMultiplier
    });

    // Calculate interval based on speed (faster speed = shorter interval)
    const intervalMs = 1000 / simSpeedMultiplier;
    let currentIdx = simIndex;

    const step = () => {
      // Calculate next index based on direction
      let nextIdx = simDirection === 'top' ? currentIdx + 1 : currentIdx - 1;

      // Handle reaching trail boundaries
      if (nextIdx < 0 || nextIdx >= simTrailPoints.length) {
        if (simLoop) {
          // Loop back to the beginning/end
          nextIdx = simDirection === 'top' ? 0 : simTrailPoints.length - 1;
          console.log('[Simulation] Looping back to index:', nextIdx);
        } else {
          // Stop simulation
          console.log('[Simulation] Reached end of trail, stopping');
          setIsSimPlaying(false);
          return;
        }
      }

      // Update current index and location
      currentIdx = nextIdx;
      const point = simTrailPoints[currentIdx];
      
      if (point) {
        // Update both current location and animated location
        const newLocation: [number, number] = [point.longitude, point.latitude];
        setCurrentLocation(newLocation);
        setSimAnimatedLocation([point.latitude, point.longitude]);
        setSimIndex(currentIdx);
      }
    };

    // Start the simulation timer
    simTimerRef.current = setInterval(step, intervalMs);

    // Cleanup function
    return () => {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
        simTimerRef.current = null;
      }
    };
  }, [isSimPlaying, simTrailPoints, simIndex, simDirection, simSpeedMultiplier, simLoop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
      }
    };
  }, []);

  return (
    <LocationContext.Provider 
      value={{ 
        currentLocation, 
        previousLocation,
        setCurrentLocation,
        isSimulationMode,
        setSimulationMode,
        setTestLocation,
        simDirection,
        setSimDirection,
        entryPoint,
        setEntryPoint,
        clearEntryPoint,
        isSimPlaying,
        setIsSimPlaying,
        simSpeedMultiplier,
        setSimSpeedMultiplier,
        simIndex,
        setSimIndex,
        setSimTrailPoints,
        simAnimatedLocation,
        simLoop,
        setSimLoop
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
