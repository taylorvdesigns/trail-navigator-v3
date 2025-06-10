const axios = require('axios');

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

  const { routeId } = req.query;

  try {
    // Use the correct RideWithGPS v1 API endpoint
    const apiUrl = `https://ridewithgps.com/api/v1/routes/${routeId}.json`;
    const params = {
      version: 2,
      apikey: process.env.RIDEWITHGPS_API_KEY,
      auth_token: process.env.RIDEWITHGPS_AUTH_TOKEN
    };
    
    console.log(`Fetching RideWithGPS route ${routeId}`);
    const response = await makeApiCall(apiUrl, {
      params,
      timeout: 10000
    });

    const duration = Date.now() - startTime;
    console.log(`RideWithGPS response status: ${response.status} - Duration: ${duration}ms`);

    res.status(200).json(response.data);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`RideWithGPS API Error (${duration}ms):`, error.message);
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
}; 