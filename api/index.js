// These logs should be first to see initial environment state
console.log(`[SERVER_STARTUP] Initial process.env.NODE_ENV: ${process.env.NODE_ENV}`);
// Load environment variables from .env file as early as possible
require('dotenv').config({ path: './api/.env' }); // ENSURE THIS IS THE CORRECT PATH
console.log(`[SERVER_STARTUP] After dotenv, process.env.NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[SERVER_STARTUP] cookie.secure will be based on: ${process.env.NODE_ENV === 'production'}`);

const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');
const socketio = require('socket.io');
const fs = require('fs');
const db = require('./config/database');
const { startScheduling } = require('./utils/scheduleUtils');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const crypto = require('crypto'); // Added for session secret

const app = express();
app.set('trust proxy', 1);
app.use(db.setupRequestContext);

// Session Configuration
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// Log information about the session secret being used
console.log(`[SESSION_INIT] Using sessionSecret. Type: ${typeof sessionSecret}, Length: ${sessionSecret ? sessionSecret.length : 'undefined/null'}`);
if (!sessionSecret || typeof sessionSecret !== 'string' || sessionSecret.length < 16) { // Example minimum length
    console.error("[SESSION_INIT] CRITICAL: sessionSecret is undefined, not a string, or too short! This will likely prevent sessions from working or be insecure.");
    // Consider exiting if the secret is critically misconfigured for a production-like environment:
    // if (process.env.NODE_ENV === 'production') { process.exit(1); }
}
if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === crypto.randomBytes(32).toString('hex'))) {
  console.warn('[SESSION_INIT] WARNING: In production, SESSION_SECRET should be a strong, static secret defined in your environment variables. A dynamically generated secret will invalidate sessions on each restart.');
}

// Enhanced Session Pool and Store Creation Logging
console.log('[SESSION_POOL_CONFIG] PG_USER:', process.env.PG_USER);
console.log('[SESSION_POOL_CONFIG] PG_HOST:', process.env.PG_HOST);
console.log('[SESSION_POOL_CONFIG] PG_DATABASE:', process.env.PG_DATABASE);
console.log('[SESSION_POOL_CONFIG] PG_PORT:', process.env.PG_PORT);
console.log('[SESSION_POOL_CONFIG] PG_PASSWORD:', process.env.PG_PASSWORD ? 'PASSWORD_SET' : 'PASSWORD_NOT_SET');

let sessionPool;
try {
    const poolConfig = {
        user: process.env.PG_USER,
        host: process.env.PG_HOST,
        database: process.env.PG_DATABASE,
        password: process.env.PG_PASSWORD,
        port: parseInt(process.env.PG_PORT, 10), // Ensure port is an integer
    };
    console.log('[SESSION_POOL_CONFIG] Attempting to create Pool with user:', poolConfig.user, 'host:', poolConfig.host, 'database:', poolConfig.database, 'port:', poolConfig.port);
    sessionPool = new Pool(poolConfig);
    console.log('[SESSION_INIT] sessionPool created successfully.');
    sessionPool.on('error', (err) => { 
      console.error('[SESSION_POOL_ERROR] Idle client error', err.message, err.stack); 
    });
    // Optional: Test query
    sessionPool.query('SELECT NOW()', (err, res) => {
        if (err) {
            console.error('[SESSION_POOL_TEST_QUERY_ERROR]', err);
        } else {
            console.log('[SESSION_POOL_TEST_QUERY_SUCCESS] SELECT NOW():', res.rows[0]);
        }
    });
} catch (error) {
    console.error('[SESSION_INIT_ERROR] Failed to create sessionPool:', error);
}

let sessionStore;
try {
    const storeOptions = {
        pool: sessionPool,
        tableName: 'user_sessions',
        createTableIfMissing: true,
        //ttl: 60 * 5 // 5 minutes for testing if needed
    };
    console.log('[SESSION_STORE_CONFIG] Attempting to create pgSession store with tableName:', storeOptions.tableName, 'and pool defined:', !!storeOptions.pool);
    sessionStore = new pgSession(storeOptions);
    console.log('[SESSION_INIT] pgSession store configured successfully.');
} catch (error) {
    console.error('[SESSION_INIT_ERROR] Failed to create pgSession store:', error);
}

console.log(`[SESSION_INIT] Checking process.env.SESSION_SECRET before app.use(session()): ${process.env.SESSION_SECRET ? 'SET (length ' + process.env.SESSION_SECRET.length + ')' : 'NOT SET'}`);

app.use(session({
  store: sessionStore, // Use the created sessionStore
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    //secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    secure: true, // Always use secure cookies for HTTPS
    httpOnly: true,
    maxAge: 300000, // 5 minutes, consistent with existing app.js logic if applicable
    sameSite: 'lax' // Recommended for most cases
  }
}));

