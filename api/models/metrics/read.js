const { getPool } = require('../../config/database');

const selectReservationsToday = async (requestId, hotelId, date) => {
    // --- Input Validation ---
    const parsedHotelId = parseInt(hotelId, 10);
    if (isNaN(parsedHotelId) || parsedHotelId <= 0) {
        return res.status(400).json({ message: 'Invalid hotelId parameter.' });
    }
    if (!date) {
        return res.status(400).json({ message: 'Missing required query parameter: date (YYYY-MM-DD).' });
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD.' });
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0,10) !== date) {
        return res.status(400).json({ message: 'Invalid date value.' });
    }

    const pool = getPool(requestId);

    try{
        const query = `
            SELECT * FROM get_reservations_made_on_date($1, $2);
        `;
        const values = [date, hotelId];
        const result = await pool.query(query, values);   
        let resultData;
        if (result.rows.length > 0) {
            resultData = {
                hotelId: parsedHotelId,
                date: date,
                reservationsCount: parseInt(result.rows[0].total_reservations_count, 10),
                reservationsValue: parseFloat(result.rows[0].total_reservations_value)
            };
        } else {
            resultData = {
                hotelId: parsedHotelId,
                date: date,
                reservationsCount: 0,
                reservationsValue: 0
            };
        }

        return resultData;
    } catch (error)  {
        console.error(`Error fetching reservations-today metric for hotel ${hotelId}, date ${date}:`, error);        
    } finally {

    }
};

const selectBookingAverageLeadTime = async (requestId, hotelId, lookback, date) => {    
    // --- Input Validation ---
    const parsedHotelId = parseInt(hotelId, 10);
    if (isNaN(parsedHotelId) || parsedHotelId <= 0) {
        return { message: 'Invalid hotelId parameter.' };
    }
    let parsedLookbackDays = parseInt(lookback, 10);
    if (lookback === undefined) { // Default if not provided
        parsedLookbackDays = 30;
    } else if (isNaN(parsedLookbackDays) || parsedLookbackDays < 0) {
        return { message: 'Invalid lookback parameter. Must be a positive integer.'};
    }
    if (!date) {
        return { message: 'Missing required query parameter: date (YYYY-MM-DD).' };
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        return { message: 'Invalid date format. Please use YYYY-MM-DD.' };
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0,10) !== date) {
        return { message: 'Invalid date value.' };
    }

    const pool = getPool(requestId);

    try{
        const query = `
            SELECT * FROM get_booking_based_lead_time($1, $2, $3);
        `;
        const values = [parsedHotelId, parsedLookbackDays, date];
        const result = await pool.query(query, values);
        
        let resultData = null;    
        if (result.rows.length > 0) {
            resultData = {
                hotelId: parsedHotelId,
                lookbackDays: parsedLookbackDays,
                average_lead_time: parseFloat(result.rows[0].average_lead_time),
                total_nights: parseFloat(result.rows[0].total_nights),
            };
        } else {
            resultData = {
                hotelId: parsedHotelId,
                lookbackDays: parsedLookbackDays,
                average_lead_time: 0,
                total_nights: 0
            };
        }        

        return resultData;
    } catch (error)  {
        console.error(`Error for hotel ${parsedHotelId}, lookback ${parsedLookbackDays} days:`, error);     
    } finally {

    }
};
const selectArrivalAverageLeadTime = async (requestId, hotelId, lookback, date) => {
    // --- Input Validation ---
    const parsedHotelId = parseInt(hotelId, 10);
    if (isNaN(parsedHotelId) || parsedHotelId <= 0) {
        return { message: 'Invalid hotelId parameter.' };
    }
    let parsedLookbackDays = parseInt(lookback, 10);
    if (lookback === undefined) { // Default if not provided
        parsedLookbackDays = 30;
    } else if (isNaN(parsedLookbackDays) || parsedLookbackDays < 0) {
        return { message: 'Invalid lookback parameter. Must be a positive integer.'};
    }
    if (!date) {
        return { message: 'Missing required query parameter: date (YYYY-MM-DD).' };
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        return { message: 'Invalid date format. Please use YYYY-MM-DD.' };
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0,10) !== date) {
        return { message: 'Invalid date value.' };
    }

    const pool = getPool(requestId);

    try{
        const query = `
            SELECT * FROM get_checkin_based_lead_time($1, $2, $3);
        `;
        const values = [parsedHotelId, parsedLookbackDays, date];
        const result = await pool.query(query, values);
        
        let resultData = null;    
        if (result.rows.length > 0) {
            resultData = {
                hotelId: parsedHotelId,
                lookbackDays: parsedLookbackDays,
                average_lead_time: parseFloat(result.rows[0].average_lead_time),
                total_nights: parseFloat(result.rows[0].total_nights),
            };
        } else {
            resultData = {
                hotelId: parsedHotelId,
                lookbackDays: parsedLookbackDays,
                average_lead_time: 0,
                total_nights: 0
            };
        }

        return resultData;
    } catch (error)  {
        console.error(`Error for hotel ${parsedHotelId}, lookback ${parsedLookbackDays} days:`, error);     
    } finally {

    }
};

