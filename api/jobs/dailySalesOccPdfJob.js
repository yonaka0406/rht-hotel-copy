const cron = require('node-cron');
const { sendGenericEmail } = require('../utils/emailUtils');
const { getFrontendCompatibleReportData } = require('./services/frontendCompatibleReportService');
const { generateDailyReportPdf } = require('../controllers/report/services/dailyTemplateService');
const logger = require('../config/logger');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const { getProdPool, getDevPool } = require('../config/database');

/**
 * Generates and sends the Daily Sales & Occ PDF report.
 */
const runDailySalesOccPdfJob = async () => {
    const requestId = `JOB-SALES-OCC-${uuidv4()}`;
    const startTime = new Date();

    logger.warn(`[${requestId}] ========== DAILY SALES & OCC PDF JOB STARTED ==========`);
    logger.warn(`[${requestId}] Job Start Time: ${startTime.toISOString()}`);
    logger.warn(`[${requestId}] Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.warn(`[${requestId}] Process PID: ${process.pid}`);

    let dbClient = null;
    let jobSuccess = false;
    let excelPath = null;
    let pdfPath = null;

    try {
        // For jobs, explicitly choose the pool based on NODE_ENV
        // This ensures jobs always use the correct database regardless of request context
        let pool;
        let databaseName;

        if (process.env.NODE_ENV === 'production') {
            pool = getProdPool();
            databaseName = process.env.PROD_PG_DATABASE;
            logger.warn(`[${requestId}] Using PRODUCTION database pool`);
        } else {
            pool = getDevPool();
            databaseName = process.env.PG_DATABASE;
            logger.warn(`[${requestId}] Using DEVELOPMENT database pool`);
        }

        logger.warn(`[${requestId}] Target Database: ${databaseName}`);
        logger.warn(`[${requestId}] NODE_ENV: ${process.env.NODE_ENV}`);

        dbClient = await pool.connect();
        logger.warn(`[${requestId}] Database connection established successfully`);

        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];

        // 1. Fetch Data
        logger.info(`[${requestId}] Fetching report data for ${formattedDate}...`);

        // Use the frontend-compatible service to ensure data consistency with downloaded reports
        // Use today's date to match frontend manual download behavior (both use fresh data)
        const reportData = await getFrontendCompatibleReportData(requestId, today, 'month', dbClient);

        logger.info(`[${requestId}] Fetched ${reportData?.revenueData?.length || 0} revenue rows and ${reportData?.occupancyData?.length || 0} occupancy rows.`);

        // Debug: Check the occupancy data before passing to template
        if (reportData?.occupancyData) {
            const totalOcc = reportData.occupancyData.find(item => item.hotel_id === 0);
            logger.warn(`[${requestId}] BEFORE TEMPLATE - Total occupancy: ${totalOcc?.occ}%, Sold: ${totalOcc?.sold_rooms}, Total: ${totalOcc?.total_rooms}`);
        }

        // Debug: Check the outlook data for blocked nights
        if (reportData?.outlookData) {
            logger.warn(`[${requestId}] OUTLOOK DATA - Found ${reportData.outlookData.length} months`);
            reportData.outlookData.forEach(item => {
                logger.warn(`[${requestId}] Month ${item.month}: Blocked nights: ${item.blocked_nights}, Occ: ${item.occ}%`);
            });
        }

        // 2. Generate PDF
        logger.info(`[${requestId}] Generating PDF...`);

        // Debug: Also generate Excel to check raw data
        logger.info(`[${requestId}] Generating Excel for debugging...`);
        excelPath = await generateDailyReportPdf(reportData, requestId, 'xlsx');
        logger.warn(`[${requestId}] Excel file generated at: ${excelPath}`);

        pdfPath = await generateDailyReportPdf(reportData, requestId, 'pdf');

        if (!pdfPath || !fs.existsSync(pdfPath)) {
            throw new Error('PDF generation failed, file not found.');
        }

        // 3. Send Email
        const recipient = process.env.NODE_ENV === 'production'
            ? 'WH@redhorse-group.co.jp'
            : 'PMSWeHub.work@redhorse-group.co.jp';

        // Use a test recipient if specified in environment for safety
        const emailTo = process.env.SALES_OCC_REPORT_EMAIL || recipient;

        const subject = `【WeHub.work】売上と稼働率レポート - ${formattedDate}`;
        const html = `
            <p>お疲れ様です。</p>
            <p>${formattedDate} の売上と稼働率レポート (PDF) を送付いたします。</p>
            <p>詳細は添付ファイルをご確認ください。</p>
            <br>
            <p>※このメールは自動送信されています。</p>
        `;

        const textBody = `${formattedDate} の売上と稼働率レポート (PDF) を送付いたします。詳細は添付ファイルをご確認ください。`;

        logger.info(`[${requestId}] Sending email to ${emailTo}...`);

        await sendGenericEmail(
            emailTo,
            subject,
            textBody,
            html,
            [
                {
                    filename: `Sales_Occ_Report_${formattedDate.replace(/-/g, '')}.pdf`,
                    path: pdfPath
                }
            ]
        );

        logger.info(`[${requestId}] Email sent successfully.`);

        jobSuccess = true;
        logger.warn(`[${requestId}] ========== JOB COMPLETED SUCCESSFULLY ==========`);

    } catch (error) {
        logger.error(`[${requestId}] ========== JOB FAILED ==========`);
        logger.error(`[${requestId}] Job failed: ${error.message}`, { stack: error.stack });

        // Log additional context for debugging
        logger.error(`[${requestId}] Error Details:`, {
            errorName: error.name,
            errorCode: error.code,
            errorSeverity: error.severity,
            errorPosition: error.position,
            errorFile: error.file,
            errorLine: error.line,
            errorRoutine: error.routine
        });

    } finally {
        const endTime = new Date();
        const duration = endTime - startTime;

        logger.warn(`[${requestId}] Job End Time: ${endTime.toISOString()}`);
        logger.warn(`[${requestId}] Total Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
        logger.warn(`[${requestId}] Job Status: ${jobSuccess ? 'SUCCESS' : 'FAILED'}`);
        logger.warn(`[${requestId}] ========== DAILY SALES & OCC PDF JOB FINISHED ==========`);

        if (dbClient) {
            dbClient.release();
            logger.debug(`[${requestId}] Database connection released.`);
        }

        // Cleanup temporary files in finally to ensure they are removed regardless of success/fail
        if (excelPath && fs.existsSync(excelPath)) {
            try {
                await fs.promises.unlink(excelPath);
                logger.info(`[${requestId}] Cleaned up temporary Excel debug file.`);
            } catch (cleanupError) {
                logger.warn(`[${requestId}] Failed to cleanup Excel file: ${cleanupError.message}`);
            }
        }

        if (pdfPath && fs.existsSync(pdfPath)) {
            try {
                await fs.promises.unlink(pdfPath);
                logger.info(`[${requestId}] Cleaned up temporary PDF file.`);
            } catch (cleanupError) {
                logger.warn(`[${requestId}] Failed to cleanup PDF file: ${cleanupError.message}`);
            }
        }
    }
};

