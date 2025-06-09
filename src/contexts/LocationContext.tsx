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
  isSimPlaying: boolean;
  setIsSimPlaying: (playing: boolean) => void;
  simSpeedMultiplier: number;
  setSimSpeedMultiplier: (speed: number) => void;
  simIndex: number | null;
  setSimIndex: (index: number | null) => void;
  setSimTrailPoints: (points: any[]) => void;
  simAnimatedLocation: [number, number] | null;
}

export const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [isSimulationMode, setSimulationMode] = useState(false);
  const [simDirection, setSimDirection] = useState<'top' | 'bottom'>('top');
  const [entryPoint, setEntryPointState] = useState<[number, number] | null>(null);
  const [isSimPlaying, setIsSimPlaying] = useState(false);
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState(4);
  const [simIndex, setSimIndex] = useState<number | null>(null);
  const [simTimer, setSimTimer] = useState<NodeJS.Timeout | null>(null);
  const [simTrailPoints, setSimTrailPoints] = useState<any[]>([]);
  const [simAnimatedLocation, setSimAnimatedLocation] = useState<[number, number] | null>(null);

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

  // Always set first test location when simulation mode is enabled
  useEffect(() => {
    if (isSimulationMode) {
      const firstLocation = TEST_LOCATIONS[0];
      if (firstLocation) {
        setCurrentLocation([firstLocation.coordinates[0], firstLocation.coordinates[1]]);
      }
    }
  }, [isSimulationMode]);

  const setTestLocation = (index: number) => {
    const location = TEST_LOCATIONS[index];
    if (location) {
      setCurrentLocation([location.coordinates[0], location.coordinates[1]]);
    }
  };

  // Clean up simulation timer on unmount
  useEffect(() => {
    return () => {
      if (simTimer) clearInterval(simTimer);
    };
  }, [simTimer]);

  // Simulation movement logic (runs regardless of view)
  useEffect(() => {
    if (!isSimPlaying || !simTrailPoints.length || simIndex == null) return;
    const BASE_SPEEDS = {
      walking: 1.4,
      running: 3.0,
      biking: 4.5,
      accessible: 1.0
    };
    // TODO: Get locomotionMode from context or pass as prop
    const locomotionMode = 'walking'; // fallback, should be settable
    const baseSpeed = BASE_SPEEDS[locomotionMode] || 1.4;
    const speed = baseSpeed * simSpeedMultiplier;
    const intervalMs = 1000 / simSpeedMultiplier;
    let idx = simIndex;
    function step() {
      let nextIdx = simDirection === 'top' ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= simTrailPoints.length) {
        setIsSimPlaying(false);
        return;
      }
      idx = nextIdx;
      setSimIndex(idx);
      const pt = simTrailPoints[idx];
      if (pt) {
        console.log('[SimLocomotion] index:', idx, 'coords:', [pt.latitude, pt.longitude], 'playing:', isSimPlaying);
        setCurrentLocation([pt.latitude, pt.longitude]);
      }
    }
    const timer = setInterval(step, intervalMs);
    setSimTimer(timer);
    return () => clearInterval(timer);
  }, [isSimPlaying, simSpeedMultiplier, simDirection, simTrailPoints, simIndex, setCurrentLocation, setIsSimPlaying]);

  // Haversine formula to calculate distance in meters between two lat/lng points
  function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Smoothing animation for simulation
  useEffect(() => {
    if (!isSimPlaying || !simTrailPoints.length || simIndex == null) {
      setSimAnimatedLocation(null);
      return;
    }
    let animationFrame: number;
    let prevIdx = simDirection === 'top' ? simIndex - 1 : simIndex + 1;
    if (prevIdx < 0 || prevIdx >= simTrailPoints.length) prevIdx = simIndex;
    const start = simTrailPoints[prevIdx];
    const end = simTrailPoints[simIndex];
    if (!start || !end) {
      setSimAnimatedLocation([end?.latitude ?? 0, end?.longitude ?? 0]);
      return;
    }
    const BASE_SPEEDS = {
      walking: 1.4,
      running: 3.0,
      biking: 4.5,
      accessible: 1.0
    };
    // TODO: Get locomotionMode from context or prop
    const locomotionMode = 'walking';
    const baseSpeed = BASE_SPEEDS[locomotionMode] || 1.4;
    const speed = baseSpeed * simSpeedMultiplier; // meters per second
    // Calculate real distance between points in meters
    const distanceMeters = haversine(start.latitude, start.longitude, end.latitude, end.longitude);
    // Duration to move between points (ms)
    const duration = (distanceMeters / speed) * 1000;
    let startTime: number | null = null;
    function animate(ts: number) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      let t = Math.min(elapsed / duration, 1);
      // Linear interpolation
      const lat = start.latitude + t * (end.latitude - start.latitude);
      const lng = start.longitude + t * (end.longitude - start.longitude);
      setSimAnimatedLocation([lat, lng]);
      if (t < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setSimAnimatedLocation([end.latitude, end.longitude]);
      }
    }
    animationFrame = requestAnimationFrame(animate);
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isSimPlaying, simTrailPoints, simIndex, simDirection, simSpeedMultiplier]);

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
        clearEntryPoint,
        isSimPlaying,
        setIsSimPlaying,
        simSpeedMultiplier,
        setSimSpeedMultiplier,
        simIndex,
        setSimIndex,
        setSimTrailPoints,
        simAnimatedLocation
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
