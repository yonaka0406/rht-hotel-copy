const jwt = require('jsonwebtoken');
const sessionService = require('../services/sessionService');
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

const generateToken = (user) => {
  try {
    const payload = {
      id: user.id,
      email: user.email,
      status_id: user.status_id,
      role: user.role_name,
      permissions: user.permissions,      
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(payload, JWT_SECRET, { 
      expiresIn: '10h',
      algorithm: 'HS256'
    });

    // Track session in Redis without blocking token generation
    sessionService.trackUserSession(user.id, token)
      .catch(error => console.error('Session tracking error:', error));

    return token;
  } catch (error) {
    console.error('Token Generation Error:', error.message);
    throw error;
  }
};

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      clockTolerance: 30, // Allow 30 seconds of clock skew
      maxAge: '10h'
    });
    return { success: true, decoded };
  } catch (error) {
    /*
    console.error('Token Verification Detailed Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    */

    // Return specific error types for better handling
    if (error.name === 'JsonWebTokenError') {
      return { success: false, error: 'JWT_MALFORMED', message: 'Invalid token format' };
    } else if (error.name === 'TokenExpiredError') {
      return { success: false, error: 'JWT_EXPIRED', message: 'Token has expired' };
    } else if (error.name === 'NotBeforeError') {
      return { success: false, error: 'JWT_NOT_ACTIVE', message: 'Token not active yet' };
    } else {
      return { success: false, error: 'JWT_INVALID', message: 'Token verification failed' };
    }
  }  
};

module.exports = { generateToken, verifyToken };