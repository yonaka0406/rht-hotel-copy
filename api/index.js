require('dotenv').config({ path: './api/.env' });
const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');
const socketio = require('socket.io');
const fs = require('fs');
const db = require('./config/database');
const { Pool } = require('pg');

const app = express();
app.use(db.setupRequestContext);

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
      console.log('reservation_log_inserted trigger')
      const logId = parseInt(msg.payload, 10);

      let response = null;

      console.log('http://localhost:5000/api/log/reservation-inventory/', logId);
      response = await fetch(`http://localhost:5000/api/log/reservation-inventory/${logId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();
      if (data && Object.keys(data).length > 0) {
        console.log('reservation_log_inserted is a reservation with changes in date', data);

        response = await fetch(`http://localhost:5000/api/report/res/inventory/${data[0].hotel_id}/${data[0].check_in}/${data[0].check_out}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        const inventory = await response.json();
        
        console.log('reservation_log_inserted is a reservation with changes in date', data);
        response = await fetch(`http://localhost:5000/api/sc/tl/inventory/multiple/${data[0].hotel_id}/${logId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(inventory),
        });

      }
    }
  });

  await client.query('LISTEN logs_reservation_changed');
  await client.query('LISTEN reservation_log_inserted');
  //console.log('Listening for changes on logs_reservation_changed');

  // Prod database listener
  const prodClient = await prodListenClient.connect();
  prodClient.on('notification', (msg) => {    
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

      const response = fetch(`http://localhost:5000/api/log/reservation-inventory/${logId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = response.json();      
      if(data){
        console.log('reservation_log_inserted is a reservation with changes in date')
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
