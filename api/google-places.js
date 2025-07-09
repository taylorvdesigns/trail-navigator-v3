const axios = require('axios');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { placeId } = req.query;

  console.log('DEBUG: Google Places API called with placeId:', placeId);

  if (!placeId) {
    return res.status(400).json({ error: 'Place ID is required' });
  }

  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  
  console.log('DEBUG: Google API key available:', !!googleApiKey);
  console.log('DEBUG: Google API key length:', googleApiKey ? googleApiKey.length : 0);
  console.log('DEBUG: Google API key first 10 chars:', googleApiKey ? googleApiKey.substring(0, 10) + '...' : 'none');

  if (!googleApiKey) {
    return res.status(500).json({ error: 'Google Places API key not configured' });
  }

  try {
    console.log('DEBUG: Making Google Places API request for placeId:', placeId);
    
    // Fetch place details from Google Places API
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        key: googleApiKey,
        fields: 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,photos,reviews,price_level,types,business_status'
      },
      timeout: 10000
    });
    
    console.log('DEBUG: Google Places API response status:', response.data.status);

    if (response.data.status !== 'OK') {
      return res.status(400).json({ 
        error: 'Failed to fetch place details', 
        status: response.data.status,
        message: response.data.error_message || 'Unknown error'
      });
    }

    const placeDetails = response.data.result;

    // Transform the response to include only necessary fields
    const transformedDetails = {
      name: placeDetails.name,
      formatted_address: placeDetails.formatted_address,
      formatted_phone_number: placeDetails.formatted_phone_number,
      website: placeDetails.website,
      rating: placeDetails.rating,
      user_ratings_total: placeDetails.user_ratings_total,
      price_level: placeDetails.price_level,
      types: placeDetails.types,
      business_status: placeDetails.business_status,
      opening_hours: placeDetails.opening_hours ? {
        open_now: placeDetails.opening_hours.open_now,
        periods: placeDetails.opening_hours.periods,
        weekday_text: placeDetails.opening_hours.weekday_text
      } : null,
      photos: placeDetails.photos ? placeDetails.photos.slice(0, 5).map(photo => ({
        photo_reference: photo.photo_reference,
        height: photo.height,
        width: photo.width,
        html_attributions: photo.html_attributions
      })) : [],
      reviews: placeDetails.reviews ? placeDetails.reviews.slice(0, 3).map(review => ({
        author_name: review.author_name,
        rating: review.rating,
        relative_time_description: review.relative_time_description,
        text: review.text
      })) : []
    };

    res.json(transformedDetails);
  } catch (error) {
    console.error('Error fetching Google Places details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch place details',
      message: error.message 
    });
  }
}; 