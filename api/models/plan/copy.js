const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

const copyPlanToHotel = async (requestId, sourcePlanId, sourceHotelId, targetHotelId, options = {}, dbClient = null) => {
    // Validate required parameters
    if (!sourcePlanId || sourcePlanId === null || sourcePlanId === undefined) {
        throw new Error(`Invalid sourcePlanId: ${sourcePlanId}`);
    }
    if (!sourceHotelId || !targetHotelId) {
        throw new Error(`Invalid hotel IDs: source=${sourceHotelId}, target=${targetHotelId}`);
    }

    const client = dbClient || await getPool(requestId).connect();
    const shouldReleaseClient = !dbClient;

    logger.debug('copyPlanToHotel model function called', {
        requestId,
        sourcePlanId,
        sourceHotelId,
        targetHotelId,
        options,
        shouldReleaseClient
    });

    try {
        if (shouldReleaseClient) {
            await client.query('BEGIN');
            logger.debug('Transaction started', { requestId });
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

        // Check if there's a specific name for this plan in the planNames mapping
        let planSpecificName = options.planNames && options.planNames[sourcePlanId]
            ? options.planNames[sourcePlanId]
            : options.newName;

        // If no custom name is provided, get the original plan name and check for conflicts
        if (!planSpecificName) {
            const originalPlanQuery = 'SELECT name FROM plans_hotel WHERE id = $1 AND hotel_id = $2';
            const originalPlanResult = await client.query(originalPlanQuery, [sourcePlanId, sourceHotelId]);

            if (originalPlanResult.rows.length === 0) {
                throw new Error(`Source plan with ID ${sourcePlanId} not found in hotel ${sourceHotelId}`);
            }

            planSpecificName = originalPlanResult.rows[0].name;
        }

        // Check if a plan with this name already exists in the target hotel
        const conflictCheckQuery = 'SELECT id FROM plans_hotel WHERE hotel_id = $1 AND name = $2';
        const conflictResult = await client.query(conflictCheckQuery, [targetHotelId, planSpecificName]);

        if (conflictResult.rows.length > 0) {
            // Generate a unique name by appending a number
            let counter = 1;
            let uniqueName = `${planSpecificName} (${counter})`;

            while (true) {
                const uniqueCheckResult = await client.query(conflictCheckQuery, [targetHotelId, uniqueName]);
                if (uniqueCheckResult.rows.length === 0) {
                    planSpecificName = uniqueName;
                    break;
                }
                counter++;
                uniqueName = `${planSpecificName} (${counter})`;

                // Prevent infinite loop
                if (counter > 100) {
                    throw new Error(`Unable to generate unique name for plan after 100 attempts`);
                }
            }

            logger.debug('Plan name conflict resolved', {
                requestId,
                originalName: options.planNames?.[sourcePlanId] || options.newName,
                resolvedName: planSpecificName
            });
        }

        logger.debug('Executing plan copy query', {
            requestId,
            targetHotelId,
            newName: options.newName,
            planSpecificName,
            userId: options.userId,
            sourcePlanId,
            sourceHotelId
        });

        const newPlanResult = await client.query(insertPlanQuery, [
            targetHotelId, planSpecificName, options.userId, sourcePlanId, sourceHotelId
        ]);

        logger.debug('Plan copy query result', {
            requestId,
            rowCount: newPlanResult.rowCount,
            rows: newPlanResult.rows
        });

        if (newPlanResult.rows.length === 0) {
            throw new Error('Failed to create new plan or source plan not found.');
        }
        const newPlanId = newPlanResult.rows[0].id;

        logger.debug('New plan created', { requestId, newPlanId });

        // 2. Optionally copy rates
        if (options.copyRates) {
            logger.debug('Copying rates', { requestId, newPlanId });
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
            const ratesResult = await client.query(ratesQuery, [
                targetHotelId, newPlanId, options.userId, sourcePlanId, sourceHotelId
            ]);
            logger.debug('Rates copied', { requestId, ratesCopied: ratesResult.rowCount });
        }

        // 3. Optionally copy addons
        if (options.copyAddons) {
            logger.debug('Copying addons', { requestId, newPlanId });
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
            const addonsResult = await client.query(addonsQuery, [
                targetHotelId, newPlanId, options.userId, sourcePlanId, sourceHotelId
            ]);
            logger.debug('Addons copied', { requestId, addonsCopied: addonsResult.rowCount });
        }

        if (shouldReleaseClient) {
            await client.query('COMMIT');
            logger.debug('Transaction committed', { requestId });
        }

        const result = { id: newPlanId, hotel_id: targetHotelId };
        logger.debug('Plan copy completed successfully', { requestId, result });
        return result;
    } catch (e) {
        if (shouldReleaseClient) {
            await client.query('ROLLBACK');
            logger.debug('Transaction rolled back', { requestId });
        }
        logger.error('Error copying plan to hotel', {
            requestId,
            error: e.message,
            stack: e.stack,
            sourcePlanId,
            sourceHotelId,
            targetHotelId,
            planSpecificName
        });
        console.error('Error copying plan to hotel:', e);

        // Provide more specific error messages
        if (e.message.includes('duplicate key value violates unique constraint')) {
            throw new Error(`Plan name conflict: A plan with the name "${planSpecificName}" already exists in the target hotel`);
        } else if (e.message.includes('not found')) {
            throw new Error(`Source plan not found: Plan ID ${sourcePlanId} does not exist in hotel ${sourceHotelId}`);
        } else {
            throw new Error(`Database error during plan copy operation: ${e.message}`);
        }
    } finally {
        if (shouldReleaseClient) {
            client.release();
            logger.debug('Database client released', { requestId });
        }
    }
};

const bulkCopyPlansToHotel = async (requestId, sourcePlanIds, sourceHotelId, targetHotelId, options = {}) => {
    // Validate input parameters
    if (!sourcePlanIds || !Array.isArray(sourcePlanIds) || sourcePlanIds.length === 0) {
        throw new Error('sourcePlanIds must be a non-empty array');
    }

    // Filter out null/undefined plan IDs
    const validPlanIds = sourcePlanIds.filter(id => id != null && id !== undefined && id !== '');
    if (validPlanIds.length === 0) {
        throw new Error('No valid plan IDs provided');
    }

    const client = await getPool(requestId).connect();

    logger.debug('bulkCopyPlansToHotel model function called', {
        requestId,
        sourcePlanIds,
        validPlanIds,
        sourceHotelId,
        targetHotelId,
        options,
        planCount: sourcePlanIds?.length,
        validPlanCount: validPlanIds.length
    });

    try {
        await client.query('BEGIN');
        logger.debug('Bulk copy transaction started', { requestId });

        const copiedPlans = [];
        for (let i = 0; i < validPlanIds.length; i++) {
            const sourcePlanId = validPlanIds[i];
            logger.debug(`Copying plan ${i + 1}/${validPlanIds.length}`, { requestId, sourcePlanId });

            const newPlan = await copyPlanToHotel(requestId, sourcePlanId, sourceHotelId, targetHotelId, { ...options, userId: options.userId }, client);
            copiedPlans.push(newPlan);

            logger.debug(`Plan ${i + 1} copied successfully`, { requestId, newPlanId: newPlan.id });
        }

        await client.query('COMMIT');
        logger.debug('Bulk copy transaction committed', { requestId, totalCopied: copiedPlans.length });

        return copiedPlans;
    } catch (e) {
        await client.query('ROLLBACK');
        logger.error('Error bulk copying plans to hotel', {
            requestId,
            error: e.message,
            stack: e.stack,
            sourcePlanIds,
            sourceHotelId,
            targetHotelId
        });
        console.error('Error bulk copying plans to hotel:', e);
        throw new Error('Database error during bulk plan copy operation');
    } finally {
        client.release();
        logger.debug('Bulk copy database client released', { requestId });
    }
};

module.exports = {
    copyPlanToHotel,
    bulkCopyPlansToHotel
};