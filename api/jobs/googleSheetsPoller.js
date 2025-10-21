const db = require('../config/database');
const defaultLogger = require('../config/logger');
const googleReportModel = require('../models/report/google');
const googleUtils = require('../utils/googleUtils');

let isJobRunning = false;
const POLLING_INTERVAL = 60 * 1000; // 60 seconds

const headers = [['施設ID', '施設名', '予約詳細ID', '日付', '部屋タイプ', '部屋番号', '予約者', 'プラン', 'ステータス', '種類', 'エージェント', '最終更新日時', '表示セル']];

const MAIN_SHEET_ID = '1W10kEbGGk2aaVa-qhMcZ2g3ARvCkUBeHeN2L8SUTqtY'; // Prod ID
const PARKING_SHEET_ID = '1LF3HOd7wyI0tlXuCqrnd-1m9OIoUb5EN7pegg0lJnt8'; // Prod ID

/**
 * Helper function to construct the display cell string based on reservation data.
 * @param {object} reservation - The reservation object.
 * @param {boolean} isParking - True if it's a parking reservation, false otherwise.
 * @returns {string} The constructed display cell string.
 */
function buildDisplayCell(reservation, isParking = false) {
    let displayCell = '';
    const statusField = isParking ? reservation.reservation_status : reservation.status;
    const typeField = isParking ? reservation.reservation_type : reservation.type;

    if (statusField === "hold") {
        displayCell += "㋭｜";
    } else if (statusField === "provisory") {
        displayCell += "㋕｜";
    }

    if (reservation.client_name) {
        displayCell += String(reservation.client_name);
    }

    if (!isParking && reservation.plan_name) {
        displayCell += "、" + String(reservation.plan_name);
    } else if (isParking && reservation.vehicle_category_name) {
        displayCell += "、" + String(reservation.vehicle_category_name);
    }

    if (reservation.agent) {
        displayCell += "、㋔｜" + String(reservation.agent);
    } else if (typeField === "employee") {
        displayCell += "、㋛｜";
    }
    return displayCell;
}

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
        logger.warn('Fetching pending Google Sheets tasks...');
        // --- 1. Get Pending Tasks ---
        // Select all 'pending' tasks. The UNIQUE constraint in the DB
        // already ensures we don't have 60 duplicates. We just have 1.
        // We limit to 50 tasks per minute to stay safely under the 60/min quota.
        const { rows } = await client.query(
            `SELECT * FROM google_sheets_queue 
             WHERE status = 'pending' 
             ORDER BY created_at ASC 
             LIMIT 29`
        );
        tasks = rows;

        if (tasks.length === 0) {
            logger.info('No pending Google Sheets tasks.');
            return;
        }

        logger.info(`Found ${tasks.length} pending Google Sheets tasks to process.`);

        // --- 2. Process Each Task One-by-One ---
        for (const task of tasks) {
            logger.warn(`Processing task ${task.id}`, { task });
            const taskRequestId = `job-google-${task.id}`;
            try {
                // a) Main Sheet
                logger.warn(`Fetching reservations for task ${task.id}...`);
                const reservations = await googleReportModel.selectReservationsForGoogle(taskRequestId, task.hotel_id, task.check_in, task.check_out);
                logger.warn(`Fetched ${reservations.length} reservations for task ${task.id}.`);
                const reservationValues = transformDataForGoogleSheets(reservations);
                const mainSheetName = `H_${task.hotel_id}`;
                logger.warn(`Appending ${reservationValues.length} reservation rows to main sheet '${mainSheetName}' for task ${task.id}.`);
                await googleUtils.appendDataToSheet(MAIN_SHEET_ID, mainSheetName, reservationValues);
                logger.warn(`Successfully appended reservations for task ${task.id}.`);

                // b) Parking Sheet
                logger.warn(`Fetching parking reservations for task ${task.id}...`);
                const parkingSheetName = `P_${task.hotel_id}`;
                const parkingReservations = await googleReportModel.selectParkingReservationsForGoogle(taskRequestId, task.hotel_id, task.check_in, task.check_out);
                logger.warn(`Fetched ${parkingReservations.length} parking reservations for task ${task.id}.`);
                const parkingReservationValues = transformParkingDataForGoogleSheets(parkingReservations);
                logger.warn(`Appending ${parkingReservationValues.length} parking reservation rows to parking sheet '${parkingSheetName}' for task ${task.id}.`);
                await googleUtils.appendDataToSheet(PARKING_SHEET_ID, parkingSheetName, parkingReservationValues);
                logger.warn(`Successfully appended parking reservations for task ${task.id}.`);

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

function transformDataForGoogleSheets(reservations) {
    // Format each reservation as an array in the same order as headers
    const rows = reservations.map(reservation => {
      const reservationDate = new Date(reservation.date);
      const formattedReservationDate = isNaN(reservationDate.getTime()) ? '' : reservationDate.toLocaleDateString('ja-JP');

      const currentTimestamp = new Date();
      const formattedTimestamp = isNaN(currentTimestamp.getTime()) ? '' : currentTimestamp.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

      const displayCell = buildDisplayCell(reservation);
  
      // Ensure all values are converted to strings
      return [
        String(reservation.hotel_id || ''),
        String(reservation.hotel_name || ''),
        String(reservation.reservation_detail_id || ''),
        formattedReservationDate,
        String(reservation.room_type_name || ''),
        String(reservation.room_number || ''),
        String(reservation.client_name || ''),
        String(reservation.plan_name || ''),
        String(reservation.status || ''),
        String(reservation.type || ''),
        String(reservation.agent || ''),
        formattedTimestamp,
        displayCell
      ];
    });
    
    // Return data rows
    return [...rows];
};

function transformParkingDataForGoogleSheets(reservations) {
    const rows = reservations.map(reservation => {
      const reservationDate = new Date(reservation.date);
      const formattedReservationDate = isNaN(reservationDate.getTime()) ? '' : reservationDate.toLocaleDateString('ja-JP');

      const currentTimestamp = new Date();
      const formattedTimestamp = isNaN(currentTimestamp.getTime()) ? '' : currentTimestamp.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

      const displayCell = buildDisplayCell(reservation, true);

      return [
        String(reservation.hotel_id || ''),
        String(reservation.hotel_name || ''),
        String(reservation.reservation_details_id || ''),
        formattedReservationDate,
        String(reservation.vehicle_category_name || ''),
        String(reservation.parking_lot_name || ''),
        String(reservation.spot_number || ''),
        String(reservation.client_name || ''),
        String(reservation.reservation_status || ''),
        String(reservation.reservation_type || ''),
        String(reservation.agent || ''),
        formattedTimestamp,
        displayCell
      ];
    });

    return [...rows];
};

module.exports = { startGoogleSheetsPoller };