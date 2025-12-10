const { getPool } = require('../../config/database');

const copyPlanToHotel = async (requestId, sourcePlanId, sourceHotelId, targetHotelId, options = {}, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const shouldReleaseClient = !dbClient;

    try {
        if (shouldReleaseClient) {
            await client.query('BEGIN');
        }

        // 1. Copy the plan record
        const insertPlanQuery = `
            INSERT INTO plans_hotel (
                hotel_id, name, description, plan_type, color,
                plan_type_category_id, plan_package_category_id, 
                display_order, is_active, available_from, available_until, created_by, updated_by
            )
            SELECT 
                $1,  -- target hotel
                COALESCE($2, name),  -- new name or keep original
                description, plan_type, color,
                plan_type_category_id, plan_package_category_id,
                (SELECT COALESCE(MAX(display_order), 0) + 1 FROM plans_hotel WHERE hotel_id = $1),
                is_active, available_from, available_until, $3, $3
            FROM plans_hotel
            WHERE id = $4 AND hotel_id = $5
            RETURNING id`;

        const newPlanResult = await client.query(insertPlanQuery, [
            targetHotelId, options.newName, options.userId, sourcePlanId, sourceHotelId
        ]);

        if (newPlanResult.rows.length === 0) {
            throw new Error('Failed to create new plan or source plan not found.');
        }
        const newPlanId = newPlanResult.rows[0].id;

        // 2. Optionally copy rates
        if (options.copyRates) {
            const ratesQuery = `
                INSERT INTO plans_rates (
                    hotel_id, plans_hotel_id, adjustment_type, adjustment_value, tax_type_id, tax_rate,
                    condition_type, condition_value, date_start, date_end, created_by, updated_by,
                    include_in_cancel_fee, sales_category
                )
                SELECT
                    $1,  -- target hotel_id
                    $2,  -- new plans_hotel_id
                    adjustment_type, adjustment_value, tax_type_id, tax_rate,
                    condition_type, condition_value, date_start, date_end, $3, $3,
                    include_in_cancel_fee, sales_category
                FROM plans_rates
                WHERE plans_hotel_id = $4 AND hotel_id = $5
            `;
            await client.query(ratesQuery, [
                targetHotelId, newPlanId, options.userId, sourcePlanId, sourceHotelId
            ]);
        }

        // 3. Optionally copy addons
        if (options.copyAddons) {
            const addonsQuery = `
                INSERT INTO plan_addons (
                    hotel_id, plans_hotel_id, addons_global_id, addons_hotel_id, addon_type,
                    price, tax_type_id, tax_rate, date_start, date_end, created_by, updated_by, sales_category
                )
                SELECT
                    $1,  -- target hotel_id
                    $2,  -- new plans_hotel_id
                    addons_global_id, addons_hotel_id, addon_type,
                    price, tax_type_id, tax_rate, date_start, date_end, $3, $3, sales_category
                FROM plan_addons
                WHERE plans_hotel_id = $4 AND hotel_id = $5
            `;
            await client.query(addonsQuery, [
                targetHotelId, newPlanId, options.userId, sourcePlanId, sourceHotelId
            ]);
        }

        if (shouldReleaseClient) {
            await client.query('COMMIT');
        }
        return { id: newPlanId, hotel_id: targetHotelId };
    } catch (e) {
        if (shouldReleaseClient) {
            await client.query('ROLLBACK');
        }
        console.error('Error copying plan to hotel:', e);
        throw new Error('Database error during plan copy operation');
    } finally {
        if (shouldReleaseClient) {
            client.release();
        }
    }
};

const bulkCopyPlansToHotel = async (requestId, sourcePlanIds, sourceHotelId, targetHotelId, options = {}) => {
    const client = await getPool(requestId).connect();
    try {
        await client.query('BEGIN');
        const copiedPlans = [];
        for (const sourcePlanId of sourcePlanIds) {
            const newPlan = await copyPlanToHotel(requestId, sourcePlanId, sourceHotelId, targetHotelId, { ...options, userId: options.userId }, client);
            copiedPlans.push(newPlan);
        }
        await client.query('COMMIT');
        return copiedPlans;
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error bulk copying plans to hotel:', e);
        throw new Error('Database error during bulk plan copy operation');
    } finally {
        client.release();
    }
};

module.exports = {
    copyPlanToHotel,
    bulkCopyPlansToHotel
};
