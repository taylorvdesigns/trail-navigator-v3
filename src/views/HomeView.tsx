import React from 'react';
import { Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { useLocation } from '../contexts/LocationContext';
import { useUser } from '../contexts/UserContext';
import { MapView } from '../components/MapView/MapView';
import { TRAIL_ROUTES } from '../config/routes.config';
import { usePOIs } from '../hooks/usePOIs';
import { POI } from '../types/index';
import { GooglePlacesModal } from '../components/GooglePlacesModal/GooglePlacesModal';

// Utility to extract first image src from HTML string
function extractFirstImageSrc(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"'>]+)["']/i);
  return match ? match[1] : null;
}

export const HomeView: React.FC = () => {
  const { currentLocation } = useLocation();
  const { selectedCategories } = useUser();
  const { pois, loading: poisLoading } = usePOIs();
  const [selectedPOI, setSelectedPOI] = React.useState<POI | null>(null);
  const [googlePlacesModalOpen, setGooglePlacesModalOpen] = React.useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = React.useState<string>('');
  const [selectedPoiName, setSelectedPoiName] = React.useState<string>('');



  const handlePoiClick = (poi: POI) => {
    if (poi.google_place_id) {
      // Open Google Places modal
      setSelectedPlaceId(poi.google_place_id);
      setSelectedPoiName(poi.title.rendered);
      setGooglePlacesModalOpen(true);
    } else {
      // Open regular POI modal
      setSelectedPOI(poi);
    }
  };

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <MapView
        trails={TRAIL_ROUTES}
        pois={pois}
        onPoiClick={handlePoiClick}
        currentLocation={currentLocation || undefined}
      />
      
      {/* POI Detail Dialog */}
      <Dialog
        open={!!selectedPOI}
        onClose={() => setSelectedPOI(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedPOI && (
          <>
            {/* POI Image */}
            {selectedPOI.featured_image ? (
              <Box sx={{ width: '100%', height: 200, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
                <img
                  src={selectedPOI.featured_image}
                  alt={typeof selectedPOI.title === 'object' && typeof selectedPOI.title.rendered === 'string'
                    ? selectedPOI.title.rendered
                    : typeof selectedPOI.title === 'string'
                      ? selectedPOI.title
                      : ''}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
            ) : selectedPOI.content?.rendered && extractFirstImageSrc(selectedPOI.content.rendered) ? (
              <Box sx={{ width: '100%', height: 200, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
                <img
                  src={extractFirstImageSrc(selectedPOI.content.rendered) as string}
                  alt={typeof selectedPOI.title === 'object' && typeof selectedPOI.title.rendered === 'string'
                    ? selectedPOI.title.rendered
                    : typeof selectedPOI.title === 'string'
                      ? selectedPOI.title
                      : ''}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
            ) : null}
            
            <DialogTitle sx={{ pr: 6, textAlign: 'center', fontWeight: 700, fontSize: '1.3rem', color: 'common.white', bgcolor: 'grey.900' }}>
              {typeof selectedPOI.title === 'object' && typeof selectedPOI.title.rendered === 'string'
                ? selectedPOI.title.rendered
                : typeof selectedPOI.title === 'string'
                  ? selectedPOI.title
                  : 'POI Details'}
            </DialogTitle>
            
            <DialogContent sx={{ bgcolor: 'grey.900' }}>
              <Typography variant="body1" color="common.white" sx={{ mb: 2 }}>
                {typeof selectedPOI.content === 'object' && typeof selectedPOI.content.rendered === 'string'
                  ? selectedPOI.content.rendered.replace(/<[^>]*>/g, '') // Remove HTML tags
                  : typeof selectedPOI.content === 'string'
                    ? selectedPOI.content
                    : 'No description available'}
              </Typography>
            </DialogContent>
            
            <DialogActions sx={{ bgcolor: 'grey.900' }}>
              <Button onClick={() => setSelectedPOI(null)} color="primary">
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Google Places Modal */}
      <GooglePlacesModal
        open={googlePlacesModalOpen}
        onClose={() => setGooglePlacesModalOpen(false)}
        placeId={selectedPlaceId}
        poiName={selectedPoiName}
      />
    </Box>
  );
};
