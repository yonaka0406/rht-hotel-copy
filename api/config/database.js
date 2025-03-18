//Database connection configuration

require('dotenv').config({ path: './api/.env' });
const { Pool } = require('pg');

// Get .env accordingly
let envDB;

if (process.env.NODE_ENV === 'production') {  
  envDB = process.env.PROD_PG_DATABASE;  
} else {  
  envDB = process.env.PG_DATABASE;  
}
console.log('database.js database being accessed:',envDB);

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: envDB,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  max: 50,
  idleTimeoutMillis: 2000,
  connectionTimeoutMillis: 2000,
});

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

module.exports = pool;