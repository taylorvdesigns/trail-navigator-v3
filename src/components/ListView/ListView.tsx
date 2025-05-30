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
import { POI } from '../../types';
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
    onPoiClick(poi);
  };

  const handleShowOnMap = () => {
    if (selectedPOI?.coordinates) {
      navigate('/', { state: { center: selectedPOI.coordinates, zoom: 17 } });
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
            <DialogTitle sx={{ pr: 6 }}>
              {selectedPOI.title.rendered}
              <IconButton
                onClick={() => setSelectedPOI(null)}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              {selectedPOI.description && (
                <Typography variant="body1" component="div">
                  {selectedPOI.description}
                </Typography>
              )}
              {selectedPOI.content && (
                <Box sx={{ mt: 2 }}>
                  {selectedPOI.content.rendered && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body1" component="div" sx={{ mb: 2 }}>
                        {selectedPOI.content.rendered}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" component="div" color="text.secondary">
                  Categories
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {selectedPOI.post_category.map(cat => (
                    <Chip key={cat.id} label={cat.name} size="small" />
                  ))}
                </Box>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" component="div" color="text.secondary">
                  Tags
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {selectedPOI.post_tags.map(tag => (
                    <Chip key={tag.id} label={tag.name} size="small" />
                  ))}
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedPOI(null)}>Close</Button>
              <Button 
                onClick={handleShowOnMap} 
                variant="contained" 
                startIcon={<PlaceIcon />}
                disabled={!selectedPOI.coordinates}
              >
                Show on Map
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};
