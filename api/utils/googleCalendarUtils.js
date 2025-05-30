const { google } = require('googleapis');
const { getUsersByID, updateUserGoogleTokens } = require('../models/user');
// For createDedicatedCalendar, we'd ideally import a function like:
// const { updateUserGoogleCalendarId } = require('../models/user'); 

// Default timezone for calendar events. Consider making this user-specific or app-configurable.
const DEFAULT_TIMEZONE = 'Asia/Tokyo'; 

/**
 * Creates and configures a Google OAuth2 client, refreshes the token if necessary,
 * and returns an authorized Google Calendar API service instance.
 * @param {string} requestId - The ID of the current request, for logging and model calls.
 * @param {number} userId - The ID of the user for whom to get the calendar service.
 * @returns {Promise<import('googleapis').calendar_v3.Calendar>} - An authorized Google Calendar API service.
 */
async function getCalendarService(requestId, userId) {
  const users = await getUsersByID(requestId, userId);
  if (!users || users.length === 0) {
    console.error(`[GoogleCalendarUtils][getCalendarService] User not found for ID: ${userId}, requestId: ${requestId}`);
    throw new Error('User not found.');
  }
  const user = users[0];

  if (!user.google_access_token) {
    console.error(`[GoogleCalendarUtils][getCalendarService] Google access token not found for user ID: ${userId}, requestId: ${requestId}`);
    throw new Error('Google access token not found. Please re-authenticate.');
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
    console.error(`[GoogleCalendarUtils][getCalendarService] Missing Google OAuth2 client environment variables. requestId: ${requestId}`);
    throw new Error('Google OAuth2 client configuration is incomplete.');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
  );

  oauth2Client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token,
    expiry_date: user.google_token_expiry_date ? new Date(user.google_token_expiry_date).getTime() : null,
  });

  const isActuallyExpiring = user.google_token_expiry_date 
                             ? (new Date(user.google_token_expiry_date).getTime() < (Date.now() + (5 * 60 * 1000)))
                             : true;

  if (isActuallyExpiring) {
    console.info(`[GoogleCalendarUtils][getCalendarService] Token for user ID: ${userId} is expiring. Attempting refresh. requestId: ${requestId}`);
    if (user.google_refresh_token) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        console.info(`[GoogleCalendarUtils][getCalendarService] Successfully refreshed token for user ID: ${userId}. requestId: ${requestId}`);
        await updateUserGoogleTokens(
          requestId,
          userId,
          credentials.access_token,
          credentials.refresh_token || user.google_refresh_token,
          credentials.expiry_date
        );
        console.info(`[GoogleCalendarUtils][getCalendarService] Updated refreshed tokens in DB for user ID: ${userId}. requestId: ${requestId}`);
      } catch (refreshError) {
        console.error(`[GoogleCalendarUtils][getCalendarService] Failed to refresh token for user ID: ${userId}. Error: ${refreshError.message}. requestId: ${requestId}`, refreshError.stack);
        throw new Error('Failed to refresh Google access token. Please re-authenticate.');
      }
    } else {
      console.warn(`[GoogleCalendarUtils][getCalendarService] Token for user ID: ${userId} expired, no refresh token. User needs to re-authenticate. requestId: ${requestId}`);
      throw new Error('Google access token expired, no refresh token. Please re-authenticate.');
    }
  }
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Creates a dedicated calendar for the user if one doesn't exist.
 * @param {string} requestId
 * @param {number} userId
 * @returns {Promise<string>} Calendar ID
 */
async function createDedicatedCalendar(requestId, userId) {
  const calendarService = await getCalendarService(requestId, userId);
  // Fetch user's name for calendar summary (optional, enhances personalization)
  const users = await getUsersByID(requestId, userId);
  const userName = (users && users.length > 0 && users[0].name) ? users[0].name : `User ${userId}`;

  const calendarResource = {
    summary: `CRM Events - ${userName}`,
    description: 'Calendar for events synced from Your PMS/CRM Application.',
    timeZone: DEFAULT_TIMEZONE,
  };

  try {
    const response = await calendarService.calendars.insert({ resource: calendarResource });
    const newCalendarId = response.data.id;
    console.info(`[GoogleCalendarUtils][createDedicatedCalendar] Successfully created dedicated calendar for user ID: ${userId} with Calendar ID: ${newCalendarId}. requestId: ${requestId}`);
    
    // **CONCEPTUAL**: Store newCalendarId in the users table
    // This would typically involve calling a model function:
    // await updateUserGoogleCalendarId(requestId, userId, newCalendarId);
    console.log(`[GoogleCalendarUtils][createDedicatedCalendar] CONCEPTUAL: Would call updateUserGoogleCalendarId(${requestId}, ${userId}, ${newCalendarId}) here.`);
    
    return newCalendarId;
  } catch (error) {
    console.error(`[GoogleCalendarUtils][createDedicatedCalendar] Error creating dedicated calendar for user ID: ${userId}. Error: ${error.message}. requestId: ${requestId}`, error.stack);
    throw new Error('Failed to create dedicated Google Calendar.');
  }
}

