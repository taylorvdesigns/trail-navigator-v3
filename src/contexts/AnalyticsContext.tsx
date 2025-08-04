import React, { createContext, useContext, useEffect, useState } from 'react';
import { initGA, trackTrailEvent, trackEvent, trackPageView, trackError } from '../config/analytics';

interface AnalyticsContextType {
  trackTrailEvent: typeof trackTrailEvent;
  trackEvent: typeof trackEvent;
  trackPageView: typeof trackPageView;
  trackError: typeof trackError;
  isAnalyticsEnabled: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  const [isAnalyticsEnabled, setIsAnalyticsEnabled] = useState(false);

  useEffect(() => {
    // Initialize Google Analytics
    try {
      initGA();
      setIsAnalyticsEnabled(true);
      
      // Track initial page view
      trackPageView();
      
      // Track initial page view
      trackPageView();
      
      // Track session start
      const deviceType = /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile/.test(navigator.userAgent) 
        ? 'mobile' 
        : 'desktop';
      
      trackTrailEvent.sessionStarted('app_load', deviceType);
      

      

      
      // Track session end when user leaves
      const handleBeforeUnload = () => {
        const sessionDuration = Math.floor((Date.now() - performance.timing.navigationStart) / 1000);
        trackTrailEvent.sessionEnded(sessionDuration, 'page_unload');
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
      trackError(error as Error, 'analytics_initialization');
    }
  }, []);

  const value: AnalyticsContextType = {
    trackTrailEvent,
    trackEvent,
    trackPageView,
    trackError,
    isAnalyticsEnabled,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}; 