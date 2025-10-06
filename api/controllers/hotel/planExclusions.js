const validationUtils = require('../../utils/validationUtils');
const hotelModel = require('../../models/hotel');

const getPlanExclusionSettingsController = async (req, res) => {
  let parsedId;
  try {
    parsedId = validationUtils.validateNumericParam(req.params.hotel_id, 'Hotel ID');
  } catch (error) {
    // If validateNumericParam throws because hotel_id is empty/null/undefined,
    // it will say "Hotel ID is required...". If it's not a positive int, it'll say that.
    return res.status(400).json({ error: error.message });
  }

  try {
    const settings = await hotelModel.getPlanExclusionSettings(req.requestId, parsedId);
    res.status(200).json(settings);
  } catch (error) {
    console.error('Error getting plan exclusion settings:', error);
    res.status(500).json({ message: 'Internal server error while retrieving plan exclusion settings.' });
  }
};

const updatePlanExclusionSettingsController = async (req, res) => {
  let parsedId;
  try {
    parsedId = validationUtils.validateNumericParam(req.params.hotel_id, 'Hotel ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const { global_plan_ids } = req.body; // e.g. { "global_plan_ids": [1, 2, 3] }

    if (!Array.isArray(global_plan_ids)) {
      return res.status(400).json({ message: 'global_plan_ids must be an array.' });
    }

    await hotelModel.updatePlanExclusions(req.requestId, parsedId, global_plan_ids);
    res.status(200).json({ message: 'Plan exclusions updated successfully' });
  } catch (error) {
    console.error('Error updating plan exclusion settings:', error);
    res.status(500).json({ message: 'Internal server error while updating plan exclusion settings.' });
  }
};

module.exports = {
  getPlanExclusionSettingsController,
  updatePlanExclusionSettingsController,
};
