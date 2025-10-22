const systemLogsModel = require('../models/system_logs');
const hotelModel = require('../models/hotel');


const cron = require('node-cron'); // Import node-cron
const { defaultLogger } = require('../config/logger'); // Import default logger
const { sendGenericEmail } = require('../utils/emailUtils'); // New import
const { formatDate, translateStatus, translateType } = require('../utils/reportUtils'); // Import formatDate, translateStatus, translateType

const sendDailyDigestEmails = async (requestId) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const formattedDate = formatDate(yesterday); // Format as YYYY-MM-DD

  defaultLogger.info(`[${requestId}] Starting daily digest email job for date: ${formattedDate}`);

  try {
    const hotels = await hotelModel.getAllHotelsWithEmail(requestId);
    const { logs: allLogs } = await systemLogsModel.getReservationDigestByDate(requestId, formattedDate);

    // Group logs by hotel_id
    const logsByHotel = allLogs.reduce((acc, log) => {
      if (log.hotel_id) { // Ensure hotel_id exists
        if (!acc[log.hotel_id]) {
          acc[log.hotel_id] = [];
        }
        acc[log.hotel_id].push(log);
      }
      return acc;
    }, {});

    for (const hotel of hotels) {
      if (!hotel.email) {
        defaultLogger.warn(`[${requestId}] Hotel ${hotel.name} (ID: ${hotel.id}) has no email address. Skipping.`);
        continue;
      }

      const hotelLogs = logsByHotel[hotel.id] || [];

      if (hotelLogs.length === 0) {
        defaultLogger.info(`[${requestId}] No reservation logs for hotel ${hotel.name} on ${formattedDate}. Skipping email.`);
        continue;
      }

      // Generate HTML email content
      let htmlContent = `<div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">日次予約ログダイジェスト - ${hotel.name}</h2>
        <p style="font-size: 16px; line-height: 1.6;">${formattedDate} の予約ログの概要です。</p>
        <div style="margin-top: 20px;">`;

      hotelLogs.forEach(log => {
        htmlContent += `<div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 15px; border: 1px solid #e9ecef;">
          <h3 style="color: #34495e; margin-top: 0; margin-bottom: 10px;">予約ID: ${log.record_id}</h3>
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

      // Use the sendGenericEmail function
      await sendGenericEmail(
        hotel.email,
        `日次予約ログダイジェスト - ${hotel.name} - ${formattedDate}`,
        `日次予約ログダイジェスト - ${hotel.name} - ${formattedDate}\n\n${hotelLogs.map(log => `予約ID: ${log.record_id}, ホテル名: ${log.hotel_name}`).join('\n')}`,
        htmlContent
      );
    }
    defaultLogger.info(`[${requestId}] Daily digest email job completed.`);
  } catch (error) {
    defaultLogger.error(`[${requestId}] Error in daily digest email job:`, error);
  }
};

const scheduleDailyDigestEmailJob = () => {
  cron.schedule('0 3 * * *', async () => { // 3 AM daily
    const logger = defaultLogger.child({ job: 'DailyDigestEmailJob' }); // Create a child logger for this job
    logger.info('[DailyDigestEmailJob] Daily digest email job triggered by cron schedule.');
    // Generate a unique requestId for the job
    const requestId = `job-daily-digest-${Date.now()}`;
    await sendDailyDigestEmails(requestId);
  }, {
    scheduled: true,
    timezone: "Asia/Tokyo"
  });
  defaultLogger.info('Daily digest email job scheduled daily at 3 AM Asia/Tokyo.');
};

module.exports = {
  sendDailyDigestEmails,
  scheduleDailyDigestEmailJob,
};
