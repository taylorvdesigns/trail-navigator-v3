import React, { createContext, useContext, useState, useEffect } from 'react';

interface LocationContextType {
  currentPosition: [number, number] | null;
  simDirection: 'forward' | 'backward';
  simPosition: [number, number] | null;
  error: GeolocationPositionError | Error | null;
  isLoading: boolean;
}

const LocationContext = createContext<LocationContextType>({
  currentPosition: null,
  simDirection: 'forward',
  simPosition: null,
  error: null,
  isLoading: true
});

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [simDirection, setSimDirection] = useState<'forward' | 'backward'>('forward');
  const [simPosition, setSimPosition] = useState<[number, number] | null>(null);
  const [error, setError] = useState<GeolocationPositionError | Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if ('geolocation' in navigator) {
      setIsLoading(true);
      const watchId = navigator.geolocation.watchPosition(
        position => {
          setCurrentPosition([position.coords.latitude, position.coords.longitude]);
          setError(null);
          setIsLoading(false);
        },
        error => {
          console.warn('Location error:', error.message);
          setError(error);
          setIsLoading(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000 // Increased timeout to 10 seconds
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    } else {
      setError(new Error('Geolocation is not supported by this browser.'));
      setIsLoading(false);
    }
  }, []);

  return (
    <LocationContext.Provider
      value={{
        currentPosition,
        simDirection,
        simPosition,
        error,
        isLoading
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}; 