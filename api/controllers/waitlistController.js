const { WaitlistEntry } = require('../models/waitlist');
const {
    validateNumericParam,
    validateDateStringParam,
    validateIntegerParam,
    validateNonEmptyStringParam
} = require('../utils/validationUtils');
const { getClientById } = require('../models/clients'); // To check if client exists
const { getHotelById } = require('../models/hotel'); // To check if hotel exists
const { getRoomTypeById } = require('../models/hotel'); // To check if room type exists

const waitlistController = {
    /**
     * POST /api/waitlist - Create new waitlist entry
     */
    async create(req, res) {
        const { requestId } = req;
        const userId = req.user.id; // Assuming authMiddleware populates req.user

        try {
            // Validate request body
            const {
                client_id, hotel_id, room_type_id,
                requested_check_in_date, requested_check_out_date,
                number_of_guests, contact_email, contact_phone,
                notes, communication_preference
            } = req.body;

            // --- Basic Input Validation ---
            const validatedClientId = validateNumericParam(client_id, 'Client ID');
            const validatedHotelId = validateNumericParam(hotel_id, 'Hotel ID');
            const validatedRoomTypeId = validateNumericParam(room_type_id, 'Room Type ID');
            const validatedCheckIn = validateDateStringParam(requested_check_in_date, 'Requested Check-in Date');
            const validatedCheckOut = validateDateStringParam(requested_check_out_date, 'Requested Check-out Date');
            const validatedNumGuests = validateIntegerParam(number_of_guests, 'Number of Guests');
            const validatedContactEmail = validateNonEmptyStringParam(contact_email, 'Contact Email');

            if (!['email', 'phone'].includes(communication_preference)) {
                return res.status(400).json({ error: 'Invalid communication preference. Must be "email" or "phone".' });
            }
            if (communication_preference === 'phone' && (!contact_phone || String(contact_phone).trim() === '')) {
                return res.status(400).json({ error: 'Contact phone is required if communication preference is phone.' });
            }
            if (validatedNumGuests <= 0) {
                return res.status(400).json({ error: 'Number of guests must be a positive integer.' });
            }
            if (new Date(validatedCheckOut) <= new Date(validatedCheckIn)) {
                return res.status(400).json({ error: 'Requested check-out date must be after check-in date.' });
            }

            // --- Entity Existence Checks ---
            // Check client exists (if client_id is provided, assuming client creation is handled separately or not in scope for this specific task)
            const client = await getClientById(requestId, validatedClientId);
            if (!client) {
                return res.status(404).json({ error: `Client with ID ${validatedClientId} not found.` });
            }

            // Verify hotel exists
            const hotel = await getHotelById(requestId, validatedHotelId);
            if (!hotel) {
                return res.status(404).json({ error: `Hotel with ID ${validatedHotelId} not found.` });
            }

            // Verify room type exists for the given hotel
            // Note: getRoomTypeById might need adjustment if it doesn't take hotel_id or if room_type_id isn't globally unique
            // Assuming getRoomTypeById can check for a specific room_type_id within a hotel_id context or that room_type_id is unique
            const roomType = await getRoomTypeById(requestId, validatedRoomTypeId, validatedHotelId);
            if (!roomType) {
                return res.status(404).json({ error: `Room type with ID ${validatedRoomTypeId} not found for hotel ${validatedHotelId}.` });
            }

            const entryData = {
                client_id: validatedClientId,
                hotel_id: validatedHotelId,
                room_type_id: validatedRoomTypeId,
                requested_check_in_date: validatedCheckIn,
                requested_check_out_date: validatedCheckOut,
                number_of_guests: validatedNumGuests,
                contact_email: validatedContactEmail,
                contact_phone: contact_phone ? String(contact_phone).trim() : null,
                notes: notes ? String(notes).trim() : null,
                communication_preference: communication_preference
            };

            const newWaitlistEntry = await WaitlistEntry.create(requestId, entryData, userId);

            return res.status(201).json(newWaitlistEntry);

        } catch (error) {
            console.error(`[${requestId}] Error in waitlistController.create:`, error);
            if (error.message.startsWith('Missing required field:') ||
                error.message.startsWith('Invalid') || // Catches validation util errors
                error.message.includes('must be after check-in date') ||
                error.message.includes('must be a positive integer')) {
                return res.status(400).json({ error: error.message });
            }
            // Handle errors from WaitlistEntry.create model (like DB constraint errors)
            if (error.message.includes('Invalid client_id') ||
                error.message.includes('Invalid hotel_id') ||
                error.message.includes('Invalid room_type_id')) {
                return res.status(404).json({ error: error.message });
            }
            if (error.message.startsWith('Database constraint violation')) {
                return res.status(409).json({ error: error.message }); // Conflict
            }
            return res.status(500).json({ error: 'Failed to create waitlist entry.' });
        }
    }

    // Future controller actions as per WAITLIST_STRATEGY.md:
    // async getByHotel(req, res) { /* ... */ }
    // async updateStatus(req, res) { /* ... */ }
    // async delete(req, res) { /* ... */ } // Soft delete by status 'cancelled'
    // async confirmReservation(req, res) { /* ... */ }
    // async handleCancellation(requestId, cancellationData) { /* ... */ }
};

module.exports = waitlistController;
