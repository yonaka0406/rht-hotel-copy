//JWT verification middleware

const { verifyToken } = require('../utils/jwtUtils');
const sessionService = require('../services/sessionService');

/**
 * Verifies the JWT token from the Authorization header.
 * Checks if the token is present, valid, not expired, and if the user is active.
 * @param {Object} req - Express request object.
 * @returns {Object} An object containing { decoded, token } on success, or { error } on failure.
 */

const verifyTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return { error: 'Authorization header required' };
  }

  const headerParts = authHeader.split(' ');
  if (headerParts.length !== 2 || headerParts[0].toLowerCase() !== 'bearer') {
    return { error: 'Invalid Authorization header format. Expected "Bearer <token>"' };
  }

  const token = headerParts[1];
  if (!token) {
    return { error: 'Bearer token missing' };
  }
  
  const decoded = verifyToken(token);

  if (!decoded) {
    return { error: 'Invalid or expired token' };
  }

  // Check if user is active (status_id = 1)
  if (!decoded.status_id || decoded.status_id !== 1) {
    return { error: 'User not active. Access denied.' };
  }
  
  return { decoded, token };
};

/**
 * Basic authentication middleware.
 * Ensures user is authenticated and active. Refreshes session.
 */

const authMiddleware = async (req, res, next) => {
  const tokenVerification = verifyTokenFromHeader(req);

  if (tokenVerification.error) {
    return res.status(401).json({ error: tokenVerification.error });
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

  next();    
  
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
    return res.status(401).json({ error: tokenVerification.error });
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
    return res.status(401).json({ error: tokenVerification.error });
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
    return res.status(401).json({ error: tokenVerification.error });
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
    return res.status(401).json({ error: tokenVerification.error });
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
    return res.status(401).json({ error: tokenVerification.error });
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

module.exports = {
  authMiddleware,
  authMiddlewareCRUDAccess,
  authMiddlewareAdmin, 
  authMiddleware_manageUsers, 
  authMiddleware_manageDB, 
  authMiddleware_manageClients
};