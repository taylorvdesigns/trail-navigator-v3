const axios = require('axios');

module.exports = async (req, res) => {
  const { id } = req.query;
  try {
    const apiUrl = `https://ridewithgps.com/routes/${id}.json`;
    const params = {
      version: 2,
      apikey: process.env.RIDEWITHGPS_API_KEY,
      auth_token: process.env.RIDEWITHGPS_AUTH_TOKEN
    };
    const response = await axios.get(apiUrl, { params });
    res.status(200).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch route data',
      details: error.message,
      status: error.response?.status
    });
  }
}; 