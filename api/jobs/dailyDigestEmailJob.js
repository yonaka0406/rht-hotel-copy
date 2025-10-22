const { defaultLogger } = require('../config/logger');
const { sendGenericEmail } = require('../utils/emailUtils');
const { formatDate, translateStatus, translateType } = require('../utils/reportUtils');
const { transformLogs } = require('../controllers/system_logs/service/logTransformer');
const appConfig = require('../config/appConfig'); // Import appConfig
const hotelModel = require('../models/hotel');
const systemLogsModel = require('../models/system_logs/main');

// Get .env accordingly
let envFrontend;
if (process.env.NODE_ENV === 'production') {
  envFrontend = process.env.PROD_FRONTEND_URL;
} else {
  envFrontend = process.env.VITE_FRONTEND_URL;
}

const sendDailyDigestEmails = async (requestId) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const formattedDate = formatDate(yesterday);

  defaultLogger.info(`[${requestId}] Starting daily digest email job for date: ${formattedDate}`);

  try {
    const hotels = await hotelModel.getAllHotelsWithEmail(requestId);
    const { logs: rawLogs = [] } = await systemLogsModel.getReservationDigestByDate(requestId, formattedDate);
    const allLogs = transformLogs(rawLogs, defaultLogger);

    // Group logs by hotel_id
    const logsByHotel = Object.values(allLogs).reduce((acc, log) => {
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

      // Group logs into categories: added, edited, and deleted
      const groupedLogs = {
        added: [],
        edited: [],
        deleted: []
      };

      hotelLogs.forEach(log => {
        if (log.DELETE.changed) {
          groupedLogs.deleted.push(log);
        } else if (log.UPDATE.changed) { // Only if not deleted
          groupedLogs.edited.push(log);
        } else if (log.INSERT.changed) { // Only if not deleted and not updated
          groupedLogs.added.push(log);
        }
      });

      // Sort each group by status
      groupedLogs.added.sort((a, b) => {
        const statusA = (a.DELETE.changed && a.DELETE.status) || (a.UPDATE.changed && a.UPDATE.status) || (a.INSERT.changed && a.INSERT.status) || '';
        const statusB = (b.DELETE.changed && b.DELETE.status) || (b.UPDATE.changed && b.UPDATE.status) || (b.INSERT.changed && b.INSERT.status) || '';
        return statusA.localeCompare(statusB);
      });
      groupedLogs.edited.sort((a, b) => {
        const statusA = (a.DELETE.changed && a.DELETE.status) || (a.UPDATE.changed && a.UPDATE.status) || (a.INSERT.changed && a.INSERT.status) || '';
        const statusB = (b.DELETE.changed && b.DELETE.status) || (b.UPDATE.changed && b.UPDATE.status) || (b.INSERT.changed && b.INSERT.status) || '';
        return statusA.localeCompare(statusB);
      });
      groupedLogs.deleted.sort((a, b) => {
        const statusA = (a.DELETE.changed && a.DELETE.status) || (a.UPDATE.changed && a.UPDATE.status) || (a.INSERT.changed && a.INSERT.status) || '';
        const statusB = (b.DELETE.changed && b.DELETE.status) || (b.UPDATE.changed && b.UPDATE.status) || (b.INSERT.changed && b.INSERT.status) || '';
        return statusA.localeCompare(statusB);
      });

      // Only send email if there are any relevant logs
      if (groupedLogs.added.length === 0 && groupedLogs.edited.length === 0 && groupedLogs.deleted.length === 0) {
        defaultLogger.info(`[${requestId}] No relevant reservation logs for hotel ${hotel.name} on ${formattedDate}. Skipping email.`);
        continue;
      }

      // Generate HTML email content
      let htmlContent = `<div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">日次予約ログダイジェスト - ${hotel.name}</h2>
        <p style="font-size: 16px; line-height: 1.6;">${formattedDate} の予約ログの概要です。</p>

        <div style="display: flex; justify-content: space-around; margin-bottom: 20px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 150px; background-color: #e6ffe6; border: 1px solid #a3e9a4; border-radius: 8px; padding: 10px; margin: 5px; text-align: center;">
            <h4 style="color: #28a745; margin: 0 0 5px 0;">追加</h4>
            <p style="font-size: 24px; font-weight: bold; color: #28a745; margin: 0;">${groupedLogs.added.length}</p>
          </div>
          <div style="flex: 1; min-width: 150px; background-color: #e6f7ff; border: 1px solid #90cdf4; border-radius: 8px; padding: 10px; margin: 5px; text-align: center;">
            <h4 style="color: #007bff; margin: 0 0 5px 0;">編集</h4>
            <p style="font-size: 24px; font-weight: bold; color: #007bff; margin: 0;">${groupedLogs.edited.length}</p>
          </div>
          <div style="flex: 1; min-width: 150px; background-color: #ffe6e6; border: 1px solid #f5c6cb; border-radius: 8px; padding: 10px; margin: 5px; text-align: center;">
            <h4 style="color: #dc3545; margin: 0 0 5px 0;">削除</h4>
            <p style="font-size: 24px; font-weight: bold; color: #dc3545; margin: 0;">${groupedLogs.deleted.length}</p>
          </div>
        </div>

        <div style="margin-top: 20px;">`;

      // Helper to generate HTML for a group of logs
      const generateLogGroupHtml = (logs, title) => {
        if (logs.length === 0) return '';
        let groupHtml = `<div style="background-color: #f0f8ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #d0e0f0;">
          <h3 style="color: #34495e; margin-top: 0; border-bottom: 1px solid #a0c0e0; padding-bottom: 5px;">${title}</h3>`;
        logs.forEach(log => {
          const reservationUrl = `${envFrontend}/reservations/edit/${log.record_id}`;

          // Determine the values based on priority: DELETE > UPDATE > INSERT
          const currentStatus = (log.DELETE.changed && log.DELETE.status) ||
                                (log.UPDATE.changed && log.UPDATE.status) ||
                                (log.INSERT.changed && log.INSERT.status) || null;
          const currentCheckIn = (log.DELETE.changed && log.DELETE.check_in) ||
                                 (log.UPDATE.changed && log.UPDATE.check_in) ||
                                 (log.INSERT.changed && log.INSERT.check_in) || null;
          const currentCheckOut = (log.DELETE.changed && log.DELETE.check_out) ||
                                  (log.UPDATE.changed && log.UPDATE.check_out) ||
                                  (log.INSERT.changed && log.INSERT.check_out) || null;
          const currentNumberOfPeople = (log.DELETE.changed && log.DELETE.number_of_people) ||
                                        (log.UPDATE.changed && log.UPDATE.number_of_people) ||
                                        (log.INSERT.changed && log.INSERT.number_of_people) || null;
          const currentType = (log.DELETE.changed && log.DELETE.type) ||
                              (log.UPDATE.changed && log.UPDATE.type) ||
                              (log.INSERT.changed && log.INSERT.type) || null;
          const currentComment = (log.DELETE.changed && log.DELETE.comment) ||
                                (log.UPDATE.changed && log.UPDATE.comment) ||
                                (log.INSERT.changed && log.INSERT.comment) || null;

          groupHtml += `<div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 15px; border: 1px solid #e9ecef;">
            <h4 style="color: #34495e; margin-top: 0; margin-bottom: 10px;">予約ID: <a href="${reservationUrl}" style="color: #3498db; text-decoration: none;">${log.record_id} &#x2192;</a></h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 5px 0; font-weight: bold;">予約者:</td>
                <td style="padding: 5px 0;" colspan="3">${log.client_name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold; width: 25%;">ステータス:</td>
                <td style="padding: 5px 0; width: 25%;">${translateStatus(currentStatus)}</td>
                <td style="padding: 5px 0; font-weight: bold; width: 25%;">タイプ:</td>
                <td style="padding: 5px 0; width: 25%;">${translateType(currentType) || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold; width: 120px;">宿泊期間:</td>
                <td style="padding: 5px 0;" colspan="3">${currentCheckIn || 'N/A'} - ${currentCheckOut || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold;">人数:</td>
                <td style="padding: 5px 0;" colspan="3">${currentNumberOfPeople || 'N/A'}</td>
              </tr>              
              <tr>
                <td style="padding: 5px 0; font-weight: bold;">コメント:</td>
                <td style="padding: 5px 0;" colspan="3">${currentComment || 'N/A'}</td>
              </tr>
            </table>
          </div>`;
        });
        groupHtml += `</div>`; // Close the group div
        return groupHtml;
      };

      htmlContent += generateLogGroupHtml(groupedLogs.added, '本日追加された予約');
      htmlContent += generateLogGroupHtml(groupedLogs.edited, '本日編集された予約');
      htmlContent += generateLogGroupHtml(groupedLogs.deleted, '本日削除された予約');

      htmlContent += `</div>
        <p style="font-size: 14px; color: #7f8c8d; margin-top: 20px;">このメールは自動送信されたものです。</p>
      </div>`;

      // Use the sendGenericEmail function
      await sendGenericEmail(
        hotel.email,
        `[WeHub.work] ダイジェスト：${formattedDate} - ${hotel.name}`,
        `日次予約ログダイジェスト - ${hotel.name} - ${formattedDate}\n\n${hotelLogs.map(log => `予約ID: ${log.record_id}, ホテル名: ${log.hotel_name}`).join('\n')}`, // Simple text fallback
        htmlContent
      );
    }
    defaultLogger.info(`[${requestId}] Daily digest email job completed.`);
  } catch (error) {
    defaultLogger.error(`[${requestId}] Error in daily digest email job:`, error);
  }
};

const scheduleDailyDigestEmailJob = () => {
  cron.schedule('0 1 * * *', async () => { // 1 AM daily
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
