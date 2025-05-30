const { validationResult } = require('express-validator');
const { 
  getAllUsers, 
  getUsersByID, 
  createUser, 
  updateUserInfo, 
  updateUserCalendarSettings // Added updateUserCalendarSettings
} = require('../models/user');
const googleCalendarUtils = require('../utils/googleCalendarUtils'); // Added googleCalendarUtils
const { syncCalendarFromGoogle } = require('../services/synchronizationService'); // Added sync service

const users = async (req, res) => {
  const logger = req.app.locals.logger;
  const isProduction = process.env.NODE_ENV === 'production';
  try {
    const users = await getAllUsers(req.requestId);
    if (!users || users.length === 0) { // Check for empty array too
      logger.info('No users found.', { requestId: req.requestId });
      return res.status(404).json({ error: isProduction ? 'Data not found.' : 'Users not found' });
    }
    res.json(users);
  } catch (err) {
    const specificError = 'Internal server error while fetching users.';
    logger.error(specificError, { error: err.message, stack: err.stack, requestId: req.requestId });
    res.status(500).json({ error: isProduction ? 'An error occurred. Please try again later.' : specificError });
  }
};

const getUser = async (req, res) => {
  const logger = req.app.locals.logger;
  const isProduction = process.env.NODE_ENV === 'production';
  const user_id = req.user.id;
  try {
      const user = await getUsersByID(req.requestId, user_id);
      if (!user) {
        logger.info('User not found by ID for current user.', { userId: user_id, requestId: req.requestId });
        return res.status(404).json({ error: isProduction ? 'User information not found.' : 'User not found' });
      }
      res.json(user);
  } catch (error) {
      const specificError = `Error getting user by ID: ${error.message}`;
      logger.error(specificError, { userId: user_id, error: error.message, stack: error.stack, requestId: req.requestId });
      res.status(500).json({ error: isProduction ? 'An error occurred. Please try again later.' : specificError });
  }
};

const registerUser = async (req, res) => {
  const logger = req.app.locals.logger;
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const specificErrors = errors.array().map(err => ({ field: err.param, message: err.msg }));
    logger.warn('User registration validation failed', { ip: req.ip, email: req.body.email, errors: specificErrors, requestId: req.requestId });
    const clientError = isProduction ? 'Registration failed. Please check your input.' : specificErrors[0].message;
    return res.status(400).json({ error: clientError, details: isProduction ? undefined : specificErrors });
  }

  const { email, name, password, role } = req.body;
  const created_by = req.user.id; // Assuming req.user is populated by authMiddleware_manageUsers
  const updated_by = req.user.id;

  // The manual check for email, password, role, created_by is now mostly covered by express-validator.
  // `created_by` comes from `req.user.id`, so it should be reliable if middleware is correct.
  // Role might need a specific validator if it has enum values, but for now, notEmpty is good.

  try {
    const user = await createUser(req.requestId, email, name, password, role, created_by, updated_by);
    logger.info('User registered successfully by admin/manager', { userId: user.id, email: user.email, adminId: created_by, requestId: req.requestId });
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        role_id: user.role_id
      }
     });
  } catch (err) {
    let specificError = 'Internal server error during user registration.';
    let statusCode = 500;
    if (err.code === '23505') { // Unique constraint violation (e.g., email already exists)
      specificError = 'Email already exists.';
      statusCode = 400;
      logger.warn(specificError, { email, ip: req.ip, requestId: req.requestId });
    } else {
      logger.error(specificError, { error: err.message, stack: err.stack, email, ip: req.ip, requestId: req.requestId });
    }
    res.status(statusCode).json({ error: isProduction && statusCode === 500 ? 'Registration failed. Please try again later.' : specificError });
  }
};

const updateUser = async (req, res) => {
  const logger = req.app.locals.logger;
  const isProduction = process.env.NODE_ENV === 'production';
  const { id, name, status_id, role_id } = req.body;
  const updated_by = req.user.id;

  // Basic validation for required fields, express-validator could be added here too for more complex rules
  if (!id || status_id === undefined || role_id === undefined) { // status_id can be 0, so check for undefined
    const specificError = 'User ID, status ID, and role ID are required for update.';
    logger.warn(specificError, { body: req.body, adminId: updated_by, requestId: req.requestId });
    return res.status(400).json({ error: isProduction ? 'Update failed. Missing required fields.' : specificError });
  }

  try {
    const user = await updateUserInfo(req.requestId, id, name, status_id, role_id, updated_by);
    if (!user) {
      const specificError = 'User not found for update.';
      logger.warn(specificError, { userIdToUpdate: id, adminId: updated_by, requestId: req.requestId });
      return res.status(404).json({ error: isProduction ? 'User not found.' : specificError });
    }
    
    logger.info('User updated successfully by admin/manager', { userIdUpdated: id, adminId: updated_by, requestId: req.requestId });
    res.status(200).json({ message: 'User updated successfully' });
  } catch (err) {
    const specificError = 'Internal server error during user update.';
    logger.error(specificError, { error: err.message, stack: err.stack, userIdToUpdate: id, adminId: updated_by, requestId: req.requestId });
    res.status(500).json({ error: isProduction ? 'Update failed. Please try again later.' : specificError });
  }
};

