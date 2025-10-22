require('dotenv').config({ path: './api/.env' }); // Load environment variables

const { sendDailyDigestEmails } = require('../jobs/dailyDigestEmailJob');
const { sendGenericEmail } = require('../utils/emailUtils'); // The real email sender
const defaultLogger = require('../config/logger');

// --- Configuration for testing ---
const TEST_EMAIL_ADDRESS = "almeida.ped@redhorse-group.co.jp";
const SEND_ACTUAL_EMAIL = process.env.SEND_TEST_DAILY_DIGEST_EMAIL === 'true'; // Set in .env to true to send email

// --- Mock sendGenericEmail to capture content or redirect ---
const originalSendGenericEmail = sendGenericEmail;
let capturedEmailContent = null;

const mockSendGenericEmail = async (to, subject, text, html) => {
  capturedEmailContent = { to, subject, text, html }; // Capture the email content

  if (SEND_ACTUAL_EMAIL) {
    defaultLogger.info(`[TestEmail] Sending actual email to: ${TEST_EMAIL_ADDRESS}`);
    // Redirect to the test email address
    await originalSendGenericEmail(TEST_EMAIL_ADDRESS, subject, text, html);
  } else {
    defaultLogger.info(`[TestEmail] Captured email for: ${to}`);
    defaultLogger.info(`[TestEmail] Subject: ${subject}`);
    defaultLogger.info(`[TestEmail] Text Body:\n${text}`);
    defaultLogger.info(`[TestEmail] HTML Body:\n${html}`);
  }
};

// Temporarily replace the real sendGenericEmail with the mock
// This requires modifying the module cache, which can be tricky.
// A simpler approach for a quick test script is to directly call the logic
// that generates the email content, without involving the full job.

// Let's create a function that directly generates the email content for a specific hotel.
// This will require duplicating some logic from sendDailyDigestEmails, but it's cleaner for testing.

const systemLogsModel = require('../models/system_logs');
const hotelModel = require('../models/hotel');
const { formatDate, translateStatus, translateType } = require('../utils/reportUtils');
const { transformLogs } = require('../controllers/system_logs/service/logTransformer');
const appConfig = require('../config/appConfig'); // Import appConfig

// Get .env accordingly
let envFrontend;
if (process.env.NODE_ENV === 'production') {
  envFrontend = process.env.PROD_FRONTEND_URL;
} else {
  envFrontend = process.env.FRONTEND_URL;
}

const generateTestEmailContent = async (requestId, hotelId, date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const formattedDate = formatDate(yesterday);

  defaultLogger.info(`[TestEmail] Generating email content for hotel ID: ${hotelId} on date: ${formattedDate}`);

  try {
    const hotel = await hotelModel.getHotelByID(requestId, hotelId); // Assuming getHotelByID exists and works
    if (!hotel) {
      defaultLogger.error(`[TestEmail] Hotel with ID ${hotelId} not found.`);
      return null;
    }

    const { logs: rawLogs = [] } = await systemLogsModel.getReservationDigestByDate(requestId, formattedDate);
    const allLogs = transformLogs(rawLogs, defaultLogger); // Transform logs here
    console.log('DEBUG: allLogs value:', allLogs);

    const logsByHotel = Object.values(allLogs).reduce((acc, log) => {
      if (log.hotel_id) {
        if (!acc[log.hotel_id]) {
          acc[log.hotel_id] = [];
        }
        acc[log.hotel_id].push(log);
      }
      return acc;
    }, {});

    const hotelLogs = logsByHotel[hotelId] || [];

    // Filter logs based on user's criteria
    const filteredHotelLogs = hotelLogs.filter(log => !log.DELETE.changed);

    if (filteredHotelLogs.length === 0) {
      defaultLogger.info(`[TestEmail] No relevant reservation logs for hotel ${hotel.name} on ${formattedDate}.`);
      return null; // Return null if no relevant logs
    }

    let htmlContent = `<div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">日次予約ログダイジェスト - ${hotel.name}</h2>
      <p style="font-size: 16px; line-height: 1.6;">${formattedDate} の予約ログの概要です。</p>
      <div style="margin-top: 20px;">`;

    filteredHotelLogs.forEach(log => {
      const reservationUrl = `${envFrontend}/reservations/edit/${log.record_id}`;
      htmlContent += `<div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 15px; border: 1px solid #e9ecef;">
        <h3 style="color: #34495e; margin-top: 0; margin-bottom: 10px;">予約ID: <a href="${reservationUrl}" style="color: #3498db; text-decoration: none;">${log.record_id}</a></h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 5px 0; font-weight: bold; width: 120px;">ホテル名:</td>
            <td style="padding: 5px 0;">${log.hotel_name}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-weight: bold;">ステータス:</td>
            <td style="padding: 5px 0;">${translateStatus(log.status)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-weight: bold;">チェックイン:</td>
            <td style="padding: 5px 0;">${log.check_in || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-weight: bold;">チェックアウト:</td>
            <td style="padding: 5px 0;">${log.check_out || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-weight: bold;">人数:</td>
            <td style="padding: 5px 0;">${log.number_of_people || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-weight: bold;">タイプ:</td>
            <td style="padding: 5px 0;">${translateType(log.type) || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-weight: bold;">コメント:</td>
            <td style="padding: 5px 0;">${log.comment || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-weight: bold;">アクション:</td>
            <td style="padding: 5px 0;">`;
        if (log.INSERT.changed) htmlContent += `作成 (ステータス: ${translateStatus(log.INSERT.status) || 'N/A'}) `;
        if (log.UPDATE.changed) htmlContent += `更新 (ステータス: ${translateStatus(log.UPDATE.status) || 'N/A'}) `;
        if (log.DELETE.changed) htmlContent += `削除 (ステータス: ${translateStatus(log.DELETE.status) || 'N/A'}) `;
        htmlContent += `</td>
            </tr>
          </table>
        </div>`;
      });

      htmlContent += `</div>
        <p style="font-size: 14px; color: #7f8c8d; margin-top: 20px;">このメールは自動送信されたものです。</p>
      </div>`;

    return {
      to: hotel.email,
      subject: `[WeHub.work] ダイジェスト：${formattedDate} - ${hotel.name}`,
      text: `日次予約ログダイジェスト - ${hotel.name} - ${formattedDate}\n\n${filteredHotelLogs.map(log => `予約ID: ${log.record_id}, ホテル名: ${log.hotel_name}`).join('\n')}`,
      html: htmlContent
    };

  } catch (error) {
    defaultLogger.error(`[TestEmail] Error generating email content:`, error);
    return null;
  }
}; // Missing closing brace was here

