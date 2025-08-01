import React, { useState } from 'react';
import ReactDOMServer from 'react-dom/server';
import { Box, Button, Typography, List, ListItem, ListItemText, ListItemButton, CircularProgress } from '@mui/material';
import { Modal } from '../Modal/Modal';
import { useLocation } from '../../contexts/LocationContext';
import { EntryPointMapPicker } from './EntryPointMapPicker';
import { TRAIL_ROUTES } from '../../config/routes.config';
import { POI, TrailConfig } from '../../types';
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

import { GrayscaleMapLayer } from '../MapView/GrayscaleMapLayer';
import { useTrailsData } from '../../hooks/useTrailsData';


interface EntryPointModalProps {
  open: boolean;
  onClose: () => void;
  showDistanceTracking?: boolean; // New prop to control which flow to show
  pois?: POI[]; // Add POI data for distance tracking flow
  trails?: TrailConfig[]; // Add trails data for distance tracking flow
  onConfirmEntryPoint?: () => void;
}

// Distance tracking map picker component
const DistanceTrackingMapPicker: React.FC<{
  selectedPOIGroup: string;
  pois: POI[];
  trails: TrailConfig[];
  onConfirm: (location: [number, number]) => void;
  onCancel: () => void;
}> = ({ selectedPOIGroup, pois, trails, onConfirm, onCancel }) => {
  const { data: trailsData, isLoading } = useTrailsData(trails);
  const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(null);

  // Get POIs for the selected group
  const groupPOIs = pois.filter(poi => poi.post_tags?.[0]?.name === selectedPOIGroup);
  
  // Calculate center based on the selected POI group
  const center: [number, number] = groupPOIs.length > 0 
    ? [groupPOIs[0].coordinates[1], groupPOIs[0].coordinates[0]] // Convert [lng, lat] to [lat, lng]
    : [34.8526, -82.3940]; // Default center

  // Flatten all trail points for snapping
  const allTrailPoints = trailsData && trailsData.length > 0
    ? trailsData.flatMap(trail => trail.points.map(pt => [pt.latitude, pt.longitude] as [number, number]))
    : [];

  // Map click handler: snap to nearest trail point
  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        // Find nearest trail point
        let minDist = Infinity;
        let nearest: [number, number] = allTrailPoints[0] || [34.8526, -82.3940];
        for (const pt of allTrailPoints) {
          const d = Math.hypot(pt[0] - e.latlng.lat, pt[1] - e.latlng.lng);
          if (d < minDist) {
            minDist = d;
            nearest = pt;
          }
        }
        setSelectedPoint(nearest);
      }
    });
    return null;
  };

  // Create a simple entry point marker
  const EntryPointMarker = () => (
    <div style={{
      width: '16px',
      height: '16px',
      background: '#4CAF50',
      border: '2px solid #fff',
      borderRadius: '50%',
      boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
      zIndex: 2
    }} />
  );

  const startIcon = new L.DivIcon({
    className: 'start-point-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: ReactDOMServer.renderToString(<EntryPointMarker />)
  });

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ width: '100%', height: 400, display: 'flex', flexDirection: 'column', mb: 2 }}>
      <Typography variant="h6" sx={{ textAlign: 'center', mb: 2, color: 'white' }}>
        Tap the exact spot where you got on the trail in {selectedPOIGroup}:
      </Typography>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <MapContainer
          center={center}
          zoom={16}
          style={{ width: '100%', height: '100%', borderRadius: 12 }}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <GrayscaleMapLayer />
          {allTrailPoints.length > 0 && (
            <Polyline positions={allTrailPoints} color="#39FF14" weight={5} />
          )}
          {selectedPoint && (
            <Marker position={selectedPoint} icon={startIcon}>
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '100%',
                transform: 'translate(-50%, 8px)',
                background: '#fff',
                color: '#4CAF50',
                fontWeight: 700,
                borderRadius: 8,
                padding: '2px 8px',
                fontSize: 13,
                boxShadow: '0 1px 4px rgba(0,0,0,0.10)'
              }}>
                Starting point
              </div>
            </Marker>
          )}
          <MapClickHandler />
        </MapContainer>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button variant="outlined" color="secondary" onClick={onCancel}>Back</Button>
        <Button variant="contained" color="primary" onClick={() => selectedPoint && onConfirm(selectedPoint)} disabled={!selectedPoint}>
          Confirm Starting Point
        </Button>
      </Box>
    </Box>
  );
};

