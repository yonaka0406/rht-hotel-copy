const { 
    selectUserActions, 
    selectClientActions, 
    selectAllActions, 
    insertAction, 
    updateAction, 
    deleteAction,
    getActionById
} = require('../models/crm');
const { getUsersByID } = require('../models/user'); // To get user's Google Calendar sync preferences
const googleCalendarUtils = require('../utils/googleCalendarUtils');

const SYNCABLE_ACTION_TYPES = ['meeting', 'task', 'visit', 'call']; // Define action types that can be synced

// Helper function to reduce boilerplate for fetching user, to be used internally
async function _getUserForSync(requestId, userId, logger) {
    try {
        const users = await getUsersByID(requestId, userId);
        if (!users || users.length === 0) {
            if (logger) logger.warn(`User not found for ID: ${userId}. Calendar sync might be skipped.`);
            return null;
        }
        return users[0];
    } catch (userError) {
        if (logger) logger.error(`Error fetching user ${userId} for calendar sync: ${userError.message}. Sync will be skipped.`, { stack: userError.stack });
        return null;
    }
}

const fetchUserActions = async (req, res) => {
  const { uid } = req.params;
    
  try{
    const result = await selectUserActions(req.requestId, uid);    
    res.status(200).json( result );
  } catch (error) {
    console.error('Error getting user actions:', error);
    res.status(500).json({ error: error.message });
  }
};
const fetchClientActions = async (req, res) => {
  const { cid } = req.params;
    
  try{
    const result = await selectClientActions(req.requestId, cid);    
    res.status(200).json( result );
  } catch (error) {
    console.error('Error getting user actions:', error);
    res.status(500).json({ error: error.message });
  }
};
const fetchAllActions = async (req, res) => {
  try{
    const result = await selectAllActions(req.requestId);    
    res.status(200).json( result );
  } catch (error) {
    console.error('Error getting all actions:', error);
    res.status(500).json({ error: error.message });
  }
};

const addAction = async (req, res) => {
  const { actionFields } = req.body; // actionFields should now come from req.body directly
  const userId = req.user.id;
  const logger = req.app.locals.logger; // Assuming logger is available

  try {
    const user = await _getUserForSync(req.requestId, userId, logger);
    const isSyncableType = SYNCABLE_ACTION_TYPES.includes(actionFields.action_type);

    if (user && actionFields.action_datetime && isSyncableType) {
      if (logger) logger.info(`[CRMController][addAction] Attempting to create Google Calendar event for user ${userId}, action type ${actionFields.action_type}.`);
      try {
        const calendarEvent = await googleCalendarUtils.createCalendarEvent(
          req.requestId,
          userId,
          user.google_calendar_id || 'primary', // Use dedicated calendar if ID exists, else primary
          actionFields
        );
        actionFields.google_calendar_event_id = calendarEvent.id;
        actionFields.google_calendar_html_link = calendarEvent.htmlLink;
        actionFields.synced_with_google_calendar = true;
        if (logger) logger.info(`[CRMController][addAction] Successfully created Google Calendar event ${calendarEvent.id} for user ${userId}.`);
      } catch (calendarError) {
        if (logger) logger.error(`[CRMController][addAction] Failed to create Google Calendar event for user ${userId}: ${calendarError.message}. CRM action will be created without calendar sync.`, { stack: calendarError.stack });
        actionFields.synced_with_google_calendar = false; // Ensure it's false if sync failed
      }
    } else {
        if (logger) logger.info(`[CRMController][addAction] Skipping Google Calendar event creation for user ${userId}. Action type: ${actionFields.action_type}, Has action_datetime: ${!!actionFields.action_datetime}`);
        actionFields.synced_with_google_calendar = false; // Explicitly false if not attempting sync
    }

    const result = await insertAction(req.requestId, actionFields, userId);    
    res.status(201).json( result ); // Changed to 201 for resource creation
  } catch (error) {
    if (logger) logger.error('[CRMController][addAction] Error adding action:', { errorMessage: error.message, stack: error.stack, actionFields });
    res.status(500).json({ error: 'Failed to add CRM action.', details: error.message });
  }
};