const selectWaitlistEntriesToday = async (requestId, hotelId, date) => {
    // --- Input Validation ---
    const parsedHotelId = parseInt(hotelId, 10);
    if (isNaN(parsedHotelId) || parsedHotelId <= 0) {
        return { message: 'Invalid hotelId parameter.' };
    }
    if (!date) {
        return { message: 'Missing required query parameter: date (YYYY-MM-DD).' };
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        return { message: 'Invalid date format. Please use YYYY-MM-DD.' };
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0,10) !== date) {
        return { message: 'Invalid date value.' };
    }

    const pool = getPool(requestId);

    try{
        const query = `
            SELECT COUNT(*) as waitlist_count
            FROM waitlist_entries 
            WHERE hotel_id = $1 
            AND status = 'waiting' 
            AND requested_check_in_date >= $2;
        `;
        const values = [parsedHotelId, date];
        const result = await pool.query(query, values);   
        
        let resultData;
        if (result.rows.length > 0) {
            resultData = {
                hotelId: parsedHotelId,
                date: date,
                waitlistCount: parseInt(result.rows[0].waitlist_count, 10)
            };
        } else {
            resultData = {
                hotelId: parsedHotelId,
                date: date,
                waitlistCount: 0
            };
        }

        return resultData;
    } catch (error)  {
        console.error(`Error fetching waitlist entries metric for hotel ${hotelId}, date ${date}:`, error);        
        return { message: 'Database error occurred while fetching waitlist entries.' };
    }
};

const getBookingSourceBreakdown = async (requestId, hotelId, startDate, endDate) => {
    const pool = getPool(requestId);
    try {
        const query = `
            SELECT
                r.type,
                r.agent,
                COUNT(rd.id) as room_nights
            FROM reservation_details rd
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            WHERE r.hotel_id = $1
              AND r.status NOT IN('hold','block')
              AND r.type <> 'employee'
              AND rd.date BETWEEN $2 AND $3
              AND rd.cancelled IS NULL
            GROUP BY r.type, r.agent;
        `;
        const values = [hotelId, startDate, endDate];
        const result = await pool.query(query, values);

        return result.rows.map(row => ({
            type: row.type,
            agent: row.agent,
            room_nights: parseInt(row.room_nights, 10),
        }));
    } catch (error) {
        console.error(`Error fetching booking source breakdown for hotel ${hotelId}:`, error);
        throw error;
    }
};

const getPaymentTimingBreakdown = async (requestId, hotelId, startDate, endDate) => {
    const pool = getPool(requestId);
    try {
        const query = `
            SELECT
                r.payment_timing,
                COUNT(rd.id) AS reservation_count
            FROM reservation_details rd
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            WHERE r.hotel_id = $1
            AND r.status NOT IN('hold','block')
            AND r.type <> 'employee'
            AND rd.date BETWEEN $2 AND $3
            AND rd.cancelled IS NULL
            GROUP BY r.payment_timing;
        `;
        const values = [hotelId, startDate, endDate];
        const result = await pool.query(query, values);

        return result.rows.map(row => ({
            paymentTiming: row.payment_timing,
            count: parseInt(row.reservation_count, 10),
        }));
    } catch (error) {
        console.error(`Error fetching payment timing breakdown for hotel ${hotelId}:`, error);
        throw error;
    }
};

const getBookerTypeBreakdown = async (requestId, hotelId, startDate, endDate) => {
    const pool = getPool(requestId);
    try {
        const query = `
            SELECT
                c.legal_or_natural_person,
                COUNT(rd.id) as room_nights
            FROM reservation_details rd
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            JOIN clients c ON r.reservation_client_id = c.id
            WHERE r.hotel_id = $1
              AND r.status NOT IN('hold','block')
              AND r.type <> 'employee'
              AND rd.date BETWEEN $2 AND $3
              AND rd.cancelled IS NULL
            GROUP BY c.legal_or_natural_person;
        `;
        const values = [hotelId, startDate, endDate];
        const result = await pool.query(query, values);

        return result.rows.map(row => ({
            legal_or_natural_person: row.legal_or_natural_person,
            room_nights: parseInt(row.room_nights, 10),
        }));
    } catch (error) {
        console.error(`Error fetching booker type breakdown for hotel ${hotelId}:`, error);
        throw error;
    }
};

module.exports = {
    selectReservationsToday,
    selectBookingAverageLeadTime,
    selectArrivalAverageLeadTime,
    selectWaitlistEntriesToday,
    getBookingSourceBreakdown,
    getPaymentTimingBreakdown,
    getBookerTypeBreakdown,
};