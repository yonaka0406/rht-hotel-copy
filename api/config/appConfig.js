const crypto = require('crypto');

// Determine if the environment is production
const isProductionEnv = process.env.NODE_ENV === 'production';

let sessionSecret;
if (isProductionEnv) {
  // In production, SESSION_SECRET must be explicitly set
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) { // Enforce a minimum length for security
    console.error('CRITICAL ERROR: In production, SESSION_SECRET environment variable must be set and be at least 32 characters long for security.');
    process.exit(1); // Exit the process if not set in production
  }
  sessionSecret = process.env.SESSION_SECRET;
} else {
  // In non-production, use provided secret or generate one with a warning
  if (!process.env.SESSION_SECRET) {
    console.warn('WARNING: SESSION_SECRET environment variable not set. Generating a random session secret. Sessions will not persist across restarts.');
    sessionSecret = crypto.randomBytes(32).toString('hex');
  } else {
    sessionSecret = process.env.SESSION_SECRET;
  }
}

module.exports = {
  getEnvironmentConfig: (req) => {
    const origin = req?.headers?.origin || '';
    const isProd = origin.includes('wehub.work') && 
                   !origin.includes('test.wehub.work');
    
    return {
      pgDatabase: isProd ? process.env.PROD_PG_DATABASE : process.env.PG_DATABASE,
      frontendUrl: isProd ? process.env.PROD_FRONTEND_URL : process.env.FRONTEND_URL,
      frontendUrlHttp: isProd ? process.env.PROD_FRONTEND_URL_HTTP : process.env.FRONTEND_URL_HTTP,
      environment: isProd ? 'prod' : 'dev'
    };
  },
  
  isProduction: () => isProductionEnv, // Use the determined isProductionEnv
  isSecure: () => process.env.NODE_ENV !== 'local',
  
  session: {
    secret: sessionSecret,
    maxAge: 30 * 60 * 1000
  }
};