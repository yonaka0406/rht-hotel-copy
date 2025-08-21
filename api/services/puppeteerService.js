const puppeteer = require('puppeteer');

let browserInstance;

const getBrowser = async () => {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  browserInstance = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });

  browserInstance.on('disconnected', () => {
    browserInstance = null;
  });

  return browserInstance;
};

const closeBrowser = async () => {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
};

module.exports = {
  getBrowser,
  closeBrowser,
};
