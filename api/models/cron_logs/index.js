const { getProdPool, getDevPool } = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Helper to get the correct pool based on environment
 */
const getPool = () => {
    return process.env.NODE_ENV === 'production' ? getProdPool() : getDevPool();
};

/**
 * Start logging a cron job execution
 * @param {string} jobName - Name of the cron job
 * @param {object} [dbClient=null] - Optional database client
 * @returns {Promise<string>} - The ID of the log entry
 */
const startLog = async (jobName, dbClient = null) => {
    let client = dbClient;
    let shouldRelease = false;

    try {
        if (!client) {
            client = await getPool().connect();
            shouldRelease = true;
        }

        const query = `
            INSERT INTO logs_cron (job_name, status, start_time)
            VALUES ($1, 'running', CURRENT_TIMESTAMP)
            RETURNING id
        `;
        const result = await client.query(query, [jobName]);
        return result.rows[0].id;
    } catch (error) {
        logger.error(`Failed to start cron log for ${jobName}`, { error: error.message, stack: error.stack });
        return null; // Don't break the job if logging fails
    } finally {
        if (shouldRelease && client) {
            try {
                client.release();
            } catch (releaseErr) {
                logger.error(`Error releasing client in startLog for ${jobName}:`, releaseErr);
            }
        }
    }
};

/**
 * Complete a cron job execution log
 * @param {string} logId - The ID of the log entry to update
 * @param {string} status - 'success' or 'failed'
 * @param {object} details - JSON object with job details
 * @param {object} [dbClient=null] - Optional database client
 */
const completeLog = async (logId, status, details = {}, dbClient = null) => {
    if (!logId) return;

    let client = dbClient;
    let shouldRelease = false;

    try {
        if (!client) {
            client = await getPool().connect();
            shouldRelease = true;
        }
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
        logger.error(`Failed to complete cron log ${logId}`, { error: error.message, stack: error.stack });
    } finally {
        if (shouldRelease && client) {
            try {
                client.release();
            } catch (releaseErr) {
                logger.error(`Error releasing client in completeLog for ${logId}:`, releaseErr);
            }
        }
    }
};

module.exports = {
    startLog,
    completeLog
};
