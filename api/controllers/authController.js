const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../utils/jwtUtils');
const { sendResetEmail, sendAdminResetEmail } = require('../utils/emailUtils');
const sessionService = require('../services/sessionService');

const { findUserByEmail, updatePasswordHash, findUserByProviderId, linkGoogleAccount, createUserWithGoogle, updateUserGoogleTokens } = require('../models/user');

const { OAuth2Client } = require('google-auth-library');
const { getGoogleOAuth2Client } = require('../config/oauth');
const { syncCalendarFromGoogle } = require('../services/synchronizationService');
const crypto = require('crypto');

// Get .env accordingly
let envFrontend;

if (process.env.NODE_ENV === 'production') {
  envFrontend = process.env.PROD_FRONTEND_URL  
} else {
  envFrontend = process.env.FRONTEND_URL  
}

// Initialize Google Auth Client
const googleAuthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const googleOAuth2Client = getGoogleOAuth2Client(); // Assuming this is correctly configured
const scopes = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar.app.created',
  'https://www.googleapis.com/auth/calendar.readonly',
];

const login = async (req, res) => {
  const logger = req.app.locals.logger;
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const specificErrors = errors.array().map(err => ({ field: err.param, message: err.msg }));
    logger.warn('Login validation failed', { ip: req.ip, email: req.body.email, errors: specificErrors });
    const clientError = isProduction ? 'Login failed. Please check your input.' : specificErrors[0].message;
    return res.status(400).json({ error: clientError, details: isProduction ? undefined : specificErrors });
  }

  const { email, password } = req.body;

  try {
    const user = await findUserByEmail(req.requestId, email);
    if (!user) {
      const specificError = 'User not found';
      logger.warn('Login attempt for non-existent user', { email, ip: req.ip, specificError });
      return res.status(401).json({ error: isProduction ? 'Invalid credentials.' : specificError });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      const specificError = 'パスワードの誤差がありました。'; // Password error
      logger.warn('Invalid password attempt', { userId: user.id, email, ip: req.ip, specificError });
      return res.status(401).json({ error: isProduction ? 'Invalid credentials.' : specificError });
    }

    if (user.status_id !== 1) {
      const specificError = 'ユーザーが無効になっています。'; // User is disabled
      logger.warn('Login attempt for disabled user', { userId: user.id, email, status_id: user.status_id, ip: req.ip, specificError });
      return res.status(401).json({ error: isProduction ? 'Account issue. Please contact support.' : specificError });
    }

    const token = generateToken(user);
    logger.info('User logged in successfully', { userId: user.id, email, ip: req.ip });

    if (user.id) {
      logger.info(`Triggering background Google Calendar sync for user ${user.id} after local login. Request ID: ${req.requestId}`);
      syncCalendarFromGoogle(req.requestId, user.id)
        .then(syncResult => {
          logger.info(`Background sync for user ${user.id} (after local login) completed. Result: ${JSON.stringify(syncResult)}. Request ID: ${req.requestId}`);
        })
        .catch(syncError => {
          logger.error(`Error during background sync for user ${user.id} (after local login): ${syncError.message}`, { stack: syncError.stack, requestId: req.requestId });
        });
    }

    res.json({ message: 'ログインしました。', token });
  } catch (err) {
    const specificError = 'Internal server error during login';
    logger.error('Login error', { error: err.message, stack: err.stack, email, ip: req.ip, specificError });
    res.status(500).json({ error: isProduction ? 'Login failed. Please try again later.' : specificError });
  }
};

const forgot = async (req, res) => {
    // ... (omitted for brevity, no changes needed here)
};

const forgotAdmin = async (req, res) => {
    // ... (omitted for brevity, no changes needed here)
};

const reset = async (req, res) => {
    // ... (omitted for brevity, no changes needed here)
};

const getActiveUsers = async (req, res) => {
    // ... (omitted for brevity, no changes needed here)
};


// --- Google OAuth Functions ---