// Environment configuration helper
const getEnvConfig = (req) => {
  // Default to dev configuration
  let config = {
    pgDatabase: process.env.PG_DATABASE,
    frontendUrl: process.env.FRONTEND_URL,
    frontendUrlHttp: process.env.FRONTEND_URL_HTTP
  };
  
  // If request exists and comes from production domain
  if (req && req.headers.origin) {
    const origin = req.headers.origin;
    if (origin.includes('wehub.work') && !origin.includes('test.wehub.work')) {
      // Use production configuration
      config = {
        pgDatabase: process.env.PROD_PG_DATABASE,
        frontendUrl: process.env.PROD_FRONTEND_URL,
        frontendUrlHttp: process.env.PROD_FRONTEND_URL_HTTP
      };
    }
  }
  
  return config;
};

// HTTP Server setup
const httpServer = http.createServer(app);

// HTTPS Server setup (try/catch block)
let httpsServer = null; // Initialize as null
try {
  const privateKey = fs.readFileSync('/etc/letsencrypt/live/wehub.work/privkey.pem', 'utf8');
  const certificate = fs.readFileSync('/etc/letsencrypt/live/wehub.work/fullchain.pem', 'utf8');
  const credentials = {
    key: privateKey,
    cert: certificate,
  };
  httpsServer = https.createServer(credentials, app);
} catch (error) {
  console.error('HTTPS setup failed:', error.message);
  console.log('HTTPS server will not be started.');
}
// Socket.IO setup for HTTP and HTTPS
const ioHttp = socketio(httpServer, {
  cors: {
    origin: [process.env.FRONTEND_URL, process.env.PROD_FRONTEND_URL],
    methods: ["GET", "POST"]
  }
});
let ioHttps = null;
if (httpsServer) {
  ioHttps = socketio(httpsServer, {
    cors: {
      origin: [process.env.FRONTEND_URL, process.env.PROD_FRONTEND_URL],
      methods: ["GET", "POST"]
    }
  });
}

const PORT = process.env.PORT || 5000;
const HTTPS_PORT = 443;

// Dynamic CORS middleware
app.use((req, res, next) => {
  const config = getEnvConfig(req);
  
  const corsOptions = {
    origin: [process.env.FRONTEND_URL, process.env.PROD_FRONTEND_URL],
    methods: 'GET, POST, PUT, DELETE',
    allowedHeaders: 'Content-Type, Authorization',
  };
  
  cors(corsOptions)(req, res, next);
});

app.use(express.json());
app.use(express.raw({ type: 'text/xml' }));
//assets for the frontend
app.use('/34ba90cc-a65c-4a6e-93cb-b42a60626108', express.static(path.join(__dirname, 'public')));

app.get('/api/very-simple-session-test', (req, res) => {
    console.log(`[SIMPLE_TEST_REGENERATE] req.headers.host: ${req.headers.host}`);
    // Log session ID at start of request, if any. After clearing cookies, this should be undefined.
    console.log(`[SIMPLE_TEST_REGENERATE] Session ID at start of request (if any): ${req.sessionID}`);

    req.session.regenerate(err => {
        if (err) {
            console.error('[SIMPLE_TEST_REGENERATE] Error regenerating session:', err);
            return res.status(500).send('Error regenerating session.');
        }
        // Log the NEW session ID after regeneration
        console.log(`[SIMPLE_TEST_REGENERATE] Session regenerated. New Session ID: ${req.sessionID}`);
        
        req.session.simpleTestData = 'This is a regenerated session test ' + Date.now();
        console.log(`[SIMPLE_TEST_REGENERATE] Data set on regenerated session: ${req.session.simpleTestData}`);

        req.session.save(saveErr => {
            if (saveErr) {
                console.error('[SIMPLE_TEST_REGENERATE] Error saving regenerated session:', saveErr);
                return res.status(500).send('Error saving regenerated session.');
            }
            console.log(`[SIMPLE_TEST_REGENERATE] Regenerated session saved successfully. Session ID: ${req.sessionID}`);
            console.log(`[SIMPLE_TEST_REGENERATE] res.headersSent before send: ${res.headersSent}`);
            
            const sessionCookieHeader = res.getHeader('Set-Cookie');
            console.log(`[SIMPLE_TEST_REGENERATE] res.getHeader('Set-Cookie') after save: ${sessionCookieHeader ? JSON.stringify(sessionCookieHeader) : 'undefined'}`);
            
            res.status(200).send(`Regenerated session test successful. Session ID: ${req.sessionID}. Data: ${req.session.simpleTestData}. Check browser for 'connect.sid' cookie.`);
        });
    });
});

