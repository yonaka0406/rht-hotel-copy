// Load environment variables from .env file as early as possible
require('dotenv').config({ path: './api/.env' });
// console.log(`[SERVER_STARTUP] After dotenv, process.env.NODE_ENV: ${process.env.NODE_ENV}`);
const logger = require('./config/logger'); // Winston Logger
const appConfig = require('./config/appConfig'); // Import appConfig

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const http = require('http');
const https = require('https');
const socketio = require('socket.io');
const fs = require('fs');
const db = require('./config/database');
const { startScheduling } = require('./jobs/otaReservationJob.js');
const { scheduleLoyaltyTierJob } = require('./jobs/loyaltyTierJob');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

const { startWaitlistJob } = require('./jobs/waitlistJob');
const { scheduleDailyMetricsJob } = require('./jobs/dailyMetricsJob');
const { scheduleDailyDigestEmailJob } = require('./jobs/dailyDigestEmailJob');
const { scheduleDailySalesOccPdfJob } = require('./jobs/dailySalesOccPdfJob');
const { startGoogleSheetsPoller } = require('./jobs/googleSheetsPoller.js');
const { startOtaXmlPoller, stopOtaXmlPoller, POLL_INTERVAL } = require('./jobs/otaXmlPoller.js');
const { defaultMonitor: otaTriggerMonitor } = require('./jobs/otaTriggerMonitorJob.js');

const app = express();

// Security Middleware: Helmet helps secure Express apps by setting various HTTP headers.
// The default configuration is enhanced with a slightly relaxed CSP to ensure
// compatibility with frontend libraries like PrimeVue and ECharts that may use inline styles/eval.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "style-src": ["'self'", "'unsafe-inline'"],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      "img-src": ["'self'", "data:", "blob:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disabled to avoid issues with loading external assets
}));

const { closeSingletonBrowser } = require('./services/playwrightService');
app.locals.logger = logger; // Make logger globally available
app.set('trust proxy', 1);



// Serve the static files from the Vue app's 'dist' directory //DOCKER CHANGE
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// *** IMPORTANT: CORS middleware should typically come very early ***
// It needs to handle OPTIONS preflight requests before other middleware process the actual request.
// Use dynamic origin based on request for more flexibility if needed,
// but ensure it explicitly matches your frontend URL(s).
app.use(cors((req, callback) => {
  const envConfig = appConfig.getEnvironmentConfig(req);
  const allowedOrigins = [envConfig.frontendUrl, envConfig.frontendUrlHttp]; // Use the determined frontend URL(s)
  // Add other specific origins if necessary, e.g., for local development: 'http://localhost:8080'

  let corsOptions;
  const origin = req.header('Origin');
  if (allowedOrigins.indexOf(origin) !== -1 || !origin) { // !origin allows same-origin requests
    corsOptions = {
      origin: origin || 'https://test.wehub.work', // Reflect back the request origin if allowed, or your default
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Include OPTIONS for preflight requests
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Environment'], // Allow all custom headers
      credentials: true, // Crucial: Allow cookies and Authorization header
      optionsSuccessStatus: 200 // Some older browsers (IE11, various SmartTVs) choke on 204
    };
  } else {
    // Block requests from unauthorized origins
    corsOptions = { origin: false };
  }
  callback(null, corsOptions);
}));


app.use(db.setupRequestContext); // This middleware determines the environment and populates req.requestId

// console.log('STAMP_COMPONENTS_DIR', process.env.STAMP_COMPONENTS_DIR)
const stampDirEnvPath = process.env.STAMP_COMPONENTS_DIR || 'stamp_components';
const projectRoot = path.resolve(__dirname, '..');
const absoluteStampPath = path.resolve(projectRoot, stampDirEnvPath);

// Session Configuration
const sessionSecret = appConfig.session.secret;

// Log information about the session secret being used
if (!sessionSecret || typeof sessionSecret !== 'string' || sessionSecret.length < 16) { // Example minimum length
  // logger.error("[SESSION_INIT] CRITICAL: sessionSecret is undefined, not a string, or too short! This will likely prevent sessions from working or be insecure.");
  // Consider exiting if the secret is critically misconfigured for a production-like environment:
  // if (process.env.NODE_ENV === 'production') { process.exit(1); }
}


