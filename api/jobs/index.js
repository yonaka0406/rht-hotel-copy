const { startScheduling } = require('./otaReservationJob.js');
const { scheduleLoyaltyTierJob } = require('./loyaltyTierJob');
const { startWaitlistJob } = require('./waitlistJob');
const { scheduleDailyMetricsJob } = require('./dailyMetricsJob');
const logger = require('../config/logger');

const startScheduledJobs = () => {
  startScheduling();
  scheduleLoyaltyTierJob();
  startWaitlistJob();
  scheduleDailyMetricsJob();
  logger.info('Scheduled jobs (OTA sync, Loyalty Tiers, Waitlist Expiration, Daily Metrics) started.');
};

module.exports = { startScheduledJobs };