// Make config available to route handlers
app.use((req, res, next) => {
  req.envConfig = getEnvConfig(req);  
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
const xmlRoutes = require('./ota/xmlRoutes');

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
app.use('/api', xmlRoutes);

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
  const client = await listenClient.connect();
  
  client.on('notification', async (msg) => {    
    if (msg.channel === 'logs_reservation_changed') {
      //console.log('Notification received:', msg.channel); // Debugging
      ioHttp.emit('tableUpdate', 'Reservation update detected');
      if (ioHttps) {
        ioHttps.emit('tableUpdate', 'Reservation update detected');
      }
    }
    if (msg.channel === 'reservation_log_inserted') {      
      const logId = parseInt(msg.payload, 10);

      let response = null;

      // Fetch log data to check if inventory has changed
      response = await fetch(`http://localhost:5000/api/log/reservation-inventory/${logId}/google`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const googleData = await response.json();
      if (googleData && Object.keys(googleData).length > 0) {
        // Update Google Sheets
        const sheetId = '1nrtx--UdBvYfB5OH2Zki5YAVc6b9olf_T_VSNNDbZng'; // dev
        response = await fetch(`http://localhost:5000/api/report/res/google/${sheetId}/${googleData[0].hotel_id}/${googleData[0].check_in}/${googleData[0].check_out}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
      }

      // Fetch log data to check if inventory has changed
      response = await fetch(`http://localhost:5000/api/log/reservation-inventory/${logId}/site-controller`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();
      if (data && Object.keys(data).length > 0) {
        // console.log('report/res/inventor', data);
        // Fetch inventory data from view
        response = await fetch(`http://localhost:5000/api/report/res/inventory/${data[0].hotel_id}/${data[0].check_in}/${data[0].check_out}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        const inventory = await response.json();        

        // Update Site Controller
        try {
          await fetch(`http://localhost:5000/api/sc/tl/inventory/multiple/${data[0].hotel_id}/${logId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(inventory),
          });
          // console.log(`Successfully updated site controller for hotel ${data[0].hotel_id}`);
        } catch (siteControllerError) {
          console.error(`Failed to update site controller for hotel ${data[0].hotel_id}:`, siteControllerError);          
        }        
      }
    }
  });

  await client.query('LISTEN logs_reservation_changed');
  await client.query('LISTEN reservation_log_inserted');
  // console.log('Listening for changes on logs_reservation_changed');

  // Prod database listener
  const prodClient = await prodListenClient.connect();
  prodClient.on('notification', async (msg) => {    
    if (msg.channel === 'logs_reservation_changed') {
      ioHttp.emit('tableUpdate', { 
        message: 'Reservation update detected',
        environment: 'prod'
      });
      if (ioHttps) {
        ioHttps.emit('tableUpdate', { 
          message: 'Reservation update detected',
          environment: 'prod'
        });
      }
    }
    if (msg.channel === 'reservation_log_inserted') {      
      const logId = parseInt(msg.payload, 10);

      let response = null;

      // Fetch log data to check if inventory has changed
      response = await fetch(`http://localhost:5000/api/log/reservation-inventory/${logId}/google`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const googleData = await response.json();
      if (googleData && Object.keys(googleData).length > 0) {
        // Update Google Sheets
        const sheetId = '1W10kEbGGk2aaVa-qhMcZ2g3ARvCkUBeHeN2L8SUTqtY'; // prod
        response = await fetch(`http://localhost:5000/api/report/res/google/${sheetId}/${googleData[0].hotel_id}/${googleData[0].check_in}/${googleData[0].check_out}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
      }

      // Fetch log data to check if inventory has changed
      response = await fetch(`http://localhost:5000/api/log/reservation-inventory/${logId}/site-controller`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();
      if (data && Object.keys(data).length > 0) {
        
        // Fetch inventory data from view
        response = await fetch(`http://localhost:5000/api/report/res/inventory/${data[0].hotel_id}/${data[0].check_in}/${data[0].check_out}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        const inventory = await response.json();        

        // Update Site Controller
        try {
          await fetch(`http://localhost:5000/api/sc/tl/inventory/multiple/${data[0].hotel_id}/${logId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(inventory),
          });
          // console.log(`Successfully updated site controller for hotel ${data[0].hotel_id}`);
        } catch (siteControllerError) {
          console.error(`Failed to update site controller for hotel ${data[0].hotel_id}:`, siteControllerError);          
        }
      }
    }
  });
  
  await prodClient.query('LISTEN logs_reservation_changed');
  await prodClient.query('LISTEN reservation_log_inserted');
};

// Start listening for table changes
listenForTableChanges();

// Socket.IO event handlers
ioHttp.on('connection', (socket) => {
  // console.log('Client connected (HTTP)');
  const origin = socket.handshake.headers.origin;
  const environment = origin && origin.includes('test.wehub') ? 'dev' : 'prod';
  socket.join(environment);

  // Handle client disconnection
  socket.on('disconnect', () => {
    // console.log('Client disconnected (HTTP)');
  });
});
if (ioHttps) {
  ioHttps.on('connection', (socket) => {
    // console.log('Client connected (HTTPS)');
    const origin = socket.handshake.headers.origin;
    const environment = origin && origin.includes('test.wehub') ? 'dev' : 'prod';
    socket.join(environment);

    // Handle client disconnection
    socket.on('disconnect', () => {
      // console.log('Client disconnected (HTTPS)');
    });
  });
}

// Serve static files from the frontend build folder
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for SPA routes (Must come last)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
/*
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
*/

// Start the servers
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`HTTP Server is running on http://0.0.0.0:${PORT}`);
});

if (httpsServer) {
  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`HTTPS Server is running on https://0.0.0.0:${HTTPS_PORT}`);
  });
}

// Start the scheduling
startScheduling();