export const EntryPointModal: React.FC<EntryPointModalProps> = ({ 
  open, 
  onClose, 
  showDistanceTracking = false,
  pois,
  trails,
  onConfirmEntryPoint
}) => {
  const { setEntryPoint } = useLocation();
  const [showMap, setShowMap] = useState(false);
  const [step, setStep] = useState<'initial' | 'reuse-last' | 'knows-location' | 'poi-selection' | 'map-picker'>('initial');
  const [selectedPOIGroup, setSelectedPOIGroup] = useState<string | null>(null);
  const [lastEntryPoint, setLastEntryPoint] = useState<[number, number] | null>(null);

  // On open, check for last entry point in localStorage
  React.useEffect(() => {
    if (open && showDistanceTracking) {
      const stored = localStorage.getItem('entryPoint');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length === 2) {
            setLastEntryPoint(parsed as [number, number]);
            setStep('reuse-last');
            return;
          }
        } catch {}
      }
      setStep('initial');
    } else if (open) {
      setStep('initial');
    }
  }, [open, showDistanceTracking]);

  // Placeholder: Use current location (simulate with a fixed point for now)
  const handleUseCurrentLocation = () => {
    // TODO: Snap to nearest trail point
    setEntryPoint([-82.3940, 34.8526]); // Example: Greenville, SC
    onClose();
  };

  const handlePickOnMap = () => {
    setShowMap(true);
  };

  const handleMapConfirm = (location: [number, number]) => {
    if (showDistanceTracking) {
      setEntryPoint(location);
      if (onConfirmEntryPoint) onConfirmEntryPoint();
      onClose();
    } else {
      setEntryPoint(location);
      setShowMap(false);
      onClose();
    }
  };

  const handleMapCancel = () => {
    if (showDistanceTracking) {
      setStep('poi-selection');
    } else {
      setShowMap(false);
    }
  };

  // Distance tracking flow handlers
  const handleDistanceTrackingYes = () => {
    setStep('knows-location');
  };

  const handleDistanceTrackingNo = () => {
    onClose();
  };

  const handleKnowsLocationYes = () => {
    setStep('poi-selection');
  };

  const handleKnowsLocationNo = () => {
    onClose();
  };

  const handlePOISelection = (poiGroupName: string) => {
    setSelectedPOIGroup(poiGroupName);
    setStep('map-picker');
  };

  const handleBackToInitial = () => {
    setStep('initial');
  };

  // Group POIs by their primary tag for the selection step
  const poiGroups = React.useMemo(() => {
    if (!pois) return [];
    
    const groups: Record<string, POI[]> = {};
    pois.forEach(poi => {
      const tag = poi.post_tags?.[0]?.name;
      if (tag) {
        if (!groups[tag]) groups[tag] = [];
        groups[tag].push(poi);
      }
    });
    
    return Object.entries(groups).map(([groupName, groupPois]) => ({
      name: groupName,
      pois: groupPois,
      count: groupPois.length
    }));
  }, [pois]);

  // Show distance tracking flow if requested
  if (showDistanceTracking) {
    return (
      <Modal open={open} onClose={onClose}>
        {step === 'initial' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 320, p: 2 }}>
            <Typography variant="h6" sx={{ textAlign: 'center', mb: 2, color: 'white' }}>
              Would you like the app to show you how far you've gone on the trail today?
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleDistanceTrackingYes}
              sx={{ width: '100%' }}
            >
              Yes
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleDistanceTrackingNo}
              sx={{ width: '100%' }}
            >
              No
            </Button>
          </Box>
        )}

        {step === 'knows-location' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 320, p: 2 }}>
            <Typography variant="h6" sx={{ textAlign: 'center', mb: 2, color: 'white' }}>
              Do you know where you got on the trail?
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleKnowsLocationYes}
              sx={{ width: '100%' }}
            >
              Yes
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleKnowsLocationNo}
              sx={{ width: '100%' }}
            >
              No
            </Button>
            <Button
              variant="text"
              onClick={handleBackToInitial}
              sx={{ mt: 1 }}
            >
              Back
            </Button>
          </Box>
        )}

        {step === 'poi-selection' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 320, p: 2 }}>
            <Typography variant="h6" sx={{ textAlign: 'center', mb: 2, color: 'white' }}>
              Select the area where you got on the trail:
            </Typography>
            <Box sx={{ width: '100%', maxHeight: 300, overflow: 'auto' }}>
              <List>
                {poiGroups.map((group) => (
                  <ListItem key={group.name} disablePadding>
                    <ListItemButton onClick={() => handlePOISelection(group.name)}>
                      <ListItemText 
                        primary={group.name}
                        secondary={`${group.count} location${group.count > 1 ? 's' : ''}`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
            <Button
              variant="text"
              onClick={handleBackToInitial}
              sx={{ mt: 1 }}
            >
              Back
            </Button>
          </Box>
        )}

        {step === 'map-picker' && (
          <DistanceTrackingMapPicker
            selectedPOIGroup={selectedPOIGroup!}
            pois={pois!}
            trails={trails!}
            onConfirm={handleMapConfirm}
            onCancel={handleMapCancel}
          />
        )}

        {step === 'reuse-last' && lastEntryPoint && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 320, p: 2 }}>
            <Typography variant="h6" sx={{ textAlign: 'center', mb: 2, color: 'white' }}>
              Did you get on the trail at the same location as last time?
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setEntryPoint(lastEntryPoint);
                if (onConfirmEntryPoint) onConfirmEntryPoint();
              }}
              sx={{ width: '100%' }}
            >
              Yes, use the same starting point
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setStep('initial')}
              sx={{ width: '100%' }}
            >
              No, pick a new starting point
            </Button>
          </Box>
        )}
      </Modal>
    );
  }

  // Original entry point modal flow
  return (
    <Modal open={open} onClose={onClose} title="Where did you get on the trail?">
      {showMap ? (
        <EntryPointMapPicker
          trails={TRAIL_ROUTES}
          onConfirm={handleMapConfirm}
          onCancel={handleMapCancel}
        />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 320 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUseCurrentLocation}
            sx={{ width: '100%' }}
          >
            Use My Current Location
          </Button>
          <Typography variant="body2" sx={{ color: '#888' }}>or</Typography>
          <Button
            variant="outlined"
            color="primary"
            onClick={handlePickOnMap}
            sx={{ width: '100%' }}
          >
            Pick on Map
          </Button>
        </Box>
      )}
    </Modal>
  );
}; 