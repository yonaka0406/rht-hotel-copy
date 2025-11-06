const puppeteer = require('puppeteer');

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
    browserInstance.on('disconnected', () => {
      console.warn('Puppeteer browser disconnected. Resetting instance.');
      browserInstance = null;
      browserLaunchPromise = null;
    });
    return browserInstance;
  } catch (err) {
    console.error('Failed to launch Puppeteer browser:', err);
    browserInstance = null;
    browserLaunchPromise = null;
    throw err;
  }
};

const closeSingletonBrowser = async () => {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch (err) {
      console.error("Error closing Puppeteer browser instance:", err);
    } finally {
      browserInstance = null;
      browserLaunchPromise = null;
    }
  }
};

const resetBrowser = async () => {
  console.warn('Resetting Puppeteer browser instance due to error.');
  await closeSingletonBrowser();
};

// The closeBrowser function is now deprecated, but we can keep it for a short time
// to avoid breaking changes, though it will now do nothing.
const closeBrowser = async (browser) => {
  // This function is deprecated. The singleton browser should not be closed by individual requests.
  // Use page.close() instead of browser.close() in your controllers.
};

module.exports = {
  getBrowser,
  closeBrowser, // Deprecated
  closeSingletonBrowser,
  resetBrowser,
};

// Add graceful shutdown handlers
const shutdown = async (signal) => {
  console.log(`Received ${signal}. Closing Puppeteer browser...`);
  try {
    await closeSingletonBrowser();
    console.log('Puppeteer browser closed gracefully.');
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
