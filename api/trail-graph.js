// API endpoint to build and return the trail network graph using real trail geometry

const TRAIL_ROUTES = [
  {
    id: 'main-trail',
    routeId: '51203086',
    name: 'Main Trail',
    color: '#43D633',
    type: 'main',
    endpointNames: ['Greenville', 'Furman University']
  },
  {
    id: 'spur-trail',
    routeId: '51203084',
    name: 'Spur Trail',
    color: '#6995E8',
    type: 'spur',
    endpointNames: ['Downtown Greenville', 'Unity Park']
  },
  {
    id: 'orange-spur',
    routeId: '51203945',
    name: 'Orange Spur',
    color: '#FFB134',
    type: 'spur',
    endpointNames: ['Unity Park', 'Furman University']
  }
];

import axios from 'axios';

// Haversine distance in meters
function haversine(a, b) {
  const toRad = x => (x * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);
  const aVal = Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

// Build a graph from real trail geometry
function buildTrailGraphFromPoints(trailsWithPoints) {
  const nodes = {};
  const edges = {};
  
  // First pass: add all nodes
  trailsWithPoints.forEach(trail => {
    const points = trail.points;
    // Add each point as a node
    points.forEach((pt, idx) => {
      const nodeId = `${trail.id}-pt-${idx}`;
      nodes[nodeId] = {
        id: nodeId,
        type: idx === 0 ? 'endpoint' : (idx === points.length - 1 ? 'endpoint' : 'point'),
        name: idx === 0 ? trail.endpointNames?.[0] || 'Start' : (idx === points.length - 1 ? trail.endpointNames?.[1] || 'End' : ''),
        position: [pt.longitude, pt.latitude],
        trailId: trail.id
      };
    });
  });
  
  // Second pass: add edges within each trail
  trailsWithPoints.forEach(trail => {
    const points = trail.points;
    points.forEach((pt, idx) => {
      const nodeId = `${trail.id}-pt-${idx}`;
      // Add edge to previous point
      if (idx > 0) {
        const prevId = `${trail.id}-pt-${idx - 1}`;
        const dist = haversine([pt.longitude, pt.latitude], [points[idx - 1].longitude, points[idx - 1].latitude]);
        if (!edges[prevId]) edges[prevId] = [];
        if (!edges[nodeId]) edges[nodeId] = [];
        edges[prevId].push({ from: prevId, to: nodeId, distance: dist, trailId: trail.id });
        edges[nodeId].push({ from: nodeId, to: prevId, distance: dist, trailId: trail.id });
      }
    });
  });
  
  // Third pass: detect and create junctions between trails
  const junctionThreshold = 50; // meters - trails within this distance are considered connected
  const processedPairs = new Set();
  
  for (let i = 0; i < trailsWithPoints.length; i++) {
    for (let j = i + 1; j < trailsWithPoints.length; j++) {
      const trail1 = trailsWithPoints[i];
      const trail2 = trailsWithPoints[j];
      const pairKey = `${trail1.id}-${trail2.id}`;
      
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);
      
      // Check every 10th point for efficiency
      for (let k = 0; k < trail1.points.length; k += 10) {
        const point1 = trail1.points[k];
        const node1Id = `${trail1.id}-pt-${k}`;
        
        for (let l = 0; l < trail2.points.length; l += 10) {
          const point2 = trail2.points[l];
          const node2Id = `${trail2.id}-pt-${l}`;
          
          const distance = haversine([point1.longitude, point1.latitude], [point2.longitude, point2.latitude]);
          
          if (distance <= junctionThreshold) {
            // Create bidirectional connection
            if (!edges[node1Id]) edges[node1Id] = [];
            if (!edges[node2Id]) edges[node2Id] = [];
            
            edges[node1Id].push({ 
              from: node1Id, 
              to: node2Id, 
              distance: distance, 
              trailId: 'junction',
              isJunction: true 
            });
            edges[node2Id].push({ 
              from: node2Id, 
              to: node1Id, 
              distance: distance, 
              trailId: 'junction',
              isJunction: true 
            });
            
            // Mark nodes as junctions
            nodes[node1Id].type = 'junction';
            nodes[node2Id].type = 'junction';
          }
        }
      }
    }
  }
  
  return { nodes, edges };
}

export default async function handler(req, res) {
  console.log('[DEBUG] /api/trail-graph.js endpoint hit');
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for required environment variables
  const requiredEnvVars = {
    RIDEWITHGPS_API_KEY: process.env.RIDEWITHGPS_API_KEY,
    RIDEWITHGPS_AUTH_TOKEN: process.env.RIDEWITHGPS_AUTH_TOKEN
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error('Missing environment variables:', missingVars);
    return res.status(500).json({ 
      error: 'Missing environment variables', 
      missing: missingVars,
      message: 'Please set the required environment variables in your Vercel dashboard'
    });
  }

  try {
    // Fetch real trail geometry for each trail
    const trailsWithPoints = [];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    for (const trail of TRAIL_ROUTES) {
      const apiUrl = `https://ridewithgps.com/routes/${trail.routeId}.json`;
      const params = {
        version: 2,
        apikey: process.env.RIDEWITHGPS_API_KEY,
        auth_token: process.env.RIDEWITHGPS_AUTH_TOKEN
      };
      console.log('Fetching RideWithGPS API:', apiUrl, params);
      const response = await axios.get(apiUrl, { params, timeout: 10000 });
      const data = response.data;
      if (!data.route || !data.route.track_points) {
        throw new Error(`Invalid trail data format for ${trail.id}`);
      }
      const points = data.route.track_points.map(pt => ({
        latitude: pt.y,
        longitude: pt.x,
        elevation: pt.e,
        distance: pt.d || 0
      }));
      trailsWithPoints.push({ ...trail, points });
    }
    const graph = buildTrailGraphFromPoints(trailsWithPoints);
    return res.status(200).json(graph);
  } catch (error) {
    console.error('Error building trail graph:', error);
    return res.status(500).json({ error: 'Failed to build trail graph', details: error.message, stack: error.stack });
  }
}