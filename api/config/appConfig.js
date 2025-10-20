const crypto = require('crypto'); // Required for session secret generation

// config/appConfig.js
module.exports = {
  getEnvironmentConfig: (req) => {
    const origin = req?.headers?.origin || ''; // Explicitly handle undefined origin
    const isProd = origin.includes('wehub.work') && 
                   !origin.includes('test.wehub.work');
    
    return {
      pgDatabase: isProd ? process.env.PROD_PG_DATABASE : process.env.PG_DATABASE,
      frontendUrl: isProd ? process.env.PROD_FRONTEND_URL : process.env.FRONTEND_URL,
      frontendUrlHttp: isProd ? process.env.PROD_FRONTEND_URL_HTTP : process.env.FRONTEND_URL_HTTP,
      environment: isProd ? 'prod' : 'dev'
    };
  },
  
  isProduction: () => process.env.NODE_ENV === 'production',
  isSecure: () => process.env.NODE_ENV !== 'local',
  
  session: {
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    maxAge: 30 * 60 * 1000
  }
};