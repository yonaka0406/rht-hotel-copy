const { google } = require('googleapis');
const usersModel = require('../models/user');
const { getGoogleOAuth2Client } = require('../config/oauth');

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
  const users = await usersModel.selectUserByID(requestId, userId);
  if (!users || users.length === 0) {
    console.error(`[GoogleCalendarUtils][getCalendarService] User not found for ID: ${userId}, requestId: ${requestId}`);
    throw new Error('User not found.');
  }
  const user = users[0];

  // Get the base OAuth2 client from your centralized config
  const oauth2Client = getGoogleOAuth2Client();


  // console.log(`[DEBUG][getCalendarService] For User ID: ${userId}, Request ID: ${requestId}`);
  // console.log(`[DEBUG][getCalendarService]   - Retrieved user.google_access_token: '${user.google_access_token}' (Type: ${typeof user.google_access_token})`);
  // console.log(`[DEBUG][getCalendarService]   - Retrieved user.google_refresh_token: '${user.google_refresh_token}' (Type: ${typeof user.google_refresh_token})`);
  // console.log(`[DEBUG][getCalendarService]   - Retrieved user.google_token_expiry_date: '${user.google_token_expiry_date}' (Type: ${typeof user.google_token_expiry_date})`);

  const expiryDateForCredentials = user.google_token_expiry_date ? new Date(user.google_token_expiry_date).getTime() : null;
  // console.log(`[DEBUG][getCalendarService]   - Calculated expiry_date for setCredentials: ${expiryDateForCredentials} (Type: ${typeof expiryDateForCredentials})`);

  oauth2Client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token,
    expiry_date: expiryDateForCredentials,
  });

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
  const users = await usersModel.selectUserByID(requestId, userId);
  const userName = (users && users.length > 0 && users[0].name) ? users[0].name : `User ${userId}`;

  const calendarResource = {
    summary: `WeHub - ${userName}`,
    description: 'WeHubのCRMと同期するカレンダー',
    timeZone: DEFAULT_TIMEZONE,
  };

  try {
    const response = await calendarService.calendars.insert({ resource: calendarResource });
    const newCalendarId = response.data.id;
    console.info(`[GoogleCalendarUtils][createDedicatedCalendar] Successfully created dedicated calendar for user ID: ${userId} with Calendar ID: ${newCalendarId}. requestId: ${requestId}`);

    return newCalendarId;
  } catch (error) {
    console.error(`[GoogleCalendarUtils][createDedicatedCalendar] Error creating dedicated calendar for user ID: ${userId}. Error: ${error.message}. requestId: ${requestId}`, error.stack);
    throw new Error('Failed to create dedicated Google Calendar.');
  }
}

/**
 * Helper to format CRM action data into a Google Calendar event resource.
 * @param {object} crmActionData - The CRM action object, containing details like `action_datetime`, `due_date`, `subject`, etc.
 * @param {number} [defaultEventDurationHours=0.5] - Default duration in hours if end time is not specified for timed events.
 * @returns {object} Google Calendar event resource.
 */
