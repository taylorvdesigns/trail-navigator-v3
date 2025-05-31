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
  DirectionsWalk as WalkIcon
} from '@mui/icons-material';
import { POI } from '../../types/index';
import { useNavigate } from 'react-router-dom';
import { calculateDistance } from '../../utils/distance';

interface ListViewProps {
  pois: POI[];
  selectedGroup?: string;
  onPoiClick: (poi: POI) => void;
  currentLocation?: [number, number] | null;
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
  currentLocation 
}) => {
  const navigate = useNavigate();
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const groupedPois = React.useMemo(() => {
    return pois.reduce((acc: GroupedPOIs, poi) => {
      const groupName = poi.post_tags[0]?.name || 'Ungrouped';
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(poi);
      return acc;
    }, {});
  }, [pois]);

  const uniqueTags = React.useMemo(() => {
    const tags = new Set<string>();
    pois.forEach(poi => {
      poi.post_tags.forEach(tag => {
        tags.add(tag.name);
      });
    });
    return Array.from(tags);
  }, [pois]);

  const getDistance = (poi: POI): number | null => {
    if (!currentLocation || !poi.coordinates) return null;
    
    try {
      return calculateDistance(
        currentLocation[0],
        currentLocation[1],
        poi.coordinates[0],
        poi.coordinates[1]
      );
    } catch (error) {
      console.error('Error calculating distance:', error);
      return null;
    }
  };

  const handlePoiClick = (poi: POI) => {
    setSelectedPOI(poi);
    // onPoiClick(poi); // No longer needed for navigation
  };

  const handleShowOnMap = () => {
    if (selectedPOI?.coordinates) {
      const latLng = [selectedPOI.coordinates[1], selectedPOI.coordinates[0]];
      console.log('Navigating to map with center:', latLng, 'zoom: 17');
      navigate('/', { state: { center: latLng, zoom: 17, highlightPOI: latLng } });
      setSelectedPOI(null);
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
                                <Typography component="span" variant="subtitle1">
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
                                      {(distance / 1609.34).toFixed(1)} mi
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
                onClick={handleShowOnMap} 
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
    </Box>
  );
};
