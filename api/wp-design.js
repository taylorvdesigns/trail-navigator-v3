require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const axios = require('axios');

// Proxies the WP Trail Navigator Config to provide active theme/config to the app
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const baseUrl = process.env.WP_BASE_URL || process.env.REACT_APP_WP_BASE_URL || 'https://srtmaps.elev8maps.com';
    const configUrl = `${baseUrl}/wp-json/trail-navigator/v1/config`;
    const { data } = await axios.get(configUrl, { timeout: 8000 });

    // Transform minimal WP config into theme schema if needed
    // WP returns: { systemName, trails: [{ routeId, name, color, ... }], apiUrl }
    // Map into a basic theme with light/dark mirroring same brand colors
    const trailColors = (data.trails || []).reduce((acc, t) => {
      if (t.routeId && t.color) acc[t.routeId] = t.color;
      return acc;
    }, {});

    const brand = {
      id: 'wp-active',
      name: data.systemName || 'Active Theme',
      variants: {
        light: {
          palette: {
            primary: { main: '#cf3100' },
            secondary: { main: '#1565C0' },
            warning: { main: '#FB8C00' },
            text: { primary: '#111111', secondary: '#4B5563' },
            background: { default: '#F6F7F9', paper: '#FFFFFF' }
          },
          trailColors
        },
        dark: {
          palette: {
            primary: { main: '#39FF14' },
            secondary: { main: '#6995E8' },
            warning: { main: '#FFB134' },
            text: { primary: '#FFFFFF', secondary: '#B0B0B0' },
            background: { default: '#23272A', paper: '#000000' }
          },
          trailColors
        }
      }
    };

    res.status(200).json(brand);
  } catch (error) {
    console.error('WP design fetch error:', error.message);
    res.status(200).json({
      id: 'fallback',
      name: 'Fallback Theme',
      variants: {
        light: {
          palette: {
            primary: { main: '#2E7D32' },
            secondary: { main: '#1565C0' },
            warning: { main: '#FB8C00' },
            text: { primary: '#111111', secondary: '#4B5563' },
            background: { default: '#F6F7F9', paper: '#FFFFFF' }
          },
          trailColors: {}
        },
        dark: {
          palette: {
            primary: { main: '#39FF14' },
            secondary: { main: '#6995E8' },
            warning: { main: '#FFB134' },
            text: { primary: '#FFFFFF', secondary: '#B0B0B0' },
            background: { default: '#23272A', paper: '#000000' }
          },
          trailColors: {}
        }
      }
    });
  }
};


