/**
 * ListView Component
 * 
 * Displays POIs (Points of Interest) in a scrollable list format with filtering,
 * distance calculations, and interactive features like map navigation and Google Places integration.
 * 
 * Features:
 * - Category-based filtering
 * - Distance calculations using trail network
 * - Google Places modal integration
 * - Map navigation on POI selection
 * - Featured POI highlighting
 * - Google Place ID warning system
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { getNetworkDistanceBetweenPoints } from '../../utils/trailGraph';
import { useTrailGraph } from '../../hooks/useTrailGraph';
import { useUser } from '../../contexts/UserContext';
import { FilterBottomSheet } from '../FilterBottomSheet/FilterBottomSheet';
import { GooglePlacesModal } from '../GooglePlacesModal/GooglePlacesModal';

/**
 * Props interface for ListView component
 */
interface ListViewProps {
  pois: POI[];                                    // Array of POIs to display
  selectedGroup?: string;                        // Currently selected POI group
  onPoiClick: (poi: POI) => void;               // Callback when POI is clicked
  currentLocation?: [number, number] | null;    // User's current GPS coordinates
  activeTrailId: string | null;                 // ID of the currently active trail
  allTrailData: { id: string, points: TrailPoint[] }[] | null; // All trail data for distance calculations
}

/**
 * Interface for grouping POIs by category or other criteria
 */
interface GroupedPOIs {
  [key: string]: POI[];
}

/**
 * Utility function to check if a POI has the "Featured" category
 * Used for highlighting special POIs in the list
 * 
 * @param poi - The POI to check
 * @returns true if the POI has a "Featured" category, false otherwise
 */
function isFeaturedPOI(poi: POI): boolean {
  return poi.post_category?.some(category => 
    category.name?.toLowerCase() === 'featured'
  ) || false;
}

/**
 * Determines whether to show the "Needs Google Place ID" warning for a POI
 * 
 * Some POIs (like water stations, parking lots, restrooms) don't need Google Place IDs
 * and are explicitly marked with google_place_id = "none" in the WordPress backend
 * 
 * @param poi - The POI to check
 * @returns true if warning should be shown, false if POI is exempt
 */
function shouldShowGooglePlaceIdWarning(poi: POI): boolean {
  // Don't show warning if Google Place ID is explicitly set to "none"
  // This indicates the POI doesn't need a Google Place ID
  if (poi.google_place_id === 'none') {
    return false;
  }
  
  // Show warning for POIs that don't have a Google Place ID but should have one
  return true;
}

/**
 * Main ListView component that renders POIs in a list format
 */
