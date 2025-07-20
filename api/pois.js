require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const axios = require('axios');
const NodeCache = require('node-cache');

// Initialize cache with 5 minute TTL
const cache = new NodeCache({ 
  stdTTL: 300,
  checkperiod: 60,
  useClones: false
});

// WordPress configuration
const WORDPRESS_URL = 'https://srtmaps.elev8maps.com';

module.exports = async (req, res) => {
  console.log('DEBUG: POI API endpoint hit');
  
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

  const cacheKey = 'pois_v4'; // Updated cache key to force refresh
  
  try {
    console.log('DEBUG: POI API called');
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log('DEBUG: Returning cached POI data');
      return res.json(cachedData);
    }
    console.log('DEBUG: No cached data, fetching from WordPress');

    // Fetch POIs from WordPress GeoDirectory API
    console.log('DEBUG: Fetching POIs from WordPress GeoDirectory API...');
    const response = await axios.get(`${WORDPRESS_URL}/wp-json/geodir/v2/places`, {
      params: {
        per_page: 100, // Get up to 100 POIs
        _embed: true   // Include featured images
      },
      timeout: 10000   // 10 second timeout
    });
    console.log('DEBUG: WordPress API response received, POI count:', response.data.length);
    console.log('DEBUG: First POI structure:', JSON.stringify(response.data[0], null, 2));

    // Transform GeoDirectory data to match our POI interface
    const pois = response.data.map(place => {
      // Debug: Log the first place to see what fields are available
      if (place.id === response.data[0].id) {
        console.log('DEBUG: First place structure:', JSON.stringify(place, null, 2));
        console.log('DEBUG: google_places_id value:', place.google_places_id);
      }
      
      const googlePlaceId = place.google_places_id || null;
      
      // Debug: Log the final google_place_id value for first place
      if (place.id === response.data[0].id) {
        console.log('DEBUG: Final google_place_id value:', googlePlaceId);
      }
      
      return {
        id: place.id.toString(),
        title: {
          rendered: decodeHTMLEntities(place.title.rendered),
          raw: place.title.raw
        },
        content: {
          rendered: decodeHTMLEntities(place.content.rendered),
          raw: place.content.raw
        },
        description: decodeHTMLEntities(place.content.rendered || ''),
        coordinates: [
          parseFloat(place.longitude || 0),
          parseFloat(place.latitude || 0)
        ],
        post_tags: place.post_tags || [],
        post_category: place.post_category || [],
        amenities: [], // GeoDirectory doesn't have amenities field in the same format
        featured_image: place.featured_image?.[0] || null,
        google_place_id: googlePlaceId
      };
    }).filter(poi => poi.coordinates[0] !== 0 && poi.coordinates[1] !== 0); // Filter out POIs without coordinates

    // Cache the response
    cache.set(cacheKey, pois);
    res.json(pois);
  } catch (error) {
    console.error('Error fetching POIs from WordPress:', error);
    console.log('DEBUG: Using fallback POI data due to WordPress API error');
    
    // Fallback to sample data if WordPress API fails
    const fallbackPois = [
      {
        id: "1",
        title: {
          rendered: "Unity Park",
          raw: "Unity Park"
        },
        content: {
          rendered: "A beautiful park with walking trails and amenities",
          raw: "A beautiful park with walking trails and amenities"
        },
        description: "A beautiful park with walking trails and amenities",
        coordinates: [34.8507, -82.3988],
        post_tags: [{ id: 25, name: "Unity Park", slug: "unity-park" }],
        post_category: [{ id: 1, name: "Park", slug: "park" }],
        amenities: ["restroom", "playground", "picnic"],
        featured_image: null,
        google_place_id: null // No Google Place ID for fallback data
      },
      {
        id: "2",
        title: {
          rendered: "Downtown Cafe",
          raw: "Downtown Cafe"
        },
        content: {
          rendered: "A cozy cafe with great coffee and food",
          raw: "A cozy cafe with great coffee and food"
        },
        description: "A cozy cafe with great coffee and food",
        coordinates: [34.8510, -82.3970],
        post_tags: [{ id: 26, name: "Downtown", slug: "downtown" }],
        post_category: [{ id: 2, name: "Food", slug: "food" }],
        amenities: ["food", "cafe", "restroom"],
        featured_image: null,
        google_place_id: null // No Google Place ID for fallback data
      },
      {
        id: "3",
        title: {
          rendered: "Trail Junction",
          raw: "Trail Junction"
        },
        content: {
          rendered: "A major junction connecting multiple trails",
          raw: "A major junction connecting multiple trails"
        },
        description: "A major junction connecting multiple trails",
        coordinates: [34.8490, -82.3990],
        post_tags: [{ id: 27, name: "Junction", slug: "junction" }],
        post_category: [{ id: 3, name: "Landmark", slug: "landmark" }],
        amenities: ["restroom", "water"],
        featured_image: null,
        google_place_id: null // No Google Place ID for fallback data
      },
      {
        id: "4",
        title: {
          rendered: "Test Restaurant with Google Place ID",
          raw: "Test Restaurant with Google Place ID"
        },
        content: {
          rendered: "A test restaurant to verify Google Places integration",
          raw: "A test restaurant to verify Google Places integration"
        },
        description: "A test restaurant to verify Google Places integration",
        coordinates: [34.8515, -82.3985],
        post_tags: [{ id: 28, name: "Test", slug: "test" }],
        post_category: [{ id: 4, name: "Restaurant", slug: "restaurant" }],
        amenities: ["food", "restaurant"],
        featured_image: null,
        google_place_id: "ChIJN7K6oEElWIgR0TC4k3iJ970" // Sample Google Place ID for testing (using your actual Place ID)
      }
    ];
    
    res.json(fallbackPois);
  }
};

// Helper function to decode HTML entities
function decodeHTMLEntities(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#038;/g, '&')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—');
} 