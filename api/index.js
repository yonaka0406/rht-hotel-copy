require('dotenv').config({ path: './api/.env' });

const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');
const socketio = require('socket.io');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
app.use((req, res, next) => {
  const origin = req.get('Origin') || req.get('Referer');
  if (origin && origin.includes('test.wehub.work')) {    
    process.env.NODE_ENV = 'development';
  } else if(origin && origin.includes('wehub.work')) {
    process.env.NODE_ENV = 'production';    
  } else {    
    process.env.NODE_ENV = 'development';   
  }  
  //console.log('For origin:', origin,'.env for',process.env.NODE_ENV,'will be used');
  next();
});

// Get .env accordingly
let envFrontend, envDB;

if (process.env.NODE_ENV === 'production') {
  envFrontend = process.env.PROD_FRONTEND_URL
  envDB = process.env.PROD_PG_DATABASE;  
} else {
  envFrontend = process.env.FRONTEND_URL
  envDB = process.env.PG_DATABASE;  
}
console.log('index.js database being accessed:',envDB);

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
    origin: envFrontend,
    methods: ["GET", "POST"]
  }
});
let ioHttps = null;
if (httpsServer) {
  ioHttps = socketio(httpsServer, {
    cors: {
      origin: envFrontend,
      methods: ["GET", "POST"]
    }
  });
}

const PORT = process.env.PORT || 5000;
const HTTPS_PORT = 443;

// Middleware
const corsOptions = {
  origin: envFrontend,  // Replace with your actual frontend domain
  methods: 'GET, POST, PUT, DELETE', 
  allowedHeaders: 'Content-Type, Authorization',
};
app.use(cors(corsOptions));
app.use(express.json());

// API Routes
const protectedRoutes = require('./routes/protectedRoutes');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const usersRoutes = require('./routes/usersRoutes');
const rolesRoutes = require('./routes/rolesRoutes');
const hotelsRoutes = require('./routes/hotelsRoutes');
const addonRoutes = require('./routes/addonRoutes');
const plansRoutes = require('./routes/plansRoutes');
const clientsRoutes = require('./routes/clientsRoutes');
const reservationsRoutes = require('./routes/reservationsRoutes');
const reportRoutes = require('./routes/reportRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

app.use('/api', protectedRoutes);
app.use('/api/auth', authRoutes); // '/api/auth/register or login' path
app.use('/api', messageRoutes); // '/api/message' path
app.use('/api', usersRoutes);
app.use('/api', rolesRoutes);
app.use('/api', hotelsRoutes);
app.use('/api', addonRoutes);
app.use('/api', plansRoutes);
app.use('/api', clientsRoutes);
app.use('/api', reservationsRoutes);
app.use('/api', reportRoutes);
app.use('/api', settingsRoutes);

// Connect to PostgreSQL database
const pool = require('./config/database');
const listenClient = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: envDB,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  max: 50, // Allow up to 50 concurrent connections
});

// Function to listen for changes in a specific table
const listenForTableChanges = async () => {
  const client = await listenClient.connect();
  
  client.on('notification', (msg) => {    
    if (msg.channel === 'logs_reservation_changed') {
      //console.log('Notification received:', msg.channel); // Debugging
      ioHttp.emit('tableUpdate', 'Reservation update detected');
      ioHttps.emit('tableUpdate', 'Reservation update detected');      
    }
  });

  await client.query('LISTEN logs_reservation_changed');
  //console.log('Listening for changes on logs_reservation_changed');
};

// Start listening for table changes
listenForTableChanges();

// Socket.IO event handlers
ioHttp.on('connection', (socket) => {
  // console.log('Client connected (HTTP)');

  // Handle client disconnection
  socket.on('disconnect', () => {
    // console.log('Client disconnected (HTTP)');
  });
});
if (ioHttps) {
  ioHttps.on('connection', (socket) => {
    // console.log('Client connected (HTTPS)');

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