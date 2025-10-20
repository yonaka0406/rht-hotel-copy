const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const crypto = require('crypto');
const appConfig = require('./appConfig');
const logger = require('./logger'); // Assuming logger is available

const validateSessionSecret = () => {
  const fallbackSecret = crypto.randomBytes(32).toString('hex');
  const sessionSecret = process.env.SESSION_SECRET || fallbackSecret;
  if (!sessionSecret || typeof sessionSecret !== 'string' || sessionSecret.length < 16) {
    // logger.error("[SESSION_INIT] CRITICAL: sessionSecret is undefined, not a string, or too short! This will likely prevent sessions from working or be insecure.");
  }
  if (appConfig.isProduction() && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === fallbackSecret)) {
    logger.warn('[SESSION_INIT] WARNING: In production, SESSION_SECRET should be a strong, static secret defined in your environment variables. A dynamically generated secret will invalidate sessions on each restart.');
  }
  return sessionSecret;
};

const createSessionPool = () => {
  let sessionPool;
  try {
    const poolConfig = {
      user: process.env.PG_USER,
      host: process.env.PG_HOST,
      database: process.env.PG_DATABASE,
      password: process.env.PG_PASSWORD,
      port: parseInt(process.env.PG_PORT, 10),
    };
    sessionPool = new Pool(poolConfig);
    sessionPool.on('error', (err) => {
      // logger.error('[SESSION_POOL_ERROR] Idle client error', { message: err.message, stack: err.stack });
    });
  } catch (error) {
    // logger.error('[SESSION_INIT_ERROR] Failed to create sessionPool:', { error: error.message, stack: error.stack });
  }
  return sessionPool;
};

const createSessionStore = (sessionPool) => {
  let sessionStore;
  try {
    const storeOptions = {
      pool: sessionPool,
      tableName: 'user_sessions',
      createTableIfMissing: true,
    };
    sessionStore = new pgSession(storeOptions);
  } catch (error) {
    // logger.error('[SESSION_INIT_ERROR] Failed to create pgSession store:', { error: error.message, stack: error.stack });
  }
  return sessionStore;
};

const getSessionCookieConfig = () => {
  const isSecureEnvironment = appConfig.isSecure();
  // logger.info(`[SESSION_CONFIG] NODE_ENV: ${process.env.NODE_ENV}, Secure cookies: ${isSecureEnvironment}, SameSite: ${isSecureEnvironment ? 'None' : 'Lax'}`);
  return {
    secure: isSecureEnvironment,
    httpOnly: true,
    maxAge: appConfig.session.maxAge,
    sameSite: isSecureEnvironment ? 'None' : 'Lax',
  };
};

const configureSession = () => {
  const sessionSecret = validateSessionSecret();
  const sessionPool = createSessionPool();
  const sessionStore = createSessionStore(sessionPool);
  
  return {
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: getSessionCookieConfig()
  };
};

module.exports = configureSession;