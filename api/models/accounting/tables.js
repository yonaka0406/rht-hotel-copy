const { getPool } = require('../../config/database');
const logger = require('../../config/logger');
const pgFormat = require('pg-format');

/**
 * Get Forecast table data (operational metrics)
 */
const getForecastTable = async (requestId, hotelId, startMonth, endMonth, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `
        SELECT * FROM du_forecast 
        WHERE hotel_id = $1 AND forecast_month BETWEEN $2 AND $3
        ORDER BY forecast_month ASC
    `;

    try {
        const result = await client.query(query, [hotelId, startMonth, endMonth]);
        logger.debug(`Forecast query for hotel ${hotelId} from ${startMonth} to ${endMonth} returned ${result.rows.length} rows`);
        return result.rows;
    } catch (err) {
        logger.error('Error fetching du_forecast data:', err);
        throw err;
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Get Accounting table data (operational metrics)
 */
const getAccountingTable = async (requestId, hotelId, startMonth, endMonth, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `
        SELECT * FROM du_accounting 
        WHERE hotel_id = $1 AND accounting_month BETWEEN $2 AND $3
        ORDER BY accounting_month ASC
    `;

    try {
        const result = await client.query(query, [hotelId, startMonth, endMonth]);
        return result.rows;
    } catch (err) {
        logger.error('Error fetching du_accounting data:', err);
        throw err;
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Upsert Forecast table data
 */
const upsertForecastTable = async (requestId, data, userId, dbClient = null) => {
    if (!data || data.length === 0) return [];

    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    try {
        // 1. Consistency Check & Propagation
        const groups = {};
        data.forEach(d => {
            const key = `${d.hotel_id}_${d.forecast_month}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(d);
        });

        for (const key in groups) {
            const groupData = groups[key];
            const first = groupData[0];
            const hotelId = first.hotel_id;
            const month = first.forecast_month;

            const globalRow = groupData.find(d => !d.plan_type_category_id && !d.plan_package_category_id);

            let opDays, availRooms;

            if (globalRow) {
                opDays = globalRow.operating_days;
                availRooms = globalRow.available_room_nights;

                await client.query(
                    `UPDATE du_forecast 
                     SET operating_days = $1, available_room_nights = $2
                     WHERE hotel_id = $3 AND forecast_month = $4`,
                    [opDays || 0, availRooms || 0, hotelId, month]
                );
            } else {
                const res = await client.query(
                    `SELECT operating_days, available_room_nights 
                     FROM du_forecast 
                     WHERE hotel_id = $1 AND forecast_month = $2 
                     AND plan_type_category_id IS NULL AND plan_package_category_id IS NULL
                     LIMIT 1`,
                    [hotelId, month]
                );
                
                if (res.rows.length > 0) {
                    opDays = res.rows[0].operating_days;
                    availRooms = res.rows[0].available_room_nights;
                }
            }

            if (opDays !== undefined || availRooms !== undefined) {
                groupData.forEach(d => {
                    if (opDays !== undefined) d.operating_days = opDays;
                    if (availRooms !== undefined) d.available_room_nights = availRooms;
                });
            }
        }

        const values = data.map(d => [
            d.hotel_id,
            d.forecast_month,
            d.plan_type_category_id || null,
            d.plan_package_category_id || null,
            d.accommodation_revenue || 0,
            d.non_accommodation_revenue || 0,
            d.operating_days || 0,
            d.available_room_nights || 0,
            d.rooms_sold_nights || 0,
            d.non_accommodation_sold_rooms || 0,
            userId
        ]);

        const query = pgFormat(
            `INSERT INTO du_forecast (
                hotel_id, forecast_month, plan_type_category_id, plan_package_category_id,
                accommodation_revenue, non_accommodation_revenue, operating_days,
                available_room_nights, rooms_sold_nights, non_accommodation_sold_rooms, created_by
            )
            VALUES %L
            ON CONFLICT (hotel_id, forecast_month, plan_type_category_id, plan_package_category_id) 
            DO UPDATE SET
                accommodation_revenue = EXCLUDED.accommodation_revenue,
                non_accommodation_revenue = EXCLUDED.non_accommodation_revenue,
                operating_days = EXCLUDED.operating_days,
                available_room_nights = EXCLUDED.available_room_nights,
                rooms_sold_nights = EXCLUDED.rooms_sold_nights,
                non_accommodation_sold_rooms = EXCLUDED.non_accommodation_sold_rooms,
                created_by = EXCLUDED.created_by
            RETURNING *`,
            values
        );

        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        logger.error('Error upserting du_forecast table:', err);
        throw err;
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Upsert Accounting table data
 */
const upsertAccountingTable = async (requestId, data, userId, dbClient = null) => {
    if (!data || data.length === 0) return [];

    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    try {
        // 1. Consistency Check & Propagation
        const groups = {};
        data.forEach(d => {
            const key = `${d.hotel_id}_${d.accounting_month}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(d);
        });

        for (const key in groups) {
            const groupData = groups[key];
            const first = groupData[0];
            const hotelId = first.hotel_id;
            const month = first.accounting_month;

            const globalRow = groupData.find(d => !d.plan_type_category_id && !d.plan_package_category_id);

            let opDays, availRooms;

            if (globalRow) {
                opDays = globalRow.operating_days;
                availRooms = globalRow.available_room_nights;

                await client.query(
                    `UPDATE du_accounting 
                     SET operating_days = $1, available_room_nights = $2
                     WHERE hotel_id = $3 AND accounting_month = $4`,
                    [opDays || 0, availRooms || 0, hotelId, month]
                );
            } else {
                const res = await client.query(
                    `SELECT operating_days, available_room_nights 
                     FROM du_accounting 
                     WHERE hotel_id = $1 AND accounting_month = $2 
                     AND plan_type_category_id IS NULL AND plan_package_category_id IS NULL
                     LIMIT 1`,
                    [hotelId, month]
                );
                
                if (res.rows.length > 0) {
                    opDays = res.rows[0].operating_days;
                    availRooms = res.rows[0].available_room_nights;
                }
            }

            if (opDays !== undefined || availRooms !== undefined) {
                groupData.forEach(d => {
                    if (opDays !== undefined) d.operating_days = opDays;
                    if (availRooms !== undefined) d.available_room_nights = availRooms;
                });
            }
        }

        const values = data.map(d => [
            d.hotel_id,
            d.accounting_month,
            d.plan_type_category_id || null,
            d.plan_package_category_id || null,
            d.accommodation_revenue || 0,
            d.non_accommodation_revenue || 0,
            d.operating_days || 0,
            d.available_room_nights || 0,
            d.rooms_sold_nights || 0,
            d.non_accommodation_sold_rooms || 0,
            userId
        ]);

        const query = pgFormat(
            `INSERT INTO du_accounting (
                hotel_id, accounting_month, plan_type_category_id, plan_package_category_id,
                accommodation_revenue, non_accommodation_revenue, operating_days,
                available_room_nights, rooms_sold_nights, non_accommodation_sold_rooms, created_by
            )
            VALUES %L
            ON CONFLICT (hotel_id, accounting_month, plan_type_category_id, plan_package_category_id) 
            DO UPDATE SET
                accommodation_revenue = EXCLUDED.accommodation_revenue,
                non_accommodation_revenue = EXCLUDED.non_accommodation_revenue,
                operating_days = EXCLUDED.operating_days,
                available_room_nights = EXCLUDED.available_room_nights,
                rooms_sold_nights = EXCLUDED.rooms_sold_nights,
                non_accommodation_sold_rooms = EXCLUDED.non_accommodation_sold_rooms,
                created_by = EXCLUDED.created_by
            RETURNING *`,
            values
        );

        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        logger.error('Error upserting du_accounting table:', err);
        throw err;
    } finally {
        if (shouldRelease) client.release();
    }
};

module.exports = {
    getForecastTable,
    getAccountingTable,
    upsertForecastTable,
    upsertAccountingTable
};