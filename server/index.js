const express = require('express');
// Uncommented dotenv to test if it causes the 431 error
const app = express();
const port = process.env.PORT || 3001;
require('dotenv').config();

const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));

const axios = require('axios');
app.get('/api/ridewithgps/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    const apiUrl = `https://ridewithgps.com/routes/${routeId}.json`;
    const params = {
      version: 2,
      apikey: process.env.RIDEWITHGPS_API_KEY,
      auth_token: process.env.RIDEWITHGPS_AUTH_TOKEN
    };
    
    console.log(`Fetching RideWithGPS route ${routeId}`);
    console.log('API URL:', apiUrl);
    console.log('Has API Key:', !!params.apikey);
    console.log('Has Auth Token:', !!params.auth_token);
    
    const response = await axios.get(apiUrl, { params });
    console.log('RideWithGPS response status:', response.status);
    res.json(response.data);
  } catch (error) {
    console.error('RideWithGPS API Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received');
    }
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch route data', 
      details: error.message,
      status: error.response?.status
    });
  }
});

app.get('/api/pois', async (req, res) => {
  try {
    console.log('Fetching POIs from WordPress API');
    const response = await axios.get('https://srtmaps.elev8maps.com/wp-json/geodir/v2/places', {
      params: {
        per_page: 100, // Request up to 100 POIs
        page: 1
      },
      timeout: 5000, // 5 second timeout
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TrailNavigator/1.0'
      }
    });
    
    // Transform the data to match our POI type
    const pois = response.data.map(poi => {
      const latitude = parseFloat(poi.latitude);
      const longitude = parseFloat(poi.longitude);
      
      return {
        id: poi.id.toString(),
        title: poi.title,
        content: poi.content,
        description: poi.content?.rendered || '',
        coordinates: [longitude, latitude], // [longitude, latitude]
        latitude,
        longitude,
        post_tags: poi.post_tags || [],
        post_category: poi.post_category || [],
        amenities: poi.amenities || [],
        featured_image: poi.featured_image?.src || null
      };
    });
    
    console.log(`Successfully fetched ${pois.length} POIs`);
    res.json(pois);
  } catch (error) {
    console.error('WordPress API Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch POI data', 
      details: error.message 
    });
  }
});

// Minimal test endpoint only
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 