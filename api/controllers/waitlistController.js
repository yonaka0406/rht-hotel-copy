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
                // Verify room type exists for the given hotel
                // Note: getRoomTypeById might need adjustment if it doesn't take hotel_id or if room_type_id isn't globally unique
                // Assuming getRoomTypeById can check for a specific room_type_id within a hotel_id context or that room_type_id is unique
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
            // Only require and validate the relevant contact field
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

            // --- Entity Existence Checks ---
            // Check client exists (if client_id is provided, assuming client creation is handled separately or not in scope for this specific task)
            const clientObj = await selectClient(requestId, validatedClientId);
            const client = clientObj && clientObj.client;
            if (!client) {
                return res.status(404).json({ error: `Client with ID ${validatedClientId} not found.` });
            }

            // Verify hotel exists
            const hotel = await getHotelByID(requestId, validatedHotelId);
            if (!hotel) {
                return res.status(404).json({ error: `Hotel with ID ${validatedHotelId} not found.` });
            }

            const entryData = {
                client_id: validatedClientId,
                hotel_id: validatedHotelId,
                room_type_id: validatedRoomTypeId, // can be null
                requested_check_in_date: validatedCheckIn,
                requested_check_out_date: validatedCheckOut,
                number_of_guests: validatedNumGuests,
                number_of_rooms: number_of_rooms, // pass through
                contact_email: validatedContactEmail, // will be null if not required
                contact_phone: validatedContactPhone, // will be null if not required
                notes: notes ? String(notes).trim() : null,
                communication_preference: communication_preference,
                preferred_smoking_status: preferred_smoking_status || 'any' // Pass to model, model also defaults
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

            // Optional: Check if entry is in a state suitable for notification (e.g., 'waiting')
            if (entry.status !== 'waiting') {
                // Or, allow resending even if 'notified', TBD by exact requirements
                // return res.status(400).json({ error: `Waitlist entry is not in 'waiting' status (current: ${entry.status}).` });
            }

            // --- Token Generation ---
            const crypto = require('crypto');
            const confirmationToken = crypto.randomBytes(32).toString('hex');
            const tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // E.g., 48 hours expiry

            // --- Email Preparation ---
            // Requires fetching client details and hotel details if not already on `entry`
            // For now, assume entry.contact_email, client.name, hotel.name, room_type.name are available
            // or can be fetched. This part needs to align with actual data fetching capabilities.

            // Fetch client details (simplified, real implementation might need a join or separate query in model)
            const clientResult = await selectClient(requestId, entry.client_id); // Assuming selectClient returns { client: {...} }
            const client = clientResult ? clientResult.client : null;
            if (!client) {
                 return res.status(404).json({ error: `Client with ID ${entry.client_id} not found for waitlist entry.` });
            }
            const clientName = client.name_first + " " + client.name_last; // Adjust based on actual client model fields


            // Fetch hotel details (simplified)
            const hotel = await getHotelByID(requestId, entry.hotel_id);
            if (!hotel) {
                return res.status(404).json({ error: `Hotel with ID ${entry.hotel_id} not found.` });
            }
            const hotelName = hotel.name;

            // Fetch room type details (simplified)
            let roomTypeName = "指定なし"; // Default if no room type
            if (entry.room_type_id) {
                const roomType = await getRoomTypeById(requestId, entry.room_type_id, entry.hotel_id);
                if (roomType) {
                    roomTypeName = roomType.name; // Adjust if field name is different
                } else {
                    console.warn(`[${requestId}] Room type ID ${entry.room_type_id} not found for hotel ${entry.hotel_id} during manual notification.`);
                }
            }


            const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'; // Fallback for local dev
            const confirmationLink = `${FRONTEND_URL}/waitlist/confirm/${confirmationToken}`;

            // --- Email Sending ---
            // TODO: Replace placeholder with actual email sending logic.
            // This involves:
            // 1. Importing an email utility (e.g., from 'emailUtils.js' or 'notificationService.js').
            // 2. Using the 'waitlistAvailable' template (defined in WAITLIST_STRATEGY.md).
            // 3. Populating templateData with clientName, hotelName, roomTypeName, dates, confirmationLink, expiryDate.
            // 4. Handling success/failure of the email sending process.
            // Example call structure (actual implementation will vary):
            // const emailService = require('../services/emailService'); // Or similar
            // const emailSent = await emailService.sendTemplatedEmail(
            // entry.contact_email,
            // 'waitlistAvailable', // Template identifier
            //     { /* templateData as above */ }
            // );

            console.log(`[${requestId}] ---- START EMAIL SIMULATION ----`);
            console.log(`[${requestId}] To: ${entry.contact_email}`);
            console.log(`[${requestId}] Subject: ご希望のお部屋に空きが出ました！`);
            console.log(`[${requestId}] Body Data: clientName=${clientName}, hotelName=${hotelName}, roomTypeName=${roomTypeName}, checkIn=${entry.requested_check_in_date}, checkOut=${entry.requested_check_out_date}, guests=${entry.number_of_guests}, expiryDate=${tokenExpiresAt.toLocaleDateString('ja-JP')}, confirmationLink=${confirmationLink}`);
            console.log(`[${requestId}] ---- END EMAIL SIMULATION ----`);
            const emailSent = true; // Placeholder: Assume email sending is successful.

            if (!emailSent) {
                // If actual email sending fails, decide on error handling.
                // Potentially: don't update status, or use a specific 'notification_failed' status.
                // return res.status(500).json({ error: 'Failed to send notification email.' });
            }

            // --- Update Waitlist Entry Status ---
            const updatedEntry = await WaitlistEntry.updateStatus(requestId, entryId, 'notified', {
                confirmation_token: confirmationToken,
                token_expires_at: tokenExpiresAt.toISOString(),
            }, userId);

            if (!updatedEntry) {
                // This could happen if the entry was deleted just before update or ID was somehow wrong
                return res.status(404).json({ error: 'Failed to update waitlist entry after sending email, entry not found or update failed.' });
            }

            // TODO: Log this manual notification action in an audit log if required

            return res.status(200).json(updatedEntry);

        } catch (error) {
            console.error(`[${requestId}] Error in sendManualNotificationEmail for entry ${entryId}:`, error);
            if (error.message.includes('not found') || error.message.includes('Invalid status')) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Failed to process manual notification.' });
        }
    }
};

module.exports = waitlistController;
