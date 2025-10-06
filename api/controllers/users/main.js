const { validationResult } = require('express-validator');
const userModel = require('../../models/user');
const { getPool } = require('../../config/database');
const googleCalendarUtils = require('../../utils/googleCalendarUtils');
const synchronizationService = require('../../services/synchronizationService');

const users = async (req, res) => {
  const logger = req.app.locals.logger;
  const isProduction = process.env.NODE_ENV === 'production';
  try {
    const users = await userModel.getAllUsers(req.requestId);
    if (!users || users.length === 0) { // Check for empty array too
      // logger.info('No users found.', { requestId: req.requestId });
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
      const user = await userModel.getUsersByID(req.requestId, user_id);
      if (!user) {
        // logger.info('User not found by ID for current user.', { userId: user_id, requestId: req.requestId });
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
    const user = await userModel.createUser(req.requestId, email, name, password, role, created_by, updated_by);
    // logger.info('User registered successfully by admin/manager', { userId: user.id, email: user.email, adminId: created_by, requestId: req.requestId });
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
    const user = await userModel.updateUserInfo(req.requestId, id, name, status_id, role_id, updated_by);
    if (!user) {
      const specificError = 'User not found for update.';
      logger.warn(specificError, { userIdToUpdate: id, adminId: updated_by, requestId: req.requestId });
      return res.status(404).json({ error: isProduction ? 'User not found.' : specificError });
    }
    
    // logger.info('User updated successfully by admin/manager', { userIdUpdated: id, adminId: updated_by, requestId: req.requestId });
    res.status(200).json({ message: 'User updated successfully' });
  } catch (err) {
    const specificError = 'Internal server error during user update.';
    logger.error(specificError, { error: err.message, stack: err.stack, userIdToUpdate: id, adminId: updated_by, requestId: req.requestId });
    res.status(500).json({ error: isProduction ? 'Update failed. Please try again later.' : specificError });
  }
};

const createUserCalendar = async (req, res) => {
  const logger = req.app.locals.logger;
  const userId = req.user.id;
  const isProduction = process.env.NODE_ENV === 'production';
  
  const settingsToUpdate = {};
  let newCalendarId = null; // To store new calendar id
  let messageDetail = '';

  const client = await getPool(req.requestId).connect(); // Acquire a client for the transaction

  try {
    await client.query('BEGIN'); // Start transaction

    const currentUserArr = await userModel.getUsersByID(req.requestId, userId, client); // Pass client
    if (!currentUserArr || currentUserArr.length === 0) {
      logger.warn(`[UserCalPrefs] User not found for ID: ${userId}. Request ID: ${req.requestId}`);
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }
    const currentUser = currentUserArr[0];
    
    newCalendarId = currentUser.google_calendar_id;
    
    if (!currentUser.google_calendar_id) { 
        // logger.info(`[UserCalPrefs] User ${userId} requested dedicated calendar creation. Current calendar ID is null. Request ID: ${req.requestId}`);
        
        const createdCalendarId = await googleCalendarUtils.createDedicatedCalendar(req.requestId, userId);
        if (createdCalendarId && typeof createdCalendarId === 'string') {
            newCalendarId = createdCalendarId;
            settingsToUpdate.google_calendar_id = newCalendarId;
            messageDetail += 'Dedicated Google Calendar created/verified. ';
            // logger.info(`[UserCalPrefs] Dedicated calendar created for user ${userId} with ID: ${newCalendarId}. Request ID: ${req.requestId}`);
        } else {
            logger.error(`[UserCalPrefs] Failed to create dedicated calendar for user ${userId}. Request ID: ${req.requestId}`);
            messageDetail += 'Failed to create dedicated Google Calendar. ';
        }
    } else {
        // logger.info(`[UserCalPrefs] User ${userId} already has dedicated calendar ID: ${currentUser.google_calendar_id}. Re-confirming. Request ID: ${req.requestId}`);
        settingsToUpdate.google_calendar_id = currentUser.google_calendar_id; 
        messageDetail += 'Existing dedicated calendar ID confirmed. ';
    }
    
    if (Object.keys(settingsToUpdate).length > 0) {
      await userModel.updateUserCalendarSettings(req.requestId, userId, settingsToUpdate, client); // Pass client
      // logger.info(`[UserCalPrefs] User ${userId} calendar preferences updated in DB. Settings: ${JSON.stringify(settingsToUpdate)}. Request ID: ${req.requestId}`);
    } else {
      // logger.info(`[UserCalPrefs] No direct preference changes to save for user ${userId}. Request ID: ${req.requestId}`);
    }
    
    // Fetch the latest user data to return, ensuring the response reflects the true state
    const updatedUserArray = await userModel.getUsersByID(req.requestId, userId, client); // Pass client
    res.status(200).json({ 
        message: 'User calendar preferences processed. ' + messageDetail.trim(), 
        user: updatedUserArray && updatedUserArray.length > 0 ? updatedUserArray[0] : null 
    });

    await client.query('COMMIT'); // Commit transaction

  } catch (error) {
    await client.query('ROLLBACK'); // Rollback on error
    logger.error(`[UserCalPrefs] Error updating calendar preferences for user ${userId}: ${error.message}`, { stack: error.stack, requestId: req.requestId });
    res.status(500).json({ error: isProduction ? 'Failed to update calendar preferences.' : error.message });
  } finally {
    client.release(); // Release the client
  }
};

const triggerGoogleCalendarSync = async (req, res) => {
  const logger = req.app.locals.logger;
  const isProduction = process.env.NODE_ENV === 'production';
  const userId = req.user.id;

  try {
    // logger.info(`[TriggerSyncCtrl] User ${userId} initiated Google Calendar sync. Request ID: ${req.requestId}`);
    const syncResult = await synchronizationService.syncCalendarFromGoogle(req.requestId, userId);

    if (syncResult.success) {
      // logger.info(`[TriggerSyncCtrl] Sync completed for user ${userId}. Result: ${JSON.stringify(syncResult)}. Request ID: ${req.requestId}`);
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

const getUserById = async (req, res) => {
  const logger = req.app.locals.logger;
  const isProduction = process.env.NODE_ENV === 'production';
  const { id } = req.params; // Get ID from URL parameters

  try {
    const user = await userModel.getUsersByID(req.requestId, id);
    if (!user || user.length === 0) {
      // logger.info(`User not found by ID: ${id}.`, { requestId: req.requestId });
      return res.status(404).json({ error: isProduction ? 'User not found.' : 'User not found' });
    }
    res.json({ user: user[0] }); // Return the first user found
  } catch (error) {
    const specificError = `Error getting user by ID: ${error.message}`;
    logger.error(specificError, { userId: id, error: error.message, stack: error.stack, requestId: req.requestId });
    res.status(500).json({ error: isProduction ? 'An error occurred. Please try again later.' : specificError });
  }
};

module.exports = { 
  users, 
  getUser, 
  getUserById, 
  registerUser, 
  updateUser,  
  createUserCalendar,
  triggerGoogleCalendarSync
};