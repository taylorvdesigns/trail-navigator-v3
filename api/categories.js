require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const axios = require('axios');
const NodeCache = require('node-cache');

// Initialize cache with 10 minute TTL
const cache = new NodeCache({ 
  stdTTL: 600,
  checkperiod: 120,
  useClones: false
});

// WordPress configuration
const WORDPRESS_URL = process.env.WP_BASE_URL || process.env.REACT_APP_WP_BASE_URL || 'https://srtmaps.elev8maps.com';

module.exports = async (req, res) => {
  console.log('DEBUG: Categories API endpoint hit');
  
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

  const cacheKey = 'categories_v1';
  
  try {
    console.log('DEBUG: Categories API called');
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log('DEBUG: Returning cached categories data');
      return res.json(cachedData);
    }
    console.log('DEBUG: No cached data, fetching from WordPress');

    // Fetch categories from WordPress GeoDirectory API
    console.log('DEBUG: Fetching categories from WordPress GeoDirectory API...');
    const response = await axios.get(`${WORDPRESS_URL}/wp-json/geodir/v2/places/categories`, {
      timeout: 10000   // 10 second timeout
    });
    console.log('DEBUG: WordPress categories API response received, category count:', response.data.length);

    // Transform the data to include icon information
    const categories = response.data.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      count: category.count,
      fa_icon: category.fa_icon || null,
      fa_icon_color: category.fa_icon_color || null,
      icon_src: category.icon?.src || null
    })).filter(category => category.count > 0); // Only include categories with POIs

    console.log('DEBUG: Processed categories:', categories.length);

    // Cache the response
    cache.set(cacheKey, categories);
    console.log('DEBUG: Categories cached successfully');

    res.json(categories);
  } catch (error) {
    console.error('DEBUG: Error fetching categories:', error.message);
    
    if (axios.isAxiosError(error)) {
      console.error('DEBUG: Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      return res.status(error.response?.status || 500).json({
        error: 'Failed to fetch categories',
        details: error.response?.data || error.message
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}; 