const editAction = async (req, res) => {
  let { actionFields } = req.body; // actionFields from req.body
  const { id: actionId } = req.params;
  const userId = req.user.id;
  const logger = req.app.locals.logger;

  try {
    const existingAction = await getActionById(req.requestId, actionId);
    if (!existingAction) {
      return res.status(404).json({ error: 'CRM Action not found' });
    }

    const user = await _getUserForSync(req.requestId, userId, logger);
    
    const isSyncableType = SYNCABLE_ACTION_TYPES.includes(actionFields.action_type || existingAction.action_type);
    const effectiveActionDatetime = actionFields.action_datetime || existingAction.action_datetime;

    // Initialize calendar fields in actionFields from existing action if not provided
    actionFields.google_calendar_event_id = actionFields.hasOwnProperty('google_calendar_event_id') ? actionFields.google_calendar_event_id : existingAction.google_calendar_event_id;
    actionFields.google_calendar_html_link = actionFields.hasOwnProperty('google_calendar_html_link') ? actionFields.google_calendar_html_link : existingAction.google_calendar_html_link;
    actionFields.synced_with_google_calendar = actionFields.hasOwnProperty('synced_with_google_calendar') ? actionFields.synced_with_google_calendar : existingAction.synced_with_google_calendar;


    if (user && effectiveActionDatetime && isSyncableType) {
      if (logger) logger.info(`[CRMController][editAction] Sync enabled for user ${userId}. Action type ${actionFields.action_type || existingAction.action_type} is syncable.`);
      const calendarIdToUse = user.google_calendar_id || 'primary';
      // Merge existing action data with new fields for calendar event context
      const eventDataForCalendar = { ...existingAction, ...actionFields };

      if (existingAction.google_calendar_event_id) {
        if (logger) logger.info(`[CRMController][editAction] Attempting to update Google Calendar event ${existingAction.google_calendar_event_id} for user ${userId}.`);
        try {
          const updatedCalendarEvent = await googleCalendarUtils.updateCalendarEvent(
            req.requestId, userId, calendarIdToUse, existingAction.google_calendar_event_id, eventDataForCalendar
          );
          actionFields.google_calendar_html_link = updatedCalendarEvent.htmlLink;
          actionFields.synced_with_google_calendar = true;
          if (logger) logger.info(`[CRMController][editAction] Successfully updated Google Calendar event ${existingAction.google_calendar_event_id}.`);
        } catch (calendarError) {
          if (logger) logger.error(`[CRMController][editAction] Failed to update Google Calendar event ${existingAction.google_calendar_event_id}: ${calendarError.message}.`, { stack: calendarError.stack });
          actionFields.synced_with_google_calendar = false;
        }
      } else {
        if (logger) logger.info(`[CRMController][editAction] No existing Google event. Attempting to create one for user ${userId}.`);
        try {
          const newCalendarEvent = await googleCalendarUtils.createCalendarEvent(
            req.requestId, userId, calendarIdToUse, eventDataForCalendar
          );
          actionFields.google_calendar_event_id = newCalendarEvent.id;
          actionFields.google_calendar_html_link = newCalendarEvent.htmlLink;
          actionFields.synced_with_google_calendar = true;
          if (logger) logger.info(`[CRMController][editAction] Successfully created new Google Calendar event ${newCalendarEvent.id}.`);
        } catch (calendarError) {
          if (logger) logger.error(`[CRMController][editAction] Failed to create new Google Calendar event: ${calendarError.message}.`, { stack: calendarError.stack });
          actionFields.synced_with_google_calendar = false;
        }
      }
    } else if (existingAction.synced_with_google_calendar && existingAction.google_calendar_event_id) {
      if (logger) logger.info(`[CRMController][editAction] Sync criteria no longer met for action ${actionId}. Attempting to delete Google Calendar event ${existingAction.google_calendar_event_id}.`);
      try {
        await googleCalendarUtils.deleteCalendarEvent(
          req.requestId, userId, user ? (user.google_calendar_id || 'primary') : 'primary', existingAction.google_calendar_event_id
        );
        if (logger) logger.info(`[CRMController][editAction] Successfully deleted Google Calendar event ${existingAction.google_calendar_event_id}.`);
      } catch (calendarError) {
        if (logger) logger.error(`[CRMController][editAction] Failed to delete Google Calendar event ${existingAction.google_calendar_event_id}: ${calendarError.message}.`, { stack: calendarError.stack });
      }
      actionFields.google_calendar_event_id = null;
      actionFields.google_calendar_html_link = null;
      actionFields.synced_with_google_calendar = false;
    } else {
        if (logger) logger.info(`[CRMController][editAction] Skipping Google Calendar operations for action ${actionId}. Type: ${actionFields.action_type || existingAction.action_type}, DateTime: ${!!effectiveActionDatetime}`);
        if (!actionFields.hasOwnProperty('synced_with_google_calendar')) { // Avoid overriding if client explicitly sends this field
            actionFields.synced_with_google_calendar = false;
        }
    }
    
    const result = await updateAction(req.requestId, actionId, actionFields, userId);
    res.status(200).json(result);
  } catch (error) {
    if (logger) logger.error('[CRMController][editAction] Error editing action:', { actionId, errorMessage: error.message, stack: error.stack, actionFields });
    res.status(500).json({ error: 'Failed to edit CRM action.', details: error.message });
  }
};

