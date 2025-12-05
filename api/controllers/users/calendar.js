const usersModel = require('../../models/user');
const googleCalendarUtils = require('../../utils/googleCalendarUtils');
const { syncCalendarFromGoogle } = require('../../services/synchronizationService');

const createUserCalendar = async (req, res) => {
    const logger = req.app.locals.logger;
    const userId = req.user.id;
    const isProduction = process.env.NODE_ENV === 'production';

    const settingsToUpdate = {};
    let newCalendarId = null; // To store new calendar id
    let messageDetail = '';

    try {
        const currentUserArr = await usersModel.selectUserByID(req.requestId, userId);
        if (!currentUserArr || currentUserArr.length === 0) {
            logger.warn(`[UserCalPrefs] User not found for ID: ${userId}. Request ID: ${req.requestId}`);
            return res.status(404).json({ error: 'User not found' });
        }
        const currentUser = currentUserArr[0];

        newCalendarId = currentUser.google_calendar_id;

        if (!currentUser.google_calendar_id) {
            logger.info(`[UserCalPrefs] User ${userId} requested dedicated calendar creation. Current calendar ID is null. Request ID: ${req.requestId}`);

            const createdCalendarId = await googleCalendarUtils.createDedicatedCalendar(req.requestId, userId);
            if (createdCalendarId && typeof createdCalendarId === 'string') {
                newCalendarId = createdCalendarId;
                settingsToUpdate.google_calendar_id = newCalendarId;
                messageDetail += 'Dedicated Google Calendar created/verified. ';
                logger.info(`[UserCalPrefs] Dedicated calendar created for user ${userId} with ID: ${newCalendarId}. Request ID: ${req.requestId}`);
            } else {
                logger.error(`[UserCalPrefs] Failed to create dedicated calendar for user ${userId}. Request ID: ${req.requestId}`);
                messageDetail += 'Failed to create dedicated Google Calendar. ';
            }
        } else {
            logger.info(`[UserCalPrefs] User ${userId} already has dedicated calendar ID: ${currentUser.google_calendar_id}. Re-confirming. Request ID: ${req.requestId}`);
            settingsToUpdate.google_calendar_id = currentUser.google_calendar_id;
            messageDetail += 'Existing dedicated calendar ID confirmed. ';
        }

        if (Object.keys(settingsToUpdate).length > 0) {
            await usersModel.updateUserCalendarSettings(req.requestId, userId, settingsToUpdate);
            logger.info(`[UserCalPrefs] User ${userId} calendar preferences updated in DB. Settings: ${JSON.stringify(settingsToUpdate)}. Request ID: ${req.requestId}`);
        } else {
            logger.info(`[UserCalPrefs] No direct preference changes to save for user ${userId}. Request ID: ${req.requestId}`);
        }

        // Fetch the latest user data to return, ensuring the response reflects the true state
        const updatedUserArray = await usersModel.selectUserByID(req.requestId, userId);
        res.status(200).json({
            message: 'User calendar preferences processed. ' + messageDetail.trim(),
            user: updatedUserArray && updatedUserArray.length > 0 ? updatedUserArray[0] : null
        });

    } catch (error) {
        logger.error(`[UserCalPrefs] Error updating calendar preferences for user ${userId}: ${error.message}`, { stack: error.stack, requestId: req.requestId });
        res.status(500).json({ error: isProduction ? 'Failed to update calendar preferences.' : error.message });
    }
};

const triggerGoogleCalendarSync = async (req, res) => {
    const logger = req.app.locals.logger;
    const isProduction = process.env.NODE_ENV === 'production';
    const userId = req.user.id;

    try {
        logger.info(`[TriggerSyncCtrl] User ${userId} initiated Google Calendar sync. Request ID: ${req.requestId}`);
        const syncResult = await syncCalendarFromGoogle(req.requestId, userId);

        if (syncResult.success) {
            logger.info(`[TriggerSyncCtrl] Sync completed for user ${userId}. Result: ${JSON.stringify(syncResult)}. Request ID: ${req.requestId}`);
            res.status(200).json({ message: 'Googleカレンダー同期処理完了.', details: syncResult });
        } else {
            logger.warn(`[TriggerSyncCtrl] Sync process for user ${userId} reported issues: ${syncResult.message}. Request ID: ${req.requestId}`);
            // Determine appropriate status code based on syncResult message if needed
            res.status(400).json({ error: syncResult.message || 'Google Calendar sync process failed or completed with issues.', details: syncResult });
        }
    } catch (error) {
        logger.error(`[TriggerSyncCtrl] Critical error during Google Calendar sync for user ${userId}: ${error.message}`, { stack: error.stack, requestId: req.requestId });
        res.status(500).json({ error: isProduction ? 'Failed to complete Google Calendar sync.' : error.message });
    }
};

module.exports = {
    createUserCalendar,
    triggerGoogleCalendarSync
};