export const ListView: React.FC<ListViewProps> = ({ 
  pois, 
  selectedGroup, 
  onPoiClick,
  currentLocation,
  activeTrailId,
  allTrailData
}) => {
  // Navigation and routing hooks
  const navigate = useNavigate();
  const location = useLocation();
  
  // Trail graph for distance calculations
  const { graph } = useTrailGraph();
  
  // User preferences and state
  const { selectedCategories } = useUser();
  
  // URL parameters for group selection
  const searchParams = new URLSearchParams(location.search);
  const urlGroupParam = searchParams.get('group');
  const groupNameFromNav = urlGroupParam || location.state?.groupName || null;
  
  // Refs for scroll management
  const focusedGroupRef = React.useRef<HTMLDivElement>(null);
  
  // Modal state management
  const [filterBottomSheetOpen, setFilterBottomSheetOpen] = useState(false);
  const [googlePlacesModalOpen, setGooglePlacesModalOpen] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>('');
  const [selectedPoiName, setSelectedPoiName] = useState<string>('');

  /**
   * Filters POIs based on active trail and selected categories
   * Uses React.useMemo for performance optimization
   */
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

  // State for tracking the currently selected tag/group
  const [selectedTag, setSelectedTag] = useState<string | null>(groupNameFromNav);
  
  /**
   * Handles navigation to map view with POI focus
   * Creates a shareable URL with POI parameter and preserves simulation mode if active
   * 
   * @param poi - The POI to focus on the map
   */
  const handleShowOnMap = useCallback((poi: POI) => {
    // Navigate to map with POI parameter for shareable URL
    const searchParams = new URLSearchParams();
    const modeParam = location.search.match(/mode=([^&]+)/)?.[1];
    if (modeParam === 'sim') {
      searchParams.set('mode', 'sim');
    }
    searchParams.set('poi', poi.id.toString());
    
    const url = `/map?${searchParams.toString()}`;
    navigate(url);
  }, [location.search, navigate]);
  
  /**
   * Handle URL parameter changes for focused groups
   * Scrolls to the focused group when URL parameters change
   */
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
  
  /**
   * Handle navigation-based group selection and individual POI handling
   * If groupNameFromNav changes, update selectedTag and potentially open POI modal
   */
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
      
      if (isIndividualPOI && matchingPOI) {
        // Navigate to map view and zoom to the POI
        handleShowOnMap(matchingPOI);
      }
    }
  }, [groupNameFromNav, trailPois, handleShowOnMap]);

  /**
   * Groups POIs by their first tag for organized display
   * Uses React.useMemo for performance optimization
   */
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

  /**
   * Extracts unique tags from all POIs for filtering and navigation
   * Uses React.useMemo for performance optimization
   */
  const uniqueTags = React.useMemo(() => {
    const tags = new Set<string>();
    trailPois.forEach(poi => {
      poi.post_tags.forEach(tag => {
        tags.add(tag.name);
      });
    });
    return Array.from(tags);
  }, [trailPois]);

  /**
   * Calculates the network distance from user's current location to a POI
   * Uses the trail graph for accurate trail-based distance calculations
   * 
   * @param poi - The POI to calculate distance to
   * @returns Distance in meters, or null if calculation is not possible
   */
  const getDistance = (poi: POI): number | null => {
    if (!graph || !currentLocation || !poi.coordinates) return null;
    // Both currentLocation and poi.coordinates are already in [lng, lat] format
    const userCoords: [number, number] = [currentLocation[0], currentLocation[1]];
    const poiCoords: [number, number] = [poi.coordinates[0], poi.coordinates[1]];
    const distance = getNetworkDistanceBetweenPoints(graph, userCoords, poiCoords);
    return distance;
  };



  /**
   * Opens the Google Places modal for a POI
   * Sets the selected place ID and POI name for the modal
   * 
   * @param poi - The POI to show Google Places information for
   */
  const handleOpenGooglePlaces = (poi: POI) => {
    if (poi.google_place_id) {
      setSelectedPlaceId(poi.google_place_id);
      setSelectedPoiName(poi.title.rendered);
      setGooglePlacesModalOpen(true);
    }
  };

  /**
   * Handles clicking the "All" filter button
   * Updates both local state and URL parameters
   */
  const handleAllFilterClick = () => {
    setSelectedTag(null);
    
    // Update URL to remove group parameter while preserving other parameters
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete('group');
    
    const newUrl = `/list?${searchParams.toString()}`;
    navigate(newUrl, { replace: true });
  };

  /**
   * Handles clicking a specific group filter button
   * Updates both local state and URL parameters
   * 
   * @param tag - The tag/group name to filter by
   */
  const handleGroupFilterClick = (tag: string) => {
    setSelectedTag(tag);
    
    // Update URL to set group parameter while preserving other parameters
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('group', tag);
    
    const newUrl = `/list?${searchParams.toString()}`;
    navigate(newUrl, { replace: true });
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Tags Filter Section - Allows filtering POIs by their tags */}
      <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
          <Chip
            label="All"
            onClick={handleAllFilterClick}
            color={selectedTag === null ? 'primary' : 'default'}
          />
          {uniqueTags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              onClick={() => handleGroupFilterClick(tag)}
              color={selectedTag === tag ? 'primary' : 'default'}
            />
          ))}
        </Box>
      </Box>

      {/* Category Filter Summary - Shows active category filters and POI count */}
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

      {/* Main POI List - Scrollable container for POI items */}
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
            !selectedTag || groupName === selectedTag
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
                              {poi.google_place_id && poi.google_place_id !== 'none' && (
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
                                <Typography component="span" variant="subtitle1" sx={{ color: 'text.primary' }}>
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
                                {!poi.google_place_id && shouldShowGooglePlaceIdWarning(poi) && (
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



      {/* Filter Bottom Sheet - Modal for category filtering */}
      <FilterBottomSheet
        open={filterBottomSheetOpen}
        onClose={() => setFilterBottomSheetOpen(false)}
        onToggle={() => setFilterBottomSheetOpen(!filterBottomSheetOpen)}
        title="List Filters"
      />

      {/* Google Places Modal - Displays business information from Google Places API */}
      <GooglePlacesModal
        open={googlePlacesModalOpen}
        onClose={() => setGooglePlacesModalOpen(false)}
        placeId={selectedPlaceId}
        poiName={selectedPoiName}
      />
    </Box>
  );
};