let sessionPool;
try {
  const poolConfig = {
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT, 10), // Ensure port is an integer
  };

  sessionPool = new Pool(poolConfig);

  sessionPool.on('error', (err) => {
    logger.error('[SESSION_POOL_ERROR] Idle client error', { message: err.message, stack: err.stack });
  });
} catch (error) {
  logger.error('[SESSION_INIT_ERROR] Failed to create sessionPool:', { error: error.message, stack: error.stack });
}
let sessionStore;
try {
  const storeOptions = {
    pool: sessionPool,
    tableName: 'user_sessions',
    createTableIfMissing: true,
    //ttl: 60 * 5 // 5 minutes for testing if needed
  };
  sessionStore = new pgSession(storeOptions);
} catch (error) {
  logger.error('[SESSION_INIT_ERROR] Failed to create pgSession store:', { error: error.message, stack: error.stack });
}

app.use((req, res, next) => {
  // logger.debug(`[PRE-SESSION] Path: ${req.path}, User-Agent: ${req.headers['user-agent']}, Cookie Header: ${req.headers.cookie}`); next(); 
  next();
});

// Determine if we're in a secure environment (HTTPS)

app.use(session({
  store: sessionStore, // Use the created sessionStore
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: appConfig.isSecure(), // Only secure in production (local/dev use HTTP)
    httpOnly: true,
    maxAge: 30 * 60 * 1000, // 30 minutes (increased from 5 mins for testing stability)
    sameSite: appConfig.isSecure() ? 'None' : 'Lax', // Use None for production, Lax for local/development
    // domain: 'test.wehub.work' // No need to set domain if same-domain
  }
}));

// HTTP Server setup
const httpServer = http.createServer(app);

/*
// HTTPS Server setup
// Apache is handling HTTPS termination
let httpsServer = null; // Initialize as null
try {
  let privateKey, certificate;
  if (process.env.NODE_ENV === 'production') {
    privateKey = fs.readFileSync('/etc/letsencrypt/live/wehub.work/privkey.pem', 'utf8');
    certificate = fs.readFileSync('/etc/letsencrypt/live/wehub.work/fullchain.pem', 'utf8');
  } else{
    privateKey = fs.readFileSync('/etc/letsencrypt/live/test.wehub.work/privkey.pem', 'utf8');
    certificate = fs.readFileSync('/etc/letsencrypt/live/test.wehub.work/fullchain.pem', 'utf8');
  }
  const credentials = {
    key: privateKey,
    cert: certificate,
  };
  httpsServer = https.createServer(credentials, app);
} catch (error) {
  // logger.error(`HTTPS setup for NODE_ENV='${process.env.NODE_ENV}' failed: ${error.message}`);
}
*/

// Socket.IO setup
const allowedSocketOrigins = [
  process.env.FRONTEND_URL,
  process.env.PROD_FRONTEND_URL,
].filter(Boolean); // Filters out any falsy values (undefined, null, '')

if (process.env.NODE_ENV !== 'production') {
  allowedSocketOrigins.push('http://localhost:5173');
}

const ioHttp = socketio(httpServer, {
  cors: {
    origin: allowedSocketOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Ensure OPTIONS is here too
    credentials: true // Important for Socket.IO HTTP polling
  }
});

/*
// Apache is handling HTTPS termination
let ioHttps = null;
if (httpsServer) {
  ioHttps = socketio(httpsServer, {
    cors: {
      origin: [process.env.FRONTEND_URL, process.env.PROD_FRONTEND_URL],
      methods: ["GET", "POST"]
    }
  });
}
*/

const PORT = process.env.PORT || 5000;
const baseUrl = `http://localhost:${PORT}`; // This should point to your backend directly if accessed internally.

app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'text/xml' }));
//assets for the frontend
app.use('/34ba90cc-a65c-4a6e-93cb-b42a60626108', express.static(absoluteStampPath));

// Make config available to route handlers
app.use((req, res, next) => {
  req.envConfig = appConfig.getEnvironmentConfig(req);
  next();
});

