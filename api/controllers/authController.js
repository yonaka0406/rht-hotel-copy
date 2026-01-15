const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../utils/jwtUtils');
const { sendResetEmail, sendAdminResetEmail } = require('../utils/emailUtils');
const sessionService = require('../services/sessionService');

const usersModel = require('../models/user');
const { getEnvironment } = require('../config/database'); // Added import

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
    // For multiple validation errors, sending all of them might be too verbose for prod.
    // Sending the first one or a generic message.
    const clientError = isProduction ? 'ログインに失敗しました。入力を確認してください。' : specificErrors[0].message;
    return res.status(400).json({ error: clientError, details: isProduction ? undefined : specificErrors });
  }

  const { email, password } = req.body;

  try {
    const user = await usersModel.selectUserByEmail(req.requestId, email);
    if (!user) {
      const specificError = 'User not found';
      logger.warn('Login attempt for non-existent user', { email, ip: req.ip, specificError });
      return res.status(401).json({ error: isProduction ? '認証に失敗しました。' : specificError });
    }

    // Check if the account is Google-linked
    if (user && user.auth_provider === 'google') {
      logger.warn('Login attempt for Google-linked account with password', { userId: user.id, email, ip: req.ip });
      return res.status(403).json({ error: "このアカウントはGoogleで登録されています。Googleログインをご利用ください。" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      const specificError = 'パスワードが間違っています。'; // Password error
      logger.warn('Invalid password attempt', { userId: user.id, email, ip: req.ip, specificError });
      return res.status(401).json({ error: isProduction ? '認証に失敗しました。' : specificError });
    }

    if (user.status_id !== 1) {
      const specificError = 'ユーザーが無効になっています。'; // User is disabled
      logger.warn('Login attempt for disabled user', { userId: user.id, email, status_id: user.status_id, ip: req.ip, specificError });
      return res.status(401).json({ error: isProduction ? 'アカウントに問題があります。サポートにお問い合わせください。' : specificError });
    }

    const token = generateToken(user);
    logger.info('User logged in successfully', { userId: user.id, email, ip: req.ip });

    // Trigger background sync if enabled
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
    res.status(500).json({ error: isProduction ? 'ログインに失敗しました。後でもう一度お試しください。' : specificError });
  }
};

const forgot = async (req, res) => {
  const logger = req.app.locals.logger;
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = validationResult(req);

  // Log the start of the request
  logger.debug('Forgot password request received', { ip: req.ip, bodyEmail: req.body.email, requestId: req.requestId });

  if (!errors.isEmpty()) {
    const specificErrors = errors.array().map(err => ({ field: err.param, message: err.msg }));
    logger.warn('Forgot password validation failed', { ip: req.ip, email: req.body.email, errors: specificErrors, requestId: req.requestId });
    const clientError = isProduction ? '入力が無効です。メールアドレスを確認してください。' : specificErrors[0].message;
    return res.status(400).json({ error: clientError, details: isProduction ? undefined : specificErrors });
  }

  const { email } = req.body;
  logger.debug('Email extracted for password reset', { email, ip: req.ip, requestId: req.requestId });

  try {
    logger.debug('Attempting to find user by email', { email, requestId: req.requestId });
    const user = await usersModel.selectUserByEmail(req.requestId, email); // Assuming selectUserByEmail also uses requestId for logging/tracing

    if (!user) {
      const specificError = 'ユーザー見つかりません。'; // User not found
      logger.warn('Password reset requested for non-existent user', { email, ip: req.ip, specificError, requestId: req.requestId });
      const message = isProduction ? 'メールアドレスが登録されている場合、パスワードリセットリンクが送信されます。' : specificError;
      // Respond with 200 in production even if user not found to prevent email enumeration
      return res.status(isProduction ? 200 : 400).json({ message: message, error: isProduction ? undefined : specificError });
    }
    logger.debug('User found for password reset', { userId: user.id, userEmail: user.email, authProvider: user.auth_provider, requestId: req.requestId });

    // Check if the account is Google-linked
    if (user.auth_provider === 'google') {
      const { forceReset } = req.body;
      logger.debug('Google account detected during forgot password', { userId: user.id, forceReset, requestId: req.requestId });
      if (!forceReset) {
        const googleError = "このアカウントはGoogleで登録されています。Googleログインをご利用ください。";
        logger.warn('Password reset requested for Google-linked account', { userId: user.id, email, ip: req.ip, requestId: req.requestId });
        return res.status(400).json({
          error: googleError,
          isGoogleAccount: true
        });
      }
      logger.info('Password reset forced for Google-linked account', { userId: user.id, email, requestId: req.requestId });
    }

    const resetToken = jwt.sign({ email: user.email }, process.env.JWT_RESET_SECRET, { expiresIn: '15m' });
    logger.debug('Password reset token generated', { userEmail: user.email, tokenPreview: resetToken.substring(0, 20) + '...', requestId: req.requestId });

    // Log right before sending the email
    logger.debug(`Value of user.email before calling sendResetEmail: [${user.email}]`, { userId: user.id, requestId: req.requestId });
    if (!user.email) {
      logger.error('CRITICAL: user.email is undefined or empty before calling sendResetEmail!', { userObject: user, requestId: req.requestId });
      // You might want to return an error here to prevent calling sendResetEmail with no recipient
      return res.status(500).json({ error: 'Internal server error: user email is missing.' });
    }
    logger.debug('Attempting to send password reset email', { recipientEmail: user.email, userId: user.id, requestId: req.requestId });
    await sendResetEmail(user.email, resetToken);

    logger.info('Password reset email successfully sent', { userId: user.id, email, ip: req.ip, requestId: req.requestId });
    res.json({ message: 'パスワードのリセットリンクが送られました。' }); // Password reset link has been sent.

  } catch (err) {
    const specificError = 'Error occurred while sending the password reset email.';
    // Ensure all relevant details are logged, especially if err.code or err.command exists (like from Nodemailer)
    logger.error('Forgot password process error', {
      error: err.message,
      stack: err.stack,
      code: err.code, // Log Nodemailer specific error codes if present
      command: err.command, // Log Nodemailer specific commands if present
      email,
      ip: req.ip,
      specificError,
      requestId: req.requestId
    });
    res.status(500).json({ error: isProduction ? 'リクエストの処理中にエラーが発生しました。後でもう一度お試しください。' : specificError + (isProduction ? '' : ` (${err.message})`) });
  }
}

const forgotAdmin = async (req, res) => {
  const logger = req.app.locals.logger;
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const specificErrors = errors.array().map(err => ({ field: err.param, message: err.msg }));
    logger.warn('Forgot admin password validation failed', { ip: req.ip, email: req.body.email, errors: specificErrors });
    const clientError = isProduction ? '入力が無効です。メールアドレスを確認してください。' : specificErrors[0].message;
    return res.status(400).json({ error: clientError, details: isProduction ? undefined : specificErrors });
  }

  const { email } = req.body;

  try {
    const resetToken = jwt.sign({ email: email }, process.env.JWT_RESET_SECRET, { expiresIn: '15m' });
    await sendAdminResetEmail(email, resetToken);

    logger.info('Admin password reset email sent', { email, ip: req.ip });
    res.json({ message: 'パスワードのリセットリンクが送られました。' });
  } catch (err) {
    const specificError = 'Error occurred while sending the admin password reset email.';
    logger.error('Forgot admin password error', { error: err.message, stack: err.stack, email, ip: req.ip, specificError });
    res.status(500).json({ error: isProduction ? 'リクエストの処理中にエラーが発生しました。後でもう一度お試しください。' : specificError });
  }
}

