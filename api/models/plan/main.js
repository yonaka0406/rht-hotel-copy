const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

const selectPlanByKey = async (requestId, hotel_id, plan_key, client = null) => {
    const defaultResult = {
        plans_global_id: null,
        plans_hotel_id: null,
        name: '',
        plan_type: 'per_room'
    };

    if (!plan_key) {
        console.debug('selectPlanByKey: No plan_key provided, returning default result');
        return defaultResult;
    }

    const parts = plan_key.split('h');
    //console.log('plan_key:', plan_key, 'parts:', parts);

    try {
        // Extract IDs from parts
        const globalId = parts[0] ? parseInt(parts[0]) : null;
        const hotelId = parts[1] ? parseInt(parts[1]) : null;

        // Case 1: Hotel plan exists (parts[1] has value)
        if (parts.length > 1 && parts[1] && !isNaN(parseInt(parts[1]))) {
            const hotelPlanId = parseInt(parts[1]);
            const hotelPlan = await selectHotelPlanById(requestId, hotel_id, hotelPlanId, client);

            if (hotelPlan) {
                return {
                    plans_global_id: globalId && !isNaN(globalId) ? globalId : null,
                    plans_hotel_id: hotelPlanId,
                    name: hotelPlan.name,
                    plan_type: hotelPlan.plan_type
                };
            }
        }

        // Case 2: Global plan exists (parts[0] has value)
        if (parts[0] && !isNaN(parseInt(parts[0]))) {
            const globalPlanId = parseInt(parts[0]);
            const globalPlan = await selectGlobalPlanById(requestId, globalPlanId, client);

            if (globalPlan) {
                return {
                    plans_global_id: globalPlanId,
                    plans_hotel_id: hotelId && !isNaN(hotelId) ? hotelId : null,
                    name: globalPlan.name,
                    plan_type: globalPlan.plan_type
                };
            }
        }

    } catch (err) {
        console.error('Error in selectPlanByKey:', err);
        throw err;
    }

    return defaultResult;
};
const selectGlobalPlanById = async (requestId, id, client = null) => {
    const pool = getPool(requestId);
    const dbClient = client || await pool.connect();
    const shouldReleaseClient = !client;
    const query = 'SELECT * FROM plans_global WHERE id = $1';
    const values = [id];

    try {
        const result = await dbClient.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error finding global Plan:', err);
        throw new Error('Database error');
    } finally {
        if (shouldReleaseClient) {
            dbClient.release();
        }
    }
};
const selectHotelPlanById = async (requestId, hotel_id, id, client = null) => {
    const pool = getPool(requestId);
    const dbClient = client || await pool.connect();
    const shouldReleaseClient = !client;
    const query = `
        SELECT ph.*, 
            COALESCE(ph.plans_global_id::TEXT, '') || 'h' || ph.id::TEXT AS plan_key,
            ptc.name as type_category_name, ptc.color as type_category_color, 
            ppc.name as package_category_name, ppc.color as package_category_color 
        FROM plans_hotel ph 
        JOIN plan_type_categories ptc ON ph.plan_type_category_id = ptc.id 
        JOIN plan_package_categories ppc ON ph.plan_package_category_id = ppc.id 
        WHERE ph.hotel_id = $1 AND ph.id = $2
    `;
    const values = [hotel_id, id];

    try {
        const result = await dbClient.query(query, values);
        return result.rows[0];
    } catch (err) {
        logger.error('Error finding hotel Plan:', err);
        throw new Error('Database error');
    } finally {
        if (shouldReleaseClient) {
            dbClient.release();
        }
    }
};

