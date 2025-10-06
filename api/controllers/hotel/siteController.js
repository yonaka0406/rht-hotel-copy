const { getPool } = require('../../config/database');
const validationUtils = require('../../utils/validationUtils');
const hotelModel = require('../../models/hotel');

const fetchHotelSiteController = async (req, res) => {
    let numericId;
    try {
      numericId = validationUtils.validateNumericParam(req.params.id, 'Hotel ID');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const hotel = await hotelModel.getHotelSiteController(req.requestId, numericId);
      res.json(hotel);
    } catch (error) {
      console.error('Error getting hotels:', error);
      res.status(500).json({ error: error.message });
    }
  };
const editHotelSiteController = async (req, res) => {
    let numericId;
    try {
      numericId = validationUtils.validateNumericParam(req.params.id, 'Hotel ID');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const data = req.body;    

    try {
      const updatedHotel = await hotelModel.updateHotelSiteController(req.requestId, numericId, data);
      if (!updatedHotel) {
        return res.status(404).json({ message: 'Hotel not found' });
      }
      res.status(200).json(updatedHotel);
    } catch (error) {
      console.error('Error updating hotel:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

module.exports = {
  fetchHotelSiteController,
  editHotelSiteController,
};
