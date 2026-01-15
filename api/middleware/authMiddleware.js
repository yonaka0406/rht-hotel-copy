//JWT verification middleware

const { verifyToken } = require('../utils/jwtUtils');
const sessionService = require('../services/sessionService');
const logger = require('../config/logger');
const { WaitlistEntry } = require('../models/waitlist'); 

/**
 * Verifies the JWT token from the Authorization header.
 * Checks if the token is present, valid, not expired, and if the user is active.
 * @param {Object} req - Express request object.
 * @returns {Object} An object containing { decoded, token } on success, or { error, errorType } on failure.
 */

const verifyTokenFromHeader = (req) => {
  // logger.debug(`[AUTH_MIDDLEWARE] Request to: ${req.path}`);
  // logger.debug(`[AUTH_MIDDLEWARE] All Headers: ${JSON.stringify(req.headers)}`);
  // logger.debug(`[AUTH_MIDDLEWARE] Authorization Header: ${req.headers.authorization}`);
  
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return { error: 'Authorization header required', errorType: 'NO_AUTH_HEADER' };
  }

  const headerParts = authHeader.split(' ');
  if (headerParts.length !== 2 || headerParts[0].toLowerCase() !== 'bearer') {
    return { error: 'Invalid Authorization header format. Expected "Bearer <token>"', errorType: 'INVALID_AUTH_FORMAT' };
  }

  const token = headerParts[1];
  if (!token) {
    return { error: 'Bearer token missing', errorType: 'NO_TOKEN' };
  }

  const verificationResult = verifyToken(token);

  if (!verificationResult.success) {
    return { 
      error: verificationResult.message, 
      errorType: verificationResult.error 
    };
  }

  const { decoded } = verificationResult;

  // Check if user is active (status_id = 1)
  if (!decoded.status_id || decoded.status_id !== 1) {
    return { error: 'User not active. Access denied.', errorType: 'USER_INACTIVE' };
  }

  return { decoded, token };
};

/**
 * Basic authentication middleware.
 * Ensures user is authenticated and active. Refreshes session.
 */

const authMiddleware = async (req, res, next) => {  
  // Prevent duplicate processing
  if (req.processed) {
    return;
  }
  req.processed = true;
  
  // logger.debug(`[AUTH_MIDDLEWARE_ENTRY] Path: ${req.path}, SessionID: ${req.sessionID}, Session available: ${!!req.session}, JWT Present: ${!!req.headers.authorization}`); if (req.session) { logger.debug(`[AUTH_MIDDLEWARE_SESSION_DATA] Session data: ${JSON.stringify(req.session)}`); }  

  // Add response logging
  const originalSend = res.send;
  res.send = function(data) {
    // logger.debug('Response being sent:', data);
    // logger.debug('Response headers:', res.getHeaders());
    return originalSend.call(this, data);
  };

  const tokenVerification = verifyTokenFromHeader(req);

  if (tokenVerification.error) {
    // Return specific status codes based on error type
    let statusCode = 401;
    if (tokenVerification.errorType === 'USER_INACTIVE') {
      statusCode = 403;
    }

    return res.status(statusCode).json({ 
      error: tokenVerification.error,
      errorType: tokenVerification.errorType 
    });
  }  

  const { decoded, token: originalToken } = tokenVerification;
  req.user = decoded;

  // Refresh session asynchronously without blocking
  if (originalToken) {
    sessionService.refreshSession(decoded.id, originalToken)
      .catch(error => console.error('Session refresh error in authMiddleware:', error));
  } else {
    // This should ideally not be reached if verifyTokenFromHeader ensures token presence on success
    console.error('Original token not available for session refresh in authMiddleware.');
  }

  // logger.debug('About to call next() in authMiddleware');
  next();
  // logger.debug('Called next() in authMiddleware');
};

/**
 * CRUD access middleware.
 * - All requests: Ensures user is authenticated and active.
 * - Non-GET requests: Additionally checks for 'crud_ok' permission.
 * Refreshes session.
 */

const authMiddlewareCRUDAccess = (req, res, next) => {
  const tokenVerification = verifyTokenFromHeader(req);

  if (tokenVerification.error) {
    let statusCode = 401;
    if (tokenVerification.errorType === 'USER_INACTIVE') {
      statusCode = 403;
    }

    return res.status(statusCode).json({ 
      error: tokenVerification.error,
      errorType: tokenVerification.errorType 
    });
  }

  const { decoded, token: originalToken } = tokenVerification;
  req.user = decoded;

  if (originalToken) {
    sessionService.refreshSession(decoded.id, originalToken)
      .catch(error => console.error('Session refresh error in authMiddlewareGeneralAccess:', error));
  } else {
    console.error('Original token not available for session refresh in authMiddlewareGeneralAccess.');
  }

  // If it's a GET request, user is authenticated and active, let them pass
  if (req.method === 'GET') {
    return next();
  }

  // For non-GET requests (POST, PUT, DELETE, PATCH, etc.), check for 'crud_ok' permission
  if (!decoded.permissions || decoded.permissions.crud_ok !== true) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to perform this action.' });
  }

  next(); // User has crud_ok permission for non-GET or it's a GET request
};

