const cron = require('node-cron');
const logger = require('../config/logger');
const db = require('../config/database');
require('dotenv').config({ path: './api/.env' });

// The SQL to update waitlist entries
const UPDATE_WAITLIST_SQL = `
  UPDATE waitlist_entries
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'waiting' AND requested_check_in_date < CURRENT_DATE
`;

const { startLog, completeLog } = require('../models/cron_logs');

const runWaitlistExpirationJob = async () => {
  const logId = await startLog('Waitlist Expiration');
  logger.info('[WaitlistJob] Starting waitlist expiration job...');
  const client = await db.getProdPool().connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(UPDATE_WAITLIST_SQL);
    await client.query('COMMIT');
    logger.info(`[WaitlistJob] Updated ${result.rowCount} waitlist entries to 'expired' (check-in before today).`);
    await completeLog(logId, 'success', { message: `Updated ${result.rowCount} waitlist entries` });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('[WaitlistJob] Error updating waitlist entries:', err);
    await completeLog(logId, 'failed', { error: err.message });
    throw err;
  } finally {
    client.release();
  }
};

const startWaitlistJob = () => {
  cron.schedule('0 1 * * *', async () => {
    try {
      logger.info('[WaitlistJob] Waitlist expiration job triggered by cron schedule.');
      await runWaitlistExpirationJob();
    } catch (error) {
      logger.error('[WaitlistJob] Waitlist expiration job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Tokyo'
  });
  logger.info('Waitlist expiration job scheduled daily at 1 AM Asia/Tokyo.');
};

module.exports = {
  runWaitlistExpirationJob,
  startWaitlistJob
}; 