const { getPool } = require('../../config/database');
const format = require('pg-format');

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
 * @param {object} [dbClient=null] - Optional. A database client to use for the query.
 * @returns {Promise<object>} The created waitlist entry.
 * @throws {Error} If database operation fails or required fields are missing.
 */
const createEntry = async (requestId, data, userId, dbClient = null) => {
    const isTransactionOwner = !dbClient;
    const client = dbClient || await getPool(requestId).connect();

    try {
        if (isTransactionOwner) {
            await client.query('BEGIN');
        }

        // Validate required fields
        const requiredFields = [
            'client_id', 'hotel_id',
            'requested_check_in_date', 'requested_check_out_date',
            'number_of_guests', 'number_of_rooms', 'communication_preference'
        ];
        for (const field of requiredFields) {
            if (data[field] === undefined || data[field] === null || data[field] === '') {
                throw new Error(`Missing required field: ${field}`);
            }
        }
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
            data.preferred_smoking_status || 'any',
            userId, userId
        );

        const result = await client.query(query);
        if (result.rows.length > 0) {
            if (isTransactionOwner) {
                await client.query('COMMIT');
            }
            return result.rows[0];
        } else {
            throw new Error('Failed to create waitlist entry, no rows returned.');
        }
    } catch (err) {
        if (isTransactionOwner) {
            await client.query('ROLLBACK');
        }
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
    } finally {
        if (isTransactionOwner) {
            client.release();
        }
    }
};

/**
 * Updates the status of a waitlist entry and related fields.
 * @param {string} requestId - The ID of the request for logging.
 * @param {string} id - The UUID of the waitlist entry to update.
 * @param {string} status - The new status.
 * @param {object} [additionalData={}] - Optional additional data to update.
 * @param {string} [additionalData.confirmation_token] - Confirmation token.
 * @param {string} [additionalData.token_expires_at] - Token expiry timestamp.
 * @param {string} [additionalData.notes] - Notes to append or update.
 * @param {number} userId - ID of the user performing the update.
 * @param {object} [dbClient=null] - Optional. A database client to use for the query.
 * @returns {Promise<object|null>} The updated waitlist entry or null if not found/updated.
 */
const updateEntryStatus = async (requestId, id, status, additionalData = {}, userId, dbClient = null) => {
    const isTransactionOwner = !dbClient;
    const client = dbClient || await getPool(requestId).connect();

    try {
        if (isTransactionOwner) {
            await client.query('BEGIN');
        }

        const { confirmation_token, token_expires_at, notes } = additionalData;

        const validStatuses = ['waiting', 'notified', 'confirmed', 'expired', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status value: ${status}`);
        }

        let querySetters = ['status = $1', 'updated_by = $2', 'updated_at = CURRENT_TIMESTAMP'];
        let queryValues = [status, userId];
        let valueCounter = 3;

        let finalConfirmationToken = null;
        let finalTokenExpiresAt = null;

        if (status === 'notified' && confirmation_token !== undefined) { // If status is notified AND a token is explicitly provided
            if (!confirmation_token || !token_expires_at) {
                throw new Error('Confirmation token and expiry are required when status is "notified" and a token is intended.');
            }
            finalConfirmationToken = confirmation_token;
            finalTokenExpiresAt = token_expires_at;
        }
        // If status is not 'notified', or if it is 'notified' but no token is provided,
        // then finalConfirmationToken and finalTokenExpiresAt remain null.

        // Always push these two setters, ensuring they are explicitly set.
        querySetters.push(`confirmation_token = $${valueCounter++}`);
        queryValues.push(finalConfirmationToken);
        querySetters.push(`token_expires_at = $${valueCounter++}`);
        queryValues.push(finalTokenExpiresAt);

        // Handle notes update
        if (notes) {
            querySetters.push(`notes = CASE WHEN notes IS NULL OR notes = '' THEN $${valueCounter} ELSE notes || ' ' || $${valueCounter} END`);
            queryValues.push(notes);
            valueCounter++;
        }

        const query = format(`
            UPDATE waitlist_entries
            SET ${querySetters.join(', ')}
            WHERE id = $${valueCounter}
            RETURNING *;
        `);
        queryValues.push(id);

        const result = await client.query(query, queryValues);
        if (result.rows.length > 0) {
            if (isTransactionOwner) {
                await client.query('COMMIT');
            }
            return result.rows[0];
        } else {
            return null;
        }
    } catch (err) {
        if (isTransactionOwner) {
            await client.query('ROLLBACK');
        }
        if (err.constraint) {
             throw new Error(`Database constraint violation: ${err.constraint} while updating status.`);
        }
        throw err; // Re-throw the original error for better debugging
    } finally {
        if (isTransactionOwner) {
            client.release();
        }
    }
};

/**
 * Cancels a waitlist entry by updating its status to 'cancelled'.
 * @param {string} requestId - The ID of the request for logging.
 * @param {string} id - The UUID of the waitlist entry to cancel.
 * @param {number} userId - ID of the user performing the cancellation.
 * @param {string} [cancelReason] - Optional reason for cancellation to append to notes.
 * @param {object} [dbClient=null] - Optional. A database client to use for the query.
 * @returns {Promise<object|null>} The cancelled waitlist entry or null if not found/updated.
 */
const cancelEntry = async (requestId, id, userId, cancelReason = '', dbClient = null) => {
    const additionalData = {};
    if (cancelReason && cancelReason.trim()) {
        additionalData.notes = `[キャンセル理由: ${cancelReason.trim()}]`;
    }
    // Pass dbClient to updateStatus
    return updateEntryStatus(requestId, id, 'cancelled', additionalData, userId, dbClient);
};

module.exports = {
    createEntry,
    updateEntryStatus,
    cancelEntry,
};