// API Routes
const protectedRoutes = require('./routes/protectedRoutes');
const authRoutes = require('./routes/authRoutes');
const usersRoutes = require('./routes/usersRoutes');
const rolesRoutes = require('./routes/rolesRoutes');
const hotelsRoutes = require('./routes/hotelsRoutes');
const addonRoutes = require('./routes/addonRoutes');
const plansRoutes = require('./routes/plansRoutes');
const clientsRoutes = require('./routes/clientsRoutes');
const crmRoutes = require('./routes/crmRoutes');
const reservationsRoutes = require('./routes/reservationsRoutes');
const reportRoutes = require('./routes/reportRoutes');
const billingRoutes = require('./routes/billingRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const importRoutes = require('./routes/importRoutes');
const logRoutes = require('./routes/logRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const projectRoutes = require('./routes/projectRoutes');
const accountingRoutes = require('./routes/accountingRoutes');
const otaRoutes = require('./routes/otaRoutes');
const xmlRoutes = require('./ota/xmlRoutes');
const waitlistRoutes = require('./routes/waitlistRoutes'); // Import waitlist routes
const bookingEngineRoutes = require('./routes/bookingEngineRoutes'); // Import booking engine routes
const searchRoutes = require('./routes/searchRoutes'); // Import search routes
const parkingRoutes = require('./routes/parkingRoutes');
const guestRoutes = require('./routes/guestRoutes');
const validationRoutes = require('./routes/validationRoutes');
const systemLogsRoutes = require('./routes/systemLogsRoutes');

app.use('/api', protectedRoutes);
app.use('/api/auth', authRoutes); // '/api/auth/register or login' path
app.use('/api', usersRoutes);
app.use('/api', rolesRoutes);
app.use('/api', hotelsRoutes);
app.use('/api', addonRoutes);
app.use('/api', plansRoutes);
app.use('/api', clientsRoutes);
app.use('/api', crmRoutes);
app.use('/api', reservationsRoutes);
app.use('/api', reportRoutes);
app.use('/api', billingRoutes);
app.use('/api', settingsRoutes);
app.use('/api', importRoutes);
app.use('/api', logRoutes);
app.use('/api', metricsRoutes);
app.use('/api', projectRoutes);
app.use('/api', accountingRoutes);
app.use('/api', otaRoutes);
app.use('/api', xmlRoutes);
app.use('/api', waitlistRoutes);
app.use('/api/search', searchRoutes); // Search functionality routes
app.use('/api/booking-engine', bookingEngineRoutes);
app.use('/api', parkingRoutes);
app.use('/api', guestRoutes);
app.use('/api', validationRoutes);
app.use('/api', systemLogsRoutes);

// API Error Handler
app.use('/api', (err, req, res, next) => {
  // Use the app's logger if available, otherwise console.error
  const logger = req.app.locals.logger || console;
  // logger.error('API Error:', {
  //   message: err.message,
  //   stack: err.stack,
  //   path: req.path,
  //   method: req.method
  // });

  // If headers have already been sent, delegate to the default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || err.statusCode || 500; // Prefer err.status or err.statusCode if available
  res.status(statusCode).json({
    error: {
      message: err.message || 'An unexpected API error occurred.',
      // Optionally, include stack trace in development only for security
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      ...(err.errorType && { type: err.errorType }) // Include errorType if present
    }
  });
});

// Connect to PostgreSQL database
const listenClient = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  max: 50, // Allow up to 50 concurrent connections
});
const prodListenClient = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PROD_PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  max: 50,
});