const removeAction = async (req, res) => {
  const { id: actionId } = req.params;
  const userId = req.user.id; // Assuming req.user.id is available for user context
  const logger = req.app.locals.logger;

  try {
    const actionToDelete = await getActionById(req.requestId, actionId);
    if (!actionToDelete) {
      return res.status(404).json({ error: 'CRM Action not found' });
    }

    if (actionToDelete.synced_with_google_calendar && actionToDelete.google_calendar_event_id) {
      if (logger) logger.info(`[CRMController][removeAction] Action ${actionId} is synced. Attempting to delete Google Calendar event ${actionToDelete.google_calendar_event_id}.`);
      let userCalendarId = 'primary'; // Default to primary
      const user = await _getUserForSync(req.requestId, userId, logger); // Fetch user to get specific calendar_id if set
      if (user && user.google_calendar_id) {
          userCalendarId = user.google_calendar_id;
      }
      
      try {
        await googleCalendarUtils.deleteCalendarEvent(
          req.requestId,
          userId, // Pass userId for token fetching in getCalendarService
          userCalendarId,
          actionToDelete.google_calendar_event_id
        );
        if (logger) logger.info(`[CRMController][removeAction] Successfully deleted Google Calendar event ${actionToDelete.google_calendar_event_id}.`);
      } catch (calendarError) {
        if (logger) logger.error(`[CRMController][removeAction] Failed to delete Google Calendar event ${actionToDelete.google_calendar_event_id}: ${calendarError.message}. CRM action will still be deleted.`, { stack: calendarError.stack });
        // Non-fatal error for CRM, proceed with CRM action deletion
      }
    } else {
        if (logger) logger.info(`[CRMController][removeAction] Action ${actionId} not synced to Google Calendar or no event ID. Skipping calendar deletion.`);
    }

    const result = await deleteAction(req.requestId, actionId);
    // if (!result) { // deleteAction in model might return the deleted row or a count. If it returns the row:
    //   return res.status(404).json({ error: 'Action not found or already deleted during operation' });
    // }
    res.status(200).json({ message: 'CRM Action removed successfully', data: result }); // Return 200 with data or 204 no content
  } catch (error) {
    if (logger) logger.error('[CRMController][removeAction] Error removing action:', { actionId, errorMessage: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to remove CRM action.', details: error.message });
  }
};

// Placeholder for syncActionToCalendar to be added next

const syncActionToCalendar = async (req, res) => {
    const { id: actionId } = req.params;
    const userId = req.user.id;
    const logger = req.app.locals.logger;

    try {
        if (logger) logger.info(`[CRMController][syncActionToCalendar] Attempting to sync action ${actionId} for user ${userId}.`);
        const action = await getActionById(req.requestId, actionId);
        if (!action) {
            return res.status(404).json({ error: 'CRM Action not found.' });
        }

        const user = await _getUserForSync(req.requestId, userId, logger);
        if (!user) {
            return res.status(403).json({ error: 'User not found, cannot sync.' });
        }
        
        const isSyncableType = SYNCABLE_ACTION_TYPES.includes(action.action_type);
        if (!isSyncableType) {
            if (logger) logger.warn(`[CRMController][syncActionToCalendar] Action type ${action.action_type} for action ${actionId} is not syncable.`);
            return res.status(400).json({ error: `Action type '${action.action_type}' is not syncable to Google Calendar.` });
        }
        if (!action.action_datetime) {
            if (logger) logger.warn(`[CRMController][syncActionToCalendar] Action ${actionId} has no action_datetime, cannot sync.`);
            return res.status(400).json({ error: 'Action must have a date/time to be synced to Google Calendar.'});
        }

        const calendarIdToUse = user.google_calendar_id || 'primary';
        let calendarEvent;
        let operationPerformed; // 'created' or 'updated'

        if (action.google_calendar_event_id && action.synced_with_google_calendar) {
            if (logger) logger.info(`[CRMController][syncActionToCalendar] Updating existing Google event ${action.google_calendar_event_id} for action ${actionId}.`);
            calendarEvent = await googleCalendarUtils.updateCalendarEvent(
                req.requestId, userId, calendarIdToUse, action.google_calendar_event_id, action
            );
            operationPerformed = 'updated';
        } else {
            if (logger) logger.info(`[CRMController][syncActionToCalendar] Creating new Google event for action ${actionId}.`);
            calendarEvent = await googleCalendarUtils.createCalendarEvent(
                req.requestId, userId, calendarIdToUse, action
            );
            operationPerformed = 'created';
        }
        
        if (logger) logger.info(`[CRMController][syncActionToCalendar] Successfully ${operationPerformed} Google event ${calendarEvent.id} for action ${actionId}.`);

        const updatedActionFieldsForDB = {
            // Only pass fields that should be updated by this specific sync operation
            google_calendar_event_id: calendarEvent.id,
            google_calendar_html_link: calendarEvent.htmlLink,
            synced_with_google_calendar: true,
        };
        
        const dbResult = await updateAction(req.requestId, actionId, updatedActionFieldsForDB, userId);
        if (logger) logger.info(`[CRMController][syncActionToCalendar] Successfully updated CRM action ${actionId} with new Google Calendar details.`);

        res.status(200).json({ 
            message: `CRM Action successfully ${operationPerformed} and synced with Google Calendar.`,
            crmAction: dbResult, 
            googleEvent: calendarEvent 
        });

    } catch (error) {
        if (logger) logger.error(`[CRMController][syncActionToCalendar] Error syncing action ${actionId} to Google Calendar:`, { errorMessage: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to sync CRM action to Google Calendar.', details: error.message });
    }
};


module.exports = { 
    fetchUserActions, 
    fetchClientActions, 
    fetchAllActions, 
    addAction, 
    editAction, 
    removeAction,
    syncActionToCalendar // Added new controller
};