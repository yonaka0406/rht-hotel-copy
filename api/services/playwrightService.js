// npx playwright install in api folder
const { chromium } = require('playwright');
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

  browserLaunchPromise = chromium.launch({
    headless: true, // Playwright uses boolean true/false for headless
    timeout: 120000, // Increase timeout to 2 minutes
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
    logger.info('Playwright browser launched successfully.');
    // Playwright browser instances don't have a direct 'disconnected' event like Puppeteer
    // The connection is managed differently. We will rely on checking isConnected()
    // before use and re-launching if needed.
    return browserInstance;
  } catch (err) {
    logger.error('Failed to launch Playwright browser:', err);
    browserInstance = null;
    browserLaunchPromise = null;
    throw err;
  }
};

const closeSingletonBrowser = async () => {
  if (browserInstance) {
    logger.info('Closing Playwright browser instance.');
    try {
      await browserInstance.close();
    } catch (err) {
      logger.error("Error closing Playwright browser instance:", err);
    } finally {
      browserInstance = null;
      browserLaunchPromise = null;
    }
  }
};

const resetBrowser = async (isError = true) => {
  if (isError) {
    logger.warn('Resetting Playwright browser instance due to error.');
  } else {
    logger.info('Resetting Playwright browser instance for cleanup.');
  }
  await closeSingletonBrowser();
};

module.exports = {
  getBrowser,
  closeSingletonBrowser,
  resetBrowser,
};
