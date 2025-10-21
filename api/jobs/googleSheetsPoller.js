const { getPool } = require('../config/database');
const defaultLogger = require('../config/logger');
// We import the model function directly, which is much cleaner than fetch
const googleReportModel = require('../models/report/google');

let isJobRunning = false;
const POLLING_INTERVAL = 60 * 1000; // 60 seconds

/**
 * This job runs every minute, finds pending tasks in the google_sheets_queue,
 * and executes them. It processes tasks one by one and marks them as 'processed'
 * or 'failed' individually, so a single bad task doesn't block the queue.
 */
async function processGoogleQueue() {
    if (isJobRunning) {
        defaultLogger.warn('Google Sheets Poller job already running. Skipping this run.');
        return;
    }
    isJobRunning = true;
    const logger = defaultLogger.child({ job: 'GoogleSheetsPoller' });
    
    let tasks = [];
    const client = await getPool().connect();

    try {
        // --- 1. Get Pending Tasks ---
        // Select all 'pending' tasks. The UNIQUE constraint in the DB
        // already ensures we don't have 60 duplicates. We just have 1.
        // We limit to 50 tasks per minute to stay safely under the 60/min quota.
        const { rows } = await client.query(
            `SELECT * FROM google_sheets_queue 
             WHERE status = 'pending' 
             ORDER BY created_at ASC 
             LIMIT 50`
        );
        tasks = rows;

        if (tasks.length === 0) {
            logger.info('No pending Google Sheets tasks.');
            return;
        }

        logger.info(`Found ${tasks.length} pending Google Sheets tasks to process.`);

        // --- 2. Process Each Task One-by-One ---
        for (const task of tasks) {
            const taskRequestId = `job-google-${task.id}`;
            try {
                // a) Main Sheet (Prod ID)
                const sheetId = '1W10kEbGGk2aaVa-qhMcZ2g3ARvCkUBeHeN2L8SUTqtY';
                await googleReportModel.generateGoogleReport(taskRequestId, sheetId, task.hotel_id, task.check_in, task.check_out);

                // b) Parking Sheet (Prod ID)
                const parkingSheetId = '1LF3HOd7wyI0tlXuCqrnd-1m9OIoUb5EN7pegg0lJnt8';
                await googleReportModel.generateGoogleParkingReport(taskRequestId, parkingSheetId, task.hotel_id, task.check_in, task.check_out);

                // c) Mark as processed
                await client.query(
                    `UPDATE google_sheets_queue SET status = 'processed', processed_at = NOW() WHERE id = $1`,
                    [task.id]
                );
                logger.info(`Successfully processed task ${task.id}`, { task });

            } catch (googleError) {
                logger.error(`Failed to process Google task ${task.id}. Marking as failed.`, { taskId: task.id, error: googleError.message, stack: googleError.stack });
                // Mark as 'failed' so we don't retry a bad task forever
                try {
                    await client.query(
                        `UPDATE google_sheets_queue SET status = 'failed', processed_at = NOW() WHERE id = $1`,
                        [task.id]
                    );
                } catch (dbError) {
                    logger.error(`DB error while marking task ${task.id} as failed. Original googleError: ${googleError.message}`, { taskId: task.id, dbError: dbError.message, dbStack: dbError.stack });
                }
            }
        }
        
    } catch (error) {
        // This is a fatal error (e.g., DB connection lost).
        // Tasks will remain 'pending' and be retried on the next run.
        logger.error('Fatal error in Google Sheets Poller job. Batch will be retried.', { error: error.message, stack: error.stack });
    } finally {
        isJobRunning = false;
        client.release();
        logger.info('Google Sheets Poller run finished.');
    }
}

function startGoogleSheetsPoller() {
    defaultLogger.info('Starting Google Sheets Polling Worker (runs every 60s)...');
    processGoogleQueue(); // Run immediately on start
    setInterval(processGoogleQueue, POLLING_INTERVAL);
}

module.exports = { startGoogleSheetsPoller };