/**
 * Schedules the job to run every weekday at 17:00 JST.
 */
const scheduleDailySalesOccPdfJob = () => {
    // Weekdays (Mon-Fri) at 17:00
    cron.schedule('0 17 * * 1-5', () => {
        const triggerTime = new Date();
        logger.warn(`========== CRON TRIGGER FIRED ==========`);
        logger.warn(`Cron Trigger Time: ${triggerTime.toISOString()}`);
        logger.warn(`Day of Week: ${triggerTime.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Tokyo' })}`);
        logger.warn(`Local Time (JST): ${triggerTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
        logger.warn(`About to execute runDailySalesOccPdfJob...`);

        runDailySalesOccPdfJob().catch(error => {
            logger.error(`Unhandled error in scheduled job execution:`, {
                message: error.message,
                stack: error.stack
            });
        });
    }, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });

    const now = new Date();
    logger.warn('========== CRON JOB SCHEDULED ==========');
    logger.warn('Scheduled Daily Sales & Occ PDF Job for weekdays at 17:00 JST.');
    logger.warn(`Current Time: ${now.toISOString()}`);
    logger.warn(`Current JST Time: ${now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
    logger.warn(`Next execution will be on the next weekday at 17:00 JST`);
    logger.warn('========================================');
};

module.exports = {
    scheduleDailySalesOccPdfJob,
    runDailySalesOccPdfJob // Export for manual triggering/testing
};
