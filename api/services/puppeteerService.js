const puppeteer = require('puppeteer');

const getBrowser = async () => {
  // Always launch a new browser instance.
  const browser = await puppeteer.launch({
    headless: "new", // Or "new" if the version supports it and is preferred.
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
  return browser;
};

const closeBrowser = async (browser) => {
  // Accepts a browser instance and closes it.
  if (browser) {
    await browser.close();
  }
};

module.exports = {
  getBrowser,
  closeBrowser,
};
