const express = require('express');
// const session = require('express-session'); // Removed
// const crypto = require('crypto'); // Removed
require('dotenv').config(); // Load environment variables

// const authRoutes = require('./routes/auth'); // Removed

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Session middleware for OAuth state CSRF protection - REMOVED as it's handled in api/index.js

// Mount authentication routes - REMOVED
// app.use('/', authRoutes); 

// Basic root route
app.get('/', (req, res) => {
  // Updated to reflect that authentication is now handled by the API
  const apiAuthUrl = `/api/auth/google`; // Example, adjust if needed
  res.send(`
    <h1>Google OAuth 2.0 Backend</h1>
    <p>This is the main application. Google OAuth 2.0 authentication is now handled by the API service.</p>
    <p>To initiate authentication with the API, a frontend application would typically redirect to: <a href="${apiAuthUrl}">${apiAuthUrl}</a> (or this link could be part of a frontend UI)</p>
    <h2>Setup Instructions (for API):</h2>
    <ol>
      <li>Ensure you have a <code>.env</code> file with the following variables:
        <ul>
          <li><code>GOOGLE_CLIENT_ID</code></li>
          <li><code>GOOGLE_CLIENT_SECRET</code></li>
          <li><code>GOOGLE_CALLBACK_URL</code> (e.g., ${callbackUrl})</li>
          <li><code>JWT_SECRET</code> (for signing JWTs)</li>
          <li><code>SESSION_SECRET</code> (a strong secret for session management, crucial for CSRF state)</li>
          <li><code>YOUR_WORKSPACE_DOMAIN</code> (e.g., yourcompany.com)</li>
          <li><code>DB_USER</code>, <code>DB_PASSWORD</code>, <code>DB_HOST</code>, <code>DB_PORT</code>, <code>DB_NAME</code> (for PostgreSQL)</li>
          <li><code>FRONTEND_URL</code> (e.g., http://localhost:5173/auth/callback)</li>
          <li><code>PORT</code> (optional, defaults to 3000)</li>
        </ul>
      </li>
      <li>Install dependencies: <code>npm install express googleapis jsonwebtoken dotenv express-session pg google-auth-library</code></li>
      <li>Run the server: <code>node app.js</code> or <code>nodemon app.js</code></li>
    </ol>
    <h3>Google Cloud Console Setup (for API):</h3>
    <p>Ensure your "Authorized redirect URIs" in Google Cloud Console for the API's OAuth client matches the API's callback URL (e.g., <code>http://localhost:YOUR_API_PORT/api/auth/google/callback</code>).</p>
    <h3>Security Best Practices:</h3>
    <ul>
      <li><strong>NEVER</strong> commit your <code>.env</code> file or hardcode secrets.</li>
      <li>Use strong, unique secrets for <code>JWT_SECRET</code> and <code>SESSION_SECRET</code> (used by the API).</li>
      <li>ID token verification, 'hd' check, and CSRF (state) protection are handled by the API.</li>
      <li>Ensure API's <code>GOOGLE_CALLBACK_URL</code> is specific and uses HTTPS in production.</li>
    </ul>
  `);
});

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, () => {
  console.log(`Main application server listening on port ${port}`);
  // Removed old OAuth specific logs, as it's now handled by the API
});

module.exports = app; // For potential testing or modular use