const updateUserCalendarPreferences = async (req, res) => {
  const logger = req.app.locals.logger; // Assuming logger is available
  const isProduction = process.env.NODE_ENV === 'production';
  const userId = req.user.id;
  const { sync_preference, create_calendar } = req.body; // These are from the frontend
  const settingsToUpdate = {};
  let newCalendarId = null; // To store new calendar id if created
  let messageDetail = '';

  try {
    const currentUserArr = await getUsersByID(req.requestId, userId);
    if (!currentUserArr || currentUserArr.length === 0) {
      logger.warn(`[UserCalPrefs] User not found for ID: ${userId}. Request ID: ${req.requestId}`);
      return res.status(404).json({ error: 'User not found' });
    }
    const currentUser = currentUserArr[0];
    
    newCalendarId = currentUser.google_calendar_id; 

    if (create_calendar === true) {
      if (!currentUser.google_calendar_id) { 
         logger.info(`[UserCalPrefs] User ${userId} requested dedicated calendar creation. Current calendar ID is null. Request ID: ${req.requestId}`);
         // Assuming createDedicatedCalendar from googleCalendarUtils now correctly calls a model function
         // to save the calendar ID to the user record and returns the full calendar object or at least its ID.
         // For this controller, we expect the ID to be set on the user object after this call if successful.
         // The prompt mentioned: "The createDedicatedCalendar in utils should ideally call a model function to save the ID."
         // And also: "For this subtask, assume such a function updateUserGoogleCalendarId(requestId, userId, calendarId) exists or can be added to user.js later. For now, just log the calendar ID or indicate where it should be saved."
         // Let's stick to the latter for this step, meaning createDedicatedCalendar returns the ID, and we save it via settingsToUpdate.
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
      settingsToUpdate.sync_google_calendar = true;
      if (sync_preference === false) { 
         logger.warn(`[UserCalPrefs] User ${userId} sent create_calendar:true and sync_preference:false. Sync will be enabled. Request ID: ${req.requestId}`);
      }
    } else if (typeof sync_preference === 'boolean') { 
      settingsToUpdate.sync_google_calendar = sync_preference;
      // If sync is disabled, we don't clear google_calendar_id here. 
      // That could be a separate explicit action "remove dedicated calendar" or similar.
    }

    if (Object.keys(settingsToUpdate).length > 0) {
      await updateUserCalendarSettings(req.requestId, userId, settingsToUpdate); 
      logger.info(`[UserCalPrefs] User ${userId} calendar preferences updated in DB. Settings: ${JSON.stringify(settingsToUpdate)}. Request ID: ${req.requestId}`);
    } else {
      logger.info(`[UserCalPrefs] No direct preference changes to save for user ${userId}. Request ID: ${req.requestId}`);
    }
    
    // Fetch the latest user data to return, ensuring the response reflects the true state
    const updatedUserArray = await getUsersByID(req.requestId, userId); 
    res.status(200).json({ 
        message: 'User calendar preferences processed. ' + messageDetail.trim(), 
        user: updatedUserArray && updatedUserArray.length > 0 ? updatedUserArray[0] : null 
    });

  } catch (error) {
    logger.error(`[UserCalPrefs] Error updating calendar preferences for user ${userId}: ${error.message}`, { stack: error.stack, requestId: req.requestId });
    res.status(500).json({ error: isProduction ? 'Failed to update calendar preferences.' : error.message });
  }
};

module.exports = { 
  users, 
  getUser, 
  registerUser, 
  updateUser,
  updateUserCalendarPreferences, 
  getCalendarEmbedUrl,
  triggerGoogleCalendarSync // Added triggerGoogleCalendarSync
};

const getCalendarEmbedUrl = async (req, res) => {
  const logger = req.app.locals.logger; 
  const isProduction = process.env.NODE_ENV === 'production';
  const userId = req.user.id;

  try {
    const userArr = await getUsersByID(req.requestId, userId);
    if (!userArr || userArr.length === 0) {
      logger.warn(`[GetEmbedUrl] User not found for ID: ${userId}. Request ID: ${req.requestId}`);
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userArr[0];

    // Determine the calendar ID to embed
    // Prioritize the dedicated app calendar if it exists, otherwise default to 'primary'
    const calendarIdToEmbed = user.google_calendar_id || 'primary';
    
    // Construct the base embed URL
    // The calendar ID needs to be URL-encoded.
    let embedUrl = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarIdToEmbed)}`;

    // Optionally, add timezone (e.g., from user profile or a default)
    // For now, using a common default. User's Google Calendar settings will often handle display timezone.
    const userTimezone = process.env.APP_DEFAULT_TIMEZONE || 'Asia/Tokyo'; // Example: Get from env or config
    embedUrl += `&ctz=${encodeURIComponent(userTimezone)}`;
    
    // Other parameters can be added here if needed, e.g., wkst=1 (week start day), showTitle=0, etc.

    logger.info(`[GetEmbedUrl] Generated calendar embed URL for user ${userId}. Calendar ID: ${calendarIdToEmbed}. Request ID: ${req.requestId}`);
    res.status(200).json({ embedUrl: embedUrl });

  } catch (error) {
    logger.error(`[GetEmbedUrl] Error generating calendar embed URL for user ${userId}: ${error.message}`, { stack: error.stack, requestId: req.requestId });
    res.status(500).json({ error: isProduction ? 'Failed to generate calendar embed URL.' : error.message });
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
      res.status(200).json({ message: 'Google Calendar sync process completed.', details: syncResult });
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