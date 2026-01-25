const { pool } = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Start logging a cron job execution
 * @param {string} jobName - Name of the cron job
 * @returns {Promise<string>} - The ID of the log entry
 */
const startLog = async (jobName) => {
    const client = await pool.connect();
    try {
        const query = `
            INSERT INTO logs_cron (job_name, status, start_time)
            VALUES ($1, 'running', CURRENT_TIMESTAMP)
            RETURNING id
        `;
        const result = await client.query(query, [jobName]);
        return result.rows[0].id;
    } catch (error) {
        logger.error(`Failed to start cron log for ${jobName}`, { error: error.message });
        return null; // Don't break the job if logging fails
    } finally {
        client.release();
    }
};

/**
 * Complete a cron job execution log
 * @param {string} logId - The ID of the log entry to update
 * @param {string} status - 'success' or 'failed'
 * @param {object} details - JSON object with job details
 */
const completeLog = async (logId, status, details = {}) => {
    if (!logId) return;

    const client = await pool.connect();
    try {
        const query = `
            UPDATE logs_cron
            SET 
                status = $2,
                end_time = CURRENT_TIMESTAMP,
                duration_ms = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time)) * 1000,
                details = $3
            WHERE id = $1
        `;
        await client.query(query, [logId, status, details]);
    } catch (error) {
        logger.error(`Failed to complete cron log ${logId}`, { error: error.message });
    } finally {
        client.release();
    }
};

module.exports = {
    startLog,
    completeLog
};
