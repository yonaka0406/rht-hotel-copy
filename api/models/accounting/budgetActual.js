const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Get Budget vs Actual comparison data
 * @param {string} requestId 
 * @param {object} filters { startDate, endDate, hotelIds, departmentNames, departmentGroupId }
 */
const getComparison = async (requestId, filters, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    try {
        const { startDate, endDate, hotelIds, departmentNames, departmentGroupId } = filters;

        // Helper to resolve hotel IDs from department group
        let effectiveHotelIds = hotelIds;
        if (departmentGroupId) {
            const deptRes = await client.query(
                'SELECT DISTINCT hotel_id FROM acc_departments WHERE department_group_id = $1 AND hotel_id IS NOT NULL',
                [departmentGroupId]
            );
            const groupHotelIds = deptRes.rows.map(r => r.hotel_id);
            if (effectiveHotelIds && effectiveHotelIds.length > 0) {
                effectiveHotelIds = effectiveHotelIds.filter(id => groupHotelIds.includes(id));
            } else {
                effectiveHotelIds = groupHotelIds;
            }
        }

        // 1. Fetch Actual Data from acc_profit_loss
        let actualQuery = `
            SELECT 
                management_group_id,
                management_group_name,
                management_group_display_order,
                account_code,
                account_name,
                SUM(net_amount) as amount
            FROM acc_profit_loss
            WHERE month BETWEEN $1 AND $2
        `;

        const actualParams = [startDate, endDate];
        let paramIndex = 3;

        if (effectiveHotelIds && effectiveHotelIds.length > 0) {
            actualQuery += ` AND hotel_id = ANY($${paramIndex})`;
            actualParams.push(effectiveHotelIds);
            paramIndex++;
        }

        if (departmentNames && departmentNames.length > 0) {
            actualQuery += ` AND department = ANY($${paramIndex})`;
            actualParams.push(departmentNames);
            paramIndex++;
        }

        actualQuery += `
            GROUP BY management_group_id, management_group_name, management_group_display_order, account_code, account_name
        `;

        // 2. Fetch Budget Data from du_forecast_entries
        let budgetQuery = `
            SELECT 
                ac.management_group_id,
                mg.name as management_group_name,
                mg.display_order as management_group_display_order,
                ac.code as account_code,
                ac.name as account_name,
                SUM(e.amount) as amount
            FROM du_forecast_entries e
            JOIN acc_account_codes ac ON e.account_name = ac.name
            JOIN acc_management_groups mg ON ac.management_group_id = mg.id
            WHERE e.month BETWEEN $1 AND $2
        `;

        const budgetParams = [startDate, endDate];
        paramIndex = 3;

        if (effectiveHotelIds && effectiveHotelIds.length > 0) {
            budgetQuery += ` AND e.hotel_id = ANY($${paramIndex})`;
            budgetParams.push(effectiveHotelIds);
            paramIndex++;
        }

        if (departmentNames && departmentNames.length > 0) {
            budgetQuery += ` AND e.department_name = ANY($${paramIndex})`;
            budgetParams.push(departmentNames);
            paramIndex++;
        }

        budgetQuery += `
            GROUP BY ac.management_group_id, mg.name, mg.display_order, ac.code, ac.name
        `;

        // 3. Fetch Occupancy Data
        // Calculation: SUM(rooms_sold) / SUM(max_available_rooms_per_month)
        let occActualQuery = `
            WITH monthly_occ AS (
                SELECT
                    a.hotel_id,
                    a.accounting_month,
                    MAX(a.available_room_nights) as available_rooms,
                    SUM(a.rooms_sold_nights) as rooms_sold
                FROM du_accounting a
                WHERE a.accounting_month BETWEEN $1 AND $2
        `;
        const occActualParams = [startDate, endDate];
        if (effectiveHotelIds && effectiveHotelIds.length > 0) {
            occActualQuery += ` AND a.hotel_id = ANY($3)`;
            occActualParams.push(effectiveHotelIds);
        }
        occActualQuery += `
                GROUP BY a.hotel_id, a.accounting_month
            )
            SELECT
                mo.hotel_id,
                h.name as hotel_name,
                SUM(mo.rooms_sold) as rooms_sold,
                SUM(mo.available_rooms) as available_rooms
            FROM monthly_occ mo
            JOIN hotels h ON mo.hotel_id = h.id
            GROUP BY mo.hotel_id, h.name
        `;

        let occBudgetQuery = `
            WITH monthly_occ AS (
                SELECT
                    f.hotel_id,
                    f.forecast_month,
                    MAX(f.available_room_nights) as available_rooms,
                    SUM(f.rooms_sold_nights) as rooms_sold
                FROM du_forecast f
                WHERE f.forecast_month BETWEEN $1 AND $2
        `;
        const occBudgetParams = [startDate, endDate];
        if (effectiveHotelIds && effectiveHotelIds.length > 0) {
            occBudgetQuery += ` AND f.hotel_id = ANY($3)`;
            occBudgetParams.push(effectiveHotelIds);
        }
        occBudgetQuery += `
                GROUP BY f.hotel_id, f.forecast_month
            )
            SELECT
                mo.hotel_id,
                h.name as hotel_name,
                SUM(mo.rooms_sold) as rooms_sold,
                SUM(mo.available_rooms) as available_rooms
            FROM monthly_occ mo
            JOIN hotels h ON mo.hotel_id = h.id
            GROUP BY mo.hotel_id, h.name
        `;

        // 4. Operating Profit per Hotel (Groups 1-5)
        let opActualQuery = `
            SELECT
                COALESCE(hotel_id, 0) as hotel_id,
                COALESCE(hotel_name, '未割当') as hotel_name,
                SUM(net_amount) as amount
            FROM acc_profit_loss
            WHERE month BETWEEN $1 AND $2
            AND management_group_display_order BETWEEN 1 AND 5
        `;
        const opActualParams = [startDate, endDate];
        if (effectiveHotelIds && effectiveHotelIds.length > 0) {
            opActualQuery += ` AND hotel_id = ANY($3)`;
            opActualParams.push(effectiveHotelIds);
        }
        opActualQuery += ` GROUP BY hotel_id, hotel_name`;

        let opBudgetQuery = `
            SELECT
                COALESCE(e.hotel_id, 0) as hotel_id,
                COALESCE(h.name, '未割当') as hotel_name,
                SUM(CASE WHEN mg.display_order = 1 THEN e.amount ELSE -e.amount END) as amount
            FROM du_forecast_entries e
            JOIN acc_account_codes ac ON e.account_name = ac.name
            JOIN acc_management_groups mg ON ac.management_group_id = mg.id
            LEFT JOIN hotels h ON e.hotel_id = h.id
            WHERE e.month BETWEEN $1 AND $2
            AND mg.display_order BETWEEN 1 AND 5
        `;
        const opBudgetParams = [startDate, endDate];
        if (effectiveHotelIds && effectiveHotelIds.length > 0) {
            opBudgetQuery += ` AND e.hotel_id = ANY($3)`;
            opBudgetParams.push(effectiveHotelIds);
        }
        opBudgetQuery += ` GROUP BY e.hotel_id, h.name`;

        const [actualRes, budgetRes, occActualRes, occBudgetRes, opActualRes, opBudgetRes] = await Promise.all([
            client.query(actualQuery, actualParams),
            client.query(budgetQuery, budgetParams),
            client.query(occActualQuery, occActualParams),
            client.query(occBudgetQuery, occBudgetParams),
            client.query(opActualQuery, opActualParams),
            client.query(opBudgetQuery, opBudgetParams)
        ]);

        return {
            actual: actualRes.rows,
            budget: budgetRes.rows,
            occupancy: {
                actual: occActualRes.rows,
                budget: occBudgetRes.rows
            },
            operatingProfit: {
                actual: opActualRes.rows,
                budget: opBudgetRes.rows
            }
        };
    } catch (err) {
        logger.error('Error in getBudgetActualComparison model:', err);
        throw err;
    } finally {
        if (shouldRelease) client.release();
    }
};

module.exports = {
    getComparison
};
