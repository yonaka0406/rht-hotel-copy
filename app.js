const express = require('express');
const session = require('express-session'); // For OAuth state CSRF protection
const crypto = require('crypto'); // For generating session secret if not in .env
require('dotenv').config(); // Load environment variables

const authRoutes = require('./routes/auth');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Session middleware for OAuth state CSRF protection
// Ensure SESSION_SECRET is set in your .env file for production.
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === crypto.randomBytes(32).toString('hex'))) {
  console.warn('WARNING: SESSION_SECRET is not securely set for production!');
  // In a real production environment, you might want to throw an error or exit
  // if a secure session secret isn't provided.
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false, // Don't save session if unmodified
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (requires HTTPS)
    httpOnly: true, // Prevents client-side JS from accessing the cookie
    maxAge: 300000, // 5 minutes (300,000 milliseconds) - for the duration of the OAuth flow
    sameSite: 'lax' // Recommended for OAuth callback handling
  }
}));

// Mount authentication routes
app.use('/', authRoutes); // Mounts at the root, so paths will be /auth/google, /auth/google/callback

// Basic root route
app.get('/', (req, res) => {
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL || `http://localhost:${port}/auth/google/callback`;
  res.send(`
    <h1>Google OAuth 2.0 Backend with CSRF Protection</h1>
    <p>This is a Node.js Express backend application demonstrating Google OAuth 2.0 authentication restricted to a Google Workspace domain, now with CSRF protection using the 'state' parameter.</p>
    <p>To initiate authentication, navigate to: <a href="/auth/google">/auth/google</a></p>
    <h2>Setup Instructions:</h2>
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
    <h3>Google Cloud Console Setup:</h3>
    <p>Ensure your "Authorized redirect URIs" in Google Cloud Console matches: <code>${callbackUrl}</code>.</p>
    <h3>Security Best Practices:</h3>
    <ul>
      <li><strong>NEVER</strong> commit your <code>.env</code> file or hardcode secrets.</li>
      <li>Use strong, unique secrets for <code>JWT_SECRET</code> and <code>SESSION_SECRET</code>.</li>
      <li>Implement proper ID token verification in <code>routes/auth.js</code>.</li>
      <li>Ensure <code>GOOGLE_CALLBACK_URL</code> is specific and uses HTTPS in production.</li>
      <li>The <code>hd</code> (hosted domain) check is crucial.</li>
      <li>The <code>state</code> parameter CSRF protection is now implemented.</li>
    </ul>
  `);
});

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Google OAuth Callback URL: ${process.env.GOOGLE_CALLBACK_URL || `http://localhost:${port}/auth/google/callback`}`);
  console.log(`Initiate login: http://localhost:${port}/auth/google`);
  if (process.env.NODE_ENV !== 'production' && sessionSecret.includes('strong_session_secret')) {
    console.warn("Using default development SESSION_SECRET. Please set a strong SESSION_SECRET in your .env file for production.");
  }
});

module.exports = app; // For potential testing or modular use
