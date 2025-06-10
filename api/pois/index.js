const axios = require('axios');
const NodeCache = require('node-cache');

// Initialize cache with 5 minute TTL
const cache = new NodeCache({ 
  stdTTL: 300,
  checkperiod: 60,
  useClones: false
});

// Helper function for API calls with retries
async function makeApiCall(url, options, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios(url, options);
      return response;
    } catch (error) {
      lastError = error;
      if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after']) || Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      if (error.code === 'ECONNABORTED' || !error.response) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// Vercel serverless function handler
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
  
  try {
    // Fetch POIs from WordPress API
    const response = await makeApiCall('https://srtmaps.elev8maps.com/wp-json/geodir/v2/places', {
      params: {
        per_page: 100,
        page: 1,
        _embed: true
      },
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TrailNavigator/1.0'
      }
    });

    const pois = response.data.map(poi => ({
      id: poi.id,
      title: poi.title,
      content: poi.content,
      coordinates: [parseFloat(poi.longitude), parseFloat(poi.latitude)],
      post_tags: poi.post_tags || [],
      post_category: poi.post_category || [],
      description: poi.content?.rendered || '',
      featured_image: poi._embedded?.['wp:featuredmedia']?.[0]?.source_url || null
    }));

    res.status(200).json(pois);
  } catch (error) {
    console.error('WordPress API Error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch POIs',
      details: error.message,
      status: error.response?.status
    });
  }
}; 