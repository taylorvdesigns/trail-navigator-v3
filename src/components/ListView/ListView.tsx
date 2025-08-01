import React, { useState, useEffect } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  Typography, 
  Divider,
  Chip,
  IconButton
} from '@mui/material';
import { 
  Place as PlaceIcon,
  DirectionsWalk as WalkIcon,
  Info as InfoIcon,
  Map as MapIcon
} from '@mui/icons-material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { POI, TrailPoint } from '../../types/index';
import { useNavigate, useLocation } from 'react-router-dom';
import { calculateDistance } from '../../utils/distance';
import { getUniqueTags, tagNameToSlug } from '../../utils/poi';

import { findNearestTrailPoint } from '../../utils/trail';
import { getNetworkDistanceBetweenPoints } from '../../utils/trailGraph';
import { useTrailGraph } from '../../hooks/useTrailGraph';
import { CategoryToggle } from '../CategoryToggle/CategoryToggle';
import { useUser } from '../../contexts/UserContext';
import { FilterBottomSheet } from '../FilterBottomSheet/FilterBottomSheet';
import { GooglePlacesModal } from '../GooglePlacesModal/GooglePlacesModal';

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



// Utility to check if a POI has the "Featured" category
function isFeaturedPOI(poi: POI): boolean {
  return poi.post_category?.some(category => 
    category.name?.toLowerCase() === 'featured'
  ) || false;
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
  const { selectedCategories } = useUser();
  const searchParams = new URLSearchParams(location.search);
  const urlGroupParam = searchParams.get('group');
  const groupNameFromNav = urlGroupParam || location.state?.groupName || null;
  const focusedGroupRef = React.useRef<HTMLDivElement>(null);
  const [filterBottomSheetOpen, setFilterBottomSheetOpen] = useState(false);
  const [googlePlacesModalOpen, setGooglePlacesModalOpen] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>('');
  const [selectedPoiName, setSelectedPoiName] = useState<string>('');

  const trailPois = React.useMemo(() => {
    // Start with all POIs
    let filteredPois = pois;
    
    // Filter by active trail if specified
    if (activeTrailId) {
      // If you have a field to assign POIs to trails, filter here. Otherwise, show all.
      // filteredPois = pois.filter(poi => poi.trailId === activeTrailId);
    }
    
    // Filter by selected categories
    if (selectedCategories.length > 0) {
      filteredPois = filteredPois.filter(poi => {
        if (!poi.post_category || !Array.isArray(poi.post_category)) {
          return false;
        }
        
        // Check if any of the POI's categories match the selected categories
        return poi.post_category.some(category => {
          if (!category.name) return false;
          // Clean up category name (same logic as extractUniqueCategories)
          const cleanName = category.name.split('-').pop()?.trim() || category.name;
          return selectedCategories.includes(cleanName);
        });
      });
    }
    
    return filteredPois;
  }, [pois, activeTrailId, selectedCategories]);

  const [selectedTag, setSelectedTag] = useState<string | null>(groupNameFromNav);
  
  // Handle URL parameter changes for focused groups
  useEffect(() => {
    if (urlGroupParam && urlGroupParam !== selectedTag) {
      setSelectedTag(urlGroupParam);
      
      // Scroll to the focused group after a short delay to ensure rendering
      setTimeout(() => {
        if (focusedGroupRef.current) {
          focusedGroupRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 100);
    }
  }, [urlGroupParam, selectedTag]);
  
  // If groupNameFromNav changes, update selectedTag and potentially open POI modal
  React.useEffect(() => {
    if (groupNameFromNav) {
      setSelectedTag(groupNameFromNav);
      
      // Scroll to the focused group after a short delay to ensure rendering
      setTimeout(() => {
        if (focusedGroupRef.current) {
          focusedGroupRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 100);
      
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
        console.log('ListView: Navigating to map for POI:', matchingPOI.title.rendered);
        // Navigate to map view and zoom to the POI
        handleShowOnMap(matchingPOI);
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
    // Navigate to map view and zoom to the POI
    handleShowOnMap(poi);
  };

  const handleShowOnMap = (poi: POI) => {
    // Navigate to map with POI parameter for shareable URL
    const searchParams = new URLSearchParams();
    const modeParam = location.search.match(/mode=([^&]+)/)?.[1];
    if (modeParam === 'sim') {
      searchParams.set('mode', 'sim');
    }
    searchParams.set('poi', poi.id.toString());
    
    const url = `/map?${searchParams.toString()}`;
    console.log('🗺️ Navigating to map with POI:', poi.title.rendered, 'URL:', url);
    navigate(url);
  };

  const handleOpenGooglePlaces = (poi: POI) => {
    if (poi.google_place_id) {
      setSelectedPlaceId(poi.google_place_id);
      setSelectedPoiName(poi.title.rendered);
      setGooglePlacesModalOpen(true);
    }
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

      {/* Category Filter Summary */}
      {selectedCategories.length > 0 && (
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Showing {trailPois.length} POIs in categories:
            </Typography>
            {selectedCategories.map(category => (
              <Chip
                key={category}
                label={category}
                size="small"
                color="primary"
                variant="filled"
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark'
                  }
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* POI List */}
      <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default' }}>
        {trailPois.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%', 
            p: 4,
            textAlign: 'center'
          }}>
            <PlaceIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No POIs Found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedCategories.length > 0 
                ? `No POIs match the selected categories: ${selectedCategories.join(', ')}`
                : 'No POIs available for the current filters.'
              }
            </Typography>
          </Box>
        ) : (
          Object.entries(groupedPois)
          .filter(([groupName]) => 
            !selectedTag || 
            groupName === selectedTag || 
            groupedPois[groupName].some(poi => 
              poi.post_tags.some(tag => tag.name === selectedTag) ||
              poi.title.rendered === selectedTag
            )
          )
          .map(([groupName, groupPois]) => (
            <Box 
              key={groupName} 
              ref={groupName === groupNameFromNav ? focusedGroupRef : null}
            >
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
                  .sort((a, b) => {
                    // Sort featured POIs to the top
                    const aFeatured = isFeaturedPOI(a);
                    const bFeatured = isFeaturedPOI(b);
                    
                    if (aFeatured && !bFeatured) return -1; // a comes first
                    if (!aFeatured && bFeatured) return 1;  // b comes first
                    return 0; // both have same featured status, maintain original order
                  })
                  .map(poi => {
                    const distance = getDistance(poi);
                    return (
                      <React.Fragment key={poi.id}>
                        <ListItem
                          sx={{
                            py: 1.5,
                            '&:hover': {
                              bgcolor: 'action.hover'
                            }
                          }}
                          secondaryAction={
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {poi.google_place_id && (
                                <IconButton
                                  edge="end"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent triggering the main item click
                                    handleOpenGooglePlaces(poi);
                                  }}
                                  size="small"
                                  sx={{ color: 'primary.main' }}
                                >
                                  <FontAwesomeIcon 
                                    icon={faCircleInfo} 
                                    style={{ 
                                      fontSize: '16px'
                                    }} 
                                  />
                                </IconButton>
                              )}
                              <IconButton
                                edge="end"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent triggering the main item click
                                  handleShowOnMap(poi);
                                }}
                                size="small"
                                sx={{ color: 'primary.main' }}
                              >
                                <MapIcon />
                              </IconButton>
                            </Box>
                          }
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {isFeaturedPOI(poi) ? (
                                  <FontAwesomeIcon 
                                    icon={faStar} 
                                    style={{ 
                                      color: '#FFD700', 
                                      fontSize: '20px'
                                    }} 
                                  />
                                ) : (
                                  <PlaceIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                                )}
                                <Typography component="span" variant="subtitle1" sx={{ color: 'white' }}>
                                  {poi.title.rendered}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box component="span">
                                <Typography component="span" variant="body2" color="text.secondary">
                                  {poi.post_category
                                    .filter(cat => cat.name.toLowerCase() !== 'featured')
                                    .map(cat => cat.name)
                                    .join(', ')}
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
          ))
        )}
      </Box>



      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        open={filterBottomSheetOpen}
        onClose={() => setFilterBottomSheetOpen(false)}
        onToggle={() => setFilterBottomSheetOpen(!filterBottomSheetOpen)}
        title="List Filters"
      />

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