function formatEventResource(crmActionData, defaultEventDurationHours = 0.5) {
  if (!crmActionData || !crmActionData.action_datetime) {
    console.error('[GoogleCalendarUtils][formatEventResource] Invalid crmActionData or missing action_datetime.');
    throw new Error('Invalid crmActionData: action_datetime is required.');
  }

  // 1. Deriving startDateTime and originalEndDateTime (conceptual)
  // startDateTime is directly obtained from crmActionData.action_datetime.
  // originalEndDateTime would be derived from crmActionData.due_date if it exists.
  // This is used to determine the event's duration or specific end point.
  const startDateTime = new Date(crmActionData.action_datetime);
  let originalEndDateTime; // This variable will store the Date object if due_date is provided.
  if (crmActionData.due_date) {
    originalEndDateTime = new Date(crmActionData.due_date);
  }

  // 2. Logic for determining isAllDay status
  // isAllDay is determined through a series of checks:
  // a) If action_datetime is a string and does not contain 'T', it's treated as a date string (e.g., "YYYY-MM-DD"), implying an all-day event.
  // b) If action_datetime has a time component, but it's midnight (00:00:00), it might be an all-day event.
  //    In this case, if due_date is also at midnight or not provided, it's considered all-day.
  // c) An explicit boolean field `crmActionData.is_all_day` can override the above logic if present.
  let isAllDay = false;
  if (typeof crmActionData.action_datetime === 'string' && !crmActionData.action_datetime.includes('T')) {
    isAllDay = true; // Handles date-only strings like "YYYY-MM-DD"
  } else if (startDateTime.getHours() === 0 && startDateTime.getMinutes() === 0 && startDateTime.getSeconds() === 0) {
    // Check for midnight time
    if (!originalEndDateTime) { // No due_date means it's likely a single all-day event if start is midnight
      isAllDay = true;
    } else {
      // If due_date is also at midnight, it's consistent with an all-day event definition
      if (originalEndDateTime.getHours() === 0 && originalEndDateTime.getMinutes() === 0 && originalEndDateTime.getSeconds() === 0) {
        isAllDay = true;
      }
    }
  }
  // Override with explicit flag if provided
  if (typeof crmActionData.is_all_day === 'boolean') {
    isAllDay = crmActionData.is_all_day;
  }

  const eventResource = {
    summary: crmActionData.subject || 'No Subject',
    description: crmActionData.details || '',
    extendedProperties: {
      private: {
        crmActionId: String(crmActionData.id),
        crmClientId: String(crmActionData.client_id || ''),
      },
    },
  };

  // 3. Constructing eventResource.start and eventResource.end
  if (isAllDay) {
    // For all-day events:
    // - `start.date` is the date part of startDateTime (YYYY-MM-DD).
    // - `end.date` is also a YYYY-MM-DD string.
    // - Google Calendar's end date for all-day events is exclusive.
    //   So, an event that occurs *on* '2023-10-26' needs an end date of '2023-10-27'.
    //   If due_date specifies the same day as action_datetime or is earlier (e.g. data error), it's a single day event.
    //   If due_date specifies a later day (e.g. '2023-10-27' for an event *ending on* the 27th), GCal needs '2023-10-28'.
    eventResource.start = { date: startDateTime.toISOString().split('T')[0] };

    let endDateForAllday;
    if (originalEndDateTime) {
      endDateForAllday = new Date(originalEndDateTime); // Use the due_date
      // If originalEndDateTime (from due_date) is on or before startDateTime for an all-day event,
      // it implies a single-day event from CRM's perspective, or an error.
      // For Google Calendar, this means the end date must be the day after startDateTime.
      if (endDateForAllday.toISOString().split('T')[0] <= startDateTime.toISOString().split('T')[0]) {
        endDateForAllday = new Date(startDateTime);
        endDateForAllday.setDate(startDateTime.getDate() + 1);
      } else {
        // If due_date is '2023-10-27', meaning the event lasts through the 27th,
        // Google Calendar's exclusive end date should be '2023-10-28'.
        endDateForAllday.setDate(endDateForAllday.getDate() + 1);
      }
    } else {
      // No due_date specified, so it's a single all-day event. End date is the day after startDateTime.
      endDateForAllday = new Date(startDateTime);
      endDateForAllday.setDate(startDateTime.getDate() + 1);
    }
    eventResource.end = { date: endDateForAllday.toISOString().split('T')[0] };

  } else {
    // For timed events:
    // - `start.dateTime` is the full ISO string of startDateTime.
    // - `end.dateTime` is the full ISO string of the calculated end time.
    // - Both include `timeZone`.
    eventResource.start = { dateTime: startDateTime.toISOString(), timeZone: DEFAULT_TIMEZONE };

    // 4. Application of the 30-minute default duration for timed events.
    // The minimum duration for a timed event is `defaultEventDurationHours` (0.5 hours = 30 minutes).
    const minDurationMillis = defaultEventDurationHours * 60 * 60 * 1000;
    let calculatedEndDateTime;

    if (originalEndDateTime) {
      calculatedEndDateTime = new Date(originalEndDateTime); // Use due_date if available
      // If the duration from startDateTime to originalEndDateTime is less than the minimum,
      // or if originalEndDateTime is before startDateTime (invalid range),
      // adjust calculatedEndDateTime to meet the minimum duration.
      if (calculatedEndDateTime.getTime() - startDateTime.getTime() < minDurationMillis) {
        calculatedEndDateTime = new Date(startDateTime.getTime() + minDurationMillis);
      }
    } else {
      // No due_date provided, so set end time using the default minimum duration from startDateTime.
      calculatedEndDateTime = new Date(startDateTime.getTime() + minDurationMillis);
    }
    // Final safety check: if calculatedEndDateTime is still on or before startDateTime,
    // (e.g., due to invalid due_date from CRM that wasn't fully caught or extremely short duration),
    // enforce the minimum duration from startDateTime.
    if (calculatedEndDateTime.getTime() <= startDateTime.getTime()) {
      calculatedEndDateTime = new Date(startDateTime.getTime() + minDurationMillis);
    }

    eventResource.end = { dateTime: calculatedEndDateTime.toISOString(), timeZone: DEFAULT_TIMEZONE };
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
