const validationModel = require('../models/validation');

const getDoubleBookings = async (req, res) => {
  try {
    const data = await validationModel.getDoubleBookings(req.requestId);
    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getEmptyReservations = async (req, res) => {
  try {
    const data = await validationModel.getEmptyReservations(req.requestId);
    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteEmptyReservation = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedReservation = await validationModel.deleteEmptyReservationById(req.requestId, id);
    if (deletedReservation) {
      res.status(200).json({ message: 'Reservation deleted successfully', id: deletedReservation.id });
    } else {
      res.status(404).json({ message: 'Reservation not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getDoubleBookings,
  getEmptyReservations,
  deleteEmptyReservation,
};