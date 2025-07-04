const { WaitlistEntry } = require('../models/waitlist');
const {
    validateNumericParam,
    validateDateStringParam,
    validateIntegerParam,
    validateNonEmptyStringParam
} = require('../utils/validationUtils');
const { selectClient } = require('../models/clients'); // To check if client exists
const { getHotelByID } = require('../models/hotel'); // To check if hotel exists
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
                number_of_guests, number_of_rooms, contact_email, contact_phone,
                notes, communication_preference, preferred_smoking_status // Added preferred_smoking_status
            } = req.body;

            // --- Basic Input Validation ---
            const validatedClientId = validateNonEmptyStringParam(client_id, 'Client ID');
            const validatedHotelId = validateNumericParam(hotel_id, 'Hotel ID');
            let validatedRoomTypeId = null;
            if (room_type_id !== undefined && room_type_id !== null && room_type_id !== '') {
                validatedRoomTypeId = validateNumericParam(room_type_id, 'Room Type ID');
                const roomType = await getRoomTypeById(requestId, validatedRoomTypeId, validatedHotelId);
                if (!roomType) {
                    return res.status(404).json({ error: `Room type with ID ${validatedRoomTypeId} not found for hotel ${validatedHotelId}.` });
                }
            }
            const validatedCheckIn = validateDateStringParam(requested_check_in_date, 'Requested Check-in Date');
            const validatedCheckOut = validateDateStringParam(requested_check_out_date, 'Requested Check-out Date');
            const validatedNumGuests = validateIntegerParam(number_of_guests, 'Number of Guests');

            if (!['email', 'phone'].includes(communication_preference)) {
                return res.status(400).json({ error: 'Invalid communication preference. Must be "email" or "phone".' });
            }
            let validatedContactEmail = null;
            let validatedContactPhone = null;
            if (communication_preference === 'email') {
                validatedContactEmail = validateNonEmptyStringParam(contact_email, 'Contact Email');
            }
            if (communication_preference === 'phone') {
                if (!contact_phone || String(contact_phone).trim() === '') {
                    return res.status(400).json({ error: 'Contact phone is required if communication preference is phone.' });
                }
                validatedContactPhone = String(contact_phone).trim();
            }

            if (validatedNumGuests <= 0) {
                return res.status(400).json({ error: 'Number of guests must be a positive integer.' });
            }
            if (new Date(validatedCheckOut) <= new Date(validatedCheckIn)) {
                return res.status(400).json({ error: 'Requested check-out date must be after check-in date.' });
            }
            if (preferred_smoking_status && !['any', 'smoking', 'non_smoking'].includes(preferred_smoking_status)) {
                return res.status(400).json({ error: 'Invalid preferred smoking status. Must be "any", "smoking", or "non_smoking".' });
            }

            const clientObj = await selectClient(requestId, validatedClientId);
            const client = clientObj && clientObj.client;
            if (!client) {
                return res.status(404).json({ error: `Client with ID ${validatedClientId} not found.` });
            }

            const hotel = await getHotelByID(requestId, validatedHotelId);
            if (!hotel) {
                return res.status(404).json({ error: `Hotel with ID ${validatedHotelId} not found.` });
            }

            const entryData = {
                client_id: validatedClientId,
                hotel_id: validatedHotelId,
                room_type_id: validatedRoomTypeId,
                requested_check_in_date: validatedCheckIn,
                requested_check_out_date: validatedCheckOut,
                number_of_guests: validatedNumGuests,
                number_of_rooms: number_of_rooms,
                contact_email: validatedContactEmail,
                contact_phone: validatedContactPhone,
                notes: notes ? String(notes).trim() : null,
                communication_preference: communication_preference,
                preferred_smoking_status: preferred_smoking_status || 'any'
            };

            const newWaitlistEntry = await WaitlistEntry.create(requestId, entryData, userId);
            return res.status(201).json(newWaitlistEntry);

        } catch (error) {
            console.error(`[${requestId}] Error in waitlistController.create:`, error);
            if (error.message.startsWith('Missing required field:') ||
                error.message.startsWith('Invalid') ||
                error.message.includes('must be after check-in date') ||
                error.message.includes('must be a positive integer')) {
                return res.status(400).json({ error: error.message });
            }
            if (error.message.includes('Invalid client_id') ||
                error.message.includes('Invalid hotel_id') ||
                error.message.includes('Invalid room_type_id')) {
                return res.status(404).json({ error: error.message });
            }
            if (error.message.startsWith('Database constraint violation')) {
                return res.status(409).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Failed to create waitlist entry.' });
        }
    }, // Added comma here

    // Future controller actions as per WAITLIST_STRATEGY.md:
    /**
     * GET /api/waitlist/hotel/:hotelId - List entries
     * (Skeleton implementation)
     */
    async getByHotel(req, res) {
        const { requestId } = req;
        const { hotelId } = req.params;
        // Extract pagination and filter query params
        const { page = 1, size = 20, status, startDate, endDate, roomTypeId } = req.query;

        // Validate hotelId (basic)
        const validatedHotelId = validateNumericParam(hotelId, 'Hotel ID');
        if (validatedHotelId === null || isNaN(validatedHotelId)) { // validateNumericParam returns null on error
             return res.status(400).json({ error: 'Invalid Hotel ID parameter.' });
        }

        try {
            // Construct filters object
            const filters = {
                page: parseInt(page, 10),
                size: parseInt(size, 10),
                status,      // Pass through, model should validate/handle
                startDate,   // Pass through
                endDate,     // Pass through
                roomTypeId   // Pass through
            };

            // TODO: Add permission check: Validate user has access to this hotel's waitlist

            const result = await WaitlistEntry.getByHotel(requestId, validatedHotelId, filters);
            return res.status(200).json(result);

        } catch (error) {
            console.error(`[${requestId}] Error in waitlistController.getByHotel for hotel ${hotelId}:`, error);
            if (error.message.includes('Invalid Hotel ID')) { // Or other specific validation errors
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Failed to retrieve waitlist entries.' });
        }
    },
    /**
     * GET /api/waitlist/confirm/:token - Validate token and return reservation details
     */
    async getConfirmationDetails(req, res) {
        const { requestId } = req;
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ error: 'Confirmation token is required.' });
        }

        try {
            // Find waitlist entry by token
            const entry = await WaitlistEntry.findByToken(requestId, token, true);
            
            if (!entry) {
                return res.status(404).json({ error: 'Invalid or expired confirmation token.' });
            }

            // Check if entry is in 'notified' status
            if (entry.status !== 'notified') {
                return res.status(400).json({ error: 'Waitlist entry is not in a valid state for confirmation.' });
            }

            // Format the response data for the frontend
            const responseData = {
                hotelName: entry.hotelName,
                checkInDate: entry.requested_check_in_date,
                checkOutDate: entry.requested_check_out_date,
                numberOfGuests: entry.number_of_guests,
                numberOfRooms: entry.number_of_rooms,
                roomTypeName: entry.roomTypeName || null,
                clientName: entry.clientName,
                expiryDate: entry.token_expires_at,
                waitlistEntryId: entry.id
            };

            return res.status(200).json(responseData);

        } catch (error) {
            console.error(`[${requestId}] Error in getConfirmationDetails for token ${token}:`, error);
            return res.status(500).json({ error: 'Failed to retrieve confirmation details.' });
        }
    },

    // async updateStatus(req, res) { /* ... */ }
    // async delete(req, res) { /* ... */ } // Soft delete by status 'cancelled'
    // async confirmReservation(req, res) { /* ... */ }
    // async handleCancellation(requestId, cancellationData) { /* ... */ }

    /**
     * POST /api/waitlist/:id/manual-notify - Send manual offer email
     */
    async sendManualNotificationEmail(req, res) {
        const { requestId } = req;
        const { id: entryId } = req.params;
        const userId = req.user.id; // From authMiddleware

        if (!entryId) {
            return res.status(400).json({ error: 'Waitlist entry ID is required.' });
        }

        try {
            const entry = await WaitlistEntry.findById(requestId, entryId);
            if (!entry) {
                return res.status(404).json({ error: 'Waitlist entry not found.' });
            }

            if (entry.status !== 'waiting') {
                // Or, allow resending even if 'notified', TBD by exact requirements
                // return res.status(400).json({ error: `Waitlist entry is not in 'waiting' status (current: ${entry.status}).` });
            }

            const crypto = require('crypto');
            const confirmationToken = crypto.randomBytes(32).toString('hex');
            const tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // E.g., 48 hours expiry

            const clientResult = await selectClient(requestId, entry.client_id);
            const client = clientResult ? clientResult.client : null;
            if (!client) {
                 return res.status(404).json({ error: `Client with ID ${entry.client_id} not found for waitlist entry.` });
            }
            // Use the same name prioritization logic as in findByToken
            const clientName = client.name_kanji || client.name_kana || client.name || 'お客様';

            const hotel = await getHotelByID(requestId, entry.hotel_id);
            if (!hotel) {
                return res.status(404).json({ error: `Hotel with ID ${entry.hotel_id} not found.` });
            }
            const hotelName = hotel.name;

            let roomTypeName = "指定なし";
            if (entry.room_type_id) {
                const roomType = await getRoomTypeById(requestId, entry.room_type_id, entry.hotel_id);
                if (roomType) {
                    roomTypeName = roomType.name;
                } else {
                    console.warn(`[${requestId}] Room type ID ${entry.room_type_id} not found for hotel ${entry.hotel_id} during manual notification.`);
                }
            }

            const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
            const confirmationLink = `${FRONTEND_URL}/waitlist/confirm/${confirmationToken}`;

            // Format dates for email
            const formatDateForEmail = (dateString) => {
                const date = new Date(dateString);
                return date.toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            };

            const formattedCheckInDate = formatDateForEmail(entry.requested_check_in_date);
            const formattedCheckOutDate = formatDateForEmail(entry.requested_check_out_date);

            // --- Email Sending ---
            const { sendWaitlistNotificationEmail } = require('../utils/emailUtils');
            
            try {
                await sendWaitlistNotificationEmail(
                    entry.contact_email,
                    clientName,
                    hotelName,
                    formattedCheckInDate,
                    formattedCheckOutDate,
                    entry.number_of_guests,
                    entry.number_of_rooms,
                    confirmationLink,
                    tokenExpiresAt.toLocaleDateString('ja-JP')
                );
                console.log(`[${requestId}] Waitlist notification email sent successfully to ${entry.contact_email}`);
            } catch (emailError) {
                console.error(`[${requestId}] Error sending waitlist notification email:`, emailError);
                return res.status(500).json({ error: 'Failed to send notification email.' });
            }

            const updatedEntry = await WaitlistEntry.updateStatus(requestId, entryId, 'notified', {
                confirmation_token: confirmationToken,
                token_expires_at: tokenExpiresAt.toISOString(),
            }, userId);

            if (!updatedEntry) {
                return res.status(404).json({ error: 'Failed to update waitlist entry after sending email, entry not found or update failed.' });
            }

            return res.status(200).json(updatedEntry);

        } catch (error) {
            console.error(`[${requestId}] Error in sendManualNotificationEmail for entry ${entryId}:`, error);
            if (error.message.includes('not found') || error.message.includes('Invalid status')) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Failed to process manual notification.' });
        }
    },

    /**
     * PUT /api/waitlist/:id/cancel - Cancel a waitlist entry
     */
    async cancelEntry(req, res) {
        const { requestId } = req;
        const { id: entryId } = req.params;
        const { cancelReason } = req.body;
        const userId = req.user.id; // From authMiddleware

        if (!entryId) {
            return res.status(400).json({ error: 'Waitlist entry ID is required.' });
        }

        try {
            const entry = await WaitlistEntry.findById(requestId, entryId);
            if (!entry) {
                return res.status(404).json({ error: 'Waitlist entry not found.' });
            }

            if (entry.status === 'cancelled') {
                return res.status(400).json({ error: 'Waitlist entry is already cancelled.' });
            }

            const cancelledEntry = await WaitlistEntry.cancelEntry(requestId, entryId, userId, cancelReason);
            if (!cancelledEntry) {
                return res.status(404).json({ error: 'Failed to cancel waitlist entry, entry not found or update failed.' });
            }

            return res.status(200).json(cancelledEntry);

        } catch (error) {
            console.error(`[${requestId}] Error in cancelEntry for entry ${entryId}:`, error);
            if (error.message.includes('not found') || error.message.includes('Invalid status')) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Failed to cancel waitlist entry.' });
        }
    },

    async getByHotelPost(req, res) {
        const { requestId } = req;
        const { hotelId } = req.params;
        // Extract pagination and filter params from body
        const { page = 1, size = 20, filters = {} } = req.body;

        // Validate hotelId (basic)
        const validatedHotelId = validateNumericParam(hotelId, 'Hotel ID');
        if (validatedHotelId === null || isNaN(validatedHotelId)) {
            return res.status(400).json({ error: 'Invalid Hotel ID parameter.' });
        }

        try {
            // Compose filters object for model
            const modelFilters = { ...filters, page: parseInt(page, 10), size: parseInt(size, 10) };
            // TODO: Add permission check: Validate user has access to this hotel's waitlist
            const result = await WaitlistEntry.getByHotel(requestId, validatedHotelId, modelFilters);
            return res.status(200).json(result);
        } catch (error) {
            console.error(`[${requestId}] Error in waitlistController.getByHotelPost for hotel ${hotelId}:`, error);
            if (error.message.includes('Invalid Hotel ID')) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Failed to retrieve waitlist entries.' });
        }
    },

    /**
     * POST /api/waitlist/check-vacancy - Check if there is vacancy for a waitlist entry
     */
    async checkVacancy(req, res) {
        const { requestId } = req;
        try {
            const {
                hotel_id,
                room_type_id,
                check_in,
                check_out,
                number_of_rooms,
                number_of_guests,
                smoking_preference
            } = req.body;

            // Validate required fields (basic)
            if (!hotel_id || !check_in || !check_out || !number_of_rooms || !number_of_guests) {
                return res.status(400).json({ error: 'Missing required parameters.' });
            }

            // Prepare params for SQL function
            const pool = require('../config/database').getProdPool();
            const result = await pool.query(
                'SELECT is_waitlist_vacancy_available($1, $2, $3, $4, $5, $6, $7) AS available',
                [
                    hotel_id,
                    room_type_id || null,
                    check_in,
                    check_out,
                    number_of_rooms,
                    number_of_guests,
                    smoking_preference
                ]
            );
            return res.status(200).json({ available: result.rows[0].available });
        } catch (error) {
            console.error(`[${requestId}] Error in waitlistController.checkVacancy:`, error);
            return res.status(500).json({ error: 'Failed to check vacancy.' });
        }
    }
};

module.exports = waitlistController;
