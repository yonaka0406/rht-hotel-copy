const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../utils/jwtUtils');
const { sendResetEmail, sendAdminResetEmail } = require('../utils/emailUtils');
const sessionService = require('../services/sessionService');
const { findUserByEmail, updatePasswordHash, findUserByProviderId, linkGoogleAccount, createUserWithGoogle, updateUserGoogleTokens } = require('../models/user');
const { OAuth2Client } = require('google-auth-library');
const { getGoogleOAuth2Client } = require('../config/oauth');
const { syncCalendarFromGoogle } = require('../services/synchronizationService'); // Import sync service
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
    // For multiple validation errors, sending all of them might be too verbose for prod.
    // Sending the first one or a generic message.
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

    // Trigger background sync if enabled
    if (user.sync_google_calendar && user.id) {
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
  const logger = req.app.locals.logger;
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const specificErrors = errors.array().map(err => ({ field: err.param, message: err.msg }));
    logger.warn('Forgot password validation failed', { ip: req.ip, email: req.body.email, errors: specificErrors });
    const clientError = isProduction ? 'Invalid input. Please check your email.' : specificErrors[0].message;
    return res.status(400).json({ error: clientError, details: isProduction ? undefined : specificErrors });
  }

  const { email } = req.body;

  try {
    const user = await findUserByEmail(req.requestId, email);
    if (!user) {
      const specificError = 'ユーザー見つかりません。'; // User not found
      logger.warn('Password reset requested for non-existent user', { email, ip: req.ip, specificError });
      const message = isProduction ? 'If your email is registered, you will receive a password reset link.' : specificError;
      return res.status(isProduction ? 200 : 400).json({ message: message, error: isProduction ? undefined : specificError });
    }

    const resetToken = jwt.sign({ email: user.email }, process.env.JWT_RESET_SECRET, { expiresIn: '15m' });

    // Send the email with the reset link
    await sendResetEmail(req.requestId, user.email, resetToken);

    logger.info('Password reset email sent', { userId: user.id, email, ip: req.ip });
    res.json({ message: 'パスワードのリセットリンクが送られました。' });
  } catch (err) {
    const specificError = 'Error occurred while sending the password reset email.';
    logger.error('Forgot password error', { error: err.message, stack: err.stack, email, ip: req.ip, specificError });
    res.status(500).json({ error: isProduction ? 'Error processing request. Please try again later.' : specificError });
  }
}

const forgotAdmin = async (req, res) => {
  const logger = req.app.locals.logger;
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const specificErrors = errors.array().map(err => ({ field: err.param, message: err.msg }));
    logger.warn('Forgot admin password validation failed', { ip: req.ip, email: req.body.email, errors: specificErrors });
    const clientError = isProduction ? 'Invalid input. Please check your email.' : specificErrors[0].message;
    return res.status(400).json({ error: clientError, details: isProduction ? undefined : specificErrors });
  }

  const { email } = req.body;

  try {
    const resetToken = jwt.sign({ email: email }, process.env.JWT_RESET_SECRET, { expiresIn: '15m' });
    await sendAdminResetEmail(req.requestId, email, resetToken);

    logger.info('Admin password reset email sent', { email, ip: req.ip });
    res.json({ message: 'パスワードのリセットリンクが送られました。' });
  } catch (err) {
    const specificError = 'Error occurred while sending the admin password reset email.';
    logger.error('Forgot admin password error', { error: err.message, stack: err.stack, email, ip: req.ip, specificError });
    res.status(500).json({ error: isProduction ? 'Error processing request. Please try again later.' : specificError });
  }
}