/**
 * Helper to format CRM action data into a Google Calendar event resource.
 * @param {object} crmActionData - The CRM action object.
 * @param {string} [defaultEventDurationHours=1] - Default duration in hours if end time is not specified.
 * @returns {object} Google Calendar event resource.
 */
function formatEventResource(crmActionData, defaultEventDurationHours = 1) {
    const startDateTime = new Date(crmActionData.action_datetime);
    let endDateTime = crmActionData.due_date ? new Date(crmActionData.due_date) : null;

    if (!endDateTime) {
        endDateTime = new Date(startDateTime.getTime() + defaultEventDurationHours * 60 * 60 * 1000);
    }
    
    // Check if it's an all-day event (time part is midnight for start and end, and end is exactly one day after start)
    // This is a heuristic. More robust all-day detection might be needed.
    const isAllDay = startDateTime.getHours() === 0 && startDateTime.getMinutes() === 0 && startDateTime.getSeconds() === 0 &&
                     endDateTime.getHours() === 0 && endDateTime.getMinutes() === 0 && endDateTime.getSeconds() === 0 &&
                     (endDateTime.getTime() - startDateTime.getTime() === 24 * 60 * 60 * 1000 ||
                      (endDateTime.getTime() === startDateTime.getTime() && !crmActionData.due_date)); // If no due_date, and time is 00:00:00, treat as all-day for the start date.


    const eventResource = {
        summary: crmActionData.subject,
        description: crmActionData.details || '', // Ensure description is not null
        extendedProperties: {
            private: {
                crmActionId: String(crmActionData.id), // Ensure it's a string
                crmClientId: String(crmActionData.client_id || ''), // Ensure it's a string, handle if undefined
            },
        },
        //guestsCanInviteOthers: false, // Example: set other properties
        //guestsCanModify: false,
    };

    if (isAllDay) {
        eventResource.start = { date: startDateTime.toISOString().split('T')[0] };
        // For all-day events, Google Calendar's end date is exclusive.
        // If it's a single all-day event, end date should be the day after.
        // If crmActionData.due_date was used and it was the same as action_datetime for an all-day event, adjust.
        const adjustedEndDateTime = new Date(endDateTime.getTime() + (crmActionData.due_date && crmActionData.due_date === crmActionData.action_datetime ? 24*60*60*1000 : 0));
        eventResource.end = { date: adjustedEndDateTime.toISOString().split('T')[0] };
    } else {
        eventResource.start = { dateTime: startDateTime.toISOString(), timeZone: DEFAULT_TIMEZONE };
        eventResource.end = { dateTime: endDateTime.toISOString(), timeZone: DEFAULT_TIMEZONE };
    }
    return eventResource;
}

/**
 * Creates an event on Google Calendar.
 * @param {string} requestId
 * @param {number} userId
 * @param {string} calendarIdToUse - e.g., 'primary' or a specific calendar ID.
 * @param {object} crmActionData - Data for the event.
 * @returns {Promise<object>} The created Google Calendar event.
 */
async function createCalendarEvent(requestId, userId, calendarIdToUse, crmActionData) {
  const calendarService = await getCalendarService(requestId, userId);
  const eventResource = formatEventResource(crmActionData);

  try {
    const response = await calendarService.events.insert({
      calendarId: calendarIdToUse,
      resource: eventResource,
    });
    console.info(`[GoogleCalendarUtils][createCalendarEvent] Successfully created event for user ID: ${userId} in calendar: ${calendarIdToUse}. Event ID: ${response.data.id}. requestId: ${requestId}`);
    return response.data;
  } catch (error) {
    console.error(`[GoogleCalendarUtils][createCalendarEvent] Error creating event for user ID: ${userId} in calendar: ${calendarIdToUse}. Error: ${error.message}. requestId: ${requestId}`, error.stack);
    throw new Error('Failed to create Google Calendar event.');
  }
}

/**
 * Updates an existing event on Google Calendar.
 * @param {string} requestId
 * @param {number} userId
 * @param {string} calendarIdToUse
 * @param {string} eventId - Google Calendar event ID.
 * @param {object} crmActionData - Updated data for the event.
 * @returns {Promise<object>} The updated Google Calendar event.
 */
async function updateCalendarEvent(requestId, userId, calendarIdToUse, eventId, crmActionData) {
  const calendarService = await getCalendarService(requestId, userId);
  const eventResource = formatEventResource(crmActionData);

  try {
    const response = await calendarService.events.update({
      calendarId: calendarIdToUse,
      eventId: eventId,
      resource: eventResource,
    });
    console.info(`[GoogleCalendarUtils][updateCalendarEvent] Successfully updated event ID: ${eventId} for user ID: ${userId} in calendar: ${calendarIdToUse}. requestId: ${requestId}`);
    return response.data;
  } catch (error) {
    console.error(`[GoogleCalendarUtils][updateCalendarEvent] Error updating event ID: ${eventId} for user ID: ${userId}. Error: ${error.message}. requestId: ${requestId}`, error.stack);
    throw new Error('Failed to update Google Calendar event.');
  }
}