const selectAllHotelsPlans = async (requestId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM plans_hotel ORDER BY hotel_id ASC, name ASC';

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving hotels plans:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};
const selectHotelPlans = async (requestId, hotel_id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `
        SELECT ph.*, 
               COALESCE(ph.plans_global_id::TEXT, '') || 'h' || ph.id::TEXT AS plan_key,
               ptc.name as plan_type_category_name, ptc.color as plan_type_category_color,
               ppc.name as plan_package_category_name, ppc.color as plan_package_category_color
        FROM plans_hotel ph
        JOIN plan_type_categories ptc ON ph.plan_type_category_id = ptc.id
        JOIN plan_package_categories ppc ON ph.plan_package_category_id = ppc.id
        WHERE ph.hotel_id = $1 
        ORDER BY ph.display_order, ph.name ASC
    `;
    const values = [hotel_id];

    try {
        const result = await client.query(query, values);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving hotel plans:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};
const selectAvailablePlansByHotel = async (requestId, hotel_id, target_date = null, date_end = null, include_inactive = false, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    
    let query, values;
    
    // Always use the full function with explicit type casting to avoid ambiguity
    query = `SELECT * FROM get_available_plans_for_hotel($1::INT, $2::DATE, $3::DATE, $4::BOOLEAN)
ORDER BY display_order ASC, plan_type ASC, name ASC;`;
    values = [
        hotel_id, 
        target_date || new Date().toISOString().split('T')[0], // Default to current date
        date_end, // Can be null
        include_inactive
    ];

    try {
        const result = await client.query(query, values);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving hotel plans:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

// Enhanced function that includes rates and addons data (for future use when you want to reduce database calls)
const selectAvailablePlansWithRatesAndAddons = async (requestId, hotel_id, target_date = null, date_end = null, include_inactive = false, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    
    const query = `SELECT * FROM get_available_plans_with_rates_and_addons($1::INT, $2::DATE, $3::DATE, $4::BOOLEAN)
ORDER BY display_order ASC, plan_type ASC, plan_name ASC;`;
    const values = [
        hotel_id, 
        target_date || new Date().toISOString().split('T')[0], // Default to current date
        date_end, 
        include_inactive
    ];

    try {
        const result = await client.query(query, values);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving hotel plans with rates and addons:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const selectAllHotelPatterns = async (requestId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `SELECT *, 'hotel' as template_type FROM plan_templates WHERE hotel_id IS NOT NULL ORDER BY name ASC`;

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving hotel patterns:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};
const selectPatternsByHotel = async (requestId, hotel_id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `        
        SELECT *, 'global' as template_type FROM plan_templates WHERE hotel_id IS NULL
        UNION ALL
        SELECT *, 'hotel' as template_type FROM plan_templates WHERE hotel_id = $1
        ORDER BY hotel_id, name            
    `;
    const values = [hotel_id];

    try {
        const result = await client.query(query, values);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving patterns for hotel:', err);
        throw err;
    } finally {
        if (!dbClient) client.release();
    }
};




const insertHotelPlan = async (requestId, hotel_id, plan_type_category_id, plan_package_category_id, name, description, plan_type, color, display_order, is_active, available_from, available_until, created_by, updated_by, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const shouldManageTransaction = !dbClient;
    
    try {
        if (shouldManageTransaction) await client.query('BEGIN');

        // Lock relevant rows for this hotel to serialize display_order calculation
        await client.query('SELECT 1 FROM hotels WHERE id = $1 FOR UPDATE', [hotel_id]);

        // Auto-calculate display_order if not provided or is 0
        let finalDisplayOrder = display_order;
        if (!display_order || display_order === 0) {
            const maxOrderQuery = `
                SELECT COALESCE(MAX(display_order), -1) + 1 as next_order 
                FROM plans_hotel 
                WHERE hotel_id = $1
            `;
            const maxOrderResult = await client.query(maxOrderQuery, [hotel_id]);
            finalDisplayOrder = maxOrderResult.rows[0].next_order;
        }
        
        const query = `
            INSERT INTO plans_hotel (
                hotel_id, plan_type_category_id, plan_package_category_id, 
                name, description, plan_type, color, display_order, is_active, available_from, available_until, 
                created_by, updated_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *;
        `;
        const values = [
            hotel_id, plan_type_category_id, plan_package_category_id,
            name, description, plan_type, color, finalDisplayOrder, is_active, available_from, available_until,
            created_by, updated_by
        ];

        logger.debug(`[DB] insertHotelPlan values:`, values);
        const result = await client.query(query, values);
        
        if (shouldManageTransaction) await client.query('COMMIT');
        return result.rows[0];
    } catch (err) {
        if (shouldManageTransaction) await client.query('ROLLBACK');
        logger.error('Error adding hotel Plan:', err);
        throw new Error('Database error');
    } finally {
        if (shouldManageTransaction) client.release();
    }
};
const insertPlanPattern = async (requestId, hotel_id, name, template, user_id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `
        INSERT INTO plan_templates (hotel_id, name, template, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $4)
        RETURNING *;
    `;
    const values = [hotel_id, name, template, user_id];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error inserting plan template:', { hotel_id, name, error: err });
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const updateHotelPlan = async (requestId, id, hotel_id, plan_type_category_id, plan_package_category_id, name, description, plan_type, color, display_order, is_active, available_from, available_until, updated_by, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `
        UPDATE plans_hotel
        SET plan_type_category_id = $1, plan_package_category_id = $2, name = $3, description = $4, plan_type = $5, color = $6, display_order = $7, is_active = $8, available_from = $9, available_until = $10, updated_by = $11
        WHERE hotel_id = $12 AND id = $13
        RETURNING *;
    `;
    const values = [plan_type_category_id || null, plan_package_category_id || null, name, description, plan_type, color, display_order, is_active, available_from, available_until, updated_by, hotel_id, id];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        logger.error('Error updating hotel Plan:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};
const updatePlansOrderBulk = async (requestId, hotelId, plans, updated_by, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const shouldManageTransaction = !dbClient;

    logger.debug(`[DB] updatePlansOrderBulk: requestId=${requestId}, hotelId=${hotelId}, plansCount=${plans.length}, updated_by=${updated_by}`);
    logger.debug(`[DB] updatePlansOrderBulk: plans =`, plans);

    try {
        if (shouldManageTransaction) {
            await client.query('BEGIN');
            logger.debug('[DB] updatePlansOrderBulk: Transaction BEGIN');
        }

        for (const plan of plans) {
            const query = `
                UPDATE plans_hotel
                SET display_order = $1, updated_by = $2
                WHERE hotel_id = $3 AND id = $4
            `;
            // Note: plan.id from frontend is mapped from plan_id. In DB, it's just 'id'.
            const values = [plan.display_order, updated_by, hotelId, plan.id];
            logger.debug(`[DB] updatePlansOrderBulk: Executing UPDATE for plan.id=${plan.id} with display_order=${plan.display_order}`);
            logger.debug(`[DB] updatePlansOrderBulk: Query: ${query}, Values: ${values}`);
            const updateResult = await client.query(query, values);
            logger.debug(`[DB] updatePlansOrderBulk: Update result for plan.id=${plan.id}: rowsAffected=${updateResult.rowCount}`);
        }
        
        if (shouldManageTransaction) {
            await client.query('COMMIT');
            logger.debug('[DB] updatePlansOrderBulk: Transaction COMMIT');
        }
        return { success: true };
    } catch (err) {
        if (shouldManageTransaction) {
            await client.query('ROLLBACK');
            logger.error('[DB] updatePlansOrderBulk: Transaction ROLLBACK due to error:', err);
        }
        throw new Error('Database error');
    } finally {
        if (shouldManageTransaction) {
            client.release();
        }
    }
};

// Check if a hotel plan is in use (has reservations, rates, or addons)
const checkHotelPlanUsage = async (requestId, planHotelId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const shouldReleaseClient = !dbClient;

    try {
        logger.debug('[DB] checkHotelPlanUsage: Checking usage for plan_hotel_id:', planHotelId);

        // Check for reservations using this plan
        const reservationQuery = `
            SELECT COUNT(*) as count 
            FROM reservation_details 
            WHERE plans_hotel_id = $1
        `;
        const reservationResult = await client.query(reservationQuery, [planHotelId]);
        const reservationCount = parseInt(reservationResult.rows[0].count);

        // Check for OTA plan master associations
        const otaQuery = `
            SELECT COUNT(*) as count 
            FROM sc_tl_plans 
            WHERE plans_hotel_id = $1
        `;
        const otaResult = await client.query(otaQuery, [planHotelId]);
        const otaCount = parseInt(otaResult.rows[0].count);

        // Check for daily metrics (if the table exists)
        let dailyMetricsCount = 0;
        try {
            const dailyMetricsQuery = `
                SELECT COUNT(*) as count 
                FROM daily_metrics 
                WHERE plans_hotel_id = $1
            `;
            const dailyMetricsResult = await client.query(dailyMetricsQuery, [planHotelId]);
            dailyMetricsCount = parseInt(dailyMetricsResult.rows[0].count);
        } catch (err) {
            // Table might not exist, ignore this check
            logger.debug('[DB] checkHotelPlanUsage: daily_metrics table not found, skipping check');
        }

        const isInUse = reservationCount > 0 || otaCount > 0 || dailyMetricsCount > 0;

        logger.debug('[DB] checkHotelPlanUsage: Usage check results:', {
            planHotelId,
            reservationCount,
            otaCount,
            dailyMetricsCount,
            isInUse
        });

        return {
            isInUse,
            usage: {
                reservations: reservationCount,
                ota: otaCount,
                dailyMetrics: dailyMetricsCount
            }
        };
    } catch (err) {
        logger.error('[DB] checkHotelPlanUsage: Error checking plan usage:', err);
        throw new Error('Database error');
    } finally {
        if (shouldReleaseClient) {
            client.release();
        }
    }
};

// Delete a hotel plan (only if not in use)
const deleteHotelPlan = async (requestId, planHotelId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const shouldManageTransaction = !dbClient;

    try {
        // Check if the plan is in use
        const usageCheck = await checkHotelPlanUsage(requestId, planHotelId, client);
        if (usageCheck.isInUse) {
            throw new Error(`Plan is in use and cannot be deleted. Usage: ${JSON.stringify(usageCheck.usage)}`);
        }

        if (shouldManageTransaction) {
            await client.query('BEGIN');
            logger.debug('[DB] deleteHotelPlan: Transaction BEGIN');
        }

        // Delete related rates (addons will be deleted automatically via CASCADE)
        await client.query('DELETE FROM plans_rates WHERE plans_hotel_id = $1', [planHotelId]);

        // Delete the plan
        const deleteQuery = `
            DELETE FROM plans_hotel 
            WHERE id = $1
            RETURNING id, name, hotel_id
        `;
        const result = await client.query(deleteQuery, [planHotelId]);

        if (result.rows.length === 0) {
            throw new Error('Plan not found');
        }

        if (shouldManageTransaction) {
            await client.query('COMMIT');
            logger.debug('[DB] deleteHotelPlan: Transaction COMMIT');
        }

        return {
            success: true,
            deletedPlan: result.rows[0]
        };
    } catch (err) {
        if (shouldManageTransaction) {
            await client.query('ROLLBACK');
            logger.error('[DB] deleteHotelPlan: Transaction ROLLBACK due to error:', err);
        }
        throw err;
    } finally {
        if (shouldManageTransaction) {
            client.release();
        }
    }
};

// Check if a global plan is in use (has hotel plans, reservations, rates, or addons)
const checkGlobalPlanUsage = async (requestId, planGlobalId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const shouldReleaseClient = !dbClient;

    try {
        logger.debug('[DB] checkGlobalPlanUsage: Checking usage for plan_global_id:', planGlobalId);

        // Check if this is one of the first 5 protected plans
        if (planGlobalId <= 5) {
            return {
                isInUse: true,
                isProtected: true,
                usage: {
                    protected: true
                }
            };
        }

        // Check for hotel plans using this global plan
        const hotelPlansQuery = `
            SELECT COUNT(*) as count 
            FROM plans_hotel 
            WHERE plans_global_id = $1
        `;
        const hotelPlansResult = await client.query(hotelPlansQuery, [planGlobalId]);
        const hotelPlansCount = parseInt(hotelPlansResult.rows[0].count);

        // Check for reservations using this plan (through hotel plans)
        const reservationQuery = `
            SELECT COUNT(*) as count 
            FROM reservation_details rd
            JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id
            WHERE ph.plans_global_id = $1
        `;
        const reservationResult = await client.query(reservationQuery, [planGlobalId]);
        const reservationCount = parseInt(reservationResult.rows[0].count);

        // Check for OTA plan master associations (through hotel plans)
        const otaQuery = `
            SELECT COUNT(*) as count 
            FROM sc_tl_plans stp
            JOIN plans_hotel ph ON stp.plans_hotel_id = ph.id
            WHERE ph.plans_global_id = $1
        `;
        const otaResult = await client.query(otaQuery, [planGlobalId]);
        const otaCount = parseInt(otaResult.rows[0].count);

        // Check for daily metrics (if the table exists)
        let dailyMetricsCount = 0;
        try {
            const dailyMetricsQuery = `
                SELECT COUNT(*) as count 
                FROM daily_metrics dm
                JOIN plans_hotel ph ON dm.plans_hotel_id = ph.id
                WHERE ph.plans_global_id = $1
            `;
            const dailyMetricsResult = await client.query(dailyMetricsQuery, [planGlobalId]);
            dailyMetricsCount = parseInt(dailyMetricsResult.rows[0].count);
        } catch (err) {
            // Table might not exist, ignore this check
            logger.debug('[DB] checkGlobalPlanUsage: daily_metrics table not found, skipping check');
        }

        const isInUse = hotelPlansCount > 0 || reservationCount > 0 || otaCount > 0 || dailyMetricsCount > 0;

        logger.debug('[DB] checkGlobalPlanUsage: Usage check results:', {
            planGlobalId,
            hotelPlansCount,
            reservationCount,
            otaCount,
            dailyMetricsCount,
            isInUse
        });

        return {
            isInUse,
            isProtected: false,
            usage: {
                hotelPlans: hotelPlansCount,
                reservations: reservationCount,
                ota: otaCount,
                dailyMetrics: dailyMetricsCount
            }
        };
    } catch (err) {
        logger.error('[DB] checkGlobalPlanUsage: Error checking plan usage:', err);
        throw new Error('Database error');
    } finally {
        if (shouldReleaseClient) {
            client.release();
        }
    }
};

// Delete a global plan (only if not in use and not protected)
const deleteGlobalPlan = async (requestId, planGlobalId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const shouldManageTransaction = !dbClient;

    try {
        // Check if the plan is in use
        const usageCheck = await checkGlobalPlanUsage(requestId, planGlobalId, client);
        if (usageCheck.isInUse) {
            throw new Error(`Plan is in use and cannot be deleted. Usage: ${JSON.stringify(usageCheck.usage)}`);
        }

        if (shouldManageTransaction) {
            await client.query('BEGIN');
            logger.debug('[DB] deleteGlobalPlan: Transaction BEGIN');
        }

        // Delete related rates (addons will be deleted automatically via CASCADE)
        await client.query('DELETE FROM plans_rates WHERE plans_global_id = $1', [planGlobalId]);

        // Delete the plan
        const deleteQuery = `
            DELETE FROM plans_global 
            WHERE id = $1
            RETURNING id, name
        `;
        const result = await client.query(deleteQuery, [planGlobalId]);

        if (result.rows.length === 0) {
            throw new Error('Plan not found');
        }

        if (shouldManageTransaction) {
            await client.query('COMMIT');
            logger.debug('[DB] deleteGlobalPlan: Transaction COMMIT');
        }

        return {
            success: true,
            deletedPlan: result.rows[0]
        };
    } catch (err) {
        if (shouldManageTransaction) {
            await client.query('ROLLBACK');
            logger.error('[DB] deleteGlobalPlan: Transaction ROLLBACK due to error:', err);
        }
        throw err;
    } finally {
        if (shouldManageTransaction) {
            client.release();
        }
    }
};

module.exports = {
    selectPlanByKey,
    selectGlobalPlanById,
    selectHotelPlanById,
    selectAllHotelsPlans,
    selectHotelPlans,
    selectAvailablePlansByHotel,
    selectAllHotelPatterns,
    selectPatternsByHotel,
    insertHotelPlan,
    insertPlanPattern,
    updateHotelPlan,
    updatePlansOrderBulk,
    checkHotelPlanUsage,
    deleteHotelPlan,
    checkGlobalPlanUsage,
    deleteGlobalPlan,
};