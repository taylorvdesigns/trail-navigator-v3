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
  Info as InfoIcon,
  Map as MapIcon
} from '@mui/icons-material';
import { POI, TrailPoint } from '../../types/index';
import { useNavigate, useLocation } from 'react-router-dom';
import { calculateDistance } from '../../utils/distance';
import { getUniqueTags, tagNameToSlug } from '../../utils/poi';
import { GooglePlacesModal } from '../GooglePlacesModal/GooglePlacesModal';
import { findNearestTrailPoint } from '../../utils/trail';
import { getNetworkDistanceBetweenPoints } from '../../utils/trailGraph';
import { useTrailGraph } from '../../hooks/useTrailGraph';

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
  const navigate = useNavigate();
  const location = useLocation();
  const { graph } = useTrailGraph();
  const groupNameFromNav = location.state?.groupName || null;
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [googlePlacesModalOpen, setGooglePlacesModalOpen] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>('');
  const [selectedPoiName, setSelectedPoiName] = useState<string>('');

  const trailPois = React.useMemo(() => {
    // Show all POIs for the active trail, or all if no trail is selected
    if (!activeTrailId) return pois;
    // If you have a field to assign POIs to trails, filter here. Otherwise, show all.
    return pois;
  }, [pois, activeTrailId]);

  const [selectedTag, setSelectedTag] = useState<string | null>(groupNameFromNav);
  // If groupNameFromNav changes, update selectedTag and potentially open POI modal
  React.useEffect(() => {
    if (groupNameFromNav) {
      setSelectedTag(groupNameFromNav);
      
      console.log('ListView: groupNameFromNav received:', groupNameFromNav);
      console.log('ListView: trailPois count:', trailPois.length);
      
      // Check if this is an individual POI (ungrouped or single POI in a group)
      const matchingPOI = trailPois.find(poi => poi.title.rendered === groupNameFromNav);
      
      // Individual POI: either has no tags (ungrouped) or is the only POI with its tag
      const isIndividualPOI = matchingPOI && (
        matchingPOI.post_tags.length === 0 || // Ungrouped POI
        (matchingPOI.post_tags.length > 0 && // Has tags but is the only POI with that tag
          !trailPois.some(poi => 
            poi.id !== matchingPOI.id && 
            poi.post_tags.some(tag => tag.name === matchingPOI.post_tags[0]?.name)
          ))
      );
      
      console.log('ListView: matchingPOI found:', !!matchingPOI);
      console.log('ListView: isIndividualPOI:', isIndividualPOI);
      if (matchingPOI) {
        console.log('ListView: matchingPOI details:', {
          title: matchingPOI.title.rendered,
          post_tags: matchingPOI.post_tags,
          post_tags_length: matchingPOI.post_tags.length
        });
      }
      
      if (isIndividualPOI && matchingPOI) {
        console.log('ListView: Opening modal for POI:', matchingPOI.title.rendered);
        if (matchingPOI.google_place_id) {
          // Open Google Places modal
          console.log('ListView: Opening Google Places modal');
          setSelectedPlaceId(matchingPOI.google_place_id);
          setSelectedPoiName(matchingPOI.title.rendered);
          setGooglePlacesModalOpen(true);
        } else {
          // Open regular POI modal
          console.log('ListView: Opening regular POI modal');
          setSelectedPOI(matchingPOI);
        }
      }
    }
  }, [groupNameFromNav, trailPois]);

  // Debug: Log POI data to see what we're working with
  // (Removed debug useEffect)

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
    if (!graph || !currentLocation || !poi.coordinates) return null;
    // currentLocation is [lng, lat] format, but we need [lat, lng] for distance calculation
    const userCoords: [number, number] = [currentLocation[1], currentLocation[0]];
    const poiCoords: [number, number] = [poi.coordinates[1], poi.coordinates[0]];
    const distance = getNetworkDistanceBetweenPoints(graph, userCoords, poiCoords);
    console.log('[ListView] POI:', poi.title?.rendered || poi.title, 'UserCoords:', userCoords, 'POICoords:', poiCoords, 'Distance:', distance);
    return distance;
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
              poi.post_tags.some(tag => tag.name === selectedTag) ||
              poi.title.rendered === selectedTag
            )
          )
          .map(([groupName, groupPois]) => (
            <Box key={groupName}>
              <Box sx={{ display: 'flex', alignItems: 'center', p: 2, color: 'text.secondary', bgcolor: 'background.paper' }}>
                <Typography
                  variant="h6"
                  sx={{ flex: 1 }}
                >
                  {groupName.toUpperCase()} ({groupPois.length})
                </Typography>
                <IconButton
                  aria-label={`View ${groupName} on map`}
                  onClick={() => {
                    // Navigate to map view with URL parameter for focused group
                    // Preserve simulation mode query parameter if present
                    const searchParams = new URLSearchParams(window.location.search);
                    const modeParam = searchParams.get('mode');
                    
                    // Create new search params with group parameter
                    const newSearchParams = new URLSearchParams();
                    if (modeParam === 'sim') {
                      newSearchParams.set('mode', 'sim');
                    }
                    newSearchParams.set('group', groupName);
                    
                    const newSearch = newSearchParams.toString();
                    navigate(`/map?${newSearch}`);
                  }}
                  size="small"
                  sx={{ color: 'primary.main', ml: 1 }}
                >
                  <MapIcon />
                </IconButton>
              </Box>
              <List>
                {groupPois
                  .filter(poi => !selectedTag || poi.post_tags.some(tag => tag.name === selectedTag) || poi.title.rendered === selectedTag)
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
