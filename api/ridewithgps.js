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

  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Route ID is required' });
  }

  try {
    console.log(`Fetching RideWithGPS route ${id}`);
    const apiUrl = `https://ridewithgps.com/routes/${id}.json`;
    const params = {
      version: 2,
      apikey: process.env.RIDEWITHGPS_API_KEY,
      auth_token: process.env.RIDEWITHGPS_AUTH_TOKEN
    };
    
    const response = await axios.get(apiUrl, { 
      params,
      timeout: 10000 // 10 second timeout
    });
    
    console.log(`Successfully fetched route ${id}`);
    res.status(200).json(response.data);
  } catch (error) {
    console.error(`Error fetching route ${id}:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch route data',
      details: error.message,
      status: error.response?.status
    });
  }
}; 