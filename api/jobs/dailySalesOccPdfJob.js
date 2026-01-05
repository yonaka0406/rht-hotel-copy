const cron = require('node-cron');
const { sendGenericEmail } = require('../utils/emailUtils');
const { getMonthlySummaryData } = require('../services/reportDataService');
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
    logger.info(`[${requestId}] Starting Daily Sales & Occ PDF Job`);

    let dbClient = null;

    try {
        // Explicitly select pool based on environment to ensure correct DB access
        const pool = process.env.NODE_ENV === 'production' ? getProdPool() : getDevPool();
        dbClient = await pool.connect();

        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];

        // 1. Fetch Data
        logger.info(`[${requestId}] Fetching report data for ${formattedDate}...`);
        const reportData = await getMonthlySummaryData(requestId, today, dbClient);

        logger.info(`[${requestId}] Fetched ${reportData?.revenueData?.length || 0} revenue rows and ${reportData?.occupancyData?.length || 0} occupancy rows.`);

        // 2. Generate PDF
        logger.info(`[${requestId}] Generating PDF...`);
        const pdfPath = await generateDailyReportPdf(reportData, requestId, 'pdf');

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

        // 4. Cleanup
        try {
            await fs.promises.unlink(pdfPath);
            logger.info(`[${requestId}] Cleaned up temporary PDF file.`);
        } catch (cleanupError) {
            logger.warn(`[${requestId}] Failed to cleanup PDF file: ${cleanupError.message}`);
        }

    } catch (error) {
        logger.error(`[${requestId}] Job failed: ${error.message}`, { stack: error.stack });
    } finally {
        if (dbClient) dbClient.release();
    }
};

/**
 * Schedules the job to run every weekday at 17:00 JST.
 */
const scheduleDailySalesOccPdfJob = () => {
    // Weekdays (Mon-Fri) at 17:00
    cron.schedule('0 17 * * 1-5', () => {
        runDailySalesOccPdfJob();
    }, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });

    logger.info('Scheduled Daily Sales & Occ PDF Job for weekdays at 17:00 JST.');
};

module.exports = {
    scheduleDailySalesOccPdfJob,
    runDailySalesOccPdfJob // Export for manual triggering/testing
};