/**
 * Admin authentication middleware.
 * Ensures user is authenticated, active, and has admin permissions ('manage_users' OR 'manage_db').
 * Refreshes session.
 */

const authMiddlewareAdmin = (req, res, next) => {
  const tokenVerification = verifyTokenFromHeader(req);

  if (tokenVerification.error) {
    let statusCode = 401;
    if (tokenVerification.errorType === 'USER_INACTIVE') {
      statusCode = 403;
    }

    return res.status(statusCode).json({ 
      error: tokenVerification.error,
      errorType: tokenVerification.errorType 
    });
  }

  const { decoded, token: originalToken } = tokenVerification;
  req.user = decoded;

  if (originalToken) {
    sessionService.refreshSession(decoded.id, originalToken)
      .catch(error => console.error('Session refresh error in authMiddlewareAdmin:', error));
  } else {
    console.error('Original token not available for session refresh in authMiddlewareAdmin.');
  }

  if (!decoded.permissions) {
    return res.status(403).json({ error: 'Forbidden: Permissions not found in token. Cannot access Admin Dashboard.' });
  }

  if (decoded.permissions.manage_users !== true && decoded.permissions.manage_db !== true) {
    return res.status(403).json({ 
      error: 'Insufficient permissions: You are authenticated but not authorized to access the Admin Dashboard. Requires manage_users or manage_db permission.' 
    });
  }

  next();  
};

/**
 * Middleware to check for 'manage_users' permission.
 * Ensures user is authenticated, active, and has 'manage_users' permission.
 * Refreshes session.
 */
const authMiddleware_manageUsers = (req, res, next) => {
  const tokenVerification = verifyTokenFromHeader(req);

  if (tokenVerification.error) {
    let statusCode = 401;
    if (tokenVerification.errorType === 'USER_INACTIVE') {
      statusCode = 403;
    }

    return res.status(statusCode).json({ 
      error: tokenVerification.error,
      errorType: tokenVerification.errorType 
    });
  }

  const { decoded, token: originalToken } = tokenVerification;
  req.user = decoded;

  if (originalToken) {
    sessionService.refreshSession(decoded.id, originalToken)
      .catch(error => console.error('Session refresh error in authMiddleware_manageUsers:', error));
  } else {
    console.error('Original token not available for session refresh in authMiddleware_manageUsers.');
  }

  if (!decoded.permissions || decoded.permissions.manage_users !== true) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to manage users.' });
  }

  next();  
};

/**
 * Middleware to check for 'manage_db' permission.
 * Ensures user is authenticated, active, and has 'manage_db' permission.
 * Refreshes session.
 */
const authMiddleware_manageDB = (req, res, next) => {
  const tokenVerification = verifyTokenFromHeader(req);

  if (tokenVerification.error) {
    let statusCode = 401;
    if (tokenVerification.errorType === 'USER_INACTIVE') {
      statusCode = 403;
    }

    return res.status(statusCode).json({ 
      error: tokenVerification.error,
      errorType: tokenVerification.errorType 
    });
  }

  const { decoded, token: originalToken } = tokenVerification;
  req.user = decoded;

  if (originalToken) {
    sessionService.refreshSession(decoded.id, originalToken)
      .catch(error => console.error('Session refresh error in authMiddleware_manageDB:', error));
  } else {
    console.error('Original token not available for session refresh in authMiddleware_manageDB.');
  }

  if (!decoded.permissions || decoded.permissions.manage_db !== true) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to manage databases.' });
  }

  next();
};

/**
 * Middleware to check for 'manage_clients' permission.
 * Ensures user is authenticated, active, and has 'manage_clients' permission.
 * Refreshes session.
 */
const authMiddleware_manageClients = (req, res, next) => {
  const tokenVerification = verifyTokenFromHeader(req);

  if (tokenVerification.error) {
    let statusCode = 401;
    if (tokenVerification.errorType === 'USER_INACTIVE') {
      statusCode = 403;
    }

    return res.status(statusCode).json({ 
      error: tokenVerification.error,
      errorType: tokenVerification.errorType 
    });
  }

  const { decoded, token: originalToken } = tokenVerification;
  req.user = decoded;

  if (originalToken) {
    sessionService.refreshSession(decoded.id, originalToken)
      .catch(error => console.error('Session refresh error in authMiddleware_manageClients:', error));
  } else {
    console.error('Original token not available for session refresh in authMiddleware_manageClients.');
  }

  if (!decoded.permissions || decoded.permissions.manage_clients !== true) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to manage clients.' });
  }

  next();
};

