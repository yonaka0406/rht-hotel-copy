const { validateNumericParam, validateNonEmptyStringParam, validateDateStringParam, validateIntegerParam } = require('../../utils/validationUtils');
const logger = require('../../config/logger');
const hotelModel = require('../../models/hotel'); // Assuming hotelModel is needed for general hotel operations

const createHotel = async (req, res) => {
  let validatedFormalName, validatedName, validatedOpenDate, validatedTotalRooms,
    validatedAddress, validatedEmail, validatedPhoneNumber;
  try {
    validatedFormalName = validateNonEmptyStringParam(req.body.formal_name, 'Formal Name');
    validatedName = validateNonEmptyStringParam(req.body.name, 'Name');
    validatedOpenDate = validateDateStringParam(req.body.open_date, 'Open Date');
    validatedTotalRooms = validateIntegerParam(String(req.body.total_rooms), 'Total Rooms');
    validatedAddress = validateNonEmptyStringParam(req.body.address, 'Address');
    validatedEmail = validateNonEmptyStringParam(req.body.email, 'Email');
    validatedPhoneNumber = validateNonEmptyStringParam(req.body.phone_number, 'Phone Number');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const hotelData = {
    formal_name: validatedFormalName,
    name: validatedName,
    facility_type_code: req.body.facility_type.code,
    open_date: validatedOpenDate,
    total_rooms: validatedTotalRooms,
    postal_code: req.body.postal_code,
    address: validatedAddress,
    email: validatedEmail,
    phone_number: validatedPhoneNumber,
  };

  try {
    const hotelId = await hotelModel.create(req.requestId, hotelData, req.user.id);
    res.status(201).json({
      message: 'Hotel created successfully with all partitions',
      id: hotelId
    });

  } catch (error) {
    logger.error('Hotel creation error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getAllHotels = async (req, res) => {
  try {
    const hotels = await hotelModel.getAllHotels(req.requestId);
    res.json(hotels);
  } catch (error) {
    logger.error('Error getting hotels:', error);
    res.status(500).json({ error: error.message });
  }
};

const fetchHotelSiteController = async (req, res) => {
  let numericId;
  try {
    numericId = validateNumericParam(req.params.id, 'Hotel ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const hotel = await hotelModel.getHotelSiteController(req.requestId, numericId);
    res.json(hotel);
  } catch (error) {
    logger.error('Error getting hotels:', error);
    res.status(500).json({ error: error.message });
  }
};

const editHotel = async (req, res) => {
  let numericId;
  try {
    numericId = validateNumericParam(req.params.id, 'Hotel ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const { formal_name, name, postal_code, address, email, phone_number, latitude, longitude, bank_name, bank_branch_name, bank_account_type, bank_account_number, bank_account_name, google_drive_url, sort_order } = req.body;
  const updated_by = req.user.id;

  let validatedFormalName, validatedName, validatedAddress, validatedEmail, validatedPhoneNumber, validatedSortOrder;
  try {
    // numericId for req.params.id is already validated at the start of the function
    validatedFormalName = validateNonEmptyStringParam(formal_name, 'Formal Name');
    validatedName = validateNonEmptyStringParam(name, 'Name');
    validatedAddress = validateNonEmptyStringParam(address, 'Address');
    validatedEmail = validateNonEmptyStringParam(email, 'Email');
    validatedPhoneNumber = validateNonEmptyStringParam(phone_number, 'Phone Number');
    validatedSortOrder = validateIntegerParam(String(sort_order), 'Sort Order');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const updatedHotel = await hotelModel.updateHotel(req.requestId, numericId, validatedFormalName, validatedName, postal_code, validatedAddress, validatedEmail, validatedPhoneNumber, latitude, longitude, bank_name, bank_branch_name, bank_account_type, bank_account_number, bank_account_name, google_drive_url, validatedSortOrder, updated_by);
    if (!updatedHotel) {
      return res.status(404).json({ message: 'Hotel not found' });
    }
    res.status(200).json(updatedHotel);
  } catch (error) {
    logger.error('Error updating hotel:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const editHotelSiteController = async (req, res) => {
  let numericId;
  try {
    numericId = validateNumericParam(req.params.id, 'Hotel ID');
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
    logger.error('Error updating hotel:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createHotel,
  getAllHotels,
  fetchHotelSiteController,
  editHotel,
  editHotelSiteController
};