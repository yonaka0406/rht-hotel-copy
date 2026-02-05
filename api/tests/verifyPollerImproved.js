const { startOtaXmlPoller, stopOtaXmlPoller } = require('../jobs/otaXmlPoller');
const logger = require('../config/logger');

async function runVerification() {
    console.log('Starting poller verification with improved error handling...');

    startOtaXmlPoller();

    // Wait for a few seconds to see it running and hitting the error handling logic
    await new Promise(resolve => setTimeout(resolve, 8000));

    console.log('Requesting poller stop...');
    stopOtaXmlPoller();

    // Wait for it to finish
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Verification finished.');
    process.exit(0);
}

runVerification().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
