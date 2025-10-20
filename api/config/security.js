const cors = require('cors');
const session = require('express-session');
const appConfig = require('./appConfig');
const configureSession = require('./session'); // Assuming session.js is in the same directory

const setupCors = (app) => {
  app.use(cors((req, callback) => {
    const envConfig = appConfig.getEnvironmentConfig(req);
    const allowedOrigins = [envConfig.frontendUrl, envConfig.frontendUrlHttp];

    let corsOptions;
    const origin = req.header('Origin');
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      corsOptions = {
        origin: origin || 'https://test.wehub.work',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Environment'],
        credentials: true,
        optionsSuccessStatus: 200
      };
    } else {
      corsOptions = { origin: false };
    }
    callback(null, corsOptions);
  }));
};

const setupSession = (app) => {
  const sessionConfig = configureSession();
  app.use(session(sessionConfig));
};

module.exports = { setupCors, setupSession };