// Function to listen for changes in a specific table
const listenForTableChanges = async () => {

  // --- Development database listener ---
  if (process.env.NODE_ENV !== 'production') {
    let devClient;
    try {
      devClient = await listenClient.connect();
      devClient.on('notification', async (msg) => {
        if (msg.channel === 'logs_reservation_changed') {
          try {
            const payload = JSON.parse(msg.payload);
            const { hotel_id } = payload;

            if (hotel_id) {
              logger.debug(`Notification for hotel ${hotel_id} received: logs_reservation_changed (dev)`);
              ioHttp.to(`hotel:${hotel_id}`).emit('tableUpdate', {
                message: 'Reservation update detected',
                environment: 'dev',
                ...payload
              });
            } else {
              logger.warn('logs_reservation_changed notification received without hotel_id (dev)', { payload });
            }
          } catch (e) {
            logger.error('Failed to parse logs_reservation_changed notification payload (dev)', { error: e, payload: msg.payload });
            // Fallback to old behavior if parsing fails
            ioHttp.emit('tableUpdate', {
              message: 'Reservation update detected (unparsed)',
              environment: 'dev'
            });
          }
        }
        // Google and Site Controller update should be made only in production
        if (msg.channel === 'reservation_log_inserted' && process.env.NODE_ENV === 'production') {
          const logId = parseInt(msg.payload, 10);
          logger.debug('Notification received: reservation_log_inserted (dev)', { logId });

          let response = null;
          response = await fetch(`${baseUrl}/api/log/reservation-inventory/${logId}/google`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              // No Authorization header needed for internal calls if backend doesn't require it for these specific log routes
            }
          });
          const googleData = await response.json();
          if (googleData && Object.keys(googleData).length > 0) {
            const sheetId = '1nrtx--UdBvYfB5OH2Zki5YAVc6b9olf_T_VSNNDbZng'; // dev
            await fetch(`${baseUrl}/api/report/res/google/${sheetId}/${googleData[0].hotel_id}/${googleData[0].check_in}/${googleData[0].check_out}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              }
            });
          }

          response = await fetch(`${baseUrl}/api/log/reservation-inventory/${logId}/site-controller`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          const data = await response.json();
          if (data && Object.keys(data).length > 0) {
            response = await fetch(`${baseUrl}/api/report/res/inventory/${data[0].hotel_id}/${data[0].check_in}/${data[0].check_out}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            const inventory = await response.json();

            try {
              if (process.env.NODE_ENV === 'production') {
                await fetch(`${baseUrl}/api/sc/tl/inventory/multiple/${data[0].hotel_id}/${logId}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(inventory),
                });
              }

              logger.debug(`Successfully updated site controller for hotel ${data[0].hotel_id} (dev)`);
            } catch (siteControllerError) {
              logger.error(`Failed to update site controller for hotel ${data[0].hotel_id} (dev):`, { error: siteControllerError.message, stack: siteControllerError.stack });
            }
          }
        }
      });

      await devClient.query('LISTEN logs_reservation_changed');
      await devClient.query('LISTEN reservation_log_inserted');
      logger.debug('Listening for changes on logs_reservation_changed and reservation_log_inserted (dev)');
    } catch (error) {
      logger.error('Failed to connect to DEV database for LISTEN:', { errorMessage: error.message, stack: error.stack });
    }
  }

  // --- Production database listener ---
  // Ensure this block only runs if NODE_ENV is production, or if prod pool config is valid
  if (process.env.NODE_ENV === 'production') { // Or condition to check if prodListenClient is valid
    try {
      const prodClient = await prodListenClient.connect();
      prodClient.on('notification', async (msg) => {
        if (msg.channel === 'logs_reservation_changed') {
          try {
            const payload = JSON.parse(msg.payload);
            const { hotel_id } = payload;

            if (hotel_id) {
              logger.info(`Notification for hotel ${hotel_id} received: logs_reservation_changed (prod)`);
              ioHttp.to(`hotel:${hotel_id}`).emit('tableUpdate', {
                message: 'Reservation update detected',
                environment: 'prod',
                ...payload
              });
            } else {
              logger.warn('logs_reservation_changed notification received without hotel_id (prod)', { payload });
            }
          } catch (e) {
            logger.error('Failed to parse logs_reservation_changed notification payload', { error: e, payload: msg.payload });
            // Fallback to old behavior if parsing fails, though less ideal
            ioHttp.emit('tableUpdate', {
              message: 'Reservation update detected (unparsed)',
              environment: 'prod'
            });
          }
        }
        if (msg.channel === 'reservation_log_inserted') {

          const logId = parseInt(msg.payload, 10);
          // logger.info('Notification received: reservation_log_inserted (prod)', { logId });

          let response = null;

          /*
          // --- Old Logic ---
          response = await fetch(`${baseUrl}/api/log/reservation-inventory/${logId}/google`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          const googleData = await response.json();
          if (googleData && Object.keys(googleData).length > 0) {
            const sheetId = '1W10kEbGGk2aaVa-qhMcZ2g3ARvCkUBeHeN2L8SUTqtY'; // prod
            await fetch(`${baseUrl}/api/report/res/google/${sheetId}/${googleData[0].hotel_id}/${googleData[0].check_in}/${googleData[0].check_out}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
          }
          if (googleData && Object.keys(googleData).length > 0) {
            const sheetId = '1LF3HOd7wyI0tlXuCqrnd-1m9OIoUb5EN7pegg0lJnt8'; // prod-parking
            await fetch(`${baseUrl}/api/report/res/google-parking/${sheetId}/${googleData[0].hotel_id}/${googleData[0].check_in}/${googleData[0].check_out}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
          }
          */

          // --- New Google Sheets Queue Logic ---
          try {
            // 1. Get Google params (same as before)
            const googleRes = await fetch(`${baseUrl}/api/log/reservation-inventory/${logId}/google`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            const googleData = await googleRes.json();

            // 2. INSERT task into queue. DO NOT call Google API.
            if (googleData && googleData.length > 0) {
              const prodDb = db.getProdPool();
              await prodDb.query(
                `INSERT INTO google_sheets_queue (hotel_id, check_in, check_out, status) 
                   VALUES ($1, $2, $3, 'pending')
                   ON CONFLICT (hotel_id, check_in, check_out) WHERE status = 'pending'
                   DO NOTHING`,
                [googleData[0].hotel_id, googleData[0].check_in, googleData[0].check_out]
              );
            }
          } catch (queueError) {
            logger.error('Failed to queue Google Sheets update for prod', { error: queueError.message, logId });
          }


          response = await fetch(`${baseUrl}/api/log/reservation-inventory/${logId}/site-controller`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          const data = await response.json();
          if (data && Object.keys(data).length > 0) {
            response = await fetch(`${baseUrl}/api/report/res/inventory/${data[0].hotel_id}/${data[0].check_in}/${data[0].check_out}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            const inventory = await response.json();

            try {
              if (process.env.NODE_ENV === 'production') {
                await fetch(`${baseUrl}/api/sc/tl/inventory/multiple/${data[0].hotel_id}/${logId}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(inventory),
                });
              }

              // logger.info(`Successfully updated site controller for hotel ${data[0].hotel_id} (prod)`);
            } catch (siteControllerError) {
              // logger.error(`Failed to update site controller for hotel ${data[0].hotel_id} (prod):`, { error: siteControllerError.message, stack: siteControllerError.stack });
            }
          }
        }
      });

      await prodClient.query('LISTEN logs_reservation_changed');
      await prodClient.query('LISTEN reservation_log_inserted');
      // logger.info('Listening for changes on logs_reservation_changed and reservation_log_inserted (prod)');
    } catch (error) {
      // logger.error('Failed to connect to PROD database for LISTEN:', { errorMessage: error.message, stack: error.stack });
    }
  } else {
    // logger.info('Not listening to production database as NODE_ENV is not production.');
  }
};

// Socket.IO event handlers
logger.debug('Socket.IO event handlers');
ioHttp.on('connection', (socket) => {
  logger.debug('Client connected (HTTP)', { clientId: socket.id, origin: socket.handshake.headers.origin });

  // The client can specify a hotel_id to join a room for targeted updates
  const hotelId = socket.handshake.query.hotelId;
  if (hotelId) {
    logger.debug(`Client ${socket.id} joining room for hotel ${hotelId}`);
    socket.join(`hotel:${hotelId}`);
  }

  socket.on('join_hotel_room', (hotelId) => {
    logger.debug(`Client ${socket.id} requesting to join room for hotel ${hotelId}`);
    socket.join(`hotel:${hotelId}`);
  });

  logger.debug(`[Socket.IO] Client connected: ${socket.id}. Total clients: ${ioHttp.sockets.sockets.size}`);
  const origin = socket.handshake.headers.origin;
  const environment = origin && origin.includes('test.wehub') ? 'dev' : 'prod';
  socket.join(environment);

  // Handle client disconnection
  socket.on('disconnect', () => {
    logger.debug('Client disconnected (HTTP)', { clientId: socket.id });
  });
});
/*
if (ioHttps) {
  ioHttps.on('connection', (socket) => {
    logger.debug('Client connected (HTTPS)', { clientId: socket.id, origin: socket.handshake.headers.origin });
    const origin = socket.handshake.headers.origin;
    const environment = origin && origin.includes('test.wehub') ? 'dev' : 'prod';
    socket.join(environment);

    // Handle client disconnection
    socket.on('disconnect', () => {
      logger.debug('Client disconnected (HTTPS)', { clientId: socket.id });
    });
  });
}
*/

// Start listening for table changes
listenForTableChanges();

// Serve static files from the frontend build folder
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for SPA routes (Must come last)
app.get('/*splat', (req, res) => {
  //res.sendFile(path.join(__dirname, 'public', 'index.html')); //DOCKER CHANGE
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// Start the server
/*
app.listen(PORT, '0.0.0.0', () => {
  // This block is commented out, but if it were active, it would be:
  // logger.info(`Server is running on http://localhost:${PORT}`);
});
*/



// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`Starting graceful shutdown due to ${signal}...`);

  // 1. Close Socket.IO server to disconnect clients
  await new Promise(resolve => {
    ioHttp.close(err => {
      if (err) {
        logger.error('Error closing Socket.IO server:', err);
      }
      resolve();
    });
  });
  logger.info('Socket.IO server closed.');

  // 2. Close HTTP server
  await new Promise(resolve => {
    httpServer.close(err => {
      if (err) {
        logger.error('Error closing HTTP server:', err);
      }
      resolve();
    });
  });
  logger.info('HTTP server closed.');

  // 3. Close all database pools
  try {
    await db.pool.end();
    logger.info('Main DEV database pool closed.');
  } catch (err) {
    logger.error('Error closing main DEV database pool:', err);
  }
  try {
    await db.prodPool.end();
    logger.info('Main PROD database pool closed.');
  } catch (err) {
    logger.error('Error closing main PROD database pool:', err);
  }
  try {
    await listenClient.end();
    logger.info('Listener DEV database pool closed.');
  } catch (err) {
    logger.error('Error closing listener DEV database pool:', err);
  }

  try {
    await prodListenClient.end();
    logger.info('Listener PROD database pool closed.');
  } catch (err) {
    logger.error('Error closing listener PROD database pool:', err);
  }

  if (sessionPool) {
    try {
      await sessionPool.end();
      logger.info('Session database pool closed.');
    } catch (err) {
      logger.error('Error closing session database pool:', err);
    }
  }

  try {
    await closeSingletonBrowser();
    logger.info('Playwright browser instance closed.');
  } catch (err) {
    logger.error('Error closing Playwright browser instance:', err);
  }

  if (process.env.NODE_ENV === 'production') {
    stopOtaXmlPoller(); // Stop the poller using its dedicated function

    // Stop OTA trigger monitoring
    otaTriggerMonitor.stop();
    logger.info('OTA trigger monitoring stopped');
  }

  logger.info('Graceful shutdown complete.');
  process.exit(0);
};

process.removeAllListeners('SIGINT');
process.on('SIGINT', () => {
  shutdown('SIGINT')
    .catch(err => {
      logger.error('Shutdown error:', err);
      process.exit(1);
    });
});

process.removeAllListeners('SIGTERM');
process.on('SIGTERM', () => {
  shutdown('SIGTERM')
    .catch(err => {
      logger.error('Shutdown error:', err);
      process.exit(1);
    });
});

// Start the servers
httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info(`HTTP Server is running on http://0.0.0.0:${PORT}`);
});

/*
// Apache is handling HTTPS termination
if (httpsServer) {
  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    logger.info(`HTTPS Server is running on https://0.0.0.0:${HTTPS_PORT}`);
  });
}
*/

// Start scheduled jobs only in production environment
// ... (inside the production block)
if (process.env.NODE_ENV === 'production') {
  startScheduling();
  scheduleLoyaltyTierJob();
  startWaitlistJob();
  scheduleDailyMetricsJob();
  startGoogleSheetsPoller();
  startOtaXmlPoller(); // Start the poller using its dedicated function
  scheduleDailyDigestEmailJob();
  scheduleDailySalesOccPdfJob();

  // Start OTA trigger monitoring
  otaTriggerMonitor.configure({ baseUrl: `http://localhost:${PORT}` });
  otaTriggerMonitor.start();
  logger.info('OTA trigger monitoring started', { port: PORT });

  // logger.info('Scheduled jobs (OTA sync, Loyalty Tiers, Waitlist Expiration, Daily Metrics) started for production environment.');
} else {
  logger.info(`Scheduled jobs (OTA sync, Loyalty Tiers) NOT started for environment: ${process.env.NODE_ENV}`);
}
