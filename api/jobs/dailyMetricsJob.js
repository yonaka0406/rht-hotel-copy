const cron = require('node-cron');
const reportModel = require('../models/report');

const performDailyMetricsCalculation = async () => {
    console.log('Starting daily plan metrics calculation job...');
    try {
        // The 'dev' parameter is a placeholder for the requestId.
        // In a real scenario, you might have a system-level requestId for jobs.
        await reportModel.calculateAndSaveDailyMetrics('dev');
        console.log('Daily plan metrics calculation job completed successfully.');
    } catch (error) {
        console.error('Error in daily plan metrics calculation job:', error);
    }
};

const scheduleDailyMetricsJob = () => {
    // Schedule the job to run daily at 16:30
    cron.schedule('30 16 * * *', performDailyMetricsCalculation, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });
    console.log('Daily plan metrics calculation job scheduled daily at 16:30.');
};

module.exports = { scheduleDailyMetricsJob };