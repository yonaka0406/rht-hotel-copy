//Database connection configuration
require('dotenv').config({ path: './api/.env' });
const { Pool } = require('pg');
const url = require('url');

// Create both pools
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  max: 50,
  idleTimeoutMillis: 2000,
  connectionTimeoutMillis: 2000,
});

const prodPool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PROD_PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  max: 50,
  idleTimeoutMillis: 2000,
  connectionTimeoutMillis: 2000,
});

// Create request-specific environment detection namespace
const requestEnv = new Map();

// This will be a unique ID per request
let requestCounter = 0;

// Add domain-based detection function
const isDomainProduction = (domain) => {
  if (!domain) return false;
  
  // Parse the domain from a full URL if needed
  try {
    if (domain.startsWith('http')) {
      const parsedUrl = new URL(domain);
      domain = parsedUrl.hostname;
    }
  } catch (e) {
    console.log('Error parsing URL:', domain, e.message);
  }
  
  // Log the extracted domain
  // console.log('Checking domain:', domain);
  
  // Check if it's a production domain
  const isProd = domain.includes('wehub.work') && !domain.includes('test.wehub');
  // console.log(`Domain ${domain} identified as: ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  
  return isProd;
};

// Function to set environment for a specific request
const setEnvironment = (requestId, env) => {
  // console.log(`Setting environment for request ${requestId} to ${env}`);
  requestEnv.set(requestId, env);
  
  // Cleanup old request IDs to prevent memory leaks
  if (requestEnv.size > 1000) {
    const oldestKey = requestEnv.keys().next().value;
    requestEnv.delete(oldestKey);
  }
};

// Function to get environment for a specific request
const getEnvironment = (requestId) => {
  return requestEnv.get(requestId);
};

// Setup middleware for Express
const setupRequestContext = (req, res, next) => {
  const requestId = ++requestCounter;
  req.requestId = requestId;
  
  // Determine environment from multiple potential sources
  const origin = req.headers.origin || req.headers.referer || '';
  const host = req.headers.host || '';
  
  console.log(`Request #${requestId} - Origin: ${origin}, Host: ${host}`);
  
  // Check both origin and host to determine environment
  const isProdOrigin = isDomainProduction(origin);  
  const isProd = isProdOrigin;
  
  setEnvironment(requestId, isProd ? 'prod' : 'dev');
  
  // Add cleanup when response finishes
  res.on('finish', () => {
    setTimeout(() => {
      requestEnv.delete(requestId);
      //console.log(`Cleaned up request #${requestId} context`);
    }, 10000); // Keep the context for 10 seconds after response
  });
  
  // Pass the requestId to the client for socket connections
  res.setHeader('X-Request-Environment', isProd ? 'prod' : 'dev');
  
  next();
};

// Get appropriate pool based on the requestId
// Update the getPool function in your database.js

const getPool = (requestId) => {
  // Validate that requestId is provided
  if (!requestId) {
    throw new Error('RequestId is required to select the correct database pool');
  }
  // If we have a requestId, use it to determine the environment
  if (requestId) {
    const env = getEnvironment(requestId);
    console.log(`Getting pool for request #${requestId}, environment: ${env}`);
    
    if (env === 'prod') {
      return prodPool;
    }
  } else {
    console.log('No requestId provided to getPool(), checking global.currentRequest');
    
    // As a fallback, check the global.currentRequest
    if (global.currentRequest) {
      const origin = global.currentRequest.headers.origin || global.currentRequest.headers.referer || '';
      
      if (origin && origin.includes('wehub.work') && !origin.includes('test.wehub')) {
        console.log('Using PROD pool based on global.currentRequest origin');
        return prodPool;
      }
    }
    
    // Last resort: check if we're in a route that suggests production
    try {
      const error = new Error();
      const stack = error.stack || '';
      
      // Check if the URL in the stack trace suggests production
      if (stack.includes('wehub.work') && !stack.includes('test.wehub')) {
        console.log('Using PROD pool based on stack trace');
        return prodPool;
      }
    } catch (e) {
      console.log('Error analyzing stack trace:', e.message);
    }
  }
  
  // Default to development pool
  console.log('Defaulting to development pool');
  return pool;
};

// Create a function to explicitly select prod pool for socket connections
const getProdPool = () => {
  console.log('Explicitly selecting production pool');
  return prodPool;
};

// Create a function to explicitly select dev pool for socket connections  
const getDevPool = () => {
  console.log('Explicitly selecting development pool');
  return pool;
};

// Log connections for debugging
pool.on('connect', () => {
  console.log('DEV pool connection created');
});

prodPool.on('connect', () => {
  console.log('PROD pool connection created');
});

pool.on('error', (err) => {
  console.error('Error in DEV pool:', err.message);
});

prodPool.on('error', (err) => {
  console.error('Error in PROD pool:', err.message);
});

module.exports = {
  pool,
  prodPool,
  getPool,
  getDevPool,
  getProdPool,
  setupRequestContext,
  isDomainProduction
};