/**
 * Waitlist token authentication middleware.
 * Validates waitlist confirmation tokens for public endpoints.
 * Sets req.user with a system user object for client-initiated actions.
 */
const authMiddlewareWaitlistToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const headerParts = authHeader.split(' ');
  if (headerParts.length !== 2 || headerParts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ error: 'Invalid Authorization header format. Expected "Bearer <token>"' });
  }

  const token = headerParts[1];
  if (!token) {
    return res.status(401).json({ error: 'Bearer token missing' });
  }

  try {
    // Find waitlist entry by token
    const entry = await WaitlistEntry.findByToken(req.requestId, token, false); // Don't validate expiry for cancellation
    
    if (!entry) {
      return res.status(401).json({ error: 'Invalid waitlist token' });
    }

    // Set a system user object for client-initiated actions
    req.user = {
      id: 1, // System user ID
      name: 'System User',
      permissions: { crud_ok: true } // Allow CRUD operations
    };

    // Store the waitlist entry for potential use in controllers
    req.waitlistEntry = entry;

    next();
  } catch (error) {
    console.error('Error in authMiddlewareWaitlistToken:', error);
    return res.status(500).json({ error: 'Token validation failed' });
  }
};

/**
 * Booking Engine API Key Authentication Middleware.
 * Validates API keys sent by the booking engine for cache update operations.
 * Sets req.user with a system user object for booking engine actions.
 */
const authMiddlewareBookingEngine = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const headerParts = authHeader.split(' ');
  if (headerParts.length !== 2 || headerParts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ error: 'Invalid Authorization header format. Expected "Bearer <api_key>"' });
  }

  const apiKey = headerParts[1];
  if (!apiKey) {
    return res.status(401).json({ error: 'API key missing' });
  }

  try {
    // Validate against environment variable
    const expectedApiKey = process.env.BOOKING_ENGINE_API_KEY;
    
    if (!expectedApiKey) {
      logger.error('BOOKING_ENGINE_API_KEY not configured in environment');
      return res.status(500).json({ error: 'Booking engine API key not configured' });
    }

    if (apiKey !== expectedApiKey) {
      logger.warn('Invalid booking engine API key attempt', { 
        providedKey: apiKey.substring(0, 8) + '...',
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Set a system user object for booking engine actions
    req.user = {
      id: 2, // System user ID for booking engine
      name: 'Booking Engine System',
      permissions: { crud_ok: true } // Allow CRUD operations
    };

    // Store booking engine context for potential use in controllers
    req.bookingEngine = {
      authenticated: true,
      apiKey: apiKey.substring(0, 8) + '...', // Log partial key for debugging
      timestamp: new Date().toISOString()
    };

    logger.debug('Booking engine authentication successful', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.path
    });

    next();
  } catch (error) {
    logger.error('Error in authMiddlewareBookingEngine:', error);
    return res.status(500).json({ error: 'Token validation failed' });
  }
};

/**
 * Middleware to check for 'accounting' permission.
 * Ensures user is authenticated, active, and has 'accounting' permission.
 * Refreshes session.
 */
const authMiddleware_accounting = (req, res, next) => {
  const tokenVerification = verifyTokenFromHeader(req);

  if (tokenVerification.error) {
    let statusCode = 401;
    if (tokenVerification.errorType === 'USER_INACTIVE') {
      statusCode = 403;
    }

    return res.status(statusCode).json({ 
      error: tokenVerification.error,
      errorType: tokenVerification.errorType 
    });
  }

  const { decoded, token: originalToken } = tokenVerification;
  req.user = decoded;

  if (originalToken) {
    sessionService.refreshSession(decoded.id, originalToken)
      .catch(error => console.error('Session refresh error in authMiddleware_accounting:', error));
  } else {
    console.error('Original token not available for session refresh in authMiddleware_accounting.');
  }

  if (!decoded.permissions || decoded.permissions.accounting !== true) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to access accounting module.' });
  }

  next();
};

module.exports = {
  authMiddleware,
  authMiddlewareCRUDAccess,
  authMiddlewareAdmin, 
  authMiddleware_manageUsers, 
  authMiddleware_manageDB, 
  authMiddleware_manageClients,
  authMiddleware_accounting,
  authMiddlewareWaitlistToken,
  authMiddlewareBookingEngine
};