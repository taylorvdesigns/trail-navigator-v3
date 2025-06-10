const axios = require('axios');

module.exports = async (req, res) => {
  try {
    const apiUrl = 'https://ridewithgps.com/api/v1/routes/50608713.json';
    const params = {
      version: 2,
      apikey: process.env.RIDEWITHGPS_API_KEY,
      auth_token: process.env.RIDEWITHGPS_AUTH_TOKEN
    };
    const response = await axios.get(apiUrl, { params });
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
}; 