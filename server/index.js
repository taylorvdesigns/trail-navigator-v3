const express = require('express');
// Uncommented dotenv to test if it causes the 431 error
const app = express();
const port = process.env.PORT || 4000;
require('dotenv').config();

const cors = require('cors');
const axios = require('axios');
const path = require('path');
const NodeCache = require('node-cache');
const WebSocket = require('ws');

// Initialize cache with 5 minute TTL
const cache = new NodeCache({ 
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every minute
  useClones: false // Store references instead of cloning
});

// Add request logging middleware first
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Add request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(10000);
  next();
});

// Add request size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.static(path.join(__dirname, '../public')));

// Create WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Track WebSocket connections
const connections = new Set();

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established');
  connections.add(ws);

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    connections.delete(ws);
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    connections.delete(ws);
  });

  ws.on('message', (message) => {
    try {
      console.log('WebSocket message received:', message.toString());
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
});

// Add memory usage logging
setInterval(() => {
  const used = process.memoryUsage();
  console.log('Memory usage:', {
    rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(used.external / 1024 / 1024)}MB`
  });
  console.log('Active WebSocket connections:', connections.size);
}, 30000);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  console.error('Stack trace:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.error('Stack trace:', err.stack);
  console.error('Active WebSocket connections at crash:', connections.size);
  // Give time for error logging before exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  console.error('Active WebSocket connections at rejection:', connections.size);
  if (reason instanceof Error) {
    console.error('Stack trace:', reason.stack);
  }
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
      if (error.response?.status === 429) { // Rate limit
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

// API Routes
app.get('/api/ridewithgps/:routeId', async (req, res) => {
  const startTime = Date.now();
  const { routeId } = req.params;
  const cacheKey = `ridewithgps:${routeId}`;

  try {
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for route ${routeId}`);
      return res.json(cachedData);
    }

    const apiUrl = `https://ridewithgps.com/routes/${routeId}.json`;
    const params = {
      version: 2,
      apikey: process.env.RIDEWITHGPS_API_KEY,
      auth_token: process.env.RIDEWITHGPS_AUTH_TOKEN
    };
    
    console.log(`Fetching RideWithGPS route ${routeId}`);
    const response = await makeApiCall(apiUrl, { 
      params,
      timeout: 10000 // Increased timeout to 10 seconds
    });

    const duration = Date.now() - startTime;
    console.log(`RideWithGPS response status: ${response.status} - Duration: ${duration}ms`);

    // Cache the response
    cache.set(cacheKey, response.data);
    res.json(response.data);
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
});

app.get('/api/pois', async (req, res) => {
  const startTime = Date.now();
  const cacheKey = 'pois';

  try {
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log('Cache hit for POIs');
      return res.json(cachedData);
    }

    console.log('Fetching POIs from WordPress API');
    const response = await makeApiCall('https://srtmaps.elev8maps.com/wp-json/geodir/v2/places', {
      params: {
        per_page: 100,
        page: 1
      },
      timeout: 10000, // Increased timeout to 10 seconds
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TrailNavigator/1.0'
      }
    });
    
    const pois = response.data.map(poi => ({
      id: poi.id,
      title: poi.title,
      content: poi.content,
      coordinates: [parseFloat(poi.latitude), parseFloat(poi.longitude)],
      post_tags: poi.post_tags || [],
      post_category: poi.post_category || [],
      description: poi.content?.rendered || '',
      featured_image: poi.featured_image || null
    }));

    const duration = Date.now() - startTime;
    console.log(`Successfully fetched ${pois.length} POIs - Duration: ${duration}ms`);

    // Cache the response
    cache.set(cacheKey, pois);
    res.json(pois);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`WordPress API Error (${duration}ms):`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received');
    }
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch POIs', 
      details: error.message,
      status: error.response?.status
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version,
    cacheStats: cache.getStats()
  };
  res.json(health);
});

// Minimal test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

// Start the server
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Node version:', process.version);
  console.log('Environment:', process.env.NODE_ENV || 'development');
});

// Handle WebSocket upgrade with error handling
server.on('upgrade', (request, socket, head) => {
  console.log('WebSocket upgrade requested');
  try {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } catch (error) {
    console.error('WebSocket upgrade error:', error);
    socket.destroy();
  }
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  console.log('Closing WebSocket connections:', connections.size);
  wss.close(() => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  console.log('Closing WebSocket connections:', connections.size);
  wss.close(() => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

process.on('exit', (code) => {
  console.log('Process exit event with code:', code);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT');
}); 