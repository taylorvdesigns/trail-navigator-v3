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
  res.status(200).json({ message: "Test function is working!", routeId: req.query.routeId });
}; 