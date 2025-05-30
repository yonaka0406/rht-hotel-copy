const { getUsersByID, updateUserCalendarSettings } = require('../models/user');
const { getActionById, insertAction, updateAction } = require('../models/crm');
const googleCalendarUtils = require('../utils/googleCalendarUtils');
const defaultLogger = require('../config/logger');

/**
 * Synchronizes events from Google Calendar to the PMS/CRM for a given user.
 * Fetches events updated since the last successful sync.
 * If an event originated from the CRM (has crmActionId), it updates the CRM action.
 * If an event originated in Google Calendar, it creates a new CRM action.
 *
 * @param {string} requestId - The ID of the current request for logging/tracing.
 * @param {number} userId - The ID of the user whose calendar is to be synced.
 * @returns {Promise<object>} A summary of the sync operation.
 */
async function syncCalendarFromGoogle(requestId, userId) {
    const logger = defaultLogger.child({ requestId, userId, service: 'SynchronizationService' });
    logger.info('Starting Google Calendar to PMS sync process.');

    let user;
    try {
        const userArr = await getUsersByID(requestId, userId);
        if (!userArr || userArr.length === 0) {
            logger.warn('User not found. Aborting sync.');
            return { success: false, message: 'User not found.' };
        }
        user = userArr[0];
    } catch (dbError) {
        logger.error('Failed to fetch user details for sync.', { error: dbError.message, stack: dbError.stack });
        throw dbError; 
    }

    if (!user.google_calendar_id) {
        logger.warn(`User ${userId} does not have a google_calendar_id configured. Aborting sync.`);
        return { success: false, message: 'ユーザーのカレンダー設定が見つかりません。GoogleカレンダーIDが設定されているか確認してください。(User calendar configuration not found. Please ensure a Google Calendar ID is set.)' };
    }
    const calendarIdForSync = user.google_calendar_id;
    
    const lastSyncTimeISO = user.last_successful_google_sync ? new Date(user.last_successful_google_sync).toISOString() : null;
    
    logger.info(`Fetching Google Calendar events for calendar: ${calendarIdForSync}. Syncing events updated since: ${lastSyncTimeISO || 'beginning of time'}.`);

    let googleEvents;
    try {
        googleEvents = await googleCalendarUtils.listCalendarEvents(requestId, userId, calendarIdForSync, lastSyncTimeISO);
    } catch (gcalError) {
        logger.error('Failed to list Google Calendar events.', { error: gcalError.message, stack: gcalError.stack });
        // If listing events fails (e.g. token revoked), we should not update last_successful_google_sync
        return { success: false, message: `Failed to retrieve Google Calendar events: ${gcalError.message}` };
    }

    if (!googleEvents || googleEvents.length === 0) {
        logger.info('No new or updated Google Calendar events to sync.');
        // Still update last sync time, as we successfully checked.
        try {
            await updateUserCalendarSettings(requestId, userId, { last_successful_google_sync: new Date().toISOString() });
            logger.info('Successfully updated last_successful_google_sync timestamp after no new events.');
        } catch (error) {
            logger.error('Failed to update last_successful_google_sync timestamp after no new events.', { error: error.message });
        }
        return { success: true, message: 'No new events to sync.', actionsCreated: 0, actionsUpdated: 0, actionsFailed: 0 };
    }

    logger.info(`Processing ${googleEvents.length} Google Calendar events.`);
    let actionsCreated = 0;
    let actionsUpdated = 0;
    let actionsFailed = 0;

    for (const gEvent of googleEvents) {
        try {
            const crmActionId = gEvent.extendedProperties?.private?.crmActionId;
            const pmsEventClientId = gEvent.extendedProperties?.private?.crmClientId; // May be undefined

            if (gEvent.status === 'cancelled' && crmActionId) {
                const existingAction = await getActionById(requestId, crmActionId);
                if (existingAction && existingAction.status !== 'cancelled') {
                    const updateFields = { 
                        status: 'cancelled', 
                        // Pass necessary GCal fields to avoid them being nulled by updateAction if not explicitly set
                        google_calendar_event_id: gEvent.id,
                        google_calendar_html_link: gEvent.htmlLink,
                        synced_with_google_calendar: true
                    };
                    await updateAction(requestId, crmActionId, updateFields, userId);
                    logger.info(`CRM Action ${crmActionId} cancelled due to Google event ${gEvent.id} cancellation.`);
                    actionsUpdated++;
                }
                continue; // Move to next event after handling cancellation
            }
            
            // Skip further processing for other cancelled events not matching above (e.g. gEvent created in GCal and then cancelled there)
            if (gEvent.status === 'cancelled') {
                logger.info(`Skipping cancelled Google event ${gEvent.id} as it's not linked to a CRM action or already processed.`);
                continue;
            }


            if (crmActionId) { // Event originated from CRM
                const existingAction = await getActionById(requestId, crmActionId);
                if (existingAction) {
                    // Compare gEvent.updated with a sync timestamp on CRM action if available, or crm_action.updated_at
                    // For simplicity, assume GCal is master if event is more recent.
                    // A more robust sync would involve true bi-directional logic and conflict resolution.
                    if (new Date(gEvent.updated) > new Date(existingAction.updated_at)) { // Basic check
                        const actionFieldsToUpdate = {
                            subject: gEvent.summary || existingAction.subject,
                            details: gEvent.description || existingAction.details,
                            action_datetime: gEvent.start?.dateTime || gEvent.start?.date || existingAction.action_datetime,
                            due_date: gEvent.end?.dateTime || gEvent.end?.date || existingAction.due_date,
                            // Potentially map gEvent.status to CRM status if applicable and not 'cancelled'
                            google_calendar_event_id: gEvent.id, // Ensure these are present
                            google_calendar_html_link: gEvent.htmlLink,
                            synced_with_google_calendar: true,
                        };
                        await updateAction(requestId, crmActionId, actionFieldsToUpdate, userId);
                        logger.info(`Updated CRM action ${crmActionId} from Google event ${gEvent.id}.`);
                        actionsUpdated++;
                    }
                } else {
                    logger.warn(`CRM Action with ID ${crmActionId} (from GCal event ${gEvent.id}) not found in DB.`);
                    actionsFailed++;
                }
            } else { // Event originated in Google Calendar
                // Basic client ID handling. This needs to be robust in a real app.
                let clientIdToUse = pmsEventClientId; 
                if (!clientIdToUse) {
                    // TODO: Implement a way to find or create a default client for unlinked Google events
                    // For now, we might skip or assign to a generic client if that exists.
                    logger.warn(`Google event ${gEvent.id} has no crmClientId. Cannot create CRM action without a client. Skipping.`);
                    actionsFailed++;
                    continue; 
                }

                const newActionFields = {
                    client_id: clientIdToUse,
                    action_type: 'task', // Default type for GCal originated events
                    action_datetime: gEvent.start?.dateTime || gEvent.start?.date,
                    subject: gEvent.summary || 'Untitled Event from Google Calendar',
                    details: gEvent.description || '',
                    assigned_to: userId, // Assign to the syncing user
                    due_date: gEvent.end?.dateTime || gEvent.end?.date,
                    status: 'pending', // Default status
                    google_calendar_event_id: gEvent.id,
                    google_calendar_html_link: gEvent.htmlLink,
                    synced_with_google_calendar: true,
                };
                await insertAction(requestId, newActionFields, userId);
                logger.info(`Created new CRM action from Google event ${gEvent.id}.`);
                actionsCreated++;
            }
        } catch (error) {
            logger.error(`Failed to process Google event ${gEvent.id}.`, { error: error.message, stack: error.stack });
            actionsFailed++;
        }
    }

    try {
        const newSyncTimestamp = new Date().toISOString();
        await updateUserCalendarSettings(requestId, userId, { last_successful_google_sync: newSyncTimestamp });
        logger.info(`Successfully updated last_successful_google_sync to ${newSyncTimestamp}.`);
    } catch (error) {
        logger.error('Failed to update last_successful_google_sync timestamp after processing events.', { error: error.message });
        // This is a non-fatal error for the sync operation itself, but should be monitored.
    }

    logger.info('Google Calendar to PMS sync process completed.');
    return { 
        success: true, 
        message: '同期処理完了', 
        actionsCreated, 
        actionsUpdated, 
        actionsFailed 
    };
}

module.exports = {
    syncCalendarFromGoogle,
};
