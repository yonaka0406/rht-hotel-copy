const { getPool } = require('../config/database');
const format = require('pg-format');

const WaitlistEntry = {
    /**
     * Creates a new waitlist entry.
     * @param {string} requestId - The ID of the request for logging and context.
     * @param {object} data - The data for the new waitlist entry.
     * @param {number} data.client_id - ID of the client.
     * @param {number} data.hotel_id - ID of the hotel.
     * @param {number} data.room_type_id - ID of the room type.
     * @param {string} data.requested_check_in_date - Requested check-in date (YYYY-MM-DD).
     * @param {string} data.requested_check_out_date - Requested check-out date (YYYY-MM-DD).
     * @param {number} data.number_of_guests - Number of guests.
     * @param {number} data.number_of_rooms - Number of rooms.
     * @param {string} data.contact_email - Contact email of the client.
     * @param {string} [data.contact_phone] - Optional contact phone of the client.
     * @param {string} [data.notes] - Optional notes for the waitlist entry.
     * @param {string} data.communication_preference - Preferred method of communication ('email' or 'phone').
     * @param {number} userId - ID of the user creating the entry.
     * @returns {Promise<object>} The created waitlist entry.
     * @throws {Error} If database operation fails or required fields are missing.
     */
    async create(requestId, data, userId) {
        const pool = getPool(requestId);

        // Validate required fields
        const requiredFields = [
            'client_id', 'hotel_id',
            'requested_check_in_date', 'requested_check_out_date',
            'number_of_guests', 'number_of_rooms', 'communication_preference'
            // Do NOT include room_type_id here
        ];
        for (const field of requiredFields) {
            if (data[field] === undefined || data[field] === null || data[field] === '') {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        // Now check contact_email/contact_phone based on communication_preference
        if (data.communication_preference === 'email') {
            if (!data.contact_email || data.contact_email.trim() === '') {
                throw new Error('Missing required field: contact_email');
            }
        }
        if (data.communication_preference === 'phone') {
            if (!data.contact_phone || data.contact_phone.trim() === '') {
                throw new Error('Missing required field: contact_phone');
            }
        }

        if (data.number_of_guests <= 0) {
            throw new Error('Number of guests must be positive.');
        }
        if (data.number_of_rooms <= 0) {
            throw new Error('Number of rooms must be positive.');
        }
        if (new Date(data.requested_check_out_date) <= new Date(data.requested_check_in_date)) {
            throw new Error('Requested check-out date must be after check-in date.');
        }
        if (!['email', 'phone'].includes(data.communication_preference)) {
            throw new Error('Invalid communication preference. Must be "email" or "phone".');
        }
        if (data.communication_preference === 'phone' && (!data.contact_phone || String(data.contact_phone).trim() === '')) {
            throw new Error('Contact phone is required if communication preference is phone.');
        }
        if (data.preferred_smoking_status && !['any', 'smoking', 'non_smoking'].includes(data.preferred_smoking_status)) {
            throw new Error('Invalid preferred smoking status. Must be "any", "smoking", or "non_smoking".');
        }


        const query = format(`
            INSERT INTO waitlist_entries (
                client_id, hotel_id, room_type_id,
                requested_check_in_date, requested_check_out_date,
                number_of_guests, number_of_rooms, contact_email, contact_phone,
                notes, communication_preference, status,
                preferred_smoking_status,
                created_by, updated_by
            ) VALUES (
                %L, %L, %L,
                %L, %L,
                %L, %L, %L, %L,
                %L, %L, 'waiting',
                %L, /* preferred_smoking_status */
                %L, %L
            )
            RETURNING *;
        `,  data.client_id, data.hotel_id, data.room_type_id,
            data.requested_check_in_date, data.requested_check_out_date,
            data.number_of_guests, data.number_of_rooms, data.contact_email, data.contact_phone,
            data.notes, data.communication_preference,
            data.preferred_smoking_status || 'any', // Default to 'any' if not provided
            userId, userId
        );

        try {
            const result = await pool.query(query);
            if (result.rows.length > 0) {
                return result.rows[0];
            } else {
                throw new Error('Failed to create waitlist entry, no rows returned.');
            }
        } catch (err) {
            console.error(`[${requestId}] Error creating waitlist entry:`, err);
            // Check for specific constraint violations if possible, e.g., FK violations
            if (err.constraint) {
                 if (err.constraint === 'waitlist_entries_client_id_fkey') {
                    throw new Error('Invalid client_id provided.');
                } else if (err.constraint === 'waitlist_entries_hotel_id_fkey') {
                    throw new Error('Invalid hotel_id provided.');
                } else if (err.constraint === 'fk_waitlist_room_types') {
                    throw new Error('Invalid room_type_id or combination with hotel_id.');
                }
                 throw new Error(`Database constraint violation: ${err.constraint}`);
            }
            throw new Error('Database error occurred while creating waitlist entry.');
        }
    }

    // Future functions as per WAITLIST_STRATEGY.md:
    // async findMatching(requestId, criteria) { /* ... */ }
    // async getByHotel(requestId, hotelId, filters = {}) { /* ... */ }
    // async updateStatus(requestId, id, status, additionalData = {}) { /* ... */ }
    // async findByToken(requestId, token, validateExpiry = true) { /* ... */ }
    // async expireOldTokens(requestId, hotelId = null) { /* ... */ }
};

module.exports = {
    WaitlistEntry
};
