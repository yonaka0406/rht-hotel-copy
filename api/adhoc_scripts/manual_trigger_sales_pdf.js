require('dotenv').config({ path: '../.env' }); // Load .env from api root
const { runDailySalesOccPdfJob } = require('../jobs/dailySalesOccPdfJob');
const logger = require('../config/logger');

const run = async () => {
    console.log('--- Starting Manual Trigger of Sales & Occ PDF Job ---');
    try {
        await runDailySalesOccPdfJob();
        console.log('--- Job Execution Completed ---');
    } catch (error) {
        console.error('--- Job Execution Failed ---', error);
    }
    // We need to keep the process alive for a moment if there are async operations resolving (like email sending/logging)
    // but runDailySalesOccPdfJob is async and we await it, so it should be fine.
    // However, database pools might hang the process.
    // Ideally we should close database connections but for a quick script Ctrl+C is fine or process.exit(0).
    setTimeout(() => {
        console.log('Exiting process...');
        process.exit(0);
    }, 5000);
};

run();
