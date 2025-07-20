require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

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
    
    // Use the NEW Google Places API endpoint
    const response = await axios.get(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'name,displayName,formattedAddress,rating,userRatingCount,priceLevel,types,businessStatus,regularOpeningHours,websiteUri,reviews,photos,reviewSummary'
      },
      timeout: 10000
    });
    
    console.log('DEBUG: Google Places API response status:', response.status);
    console.log('DEBUG: Google Places API response data:', JSON.stringify(response.data, null, 2));

    const placeDetails = response.data;

    // Transform the response to match the expected format
    const transformedDetails = {
      name: (placeDetails.displayName && placeDetails.displayName.text) ? placeDetails.displayName.text : (placeDetails.displayName || placeDetails.name),
      formatted_address: placeDetails.formattedAddress,
      formatted_phone_number: null, // Not available in new API
      website: placeDetails.websiteUri,
      rating: placeDetails.rating,
      user_ratings_total: placeDetails.userRatingCount,
      price_level: placeDetails.priceLevel,
      types: placeDetails.types,
      business_status: placeDetails.businessStatus,
      opening_hours: placeDetails.regularOpeningHours ? {
        open_now: placeDetails.regularOpeningHours.openNow,
        periods: placeDetails.regularOpeningHours.periods,
        weekday_text: placeDetails.regularOpeningHours.weekdayDescriptions
      } : null,
      photos: placeDetails.photos || [],
      reviews: placeDetails.reviews || [],
      review_summary: placeDetails.reviewSummary ? {
        text: placeDetails.reviewSummary.text?.text || '',
        disclosure: placeDetails.reviewSummary.disclosureText?.text || ''
      } : null
    };

    res.json(transformedDetails);
  } catch (error) {
    console.error('Error fetching Google Places details:', error);
    
    // Handle the new API error format
    if (error.response) {
      console.log('DEBUG: Google Places API error response:', error.response.data);
      console.log('DEBUG: Google Places API error details:', JSON.stringify(error.response.data, null, 2));
      return res.status(400).json({ 
        error: 'Failed to fetch place details', 
        status: error.response.status,
        message: error.response.data.error?.message || error.response.data.message || 'Unknown error'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch place details',
      message: error.message 
    });
  }
}; 