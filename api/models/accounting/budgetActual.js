const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Get Budget vs Actual comparison data
 * @param {string} requestId 
 * @param {object} filters { startDate, endDate, hotelIds, departmentNames }
 */
const getComparison = async (requestId, filters, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    try {
        const { startDate, endDate, hotelIds, departmentNames } = filters;

        // 1. Fetch Actual Data from acc_profit_loss
        // We use startMonth/endMonth logic similar to getProfitLossSummary
        let actualQuery = `
            SELECT 
                management_group_id,
                management_group_name,
                management_group_display_order,
                SUM(net_amount) as amount
            FROM acc_profit_loss
            WHERE month BETWEEN $1 AND $2
        `;

        const actualParams = [startDate, endDate];
        let paramIndex = 3;

        if (hotelIds && hotelIds.length > 0) {
            actualQuery += ` AND hotel_id = ANY($${paramIndex})`;
            actualParams.push(hotelIds);
            paramIndex++;
        }

        if (departmentNames && departmentNames.length > 0) {
            actualQuery += ` AND department = ANY($${paramIndex})`;
            actualParams.push(departmentNames);
            paramIndex++;
        }

        actualQuery += `
            GROUP BY management_group_id, management_group_name, management_group_display_order
        `;

        // 2. Fetch Budget Data from du_forecast_entries
        let budgetQuery = `
            SELECT 
                ac.management_group_id,
                mg.name as management_group_name,
                mg.display_order as management_group_display_order,
                SUM(e.amount) as amount
            FROM du_forecast_entries e
            JOIN acc_account_codes ac ON e.account_name = ac.name
            JOIN acc_management_groups mg ON ac.management_group_id = mg.id
            WHERE e.month BETWEEN $1 AND $2
        `;

        const budgetParams = [startDate, endDate];
        paramIndex = 3;

        if (hotelIds && hotelIds.length > 0) {
            budgetQuery += ` AND e.hotel_id = ANY($${paramIndex})`;
            budgetParams.push(hotelIds);
            paramIndex++;
        }

        if (departmentNames && departmentNames.length > 0) {
            budgetQuery += ` AND e.department_name = ANY($${paramIndex})`;
            budgetParams.push(departmentNames);
            paramIndex++;
        }

        budgetQuery += `
            GROUP BY ac.management_group_id, mg.name, mg.display_order
        `;

        const [actualRes, budgetRes] = await Promise.all([
            client.query(actualQuery, actualParams),
            client.query(budgetQuery, budgetParams)
        ]);

        return {
            actual: actualRes.rows,
            budget: budgetRes.rows
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
