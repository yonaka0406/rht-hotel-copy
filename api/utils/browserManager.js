// browserManager.js
const puppeteer = require('puppeteer');
const { exec, execSync } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

let browserInstancePromise;
let browserProcess = null;

// Cross-platform process cleanup
async function cleanupZombieProcesses() {
  if (process.platform === 'win32') {  
    return; // Don't proceed with Unix cleanup on Windows
  }
  
  // Unix/Linux cleanup
  console.log('🧹 Cleaning up any zombie Chrome processes...');
  try {
    // Kill any remaining Chrome processes
    await Promise.all([
      execAsync('pkill -f "chrome.*puppeteer" || true'),
      execAsync('pkill -f "chromium.*puppeteer" || true'),
      execAsync('pkill -f "chrome.*--headless" || true'),
      execAsync('pkill -f "chromium.*--headless" || true')
    ]);
  } catch (error) {
    console.warn('⚠️ Error during Unix process cleanup:', error.message);
  }
};

/**
 * Logs system resource information
 */
const logSystemResources = () => {
  try {
    console.log('\n📊 System Resources:');
    
    // Memory usage
    const memory = process.memoryUsage();
    console.log('Memory Usage (MB):', {
      rss: (memory.rss / 1024 / 1024).toFixed(2),
      heapTotal: (memory.heapTotal / 1024 / 1024).toFixed(2),
      heapUsed: (memory.heapUsed / 1024 / 1024).toFixed(2),
      external: (memory.external / 1024 / 1024).toFixed(2)
    });

    // System memory
    const freeMem = execSync('free -m').toString();
    console.log('System Memory (MB):\n' + freeMem);

    // Disk space
    const diskSpace = execSync('df -h').toString();
    console.log('Disk Space:\n' + diskSpace);

    // CPU info
    const cpuInfo = execSync('lscpu').toString();
    console.log('CPU Info:', cpuInfo.split('\n').slice(0, 10).join('\n'));
    
  } catch (error) {
    console.error('Error getting system resources:', error.message);
  }
};

/**
 * Launches a new browser instance with optimized settings for server environments
 * @returns {Promise<import('puppeteer').Browser>}
 */
