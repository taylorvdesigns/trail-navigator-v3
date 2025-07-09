import React, { useState } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  Typography, 
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton
} from '@mui/material';
import { 
  Place as PlaceIcon,
  Close as CloseIcon,
  DirectionsWalk as WalkIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { POI, TrailPoint } from '../../types/index';
import { useNavigate } from 'react-router-dom';
import { calculateDistance } from '../../utils/distance';
import { getPOIsForTrail } from '../../utils/poi';
import { GooglePlacesModal } from '../GooglePlacesModal/GooglePlacesModal';
import { findNearestTrailPoint } from '../../utils/trail';

interface ListViewProps {
  pois: POI[];
  selectedGroup?: string;
  onPoiClick: (poi: POI) => void;
  currentLocation?: [number, number] | null;
  activeTrailId: string | null;
  allTrailData: { id: string, points: TrailPoint[] }[] | null;
}

interface GroupedPOIs {
  [key: string]: POI[];
}

// Utility to extract first image src from HTML string
function extractFirstImageSrc(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"'>]+)["']/i);
  return match ? match[1] : null;
}

export const ListView: React.FC<ListViewProps> = ({ 
  pois, 
  selectedGroup, 
  onPoiClick,
  currentLocation,
  activeTrailId,
  allTrailData
}) => {
  // Debug: Log the props to see what's being passed
  React.useEffect(() => {
    
  }, [pois, activeTrailId, allTrailData]);
  const navigate = useNavigate();
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [googlePlacesModalOpen, setGooglePlacesModalOpen] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>('');
  const [selectedPoiName, setSelectedPoiName] = useState<string>('');

  const trailPois = React.useMemo(() => {
    // Show all POIs for the active trail, or all if no trail is selected
    if (!activeTrailId) return pois;
    // If you have a field to assign POIs to trails, filter here. Otherwise, show all.
    return pois;
  }, [pois, activeTrailId]);

  // Debug: Log POI data to see what we're working with
  React.useEffect(() => {

    
    // Count POIs with and without Google Place IDs
    const withGooglePlaceId = trailPois.filter(poi => poi.google_place_id).length;
    const withoutGooglePlaceId = trailPois.filter(poi => !poi.google_place_id).length;

  }, [trailPois]);

  const groupedPois = React.useMemo(() => {
    return trailPois.reduce((acc: GroupedPOIs, poi) => {
      const groupName = poi.post_tags[0]?.name || 'Ungrouped';
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(poi);
      return acc;
    }, {});
  }, [trailPois]);

  const uniqueTags = React.useMemo(() => {
    const tags = new Set<string>();
    trailPois.forEach(poi => {
      poi.post_tags.forEach(tag => {
        tags.add(tag.name);
      });
    });
    return Array.from(tags);
  }, [trailPois]);

  const getDistance = (poi: POI): number | null => {
    if (!currentLocation || !poi.coordinates || !allTrailData || !activeTrailId) return null;
    
    try {
      // Find the active trail data
      const activeTrail = allTrailData.find(trail => trail.id === activeTrailId);
      if (!activeTrail || activeTrail.points.length === 0) {
        return calculateDistance(
          currentLocation[1], // latitude
          currentLocation[0], // longitude
          poi.coordinates[1], // latitude
          poi.coordinates[0]  // longitude
        );
      }

      // Find the nearest point on the trail to the user's location
      const userLocation: [number, number] = [currentLocation[1], currentLocation[0]]; // [lat, lng]
      const userNearestPoint = findNearestTrailPoint(userLocation, activeTrail.points);
      
      // Find the nearest point on the trail to the POI
      const poiLocation: [number, number] = [poi.coordinates[1], poi.coordinates[0]]; // [lat, lng]
      const poiNearestPoint = findNearestTrailPoint(poiLocation, activeTrail.points);
      


      if (userNearestPoint && poiNearestPoint) {
        // Use the .distance property of the nearest trail points
        const userTrailDist = userNearestPoint.point.distance ?? 0;
        const poiTrailDist = poiNearestPoint.point.distance ?? 0;
        const trailDistance = Math.abs(userTrailDist - poiTrailDist);
        // Add the off-trail distances
        const totalDistance = trailDistance + userNearestPoint.distance + poiNearestPoint.distance;

        return totalDistance;
      }
      
      // Fallback to straight-line distance if trail calculation fails
      return calculateDistance(
        currentLocation[1], // latitude
        currentLocation[0], // longitude
        poi.coordinates[1], // latitude
        poi.coordinates[0]  // longitude
      );
    } catch (error) {
      console.error('Error calculating trail distance:', error);
      // Fallback to straight-line distance
      return calculateDistance(
        currentLocation[1], // latitude
        currentLocation[0], // longitude
        poi.coordinates[1], // latitude
        poi.coordinates[0]  // longitude
      );
    }
  };

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

  const handleShowOnMap = (poi: POI) => {
    // Swap coordinates to match Leaflet's expected format [latitude, longitude]
    const latLng: [number, number] = [poi.coordinates[1], poi.coordinates[0]];
    


    navigate('/map', { 
      state: { 
        highlightPOI: latLng,
        zoom: 16
      }
    });
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tags Filter */}
      <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
          <Chip
            label="All"
            onClick={() => setSelectedTag(null)}
            color={selectedTag === null ? 'primary' : 'default'}
          />
          {uniqueTags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              onClick={() => setSelectedTag(tag)}
              color={selectedTag === tag ? 'primary' : 'default'}
            />
          ))}
        </Box>
      </Box>

      {/* POI List */}
      <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default' }}>
        {Object.entries(groupedPois)
          .filter(([groupName]) => 
            !selectedTag || 
            groupName === selectedTag || 
            groupedPois[groupName].some(poi => 
              poi.post_tags.some(tag => tag.name === selectedTag)
            )
          )
          .map(([groupName, groupPois]) => (
            <Box key={groupName}>
              <Typography
                variant="h6"
                sx={{
                  p: 2,
                  color: 'text.secondary',
                  bgcolor: 'background.paper'
                }}
              >
                {groupName.toUpperCase()} ({groupPois.length})
              </Typography>
              <List>
                {groupPois
                  .filter(poi => !selectedTag || poi.post_tags.some(tag => tag.name === selectedTag))
                  .map(poi => {
                    const distance = getDistance(poi);
                    return (
                      <React.Fragment key={poi.id}>
                        <ListItem
                          button
                          onClick={() => handlePoiClick(poi)}
                          sx={{
                            py: 1.5,
                            '&:hover': {
                              bgcolor: 'action.hover'
                            }
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PlaceIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                                <Typography component="span" variant="subtitle1" sx={{ color: 'white' }}>
                                  {poi.title.rendered}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box component="span">
                                <Typography component="span" variant="body2" color="text.secondary">
                                  {poi.post_category.map(cat => cat.name).join(', ')}
                                </Typography>
                                {distance !== null && (
                                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                    <WalkIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography component="span" variant="body2" color="text.secondary">
                                      {(distance / 1609.34).toFixed(1)} mi away from your location
                                    </Typography>
                                  </Box>
                                )}
                                {!poi.google_place_id && (
                                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                    <InfoIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                                    <Typography component="span" variant="body2" color="warning.main" sx={{ fontSize: '0.75rem' }}>
                                      Needs Google Place ID
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    );
                  })}
              </List>
            </Box>
          ))}
      </Box>

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
            ) : (
              <Box sx={{ width: '100%', height: 200, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="subtitle1" color="text.secondary">No Image Available</Typography>
              </Box>
            )}
            {/* POI Name */}
            <DialogTitle sx={{ pr: 6, textAlign: 'center', fontWeight: 700, fontSize: '1.3rem', color: 'common.white', bgcolor: 'grey.900' }}>
              {typeof selectedPOI.title === 'object' && selectedPOI.title?.rendered
                ? selectedPOI.title.rendered
                : typeof selectedPOI.title === 'string'
                  ? selectedPOI.title
                  : ''}
              <IconButton
                onClick={() => setSelectedPOI(null)}
                sx={{ position: 'absolute', right: 8, top: 8, color: 'common.white' }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            {/* POI Description */}
            <DialogContent sx={{ bgcolor: 'grey.900' }}>
              <Box sx={{ mb: 2 }}>
                {selectedPOI.description ? (
                  <Typography variant="body1" sx={{ wordBreak: 'break-word', color: 'common.white' }} component="div">
                    <span dangerouslySetInnerHTML={{ __html: selectedPOI.description }} />
                  </Typography>
                ) : (
                  <Typography variant="body1" color="text.secondary">No description available.</Typography>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ bgcolor: 'grey.900' }}>
              <Button onClick={() => setSelectedPOI(null)} sx={{ color: 'success.light' }}>Close</Button>
              <Button 
                onClick={() => handleShowOnMap(selectedPOI)} 
                variant="contained" 
                startIcon={<PlaceIcon />}
                disabled={!selectedPOI.coordinates}
              >
                View on Map
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
