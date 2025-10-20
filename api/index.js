// Load environment variables from .env file as early as possible
require('dotenv').config({ path: './api/.env' });
// console.log(`[SERVER_STARTUP] After dotenv, process.env.NODE_ENV: ${process.env.NODE_ENV}`);
const logger = require('./config/logger'); // Winston Logger

const express = require('express');
const { Pool } = require('pg'); // Keep Pool for database listeners
const appConfig = require('./config/appConfig');
const setupMiddleware = require('./config/middleware');
const { setupCors, setupSession } = require('./config/security');
const { registerRoutes } = require('./config/routes');
const ServerManager = require('./config/server');
const DatabaseListener = require('./services/databaseListener');
const { setupGracefulShutdown } = require('./utils/gracefulShutdown');
const { startScheduledJobs } = require('./jobs');

const app = express();
app.locals.logger = logger; // Make logger globally available
app.set('trust proxy', 1);

// Setup
setupCors(app);
setupSession(app);
setupMiddleware(app);
registerRoutes(app);

// Server & Socket.IO
const server = new ServerManager(app);
server.setupSocketHandlers();

const PORT = process.env.PORT || 5000;
const baseUrl = `http://localhost:${PORT}`;

// Database listeners
const devDbPoolConfig = {
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT, 10),
  max: 50,
};
const devListenClient = new Pool(devDbPoolConfig);
const devDatabaseListener = new DatabaseListener(devListenClient, 'dev', baseUrl, server.io);
devDatabaseListener.start();

let prodListenClient = null; // Declare prodListenClient outside the conditional block
if (appConfig.isProduction()) {
  const prodDbPoolConfig = {
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PROD_PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT, 10),
    max: 50,
  };
  prodListenClient = new Pool(prodDbPoolConfig); // Assign here
  const prodDatabaseListener = new DatabaseListener(prodListenClient, 'prod', baseUrl, server.io);
  prodDatabaseListener.start();
  startScheduledJobs();
}

// Graceful shutdown
setupGracefulShutdown(server, [devListenClient, prodListenClient]);

// Start server
server.listen(PORT);
