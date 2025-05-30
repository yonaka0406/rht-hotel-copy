const { getUsersByID, updateUserCalendarSettings } = require('../models/user');
const googleCalendarUtils = require('../utils/googleCalendarUtils'); 

const updateUserCalendarPreferences = async (req, res) => {
    const userId = req.user.id;
    const { sync_preference, create_calendar } = req.body; // Booleans from request
    const logger = req.app.locals.logger; // Assuming logger is available

    const settingsToUpdate = {};
    let dedicatedCalendarCreationFailed = false;
    let newCalendarId = null;

    if (typeof sync_preference === 'boolean') {
        settingsToUpdate.sync_google_calendar = sync_preference;
    }

    if (create_calendar === true) {
        if (logger) logger.info(`[UserController][updatePrefs] User ${userId} requested creation of a dedicated calendar.`);
        try {
            // Check if user already has a dedicated calendar ID stored
            const users = await getUsersByID(req.requestId, userId);
            const currentUser = users && users.length > 0 ? users[0] : null;

            if (currentUser && currentUser.google_calendar_id) {
                if (logger) logger.info(`[UserController][updatePrefs] User ${userId} already has a dedicated calendar ID: ${currentUser.google_calendar_id}. Re-using it.`);
                newCalendarId = currentUser.google_calendar_id;
                 // Ensure sync_preference is true if creating/assigning a dedicated calendar
                if (typeof settingsToUpdate.sync_google_calendar === 'undefined' || settingsToUpdate.sync_google_calendar === false) {
                    settingsToUpdate.sync_google_calendar = true; 
                    if (logger) logger.info(`[UserController][updatePrefs] Enabling sync_google_calendar for user ${userId} as dedicated calendar is active/requested.`);
                }
            } else {
                newCalendarId = await googleCalendarUtils.createDedicatedCalendar(req.requestId, userId);
                if (logger) logger.info(`[UserController][updatePrefs] Successfully created dedicated calendar ${newCalendarId} for user ${userId}.`);
                 // Ensure sync_preference is true if creating a dedicated calendar
                settingsToUpdate.sync_google_calendar = true; 
                if (logger) logger.info(`[UserController][updatePrefs] Enabling sync_google_calendar for user ${userId} due to new dedicated calendar.`);
            }
            settingsToUpdate.google_calendar_id = newCalendarId;
        } catch (calendarError) {
            if (logger) logger.error(`[UserController][updatePrefs] Failed to create dedicated calendar for user ${userId}: ${calendarError.message}`, { stack: calendarError.stack });
            dedicatedCalendarCreationFailed = true;
            // Do not automatically set sync_preference to false here,
            // let the explicit sync_preference value (if any) from request take precedence,
            // or if user only requested create_calendar, then this failure means we can't enable sync based on this action.
        }
    }

    let message = "User calendar preferences processed.";
    let updatedUser = null;

    if (Object.keys(settingsToUpdate).length > 0) {
        if (dedicatedCalendarCreationFailed && settingsToUpdate.google_calendar_id) {
            // Avoid saving a calendar ID if creation failed but somehow it was still set
            delete settingsToUpdate.google_calendar_id; 
        }
        
        // If only create_calendar was true, and it failed, settingsToUpdate might be empty or only contain sync_google_calendar=true
        // If sync_preference was explicitly false, but create_calendar was true and failed, we should respect sync_preference=false.
        if (dedicatedCalendarCreationFailed && create_calendar === true && typeof sync_preference === 'undefined'){
            // If create_calendar was the sole trigger for sync and it failed, don't enable sync.
             if (settingsToUpdate.sync_google_calendar && settingsToUpdate.google_calendar_id === newCalendarId){
                 // This means sync was enabled *because* of successful calendar creation, which didn't happen.
                 // However, the logic above already sets sync_google_calendar = true *before* attempting to save settingsToUpdate.google_calendar_id.
                 // This path needs careful thought. If create_calendar fails, should sync_google_calendar still be true if it was auto-set?
                 // Let's assume for now, if create_calendar fails, we should not force sync_google_calendar to true if it wasn't explicitly requested.
                 // The current logic: sync_google_calendar is set to true when create_calendar is true.
                 // If create_calendar then fails, newCalendarId won't be set in settingsToUpdate.google_calendar_id.
                 // sync_google_calendar might still be true in settingsToUpdate.
                 // This behavior might be acceptable: user wants sync, tried to create calendar, it failed, but sync preference is still saved.
             }
        }


        if (Object.keys(settingsToUpdate).length > 0) { // Re-check if settingsToUpdate still has items
            try {
                updatedUser = await updateUserCalendarSettings(req.requestId, userId, settingsToUpdate);
                if (logger) logger.info(`[UserController][updatePrefs] Successfully updated calendar settings for user ${userId}.`);
                message = "User calendar preferences updated successfully.";
                if (dedicatedCalendarCreationFailed) {
                    message += " However, failed to create or assign a dedicated Google Calendar.";
                }
            } catch (dbError) {
                if (logger) logger.error(`[UserController][updatePrefs] Failed to save calendar settings for user ${userId} to DB: ${dbError.message}`, { stack: dbError.stack });
                return res.status(500).json({ error: "Failed to update calendar preferences in database.", details: dbError.message });
            }
        } else if (dedicatedCalendarCreationFailed) {
             // Only create_calendar was true, it failed, and no other settings were to be updated.
            return res.status(500).json({ error: "Failed to create dedicated Google Calendar. No other settings were changed." });
        } else {
            // No settings were actually changed or requested.
            message = "No calendar preferences were modified.";
        }

    } else if (dedicatedCalendarCreationFailed) {
        // Only create_calendar was true, and it failed.
        return res.status(500).json({ error: "Failed to create dedicated Google Calendar." });
    } else {
        message = "No changes requested for calendar preferences.";
    }

    // Fetch the latest user state to return
    try {
        const users = await getUsersByID(req.requestId, userId);
        const finalUser = users && users.length > 0 ? users[0] : null;
        res.status(200).json({ message, data: finalUser });
    } catch (fetchError){
        if (logger) logger.error(`[UserController][updatePrefs] Failed to fetch final user state for ${userId}: ${fetchError.message}`);
        res.status(200).json({ message, data: updatedUser }); // Fallback to updatedUser if fetch fails
    }
};

module.exports = {
    updateUserCalendarPreferences,
};
