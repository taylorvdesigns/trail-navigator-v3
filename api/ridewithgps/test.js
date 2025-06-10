module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    message: 'Test endpoint working',
    query: req.query,
    env: {
      hasApiKey: !!process.env.RIDEWITHGPS_API_KEY,
      hasAuthToken: !!process.env.RIDEWITHGPS_AUTH_TOKEN
    }
  });
}; 