const launchBrowser = async () => {
  const startTime = Date.now();
  console.log("🚀 Launching a new self-contained browser instance...");
  
  // Clean up any existing processes first
  await cleanupZombieProcesses();
  
  // Log system resources before launch
  logSystemResources();
  
  try {
    console.log('\n🔧 Browser launch options:', {
      headless: 'new',
      timeout: 60000,
      env: {
        LANG: 'en_US.UTF-8',
        DISPLAY: process.env.DISPLAY || ':99'
      }
    });
    
    console.log('\n📡 Starting browser process...');
    // Kill only Puppeteer-managed Chrome instances
    try {
      if (process.platform === 'win32') {
        // On Windows, we'll use the --remote-debugging-port to identify Puppeteer instances
        await execAsync('wmic process where "name=\'chrome.exe\' and commandline like \'%--remote-debugging-port%\'" delete || exit 0');
      } else {
        // On Unix, look for Chrome processes with puppeteer in the command line
        await execAsync('pkill -f "chrome.*puppeteer" || true');
        await execAsync('pkill -f "chromium.*puppeteer" || true');
      }
    } catch (e) {
      console.warn('Warning cleaning up Puppeteer instances:', e.message);
    }
    
    const browser = await puppeteer.launch({
      headless: 'new',
      timeout: 120000,
      protocolTimeout: 120000,
      protocol: 'cdp',
      // Disable process cleanup on exit to prevent race conditions
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-site-isolation-trials',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-breakpad',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-pings',
        '--remote-debugging-port=0',  // Auto-select port
        '--window-size=1920,1080',
        '--single-process',
        '--disable-ipc-flooding-protection',
        '--disable-hang-monitor',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-background-networking',
        '--disable-client-side-phishing-detection',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-session-crashed-bubble',
        '--disable-crash-reporter',
        '--disable-ipc-flooding-protection',
        '--disable-renderer-backgrounding',
        '--force-color-profile=srgb',
        '--use-mock-keychain',
        '--enable-features=NetworkService,NetworkServiceInProcess',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-hang-monitor',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-pings',
        '--no-zygote',
        '--password-store=basic',
        '--use-mock-keychain',
        '--disable-blink-features=AutomationControlled'
      ],
      env: {
        ...process.env,
        LANG: 'en_US.UTF-8',
        DISPLAY: ':99',
        NODE_ENV: 'production',
        PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'true',
        PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH || '',
        GOOGLE_API_KEY: 'no',
        GOOGLE_DEFAULT_CLIENT_ID: 'no',
        GOOGLE_DEFAULT_CLIENT_SECRET: 'no',
        NODE_OPTIONS: '--max-old-space-size=4096',
        CHROME_UPDATE_URL: 'http://127.0.0.1',
        CHROME_HEADLESS: '1',
        CHROME_FORCE_ENABLE_LOGGING: '0',
        CHROME_DISABLE_TRANSLATE: '1',
        CHROME_COMPONENT_UPDATER: '0',
        CHROME_EXTENSIONS_UPDATE_URL: 'http://127.0.0.1',
        CHROME_DISABLE_NETWORK_TIME: '1',
        CHROME_FORCE_FIRST_RUN: '0',
        CHROME_METRICS_RECORDING: '0',
        CHROME_PASSWORD_MANAGER: '0',
        CHROME_SAFE_BROWSING: '0',
        CHROME_SPELLCHECK: '0',
        CHROME_SYNC: '0',
        CHROME_TRANSLATE: '0',
        CHROME_UPDATE: '0',
        CHROME_USER_DATA_DIR: '0',
        CHROME_VERSION_CHECK: '0',
        CHROME_WEB_STORE: '0',
        CHROME_WIDEVINE: '0',
        CHROME_WIDEVINE_CDM: '0',
        CHROME_WIDEVINE_CDM_PATH: '0',
        CHROME_WIDEVINE_CDM_VERSION: '0',
        CHROME_WIDEVINE_CDM_SIGNATURE: '0',
        CHROME_WIDEVINE_PATH: '0',
        CHROME_WIDEVINE_VERSION: '0'
      }
    });

    // Store the browser process for cleanup
    const currentBrowserProcess = browser.process();
    browserProcess = currentBrowserProcess; // Update the module-level variable
    
    browser.on('disconnected', async () => {
      console.log("🔌 Browser disconnected. It will be relaunched on the next request.");
      browserInstancePromise = null;
      browserProcess = null;
      
      // Skip process cleanup on Windows to avoid issues with process tree
      if (process.platform === 'win32') {
        return;
      }
      
      // Cleanup for non-Windows platforms
      try {
        if (currentBrowserProcess && !currentBrowserProcess.killed) {
          currentBrowserProcess.kill('SIGKILL');
        }
        await cleanupZombieProcesses();
      } catch (e) {
        console.error('Error during browser cleanup:', e);
      }
    });

    const launchDuration = (Date.now() - startTime) / 1000;
    console.log(`✅ Browser launched successfully in ${launchDuration.toFixed(2)}s`);
    
    // Log browser process info
    if (currentBrowserProcess) {
      console.log(`🔍 Browser PID: ${currentBrowserProcess.pid}`);
      if (process.platform !== 'win32') {
        try {
          const psOutput = execSync(`ps -p ${currentBrowserProcess.pid} -o %cpu,%mem,cmd`).toString();
          console.log('Browser Process Info:\n' + psOutput);
        } catch (e) {
          console.log('Could not get process info:', e.message);
        }
      } else {
        try {
          const taskList = await execAsync(`tasklist /FI "PID eq ${currentBrowserProcess.pid}"`);
          console.log('Browser Process Info:\n' + taskList.stdout);
        } catch (e) {
          console.log('Could not get Windows process info:', e.message);
        }
      }
    }
    
    return browser;
  } catch (error) {
    const errorTime = (Date.now() - startTime) / 1000;
    console.error(`❌ Failed to launch browser after ${errorTime.toFixed(2)}s:`, error);
    
    // Log additional diagnostic info
    try {
      console.log('\n🔍 Running processes:');
      const processes = execSync('ps aux | grep -i chrome || ps aux | grep -i chromium').toString();
      console.log(processes || 'No Chrome/Chromium processes found');
      
      console.log('\n🔍 Open files:');
      const lsof = execSync('lsof -i -P -n | grep -i listen').toString();
      console.log(lsof || 'No listening ports found');
    } catch (e) {
      console.error('Error getting diagnostic info:', e.message);
    }
    
    browserInstancePromise = null;
    throw error;
  }
};

/**
 * Gets the shared browser instance, creating one if it doesn't exist
 * @returns {Promise<import('puppeteer').Browser>}
 */
const getBrowser = () => {
  if (!browserInstancePromise) {
    browserInstancePromise = launchBrowser();
  }
  return browserInstancePromise;
};

/**
 * Closes the browser instance for a graceful shutdown
 * @returns {Promise<void>}
 */
const closeBrowser = async () => {
  if (browserInstancePromise) {
    try {
      const browser = await browserInstancePromise;
      if (browser && browser.close) {
        await browser.close();
      }
      
      // Force kill any remaining processes
      if (browserProcess && !browserProcess.killed) {
        browserProcess.kill('SIGKILL');
      }
      
      // Clean up any remaining processes
      await cleanupZombieProcesses();
    } catch (error) {
      console.error('Error during browser shutdown:', error);
    } finally {
      browserInstancePromise = null;
      browserProcess = null;
    }
  }
};

// Handle process termination
process.on('SIGTERM', closeBrowser);
process.on('SIGINT', closeBrowser);

module.exports = {
  getBrowser,
  closeBrowser
};
