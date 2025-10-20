const logger = require('../config/logger');
const { closeBrowser } = require('../services/puppeteerService'); // Assuming this path is correct

const setupGracefulShutdown = (server, pools = []) => {
  const cleanup = async () => {
    logger.info('Starting graceful shutdown...');

    // Close Socket.IO server
    server.io.close(() => {
      logger.info('Socket.IO server closed.');
    });

    // Close HTTP server
    server.httpServer.close(async () => {
      logger.info('HTTP server closed.');

      // Close all database pools
      for (const pool of pools) {
        try {
          await pool.end();
          logger.info(`Database pool closed.`);
        } catch (err) {
          logger.error('Error closing database pool:', err);
        }
      }

      // Close Puppeteer
      try {
        await closeBrowser();
        logger.info('Puppeteer browser closed.');
      } catch (err) {
        logger.error('Error closing Puppeteer browser:', err);
      }

      logger.info('Graceful shutdown complete.');
      process.exit(0);
    });

    // Force shutdown after a timeout
    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcefully exiting.');
      process.exit(1);
    }, 10000); // 10 seconds
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
};

module.exports = { setupGracefulShutdown };