const reset = async (req, res) => {
  const logger = req.app.locals.logger;
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const specificErrors = errors.array().map(err => ({ field: err.param, message: err.msg }));
    logger.warn('Reset password validation failed', { ip: req.ip, errors: specificErrors });
    // Password validation errors can be more specific in prod if they don't leak too much (e.g. "Password too short")
    const clientError = isProduction ? 'Password reset failed. Please ensure your new password meets the requirements.' : specificErrors[0].message;
    return res.status(400).json({ error: clientError, details: isProduction ? undefined : specificErrors });
  }

  const { token, password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
    const email = decoded.email;
    const user = await findUserByEmail(req.requestId, email);

    if (!user) {
      const specificError = 'Invalid or expired token (user not found for token email)';
      logger.warn('Password reset attempt with invalid or expired token', { tokenEmail: email, ip: req.ip, specificError });
      return res.status(400).json({ error: isProduction ? 'Password reset failed. The link may be invalid or expired.' : specificError });
    }

    const updated_by = user.id;
    const hashedPassword = await bcrypt.hash(password, 10);
    await updatePasswordHash(req.requestId, email, hashedPassword, updated_by);

    logger.info('Password reset successfully', { userId: user.id, email, ip: req.ip });
    res.json({ message: 'パスワードが正常にリセットされました。' });
  } catch (error) {
    let specificError = 'Error occurred while resetting password';
    if (error.name === 'TokenExpiredError') {
        specificError = 'Password reset token has expired.';
    } else if (error.name === 'JsonWebTokenError') {
        specificError = 'Password reset token is invalid.';
    }
    logger.error('Error resetting password', { error: error.message, stack: error.stack, errorName: error.name, tokenUsed: !!token, ip: req.ip, specificError });
    res.status(500).json({ error: isProduction ? 'Password reset failed. Please try again or request a new link.' : specificError });
  }
}

const getActiveUsers = async (req, res) => {
  const logger = req.app.locals.logger;
  const isProduction = process.env.NODE_ENV === 'production';
  try {
    const count = await sessionService.getActiveSessions();
    logger.debug('Fetched active users count', { count });
    res.json({ activeUsers: count });
  } catch (err) {
    const specificError = 'Failed to get active users';
    logger.error('Failed to get active users', { error: err.message, stack: err.stack, specificError });
    res.status(500).json({ error: isProduction ? 'Error fetching data.' : specificError });
  }
};


// --- Google OAuth Functions ---

