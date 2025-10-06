const validationUtils = require('../../utils/validationUtils');
const hotelModel = require('../../models/hotel');

const getRoomAssignmentOrderController = async (req, res) => {
  let numericId;
  try {
    numericId = validationUtils.validateNumericParam(req.params.id, 'Hotel ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const order = await hotelModel.getRoomAssignmentOrder(req.requestId, numericId);
    res.json(order);
  } catch (error) {
    console.error('Error getting room assignment order:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateRoomAssignmentOrderController = async (req, res) => {
  let numericId;
  try {
    numericId = validationUtils.validateNumericParam(req.params.id, 'Hotel ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const { rooms } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(rooms)) {
    return res.status(400).json({ error: 'Request body must be an array of rooms.' });
  }

  try {
    await hotelModel.updateRoomAssignmentOrder(req.requestId, numericId, rooms, userId);
    res.status(200).json({ message: 'Room assignment order updated successfully.' });
  } catch (error) {
    console.error('Error updating room assignment order:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getRoomAssignmentOrderController,
  updateRoomAssignmentOrderController,
};
