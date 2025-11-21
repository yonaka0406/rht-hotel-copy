const { validateNumericParam } = require('../../utils/validationUtils');
const hotelModel = require('../../models/hotel');
const roomsModel = require('../../models/rooms');
const logger = require('../../config/logger');

const getPlanExclusionSettingsController = async (req, res) => {
  let parsedId;
  try {
    parsedId = validateNumericParam(req.params.hotel_id, 'Hotel ID');
  } catch (error) {
    // If validateNumericParam throws because hotel_id is empty/null/undefined,
    // it will say "Hotel ID is required...". If it's not a positive int, it'll say that.
    return res.status(400).json({ error: error.message });
  }

  try {
    const settings = await hotelModel.getPlanExclusionSettings(req.requestId, parsedId);
    res.status(200).json(settings);
  } catch (error) {
    logger.error('Error getting plan exclusion settings:', error);
    res.status(500).json({ error: 'Internal server error while retrieving plan exclusion settings.' });
  }
};

const updatePlanExclusionSettingsController = async (req, res) => {
  let parsedId;
  try {
    parsedId = validateNumericParam(req.params.hotel_id, 'Hotel ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const { global_plan_ids } = req.body; // e.g. { "global_plan_ids": [1, 2, 3] }

    if (!Array.isArray(global_plan_ids)) {
      return res.status(400).json({ error: 'global_plan_ids must be an array.' });
    }

    // Validate that every entry in global_plan_ids is an integer > 0
    const invalidPlanId = global_plan_ids.find(id => !Number.isInteger(id) || id <= 0);
    if (invalidPlanId !== undefined) {
      return res.status(400).json({ error: 'All plan IDs must be positive integers.' });
    }

    await hotelModel.updatePlanExclusions(req.requestId, parsedId, global_plan_ids);
    res.status(200).json({ message: 'Plan exclusions updated successfully' });
  } catch (error) {
    logger.error('Error updating plan exclusion settings:', error);
    res.status(500).json({ error: 'Internal server error while updating plan exclusion settings.' });
  }
};

const getRoomAssignmentOrderController = async (req, res) => {
  let numericId;
  try {
    numericId = validateNumericParam(req.params.id, 'Hotel ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const order = await roomsModel.getRoomAssignmentOrder(req.requestId, numericId);
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error while retrieving room assignment order.' });
  }
};

const updateRoomAssignmentOrderController = async (req, res) => {
  let numericId;
  try {
    numericId = validateNumericParam(req.params.id, 'Hotel ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const { rooms } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(rooms)) {
    return res.status(400).json({ error: 'Request body must be an array of rooms.' });
  }

  try {
    await roomsModel.updateRoomAssignmentOrder(req.requestId, numericId, rooms, userId);
    res.status(200).json({ message: 'Room assignment order updated successfully.' });
  } catch (error) {
    logger.error('Error updating room assignment order:', error);
    res.status(500).json({ error: 'Internal server error while updating room assignment order.' });
  }
};

module.exports = {
  getPlanExclusionSettingsController,
  updatePlanExclusionSettingsController,
  getRoomAssignmentOrderController,
  updateRoomAssignmentOrderController
};