const googleLogin = (req, res) => {
  const logger = req.app.locals.logger;
  const isProduction = process.env.NODE_ENV === 'production';
  const state = crypto.randomBytes(32).toString('hex');

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
    logger.debug(`[AUTH_CTRL_GOOGLE_LOGIN] res.headersSent before redirect: ${res.headersSent}`, { ip: req.ip });
    const setCookieHeader = res.getHeader('Set-Cookie');
    logger.debug(`[AUTH_CTRL_GOOGLE_LOGIN] Value of 'Set-Cookie' header before redirect: ${setCookieHeader ? 'present' : 'undefined'}`, { ip: req.ip });

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

  logger.debug(`[AUTH_CTRL_GOOGLE_CALLBACK] Callback received. Code: ${code ? 'present' : 'missing'}, Received State (length: ${receivedState ? receivedState.length : 'missing'}), Stored State (length: ${storedState ? storedState.length : 'missing'})`, { ip: req.ip });

  if (!req.session) {
    const specificError = `CRITICAL: req.session is undefined on callback. Session not found or not loaded. Received state from URL: ${receivedState}.`;
    logger.error(`[AUTH_CTRL_GOOGLE_CALLBACK] ${specificError}`, { receivedStateLength: receivedState ? receivedState.length : 'missing', ip: req.ip });
    return res.status(500).json({ error: isProduction ? 'Authentication failed. Session issue.' : specificError });
  }

  logger.debug(`[AUTH_CTRL_GOOGLE_CALLBACK] Session ID: ${req.sessionID}, Stored state from session (length: ${storedState ? storedState.length : 'undefined'}), Received state from URL (length: ${receivedState ? receivedState.length : 'undefined'})`, { ip: req.ip });

  const stateForComparison = req.session.oauth_state;

  if (req.session.oauth_state) {
    delete req.session.oauth_state;
    req.session.save(err => {
      if (err) {
        logger.error(`[AUTH_CTRL_GOOGLE_CALLBACK] Session ID: ${req.sessionID}, Error saving session after deleting oauth_state:`, { error: err.message, stack: err.stack, ip: req.ip });
      } else {
        logger.debug(`[AUTH_CTRL_GOOGLE_CALLBACK] Session ID: ${req.sessionID}, oauth_state deleted from session and session saved.`, { ip: req.ip });
      }
    });
  } else {
    logger.warn(`[AUTH_CTRL_GOOGLE_CALLBACK] Session ID: ${req.sessionID}, No oauth_state found in session to delete.`, { receivedStateLength: receivedState ? receivedState.length : 'undefined', ip: req.ip });
  }

  if (!receivedState || !stateForComparison || receivedState !== stateForComparison) {
    const specificError = `STATE MISMATCH OR MISSING! Session ID: ${req.sessionID}. URL state: '${receivedState}', Session state: '${stateForComparison}'. Authentication aborted.`;
    logger.error(`[AUTH_CTRL_GOOGLE_CALLBACK] ${specificError}`, { urlStateLength: receivedState ? receivedState.length : 'missing', sessionStateLength: stateForComparison ? stateForComparison.length : 'missing', ip: req.ip });
    return res.status(403).json({ error: isProduction ? 'Authentication failed. Invalid request state.' : specificError });
  }

  logger.debug(`[AUTH_CTRL_GOOGLE_CALLBACK] Session ID: ${req.sessionID}, State validated successfully. Proceeding with token exchange.`, { ip: req.ip });

  if (!code) {
    const specificError = 'Authorization code missing.';
    logger.warn(`[AUTH_CTRL_GOOGLE_CALLBACK] ${specificError}`, { ip: req.ip });
    return res.status(400).json({ error: isProduction ? 'Authentication failed. Missing authorization code.' : specificError });
  }

  try {
    const { tokens } = await googleOAuth2Client.getToken(code);
    const idToken = tokens.id_token;
    // Log the received tokens for debugging (REMOVE IN PRODUCTION)
    // logger.debug('[AUTH_CTRL_GOOGLE_CALLBACK] Received tokens from Google:', { tokens });

    if (!idToken) {
      const specificError = 'ID token missing from Google response.';
      logger.warn(`[AUTH_CTRL_GOOGLE_CALLBACK] ${specificError}`, { ip: req.ip });
      return res.status(400).json({ error: isProduction ? 'Authentication failed. Missing ID token.' : specificError });
    }
    logger.debug('[AUTH_CTRL_GOOGLE_CALLBACK] Received ID token from Google.', { ip: req.ip });

    const ticket = await googleAuthClient.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    logger.debug('[AUTH_CTRL_GOOGLE_CALLBACK] Google ID token verified successfully.', { email: payload.email, googleUserId: payload.sub, ip: req.ip });

    if (!payload.hd || payload.hd !== process.env.GOOGLE_HOSTED_DOMAIN) {
      const specificError = `Invalid domain. Please use an account from ${process.env.GOOGLE_HOSTED_DOMAIN}. User's domain: ${payload.hd}`;
      logger.warn(`[AUTH_CTRL_GOOGLE_CALLBACK] Domain mismatch for user.`, { userHd: payload.hd, requiredHd: process.env.GOOGLE_HOSTED_DOMAIN, email: payload.email, ip: req.ip, specificError });
      return res.status(403).json({ error: isProduction ? 'Authentication failed. Invalid account domain.' : specificError });
    }

    const googleUserId = payload.sub;
    const userEmail = payload.email;
    const userName = payload.name;

    let user = await findUserByProviderId(req.requestId, 'google', googleUserId);

    if (!user) {
      const existingUserByEmail = await findUserByEmail(req.requestId, userEmail);
      if (existingUserByEmail) {
        if (existingUserByEmail.auth_provider === 'local' || existingUserByEmail.auth_provider === null) {
          user = await linkGoogleAccount(req.requestId, existingUserByEmail.id, googleUserId);
          logger.info(`Linked existing local user to Google ID.`, { userId: existingUserByEmail.id, email: userEmail, googleUserId, ip: req.ip });
        } else if (existingUserByEmail.auth_provider === 'google' && existingUserByEmail.provider_user_id !== googleUserId) {
          const specificError = 'This email is associated with a different Google account. Please sign in with the original Google account or contact support.';
          logger.warn(`User email already associated with a different Google account.`, { email: userEmail, existingGoogleId: existingUserByEmail.provider_user_id, currentAttemptGoogleId: googleUserId, ip: req.ip, specificError });
          return res.status(409).json({ error: isProduction ? 'Authentication conflict. Please contact support.' : specificError });
        } else {
          user = existingUserByEmail;
          logger.debug(`User found by email, already linked or with other provider.`, { userId: user.id, email: userEmail, ip: req.ip });
        }
      } else {
        user = await createUserWithGoogle(req.requestId, googleUserId, userEmail, userName);
        logger.info(`Created new user with Google ID.`, { userId: user.id, email: userEmail, googleUserId, ip: req.ip });
      }
    } else {
        logger.debug(`User found by Google provider ID.`, { userId: user.id, email: userEmail, googleUserId, ip: req.ip });
    }

    if (!user) {
      const specificError = 'User processing failed after authentication.';
      logger.error('[AUTH_CTRL_GOOGLE_CALLBACK] User object is null after user handling logic.', { email: userEmail, googleUserId, ip: req.ip, specificError });
      return res.status(500).json({ error: isProduction ? 'Authentication error. Please try again.' : specificError });
    }

    // Persist the tokens
    if (user && user.id && tokens.access_token) {
      try {
        await updateUserGoogleTokens(
          req.requestId,
          user.id,
          tokens.access_token,
          tokens.refresh_token || null, // refresh_token might not always be provided
          tokens.expiry_date || null    // expiry_date is a timestamp in ms
        );
        logger.info(`[AUTH_CTRL_GOOGLE_CALLBACK] Successfully saved Google OAuth tokens for user.`, { userId: user.id, email: userEmail, ip: req.ip });
      } catch (tokenSaveError) {
        logger.error(`[AUTH_CTRL_GOOGLE_CALLBACK] Failed to save Google OAuth tokens for user.`, { userId: user.id, email: userEmail, error: tokenSaveError.message, stack: tokenSaveError.stack, ip: req.ip });
        // Decide if this is a critical failure. For now, log and continue.
        // Potentially, redirect to an error page or return an error JSON.
      }
    } else {
      logger.warn('[AUTH_CTRL_GOOGLE_CALLBACK] User object or access token missing, skipping token save.', { userId: user ? user.id : 'N/A', hasAccessToken: !!tokens.access_token, ip: req.ip });
    }

    const jwtToken = generateToken(user);
    logger.debug('[AUTH_CTRL_GOOGLE_CALLBACK] Generated JWT for user.', { userId: user.id, email: userEmail, ip: req.ip });

    // Trigger background sync if enabled
    if (user.sync_google_calendar && user.id) {
      logger.info(`Triggering background Google Calendar sync for user ${user.id} after Google login/callback. Request ID: ${req.requestId}`);
      syncCalendarFromGoogle(req.requestId, user.id)
        .then(syncResult => {
          logger.info(`Background sync for user ${user.id} (after Google login) completed. Result: ${JSON.stringify(syncResult)}. Request ID: ${req.requestId}`);
        })
        .catch(syncError => {
          logger.error(`Error during background sync for user ${user.id} (after Google login): ${syncError.message}`, { stack: syncError.stack, requestId: req.requestId });
        });
    }

    const frontendRedirectUrl = `${envFrontend}/auth/google/callback?token=${jwtToken}`;
    logger.info(`[AUTH_CTRL_GOOGLE_CALLBACK] Redirecting to frontend with JWT for user.`, { userId: user.id, email: userEmail, redirectUrlDomain: envFrontend, ip: req.ip });
    res.redirect(frontendRedirectUrl);

  } catch (error) {
    let specificError = 'Authentication processing failed.';
    if (error.isAxiosError && error.response && error.response.data) {
        specificError = `Google API error: ${error.response.data.error_description || error.response.data.error || 'Unknown Google API error'}`;
        logger.error('Google API Error Details:', { data: error.response.data, ip: req.ip });
    } else if (error.message && (error.message.includes("Invalid token signature") || error.message.includes("Token used too late"))) {
        specificError = `Google ID token validation failed: ${error.message}`;
    } else if (error.message) {
        specificError = error.message;
    }
    
    logger.error('Error during Google OAuth callback processing:', { errorMessage: error.message, stack: error.stack, isAxiosError: !!error.isAxiosError, ip: req.ip, specificError });
    
    const status = (error.message && (error.message.includes("Invalid token signature") || error.message.includes("Token used too late"))) ? 401 : 500;
    return res.status(status).json({ error: isProduction ? 'Authentication failed. Please try again.' : specificError });
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
