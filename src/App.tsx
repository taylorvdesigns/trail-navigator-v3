import React from 'react';
import { CssBaseline } from '@mui/material';
import { 
  BrowserRouter,
  Routes, 
  Route, 
  Navigate, 
  useNavigate,
  useLocation as useRouterLocation,
  createBrowserRouter,
  RouterProvider
} from 'react-router-dom';
import { AppLayout } from './components/Layout/AppLayout';
import { ViewMode, LocomotionMode } from './types';
import { ThemeProvider } from './contexts/ThemeContext';
import { LocationProvider } from './contexts/LocationContext';
import { UserProvider } from './contexts/UserContext';
import { MapView } from './components/MapView/MapView';
import { NavView } from './components/NavView/NavView';
import { ListView } from './components/ListView/ListView';
import { TrailView } from './views/TrailView';
import { NotFoundView } from './views/NotFoundView';
import { TRAIL_ROUTES } from './config/routes.config';
import { usePOIs } from './hooks/usePOIs';
import { useLocation as useGeoLocation } from './hooks/useLocation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppContent } from './components/AppContent';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <LocationProvider>
            <UserProvider>
              <CssBaseline />
              <AppContent />
            </UserProvider>
          </LocationProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