const reset = async (req, res) => {
  const logger = req.app.locals.logger;
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const specificErrors = errors.array().map(err => ({ field: err.param, message: err.msg }));
    logger.warn('Reset password validation failed', { ip: req.ip, errors: specificErrors });
    const clientError = isProduction ? 'パスワードのリセットに失敗しました。新しいパスワードが要件を満たしているか確認してください。' : specificErrors[0].message;
    return res.status(400).json({ error: clientError, details: isProduction ? undefined : specificErrors });
  }

  const { token, password } = req.body;

  try {
    if (!token) {
      const err = new Error('Token is missing');
      err.name = 'JsonWebTokenError';
      throw err;
    }
    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
    const email = decoded.email;
    const user = await usersModel.selectUserByEmail(req.requestId, email);

    if (!user) {
      const specificError = 'Invalid or expired token (user not found for token email)';
      logger.warn('Password reset attempt with invalid or expired token', { tokenEmail: email, ip: req.ip, specificError });
      return res.status(400).json({ error: isProduction ? 'パスワードのリセットに失敗しました。リンクが無効か、有効期限が切れている可能性があります。' : specificError });
    }

    const updated_by = user.id;
    const hashedPassword = await bcrypt.hash(password, 10);
    await usersModel.updatePasswordHash(req.requestId, email, hashedPassword, updated_by);

    logger.info('Password reset successfully', { userId: user.id, email, ip: req.ip });
    res.json({ message: 'パスワードが正常にリセットされました。' });
  } catch (error) {
    let specificError = 'パスワードのリセット中にエラーが発生しました。';
    let statusCode = 500;

    if (error.name === 'TokenExpiredError') {
      specificError = 'パスワードリセットのリンクの有効期限が切れています。もう一度リクエストしてください。';
      statusCode = 400;
    } else if (error.name === 'JsonWebTokenError') {
      specificError = 'パスワードリセットのリンクが無効です。';
      statusCode = 400;
    }

    logger.error('Error resetting password', {
      error: error.message,
      stack: error.stack,
      errorName: error.name,
      tokenUsed: !!token,
      ip: req.ip,
      specificError
    });

    res.status(statusCode).json({
      error: isProduction && statusCode === 500
        ? 'パスワードのリセットに失敗しました。もう一度お試しいただくか、新しいリンクをリクエストしてください。'
        : specificError
    });
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
  const logger = req.app.locals.logger; // Ensure logger is defined, it should be.
  // Add this debug logging
  logger.debug(`[OAUTH_DEBUG] Request ID: ${req.requestId}, Host: ${req.get('host')}, Origin: ${req.get('origin')}`);
  logger.debug(`[OAUTH_DEBUG] Environment detected by getEnvironment: ${getEnvironment(req.requestId)}`);
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

    let user = await usersModel.selectUserByProviderId(req.requestId, 'google', googleUserId);

    if (!user) {
      const existingUserByEmail = await usersModel.selectUserByEmail(req.requestId, userEmail);
      if (existingUserByEmail) {
        if (existingUserByEmail.auth_provider === 'local' || existingUserByEmail.auth_provider === null) {
          user = await usersModel.linkGoogleAccount(req.requestId, existingUserByEmail.id, googleUserId);
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
        user = await usersModel.insertUserWithGoogle(req.requestId, googleUserId, userEmail, userName);
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
        await usersModel.updateUserGoogleTokens(
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
    if (user.id) {
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
