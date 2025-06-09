const axios = require('axios');
const NodeCache = require('node-cache');

// Initialize cache with 5 minute TTL
const cache = new NodeCache({ 
  stdTTL: 300,
  checkperiod: 60,
  useClones: false
});

// Vercel serverless function handler
export default async function handler(req, res) {
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

    // TODO: Replace with your actual POIs data source
    const pois = [
      {
        id: 1,
        name: "Sample POI 1",
        type: "restaurant",
        coordinates: [34.8507, -82.3988],
        description: "A sample point of interest"
      },
      // Add more sample POIs as needed
    ];

    // Cache the response
    cache.set(cacheKey, pois);
    res.json(pois);
  } catch (error) {
    console.error('Error fetching POIs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch POIs',
      details: error.message
    });
  }
} 