const { sendDailyDigestEmails } = require('../dailyDigestEmailJob');

const triggerManualEmail = async () => {
  const requestId = `manual-trigger-${Date.now()}`; // Generate a unique requestId
  console.log(`Manually triggering sendDailyDigestEmails with requestId: ${requestId}`);
  try {
    await sendDailyDigestEmails(requestId);
    console.log('sendDailyDigestEmails completed successfully.');
  } catch (error) {
    console.error('Error triggering sendDailyDigestEmails:', error);
  }
};

triggerManualEmail();
