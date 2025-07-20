import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Rating,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Phone as PhoneIcon,
  Language as WebsiteIcon,
  AccessTime as TimeIcon,
  Star as StarIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { api } from '../../services/api';

interface GooglePlacesDetails {
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  business_status?: string;
  opening_hours?: {
    open_now: boolean;
    periods?: any[];
    weekday_text?: string[];
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
    html_attributions: string[];
  }>;
  reviews?: Array<{
    author_name?: string;
    rating: number;
    relative_time_description?: string;
    relativePublishTimeDescription?: string;
    text: string | { text: string; languageCode: string };
    authorAttribution?: {
      displayName: string;
    };
  }>;
  review_summary?: {
    text: string;
    disclosure: string;
  };
}

interface GooglePlacesModalProps {
  open: boolean;
  onClose: () => void;
  placeId: string;
  poiName: string;
}

export const GooglePlacesModal: React.FC<GooglePlacesModalProps> = ({
  open,
  onClose,
  placeId,
  poiName
}) => {
  const [details, setDetails] = useState<GooglePlacesDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && placeId) {
      fetchPlaceDetails();
    }
  }, [open, placeId]);

  const fetchPlaceDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getGooglePlacesDetails(placeId);
      setDetails(data);
    } catch (err: any) {
      console.error('Error fetching Google Places details:', err);
      setError(err.response?.data?.error || 'Failed to fetch place details');
    } finally {
      setLoading(false);
    }
  };

  const getPriceLevelText = (level?: number) => {
    if (!level) return '';
    return '$'.repeat(level);
  };

  const getBusinessStatusColor = (status?: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return 'success';
      case 'CLOSED_TEMPORARILY':
        return 'warning';
      case 'CLOSED_PERMANENTLY':
        return 'error';
      default:
        return 'default';
    }
  };

  const handlePhoneClick = () => {
    if (details?.formatted_phone_number) {
      window.open(`tel:${details.formatted_phone_number}`);
    }
  };

  const handleWebsiteClick = () => {
    if (details?.website) {
      window.open(details.website, '_blank');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'grey.900',
          color: 'common.white'
        }
      }}
    >
      <DialogTitle sx={{ pr: 6, textAlign: 'center', fontWeight: 700, fontSize: '1.3rem' }}>
        {details?.name || poiName}
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8, color: 'common.white' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {details && !loading && (
          <Box>
            {/* Address */}
            {details.formatted_address && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LocationIcon color="primary" />
                <Typography variant="body1">
                  {details.formatted_address}
                </Typography>
              </Box>
            )}

            {/* Review Summary */}
            {details.review_summary && details.review_summary.text && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1" sx={{ mb: 1, fontStyle: 'italic' }}>
                  {details.review_summary.text}
                </Typography>
                {details.review_summary.disclosure && (
                  <Typography variant="caption" color="text.secondary">
                    {details.review_summary.disclosure}
                  </Typography>
                )}
              </Box>
            )}

            {/* Rating and Price Level */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              {details.rating && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Rating value={details.rating} readOnly size="small" />
                  <Typography variant="body2">
                    ({details.user_ratings_total} reviews)
                  </Typography>
                </Box>
              )}
              {details.price_level && (
                <Chip 
                  label={getPriceLevelText(details.price_level)} 
                  size="small" 
                  color="primary" 
                />
              )}
              {details.business_status && (
                <Chip 
                  label={details.business_status.replace('_', ' ')} 
                  size="small" 
                  sx={{
                    bgcolor: 'grey.700',
                    color: 'common.white',
                    '& .MuiChip-label': {
                      color: 'common.white'
                    }
                  }}
                />
              )}
            </Box>

            {/* Contact Information */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
              {details.formatted_phone_number && (
                <Button
                  startIcon={<PhoneIcon />}
                  onClick={handlePhoneClick}
                  sx={{ justifyContent: 'flex-start', color: 'primary.light' }}
                >
                  {details.formatted_phone_number}
                </Button>
              )}
              {details.website && (
                <Button
                  startIcon={<WebsiteIcon />}
                  onClick={handleWebsiteClick}
                  sx={{ justifyContent: 'flex-start', color: 'primary.light' }}
                >
                  Visit Website
                </Button>
              )}
            </Box>

            {/* Opening Hours */}
            {details.opening_hours && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TimeIcon color="primary" />
                  <Typography variant="subtitle1">Hours</Typography>
                  <Chip 
                    label={details.opening_hours.open_now ? 'Open Now' : 'Closed'} 
                    size="small" 
                    color={details.opening_hours.open_now ? 'success' : 'error'}
                  />
                </Box>
                {details.opening_hours.weekday_text && (
                  <Box sx={{ pl: 3 }}>
                    {details.opening_hours.weekday_text.map((day, index) => (
                      <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                        {day}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* Types */}
            {details.types && details.types.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Categories</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {details.types.slice(0, 8).map((type, index) => (
                    <Chip 
                      key={index} 
                      label={type.replace(/_/g, ' ')} 
                      size="small" 
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Reviews */}
            {details.reviews && details.reviews.length > 0 && (
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Recent Reviews</Typography>
                {details.reviews.map((review, index) => {
                  // Handle new API text structure
                  const reviewText = typeof review.text === 'string' 
                    ? review.text 
                    : review.text?.text || '';
                  
                  // Handle new API author structure
                  const authorName = review.author_name || review.authorAttribution?.displayName || 'Anonymous';
                  
                  // Handle new API time structure
                  const timeDescription = review.relative_time_description || review.relativePublishTimeDescription || '';
                  
                  return (
                    <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.800', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Rating value={review.rating} readOnly size="small" />
                        <Typography variant="body2" color="text.secondary">
                          by {authorName} • {timeDescription}
                        </Typography>
                      </Box>
                      <Typography variant="body2">
                        {reviewText.length > 200 
                          ? `${reviewText.substring(0, 200)}...` 
                          : reviewText
                        }
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} sx={{ color: 'success.light' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 