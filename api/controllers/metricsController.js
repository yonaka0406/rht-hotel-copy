// api/controllers/metricsController.js

// Assume dbPool is your configured pg.Pool instance (e.g., from 'pg' library)
const dbPool = require('../config/database'); // Adjust path if necessary
// Assume redisClient is your configured Redis client instance (e.g., from 'ioredis' or 'node-redis')
const redisClient = require('../config/redis'); // Adjust path if necessary

const RESERVATIONS_TODAY_CACHE_TTL_SECONDS = 15 * 60; // 15 minutes
const AVG_LEAD_TIME_CACHE_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * @description Get Reservations Made Today metric for a specific hotel and date.
 * @route GET /hotels/:hotelId/metrics/reservations-today
 * @access Public (or protected, depending on overall auth strategy)
 */
const getReservationsToday = async (req, res, next) => {
    const { hotelId } = req.params;
    const { date } = req.query;

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
    // --- End Input Validation ---

    const cacheKey = `metrics:hotel:${parsedHotelId}:reservations-today:${date}`;

    try {
        if (redisClient) {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                return res.status(200).json(JSON.parse(cachedData));
            }
        }

        const { rows } = await dbPool.query(
            'SELECT * FROM get_reservations_made_on_date($1, $2)',
            [date, parsedHotelId]
        );

        let resultData;
        if (rows.length > 0) {
            resultData = {
                hotelId: parsedHotelId,
                date: date,
                reservationsCount: parseInt(rows[0].total_reservations_count, 10),
                reservationsValue: parseFloat(rows[0].total_reservations_value)
            };
        } else {
            resultData = {
                hotelId: parsedHotelId,
                date: date,
                reservationsCount: 0,
                reservationsValue: 0
            };
        }

        if (redisClient) {
            await redisClient.setex(cacheKey, RESERVATIONS_TODAY_CACHE_TTL_SECONDS, JSON.stringify(resultData));
        }

        return res.status(200).json(resultData);

    } catch (error) {
        console.error(`Error fetching reservations-today metric for hotel ${parsedHotelId}, date ${date}:`, error);
        next(error);
    }
};


/**
 * @description Get Average Lead Time for New Bookings metric for a specific hotel.
 * @route GET /hotels/:hotelId/metrics/average-lead-time
 * @access Public (or protected)
 */
const getAverageLeadTime = async (req, res, next) => {
    const { hotelId } = req.params;
    let { lookback_days } = req.query;

    // --- Input Validation ---
    const parsedHotelId = parseInt(hotelId, 10);
    if (isNaN(parsedHotelId) || parsedHotelId <= 0) {
        return res.status(400).json({ message: 'Invalid hotelId parameter.' });
    }

    let parsedLookbackDays = parseInt(lookback_days, 10);
    if (lookback_days === undefined) { // Default if not provided
        parsedLookbackDays = 30;
    } else if (isNaN(parsedLookbackDays) || parsedLookbackDays <= 0) {
        return res.status(400).json({ message: 'Invalid lookback_days parameter. Must be a positive integer.'});
    }
    // --- End Input Validation ---

    const cacheKey = `metrics:hotel:${parsedHotelId}:avg-lead-time:${parsedLookbackDays}`;

    try {
        if (redisClient) {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                return res.status(200).json(JSON.parse(cachedData));
            }
        }

        // Call the PostgreSQL function
        // SELECT get_average_lead_time_for_new_bookings(p_hotel_id INT, p_lookback_days INT) AS average_lead_time;
        const { rows } = await dbPool.query(
            'SELECT get_average_lead_time_for_new_bookings($1, $2) AS average_lead_time;',
            [parsedHotelId, parsedLookbackDays]
        );

        let avgLeadTime = 0.00;
        if (rows.length > 0 && rows[0].average_lead_time !== null) {
            avgLeadTime = parseFloat(rows[0].average_lead_time);
        }

        const resultData = {
            hotelId: parsedHotelId,
            lookbackDays: parsedLookbackDays,
            averageLeadTimeDays: avgLeadTime
        };

        if (redisClient) {
            await redisClient.setex(cacheKey, AVG_LEAD_TIME_CACHE_TTL_SECONDS, JSON.stringify(resultData));
        }

        return res.status(200).json(resultData);

    } catch (error) {
        console.error(`Error fetching average-lead-time metric for hotel ${parsedHotelId}, lookback ${parsedLookbackDays} days:`, error);
        next(error);
    }
};


module.exports = {
    getReservationsToday,
    getAverageLeadTime, // Export the new function
};