const googleLogin = (req, res) => {
  const logger = req.app.locals.logger;
  const isProduction = process.env.NODE_ENV === 'production';
  const state = crypto.randomBytes(32).toString('hex');
  
  // --- START: ADDED FOR DEBUGGING (Step 6) ---
  logger.error('[PROD_DEBUG] Session debug info at start of googleLogin', {
    hasSession: !!req.session,
    sessionId: req.sessionID,
    sessionStore: typeof req.sessionStore,
    cookies: req.headers.cookie ? 'present' : 'missing',
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    protocol: req.protocol,
    secure: req.secure,
  });
  // --- END: ADDED FOR DEBUGGING (Step 6) ---

  if (!req.session) {
    const specificError = 'Google login: Session middleware not active or configured correctly.';
    logger.error(specificError, { ip: req.ip });
    return res.status(500).json({ error: isProduction ? 'Authentication setup error. Please try again later.' : specificError });
  }
  req.session.oauth_state = state;
  logger.debug(`[AUTH_CTRL_GOOGLE_LOGIN] Session ID: ${req.sessionID}, Storing oauth_state (length: ${state.length})`, { ip: req.ip });

  req.session.save(err => {
    if (err) {
      const specificError = `Error saving session before redirect: ${err.message}`;
      logger.error(`[AUTH_CTRL_GOOGLE_LOGIN] Session ID: ${req.sessionID}, ${specificError}`, { stack: err.stack, ip: req.ip });
      return res.status(500).json({ error: isProduction ? 'Authentication setup error. Please try again later.' : specificError });
    }
    logger.debug(`[AUTH_CTRL_GOOGLE_LOGIN] Session ID: ${req.sessionID}, Session saved. oauth_state in session (length: ${req.session.oauth_state ? req.session.oauth_state.length : 'undefined'}). Redirecting...`, { ip: req.ip });
    const setCookieHeader = res.getHeader('Set-Cookie');
    // --- START: ADDED FOR DEBUGGING ---
    logger.error(`[PROD_DEBUG] Value of 'Set-Cookie' header before redirect: ${setCookieHeader ? 'present' : 'missing'}`, { ip: req.ip });
    // --- END: ADDED FOR DEBUGGING ---

    logger.info(`[AUTH_CTRL_GOOGLE_LOGIN] Redirecting to Google for OAuth...`, { ip: req.ip });
    const authorizeUrl = googleOAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      hd: process.env.GOOGLE_HOSTED_DOMAIN,
      state: state,
    });
    res.redirect(authorizeUrl);
  });
};

