import React from 'react';
import { CssBaseline } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LocationProvider } from './contexts/LocationContext';
import { UserProvider } from './contexts/UserContext';
import { AppContent } from './components/AppContent';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
