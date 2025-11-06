const puppeteer = require('puppeteer');
const logger = require('../config/logger');

let browserInstance = null;
let browserLaunchPromise = null;

const getBrowser = async () => {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }

  browserLaunchPromise = puppeteer.launch({
    headless: "new",
    protocolTimeout: 120000, // Increase timeout to 2 minutes    
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--disable-features=IsolateOrigins,site-per-process'
    ],
  });

  try {
    browserInstance = await browserLaunchPromise;
    logger.info('Puppeteer browser launched successfully.');
    browserInstance.on('disconnected', () => {
      logger.warn('Puppeteer browser disconnected. Resetting instance.');
      browserInstance = null;
      browserLaunchPromise = null;
    });
    return browserInstance;
  } catch (err) {
    logger.error('Failed to launch Puppeteer browser:', err);
    browserInstance = null;
    browserLaunchPromise = null;
    throw err;
  }
};

const closeSingletonBrowser = async () => {
  if (browserInstance) {
    logger.info('Closing Puppeteer browser instance.');
    try {
      await browserInstance.close();
    } catch (err) {
      logger.error("Error closing Puppeteer browser instance:", err);
    } finally {
      browserInstance = null;
      browserLaunchPromise = null;
    }
  }
};

const resetBrowser = async () => {
  logger.warn('Resetting Puppeteer browser instance due to error.');
  await closeSingletonBrowser();
};

module.exports = {
  getBrowser,
  closeSingletonBrowser,
  resetBrowser,
};
