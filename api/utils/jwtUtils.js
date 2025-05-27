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
    return decoded;
  } catch (error) {
    console.error('Token Verification Detailed Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return null;    
  }  
};

module.exports = { generateToken, verifyToken };