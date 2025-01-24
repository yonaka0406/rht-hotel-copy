//JWT verification middleware

const { verifyToken } = require('../utils/jwtUtils');
const sessionService = require('../services/sessionService');

const verifyTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return { error: 'Authorization header required' };
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return { error: 'Invalid or expired token' };
  }

  // Check if user is active (status_id = 1)
  if (!decoded.status_id || decoded.status_id !== 1) {
    return { error: 'User not active. Access denied.' };
  }
  
  return { decoded };
};

const authMiddleware = async (req, res, next) => {
  const tokenVerification = verifyTokenFromHeader(req);

  if (tokenVerification.error) {
    return res.status(401).json({ error: tokenVerification.error });
  }  

  try {
    const { token, decoded } = tokenVerification;
    req.user = decoded;

    // Refresh session asynchronously without blocking
    sessionService.refreshSession(decoded.id, token)
      .catch(error => console.error('Session refresh error:', error));

    next();  
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
};

const authMiddlewareAdmin = (req, res, next) => {
  const tokenVerification = verifyTokenFromHeader(req);

  if (tokenVerification.error) {
    return res.status(401).json({ error: tokenVerification.error });
  }

  try {
    const { token, decoded } = tokenVerification;
    req.user = decoded;
    // Refresh session asynchronously without blocking
    sessionService.refreshSession(decoded.id, token)
      .catch(error => console.error('Session refresh error:', error));

    // Check if the user has 'manage_users' permission
    if (!decoded.permissions) {
      // Token does not include permissions
      return res.status(403).json({ error: 'Forbidden: You do not have permission to access the Admin Dashboard' });
    }  

    if (decoded.permissions.manage_users !== true && decoded.permissions.manage_db !== true) {
      // Authenticated user without admin permissions
      return res.status(403).json({ 
        error: 'Insufficient permissions: You are authenticated but not authorized to access the Admin Dashboard' 
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const authMiddleware_manageUsers = (req, res, next) => {
  const tokenVerification = verifyTokenFromHeader(req);

  if (tokenVerification.error) {
    return res.status(401).json({ error: tokenVerification.error });
  }

  try {
    const { token, decoded } = tokenVerification;
    req.user = decoded;
    // Refresh session asynchronously without blocking
    sessionService.refreshSession(decoded.id, token)
      .catch(error => console.error('Session refresh error:', error));

    // Check if the user has 'manage_users' permission
    if (!decoded.permissions || decoded.permissions.manage_users !== true) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to manage users' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const authMiddleware_manageDB = (req, res, next) => {
  const tokenVerification = verifyTokenFromHeader(req);

  if (tokenVerification.error) {
    return res.status(401).json({ error: tokenVerification.error });
  }

  try {
    const { token, decoded } = tokenVerification;
    req.user = decoded;
    // Refresh session asynchronously without blocking
    sessionService.refreshSession(decoded.id, token)
      .catch(error => console.error('Session refresh error:', error));

    // Check if the user has 'manage_db' permission
    if (!decoded.permissions || decoded.permissions.manage_db !== true) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to manage databases' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = {authMiddleware, authMiddlewareAdmin, authMiddleware_manageUsers, authMiddleware_manageDB};