const runTest = async () => {
  const requestId = `test-daily-digest-${Date.now()}`;
  const testDate = process.env.TEST_DAILY_DIGEST_DATE || formatDate(new Date(new Date().setDate(new Date().getDate() - 1))); // Defaults to yesterday
  const testHotelId = parseInt(process.env.TEST_DAILY_DIGEST_HOTEL_ID || '10', 10); // Default to hotel ID 10

  defaultLogger.info(`[TestEmail] Running daily digest email test.`);
  defaultLogger.info(`[TestEmail] Test Date: ${testDate}`);
  defaultLogger.info(`[TestEmail] Test Hotel ID: ${testHotelId}`);
  defaultLogger.info(`[TestEmail] Send Actual Email: ${SEND_ACTUAL_EMAIL}`);

  try {
    const hotel = await hotelModel.getHotelByID(requestId, testHotelId); // Fetch specific hotel
    if (!hotel || !hotel.email) {
      defaultLogger.warn(`[TestEmail] Hotel with ID ${testHotelId} not found or has no email. Exiting test.`);
      return;
    }

    defaultLogger.info(`[TestEmail] Processing email for hotel: ${hotel.name} (ID: ${hotel.id})`);

    const emailData = await generateTestEmailContent(requestId, hotel.id, testDate);

    if (emailData) {
      if (SEND_ACTUAL_EMAIL) {
        try {
          // Send to the TEST_EMAIL_ADDRESS, but use the hotel's subject and content
          await originalSendGenericEmail(TEST_EMAIL_ADDRESS, emailData.subject, emailData.text, emailData.html);
          defaultLogger.info(`[TestEmail] Test email for hotel ${hotel.name} sent successfully to ${TEST_EMAIL_ADDRESS}.`);
        } catch (error) {
          defaultLogger.error(`[TestEmail] Failed to send test email for hotel ${hotel.name}:`, error);
        }
      } else {
        defaultLogger.info(`[TestEmail] --- Generated Email Content for Hotel: ${hotel.name} ---`);
        defaultLogger.info(`[TestEmail] To: ${TEST_EMAIL_ADDRESS}`); // Still show test address as recipient
        defaultLogger.info(`[TestEmail] Subject: ${emailData.subject}`);
        defaultLogger.info(`[TestEmail] Text Body:\n${emailData.text}`);
        defaultLogger.info(`[TestEmail] HTML Body:\n${emailData.html}`);
        defaultLogger.info(`[TestEmail] --- End Generated Email Content for Hotel: ${hotel.name} ---`);
      }
    } else {
      defaultLogger.warn(`[TestEmail] No email content generated for hotel ${hotel.name}.`);
    }
  } catch (error) {
    defaultLogger.error(`[TestEmail] Error during test run:`, error);
  }
};

runTest();
