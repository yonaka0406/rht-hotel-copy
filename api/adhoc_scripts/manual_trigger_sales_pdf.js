const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Load .env from api root
const { runDailySalesOccPdfJob } = require('../jobs/dailySalesOccPdfJob');
const logger = require('../config/logger');
const { pool, prodPool } = require('../config/database');

const run = async () => {
    logger.info('--- Starting Manual Trigger of Sales & Occ PDF Job ---');
    try {
        await runDailySalesOccPdfJob();
        logger.info('--- Job Execution Completed ---');
    } catch (error) {
        logger.error('--- Job Execution Failed ---', { message: error.message, stack: error.stack });
    } finally {
        // Explicitly close database pools
        logger.info('Closing database connections...');
        await Promise.all([
            pool.end(),
            prodPool.end()
        ]);
        logger.info('Exiting process...');
        process.exit(0);
    }
};

run().catch(error => {
    logger.error('Unhandled error in manual trigger script', { message: error.message, stack: error.stack });
    process.exit(1);
});
