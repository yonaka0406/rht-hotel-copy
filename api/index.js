require('dotenv').config({ path: './api/.env' });

const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketio = require('socket.io');
const { Pool } = require('pg');

const corsOptions = {
  origin: process.env.FRONTEND_URL,  // Replace with your actual frontend domain
  methods: 'GET, POST, PUT, DELETE', 
  allowedHeaders: 'Content-Type, Authorization',
};

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const PORT = process.env.PORT || 5000;

// Middleware
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

// Connect to PostgreSQL database
const pool = require('./config/database');
const listenClient = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
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
      io.emit('tableUpdate', 'Reservation update detected'); // Emit to clients
    }
  });

  await client.query('LISTEN logs_reservation_changed');
  //console.log('Listening for changes on logs_reservation_changed');
};

// Start listening for table changes
listenForTableChanges();

// Socket.IO event handlers
io.on('connection', (socket) => {
  //console.log('Client connected');

  // Handle client disconnection
  socket.on('disconnect', () => {
    //console.log('Client disconnected');
  });
});

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
server.listen(PORT, '0.0.0.0', () => {
  // console.log(`Server is running on http://localhost:${PORT}`);
});