const googleCallback = async (req, res) => {
  const logger = req.app.locals.logger;
  const { code, state: receivedState } = req.query;
  const storedState = req.session ? req.session.oauth_state : null;
  const isProduction = process.env.NODE_ENV === 'production';

  // --- START: ADDED FOR DEBUGGING (Step 1) ---
  logger.error(`[PROD_DEBUG] Google Callback Hit. Has Code: ${!!code}. Has Session: ${!!req.session}. Stored State: ${storedState ? 'present' : 'missing'}.`, { ip: req.ip });
  // --- END: ADDED FOR DEBUGGING ---

  if (!req.session) {
    const specificError = `CRITICAL: req.session is undefined on callback. Session not found or not loaded. Received state from URL: ${receivedState}.`;
    logger.error(`[AUTH_CTRL_GOOGLE_CALLBACK] ${specificError}`, { receivedStateLength: receivedState ? receivedState.length : 'missing', ip: req.ip });
    return res.status(500).json({ error: isProduction ? 'Authentication failed. Session issue.' : specificError });
  }

  const stateForComparison = req.session.oauth_state;

  if (req.session.oauth_state) {
    delete req.session.oauth_state;
    req.session.save(err => {
      if (err) {
        logger.error(`[AUTH_CTRL_GOOGLE_CALLBACK] Session ID: ${req.sessionID}, Error saving session after deleting oauth_state:`, { error: err.message, stack: err.stack, ip: req.ip });
      }
    });
  }

  if (!receivedState || !stateForComparison || receivedState !== stateForComparison) {
    const specificError = `STATE MISMATCH OR MISSING! Session ID: ${req.sessionID}. URL state: '${receivedState}', Session state: '${stateForComparison}'. Authentication aborted.`;
    logger.error(`[AUTH_CTRL_GOOGLE_CALLBACK] ${specificError}`, { urlStateLength: receivedState ? receivedState.length : 'missing', sessionStateLength: stateForComparison ? stateForComparison.length : 'missing', ip: req.ip });
    return res.status(403).json({ error: isProduction ? 'Authentication failed. Invalid request state.' : specificError });
  }

  if (!code) {
    const specificError = 'Authorization code missing.';
    logger.warn(`[AUTH_CTRL_GOOGLE_CALLBACK] ${specificError}`, { ip: req.ip });
    return res.status(400).json({ error: isProduction ? 'Authentication failed. Missing authorization code.' : specificError });
  }
  
  // --- START: ADDED FOR DEBUGGING ---
  logger.error(`[PROD_DEBUG] State validated successfully. Proceeding with token exchange.`, { ip: req.ip });
  // --- END: ADDED FOR DEBUGGING ---

  try {
    const { tokens } = await googleOAuth2Client.getToken(code);
    const idToken = tokens.id_token;
    
    if (!idToken) {
      const specificError = 'ID token missing from Google response.';
      logger.error(`[AUTH_CTRL_GOOGLE_CALLBACK] ${specificError}`, { ip: req.ip });
      return res.status(400).json({ error: isProduction ? 'Authentication failed. Missing ID token.' : specificError });
    }
    logger.error('[PROD_DEBUG] Received ID token from Google.', { ip: req.ip });

    const ticket = await googleAuthClient.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    logger.error('[PROD_DEBUG] Google ID token verified successfully.', { email: payload.email, googleUserId: payload.sub, ip: req.ip });

    if (!payload.hd || payload.hd !== process.env.GOOGLE_HOSTED_DOMAIN) {
      const specificError = `Invalid domain. Please use an account from ${process.env.GOOGLE_HOSTED_DOMAIN}. User's domain: ${payload.hd}`;
      logger.error(`[PROD_DEBUG] Domain mismatch for user.`, { userHd: payload.hd, requiredHd: process.env.GOOGLE_HOSTED_DOMAIN, email: payload.email, ip: req.ip, specificError });
      return res.status(403).json({ error: isProduction ? 'Authentication failed. Invalid account domain.' : specificError });
    }
    
    // --- START: ADDED FOR DEBUGGING (Step 1) ---
    const googleUserId = payload.sub;
    const userEmail = payload.email;
    const userName = payload.name;
    logger.error('[PROD_DEBUG] Domain validated, proceeding with user logic', { userEmail, googleUserId, domain: payload.hd, ip: req.ip });
    // --- END: ADDED FOR DEBUGGING ---

    let user = await findUserByProviderId(req.requestId, 'google', googleUserId);
    logger.error('[PROD_DEBUG] Checked for user by provider ID.', { userFound: !!user, ip: req.ip });

    if (!user) {
      const existingUserByEmail = await findUserByEmail(req.requestId, userEmail);
      logger.error('[PROD_DEBUG] Checked existing user by email', { existingUserFound: !!existingUserByEmail, userEmail, ip: req.ip });

      if (existingUserByEmail) {
        logger.error('[PROD_DEBUG] Existing user found by email, entering linking logic.', { ip: req.ip });
        if (existingUserByEmail.auth_provider === 'local' || existingUserByEmail.auth_provider === null) {
          logger.error('[PROD_DEBUG] About to link local account to Google.', { userId: existingUserByEmail.id, ip: req.ip });
          user = await linkGoogleAccount(req.requestId, existingUserByEmail.id, googleUserId);
          logger.info(`Linked existing local user to Google ID.`, { userId: existingUserByEmail.id, email: userEmail, googleUserId, ip: req.ip });
        } else {
           // ... other logic for different providers
           user = existingUserByEmail;
        }
      } else {
        logger.error('[PROD_DEBUG] About to create new user', { userEmail, googleUserId, ip: req.ip });
        user = await createUserWithGoogle(req.requestId, googleUserId, userEmail, userName);
        logger.error('[PROD_DEBUG] User creation result', { userCreated: !!user, userId: user ? user.id : 'N/A', userEmail, ip: req.ip });
      }
    } 

    if (!user) {
      const specificError = 'User processing failed after authentication.';
      logger.error('[AUTH_CTRL_GOOGLE_CALLBACK] User object is null after user handling logic.', { email: userEmail, googleUserId, ip: req.ip, specificError });
      return res.status(500).json({ error: isProduction ? 'Authentication error. Please try again.' : specificError });
    }

    // Persist the tokens logic... (omitted for brevity)
    if (user && user.id && tokens.access_token) {
        await updateUserGoogleTokens(req.requestId, user.id, tokens.access_token, tokens.refresh_token || null, tokens.expiry_date || null);
        logger.error('[PROD_DEBUG] Successfully saved Google OAuth tokens for user.', { userId: user.id, email: userEmail, ip: req.ip });
    }

    const jwtToken = generateToken(user);
    
    // Trigger background sync... (omitted for brevity)
    if (user.id) {
        syncCalendarFromGoogle(req.requestId, user.id).catch(err => logger.error('Sync error post-login', { err }));
    }

    const frontendRedirectUrl = `${envFrontend}/auth/google/callback?token=${jwtToken}`;
    logger.error(`[PROD_DEBUG] Redirecting to frontend with JWT for user.`, { userId: user.id, email: userEmail, redirectUrlDomain: envFrontend, ip: req.ip });
    res.redirect(frontendRedirectUrl);

  } catch (error) {
    // --- START: ADDED FOR DEBUGGING (Quick Fix) ---
    logger.error('[PROD_DEBUG] Complete error details in googleCallback catch block', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      isAxiosError: !!error.isAxiosError,
      response: error.response?.data,
      request: error.request?.path,
      ip: req.ip
    });
    // --- END: ADDED FOR DEBUGGING ---
    
    const status = (error.message && (error.message.includes("Invalid token signature") || error.message.includes("Token used too late"))) ? 401 : 500;
    return res.status(status).json({ error: 'Authentication failed. Please try again.', details: error.message }); // Return detailed error for debugging
  }
};

module.exports = {
  login,
  forgot,
  forgotAdmin,
  reset,
  getActiveUsers,
  googleLogin,
  googleCallback,  
};
