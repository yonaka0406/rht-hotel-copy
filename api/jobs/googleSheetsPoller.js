const db = require('../config/database');
const defaultLogger = require('../config/logger');
const googleReportModel = require('../models/report/google');
const googleUtils = require('../utils/googleUtils');

let isJobRunning = false;
const POLLING_INTERVAL = 60 * 1000; // 60 seconds

const headers = [['施設ID', '施設名', '予約詳細ID', '日付', '部屋タイプ', '部屋番号', '予約者', 'プラン', 'ステータス', '種類', 'エージェント']];

const MAIN_SHEET_ID = '1W10kEbGGk2aaVa-qhMcZ2g3ARvCkUBeHeN2L8SUTqtY'; // Prod ID
const PARKING_SHEET_ID = '1LF3HOd7wyI0tlXuCqrnd-1m9OIoUb5EN7pegg0lJnt8'; // Prod ID

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
    const client = await db.getProdPool().connect();

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
                // a) Main Sheet
                const reservations = await googleReportModel.selectReservationsForGoogle(taskRequestId, task.hotel_id, task.check_in, task.check_out);
                const reservationValues = transformDataForGoogleSheets(reservations);
                await googleUtils.appendDataToSheet(MAIN_SHEET_ID, '予約データ', reservationValues);

                // b) Parking Sheet
                const parkingReservations = await googleReportModel.selectParkingReservationsForGoogle(taskRequestId, task.hotel_id, task.check_in, task.check_out);
                const parkingReservationValues = transformParkingDataForGoogleSheets(parkingReservations);
                await googleUtils.appendDataToSheet(PARKING_SHEET_ID, '駐車場データ', parkingReservationValues);

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

function transformDataForGoogleSheets(data) {
    return data.map(row => [
        row.hotel_id,
        row.hotel_name,
        row.reservation_detail_id,
        row.date,
        row.room_type_name,
        row.room_number,
        row.client_name,
        row.plan_name,
        row.status,
        row.type,
        row.agent,
    ]);
}

function transformParkingDataForGoogleSheets(data) {
    return data.map(row => [
        row.hotel_id,
        row.hotel_name,
        row.reservation_details_id,
        row.date,
        row.vehicle_category_name,
        row.parking_lot_name,
        row.spot_number,
        row.client_name,
        row.reservation_status,
        row.reservation_type,
        row.agent,
        row.parking_status,
        row.addon_name,
        row.comment,
    ]);
}

module.exports = { startGoogleSheetsPoller };