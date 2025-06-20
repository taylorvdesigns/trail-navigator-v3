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

  const cacheKey = 'pois';
  
  try {
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Fetch POIs from WordPress API
    const response = await axios.get(`${WORDPRESS_URL}/wp-json/wp/v2/poi`, {
      params: {
        per_page: 100, // Get up to 100 POIs
        _embed: true   // Include featured images
      },
      timeout: 10000   // 10 second timeout
    });

    // Transform WordPress data to match our POI interface
    const pois = response.data.map(post => ({
      id: post.id.toString(),
      title: {
        rendered: decodeHTMLEntities(post.title.rendered),
        raw: post.title.raw
      },
      content: {
        rendered: decodeHTMLEntities(post.content.rendered),
        raw: post.content.raw
      },
      description: decodeHTMLEntities(post.excerpt?.rendered || ''),
      coordinates: [
        parseFloat(post.meta?.longitude || 0),
        parseFloat(post.meta?.latitude || 0)
      ],
      post_tags: post._embedded?.['wp:term']?.[0] || [],
      post_category: post._embedded?.['wp:term']?.[1] || [],
      amenities: post.meta?.amenities ? JSON.parse(post.meta.amenities) : [],
      featured_image: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null
    })).filter(poi => poi.coordinates[0] !== 0 && poi.coordinates[1] !== 0); // Filter out POIs without coordinates

    // Cache the response
    cache.set(cacheKey, pois);
    res.json(pois);
  } catch (error) {
    console.error('Error fetching POIs from WordPress:', error);
    
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
        featured_image: null
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
        featured_image: null
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
        featured_image: null
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