/**
 * Deletes an event from Google Calendar.
 * @param {string} requestId
 * @param {number} userId
 * @param {string} calendarIdToUse
 * @param {string} eventId - Google Calendar event ID.
 * @returns {Promise<void>}
 */
async function deleteCalendarEvent(requestId, userId, calendarIdToUse, eventId) {
  const calendarService = await getCalendarService(requestId, userId);
  try {
    await calendarService.events.delete({
      calendarId: calendarIdToUse,
      eventId: eventId,
    });
    console.info(`[GoogleCalendarUtils][deleteCalendarEvent] Successfully deleted event ID: ${eventId} for user ID: ${userId} from calendar: ${calendarIdToUse}. requestId: ${requestId}`);
  } catch (error) {
    if (error.code === 404 || error.message.toLowerCase().includes('not found')) { // GAPI error for not found
        console.warn(`[GoogleCalendarUtils][deleteCalendarEvent] Event ID: ${eventId} not found for deletion for user ID: ${userId} in calendar: ${calendarIdToUse}. Already deleted? requestId: ${requestId}`);
        return; // Consider it a success if already deleted
    }
    console.error(`[GoogleCalendarUtils][deleteCalendarEvent] Error deleting event ID: ${eventId} for user ID: ${userId}. Error: ${error.message}. requestId: ${requestId}`, error.stack);
    throw new Error('Failed to delete Google Calendar event.');
  }
}

/**
 * Gets a specific event from Google Calendar.
 * @param {string} requestId
 * @param {number} userId
 * @param {string} calendarIdToUse
 * @param {string} eventId - Google Calendar event ID.
 * @returns {Promise<object>} The Google Calendar event.
 */
async function getCalendarEvent(requestId, userId, calendarIdToUse, eventId) {
  const calendarService = await getCalendarService(requestId, userId);
  try {
    const response = await calendarService.events.get({
      calendarId: calendarIdToUse,
      eventId: eventId,
    });
    console.info(`[GoogleCalendarUtils][getCalendarEvent] Successfully fetched event ID: ${eventId} for user ID: ${userId} from calendar: ${calendarIdToUse}. requestId: ${requestId}`);
    return response.data;
  } catch (error) {
     if (error.code === 404 || error.message.toLowerCase().includes('not found')) {
        console.warn(`[GoogleCalendarUtils][getCalendarEvent] Event ID: ${eventId} not found for user ID: ${userId} in calendar: ${calendarIdToUse}. requestId: ${requestId}`);
        return null; 
    }
    console.error(`[GoogleCalendarUtils][getCalendarEvent] Error fetching event ID: ${eventId} for user ID: ${userId}. Error: ${error.message}. requestId: ${requestId}`, error.stack);
    throw new Error('Failed to get Google Calendar event.');
  }
}

/**
 * Lists events from a Google Calendar.
 * @param {string} requestId
 * @param {number} userId
 * @param {string} calendarIdToUse
 * @param {string} [lastSyncTimestampISO] - Optional ISO string to fetch events modified since this time.
 * @param {number} [maxResults=100] - Maximum results to return.
 * @returns {Promise<Array<object>>} A list of Google Calendar events.
 */
async function listCalendarEvents(requestId, userId, calendarIdToUse, lastSyncTimestampISO, maxResults = 100) {
  const calendarService = await getCalendarService(requestId, userId);
  const listOptions = {
    calendarId: calendarIdToUse,
    singleEvents: true,
    orderBy: 'startTime',
    showDeleted: false, // Typically, we don't need to see events that were deleted on Google's side unless handling deletions.
    maxResults: maxResults,
  };

  if (lastSyncTimestampISO) {
    listOptions.updatedMin = lastSyncTimestampISO; // Use updatedMin to get events changed since last sync
    // listOptions.timeMin = lastSyncTimestampISO; // Or timeMin if only interested in future events from that point
  }

  try {
    const response = await calendarService.events.list(listOptions);
    console.info(`[GoogleCalendarUtils][listCalendarEvents] Successfully listed events for user ID: ${userId} from calendar: ${calendarIdToUse}. Count: ${response.data.items.length}. requestId: ${requestId}`);
    return response.data.items || [];
  } catch (error) {
    console.error(`[GoogleCalendarUtils][listCalendarEvents] Error listing events for user ID: ${userId} from calendar: ${calendarIdToUse}. Error: ${error.message}. requestId: ${requestId}`, error.stack);
    throw new Error('Failed to list Google Calendar events.');
  }
}

module.exports = {
  getCalendarService,
  createDedicatedCalendar,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvent,
  listCalendarEvents,
};
