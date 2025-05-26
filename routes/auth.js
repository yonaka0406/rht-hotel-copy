const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // For generating state parameter
const { OAuth2Client } = require('google-auth-library');
const { getGoogleOAuth2Client } = require('../config/oauth');
const db = require('../db');
require('dotenv').config();

const router = express.Router();
const googleOAuth2Client = getGoogleOAuth2Client();
const googleAuthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const scopes = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

// --- Database Interaction Functions (assumed to be unchanged from previous step) ---
async function findUserByGoogleId(googleId) {
  const { rows } = await db.query(
    "SELECT * FROM users WHERE provider_user_id = $1 AND auth_provider = 'google'",
    [googleId]
  );
  return rows[0];
}

async function findUserByEmail(email) {
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0];
}

async function linkGoogleAccount(userId, googleId) {
  const { rows } = await db.query(
    "UPDATE users SET auth_provider = 'google', provider_user_id = $1, password_hash = NULL WHERE id = $2 RETURNING *",
    [googleId, userId]
  );
  console.log(`Linked Google account for user ID: ${userId} to Google ID: ${googleId}`);
  return rows[0];
}

async function createUserWithGoogle(googleId, email, name) {
  const defaultStatusId = 1; 
  const defaultRoleId = 5; 
  const { rows } = await db.query(
    'INSERT INTO users (email, name, auth_provider, provider_user_id, status_id, role_id) VALUES ($1, $2, \'google\', $3, $4, $5) RETURNING *',
    [email, name, googleId, defaultStatusId, defaultRoleId]
  );
  console.log(`Created new user with Google: ${email}, Google ID: ${googleId}`);
  return rows[0];
}

// --- Authentication Routes ---

// GET /auth/google
// Initiates the Google OAuth2 authentication process.
router.get('/auth/google', (req, res) => {
  // 1. Generate a random string for the state parameter
  const state = crypto.randomBytes(32).toString('hex');

  // 2. Store this state value in req.session.oauth_state
  req.session.oauth_state = state;
  // Set session cookie maxAge again here if you want to be explicit about its lifetime for this specific session variable
  // req.session.cookie.maxAge = 300000; // 5 minutes

  console.log(`Generated OAuth state: ${state} for session ID: ${req.sessionID}`);


  // 3. Include this state parameter in the authorization URL
  const authorizeUrl = googleOAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    hd: process.env.YOUR_WORKSPACE_DOMAIN,
    state: state, // Include the state parameter
  });
  res.redirect(authorizeUrl);
});

// GET /auth/google/callback
// Handles the callback from Google after user authentication.
router.get('/auth/google/callback', async (req, res) => {
  const { code, state: receivedState } = req.query;
  const storedState = req.session.oauth_state;

  console.log(`Received OAuth callback. Code: ${code ? 'present' : 'missing'}, Received State: ${receivedState}, Stored State: ${storedState}`);

  // Clear the stored state from session immediately after retrieving it
  // to prevent reuse, regardless of success or failure of subsequent steps.
  if (req.session) {
    delete req.session.oauth_state;
  }

  // 1. Verify the state parameter (CSRF protection)
  if (!receivedState || !storedState || receivedState !== storedState) {
    console.error('Invalid OAuth state parameter. CSRF attack suspected.');
    console.error(`Details: Received State: ${receivedState}, Expected Stored State: ${storedState}`);
    // It's important to destroy the session or at least the oauth_state if there's a mismatch.
    // req.session.destroy(); // Optionally destroy the whole session
    return res.status(403).json({ error: 'Invalid state parameter. Authentication aborted.' });
  }

  if (!code) {
    return res.status(400).json({ error: 'Authorization code missing.' });
  }

  try {
    // 2. Exchange authorization code for tokens
    const { tokens } = await googleOAuth2Client.getToken(code);
    const idToken = tokens.id_token;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token missing from Google response.' });
    }

    // 3. Verify the ID token
    const ticket = await googleAuthClient.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    // 4. Verify the 'hd' (hosted domain) claim
    if (!payload.hd || payload.hd !== process.env.YOUR_WORKSPACE_DOMAIN) {
      console.warn(`Domain mismatch: User's domain (${payload.hd}) vs required domain (${process.env.YOUR_WORKSPACE_DOMAIN})`);
      return res.status(403).json({ 
        error: 'Access denied. User does not belong to the required Google Workspace organization.' 
      });
    }

    const googleUserId = payload.sub;
    const userEmail = payload.email;
    const userName = payload.name;

    // 5. User Handling Logic
    let user = await findUserByGoogleId(googleUserId);

    if (!user) {
      const existingUserByEmail = await findUserByEmail(userEmail);
      if (existingUserByEmail) {
        if (existingUserByEmail.auth_provider === 'local') {
          user = await linkGoogleAccount(existingUserByEmail.id, googleUserId);
        } else if (existingUserByEmail.auth_provider === 'google' && existingUserByEmail.provider_user_id !== googleUserId) {
          console.error(`User ${userEmail} is already associated with a different Google account.`);
          return res.status(409).json({ 
            error: 'This email is associated with a different Google account. Please sign in with the original Google account or contact support.' 
          });
        } else {
          user = existingUserByEmail;
        }
      } else {
        user = await createUserWithGoogle(googleUserId, userEmail, userName);
      }
    }

    if (!user) {
      console.error('User object is null after user handling logic.');
      return res.status(500).json({ error: 'User processing failed after authentication.' });
    }

    // 6. JWT Generation
    const jwtPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role_id: user.role_id,
    };
    const jwtToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 7. Redirect user to the frontend with the JWT
    const frontendRedirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173/auth/callback'}?token=${jwtToken}`;
    res.redirect(frontendRedirectUrl);

  } catch (error) {
    console.error('Error during Google OAuth callback processing:', error);
    // Check if the error is due to a specific Google API issue
    if (error.isAxiosError && error.response) { 
        console.error('Google API Error Details:', error.response.data);
        return res.status(500).json({ error: `Authentication failed: ${error.response.data.error_description || 'Google API error'}` });
    } else if (error.message && (error.message.includes("Invalid token signature") || error.message.includes("Token used too late"))) {
        return res.status(401).json({ error: `Google ID token validation failed: ${error.message}`});
    }
    // Generic error for other cases (DB errors, etc.)
    return res.status(500).json({ error: 'Authentication processing failed.' });
  }
});

module.exports = router;
