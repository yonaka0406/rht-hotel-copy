const express = require('express');
const path = require('path');
const appConfig = require('./appConfig');
const db = require('./database');

const setupMiddleware = (app) => {
  app.use(express.json({ limit: '50mb' }));
  app.use(express.raw({ type: 'text/xml' }));

  const frontendDistPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDistPath));

  const stampDirEnvPath = process.env.STAMP_COMPONENTS_DIR;
  const projectRoot = path.resolve(__dirname, '..');
  const absoluteStampPath = path.resolve(projectRoot, stampDirEnvPath);
  app.use('/34ba90cc-a65c-4a6e-93cb-b42a60626108', express.static(absoluteStampPath));
  
  app.use(db.setupRequestContext); // This middleware determines the environment and populates req.requestId

  // Make config available to route handlers
  app.use((req, res, next) => {
    req.envConfig = appConfig.getEnvironmentConfig(req);  
    next();
  });
};

module.exports = setupMiddleware;