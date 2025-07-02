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
  if (!domain) {
    // console.log('isDomainProduction: No domain provided, returning false.');
    return false;
  }
  
  // Parse the domain from a full URL if needed
  try {
    if (domain.startsWith('http')) {
      const parsedUrl = new URL(domain);
      domain = parsedUrl.hostname;
    }
  } catch (e) {
    console.warn(`Error parsing URL for domain check: '${domain}', Error: ${e.message}`);
    return false; // Treat as non-production if parsing fails
  }
  
  // Log the extracted domain being checked
  console.debug(`isDomainProduction: Checking domain '${domain}'`);
  
  // Check if it's a production domain
  const isProd = domain.includes('wehub.work') && !domain.includes('test.wehub');
  console.debug(`isDomainProduction: Domain '${domain}' identified as: ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  
  return isProd;
};

// Function to set environment for a specific request
const setEnvironment = (requestId, env) => {
  console.debug(`Setting environment for request ${requestId} to ${env}`);
  requestEnv.set(requestId, env);
  
  // Cleanup old request IDs to prevent memory leaks
  if (requestEnv.size > 1000) {
    const oldestKey = requestEnv.keys().next().value;
    requestEnv.delete(oldestKey);
    console.debug(`Cleaned up oldest request ID: ${oldestKey}`);
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
  // Prioritize Host header as it's typically more reliable for domain identification
  const host = req.headers.host || '';
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';

  console.debug(`Request #${requestId} - Determining environment. Host: '${host}', Origin: '${origin}', Referer: '${referer}'`);

  // Check host first, then origin, then referer for production domain
  // This order makes it more robust against stripped referer/origin headers
  const isProd = isDomainProduction(host) || isDomainProduction(origin) || isDomainProduction(referer);

  if (isProd) {
      console.debug(`Request #${requestId} - Detected PRODUCTION environment based on checks.`);
  } else {
      console.debug(`Request #${requestId} - Detected DEVELOPMENT environment based on checks.`);
  }

  setEnvironment(requestId, isProd ? 'prod' : 'dev');
  
  // Add cleanup when response finishes
  res.on('finish', () => {
    setTimeout(() => {
      requestEnv.delete(requestId);
      console.debug(`Cleaned up request #${requestId} context`);
    }, 10000); // Keep the context for 10 seconds after response for potential async operations
  });
  
  // Pass the environment info to the client via a custom header
  res.setHeader('X-Request-Environment', isProd ? 'prod' : 'dev');
  
  next();
};

// Get appropriate pool based on the requestId
const getPool = (requestId) => {
  // Validate that requestId is provided
  if (!requestId) {
    console.error('RequestId is required to select the correct database pool in getPool()');
    // Fallback to default pool if requestId is missing, to prevent application crash
    console.info(`[getPool] No requestId provided, using DEV pool: ${process.env.PG_DATABASE} @ ${process.env.PG_HOST}`);
    return pool; 
  }
  
  const env = getEnvironment(requestId);
  console.debug(`Getting pool for request #${requestId}, environment: ${env}`);
  
  if (env === 'prod') {
    console.info(`[getPool] Using PROD pool for request #${requestId}: ${process.env.PROD_PG_DATABASE} @ ${process.env.PG_HOST}`);
    return prodPool;
  } 
  
  // Default to development pool if environment is 'dev' or not found
  console.info(`[getPool] Using DEV pool for request #${requestId}: ${process.env.PG_DATABASE} @ ${process.env.PG_HOST}`);
  return pool;
};

// Create a function to explicitly select prod pool for socket connections
const getProdPool = () => {
  console.debug('Explicitly selecting production pool for socket/manual use.');
  return prodPool;
};

// Create a function to explicitly select dev pool for socket connections
const getDevPool = () => {
  console.debug('Explicitly selecting development pool for socket/manual use.');
  return pool;
};

// Log connections for debugging
pool.on('connect', () => {
  console.debug('DEV pool: connection created');
});

prodPool.on('connect', () => {
  console.debug('PROD pool: connection created');
});

pool.on('error', (err) => {
  console.error('Error in DEV pool', { errorMessage: err.message, stack: err.stack });
});

prodPool.on('error', (err) => {
  console.error('Error in PROD pool', { errorMessage: err.message, stack: err.stack });
});

module.exports = {
  pool,
  prodPool,
  getPool,
  getDevPool,
  getProdPool,
  getEnvironment,
  setupRequestContext,
  isDomainProduction
};
