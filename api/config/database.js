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
  idleTimeoutMillis: 1,
  connectionTimeoutMillis: 2000,
});

let currentClientCount = 0;

pool.on('connect', (client) => {
  currentClientCount++;
  //console.log('Client connected:', client.processID);
  console.log('Current client count:', currentClientCount);
});

pool.on('acquire', (client) => {
  //console.log('Client acquired:', client.processID);
});

pool.on('remove', (client) => {
  currentClientCount--;
  //console.log('Client removed:', client.processID);
  console.log('Current client count:', currentClientCount);
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;