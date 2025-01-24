const redis = require('../config/redis');

const SESSION_EXPIRY = 30 * 60; // 30 minutes

class SessionService {
    constructor() {
        this.SESSION_EXPIRY = 30 * 60;
    }

  async trackUserSession(userId, token) {
    await redis.setex(`user_session:${userId}`, SESSION_EXPIRY, token);
  }

  async removeUserSession(userId) {
    await redis.del(`user_session:${userId}`);
  }

  async getActiveSessions() {
    const keys = await redis.keys('user_session:*');
    return keys.length;
  }

  async refreshSession(userId, token) {
    // Check if the Redis record exists
    const sessionExists = await redis.exists(`user_session:${userId}`);
    
    if (!sessionExists) {
      // Recreate the Redis record if it doesn't exist
      await redis.setex(`user_session:${userId}`, SESSION_EXPIRY, token);      
    } else {
      // Refresh the session expiry
      await redis.expire(`user_session:${userId}`, SESSION_EXPIRY);      
    }    
    
  }
  
}

module.exports = new SessionService();