//Database connection configuration

require('dotenv').config({ path: './api/.env' });
const { Pool } = require('pg');

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

// Create a request context store
const asyncLocalStorage = require('async_hooks').AsyncLocalStorage
  ? new (require('async_hooks').AsyncLocalStorage)()
  : null;

// Function to determine which pool to use
const getPool = () => {
  // If we have AsyncLocalStorage available, use it to get the environment
  if (asyncLocalStorage) {
    const store = asyncLocalStorage.getStore();
    if (store && store.environment === 'prod') {
      return prodPool;
    }
  }
  
  // Otherwise, try to determine from request context (if it exists)
  if (global.currentRequest && global.currentRequest.headers && global.currentRequest.headers.origin) {
    const origin = global.currentRequest.headers.origin;
    if (origin.includes('wehub.work') && !origin.includes('test.wehub.work')) {
      return prodPool;
    }
  }
  
  // Default to development pool
  return pool;
};

let currentClientCount = 0;

pool.on('connect', (client) => {
  currentClientCount++;
  //console.log('Client connected:', client.processID);
  //console.log('Client connected. Current client count:', currentClientCount);
});

pool.on('acquire', (client) => {
  //console.log('Client acquired:', client.processID);
  //console.log('Client released to the pool.');
});

pool.on('remove', (client) => {
  currentClientCount--;
  //console.log('Client removed:', client.processID);
  //console.log('Client removed. Current client count:', currentClientCount);
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});
prodPool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  pool,
  prodPool,
  getPool,
  setRequestContext: (req) => {
    if (asyncLocalStorage) {
      // Determine environment from origin
      const isProd = req.headers.origin && req.headers.origin.includes('wehub.work') && 
                    !req.headers.origin.includes('test.wehub.work');
      
      // Store environment info
      return asyncLocalStorage.enterWith({ environment: isProd ? 'prod' : 'dev' });
    } else {
      // Fallback to global if AsyncLocalStorage isn't available
      global.currentRequest = req;
    }
  }
};