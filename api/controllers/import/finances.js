const accountingModel = require('../../models/accounting');
const planModel = require('../../models/plan');
const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Get Finance Grid Data
 * Returns budget and actual entries for a specific hotel and month range
 */
const getFinancesData = async (req, res) => {
    const { requestId } = req;
    const { hotelId, startMonth, endMonth } = req.query;

    if (!hotelId || !startMonth || !endMonth) {
        return res.status(400).json({ error: 'Missing required parameters: hotelId, startMonth, endMonth' });
    }

    logger.info(`Fetching finance grid data for hotelId: ${hotelId}, range: ${startMonth} to ${endMonth}`);

    try {
        const [forecast, accountCodes, forecastTable, actualsTable, typeCategories, packageCategories] = await Promise.all([
            accountingModel.forecastEntries.getEntries(requestId, 'forecast', hotelId, startMonth, endMonth),
            accountingModel.accountingRead.getAccountCodes(requestId),
            accountingModel.operationalTables.getForecastTable(requestId, hotelId, startMonth, endMonth),
            accountingModel.operationalTables.getAccountingTable(requestId, hotelId, startMonth, endMonth),
            planModel.selectAllPlanTypeCategories(requestId),
            planModel.selectAllPlanPackageCategories(requestId)
        ]);

        logger.debug(`Found ${forecast.length} forecast entries, ${forecastTable.length} forecast table records`);

        // Log per-month counts for forecastTable
        const countsByMonth = forecastTable.reduce((acc, row) => {
            let m;
            if (row.forecast_month instanceof Date) {
                const d = row.forecast_month;
                m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            } else {
                m = String(row.forecast_month).slice(0, 7);
            }
            acc[m] = (acc[m] || 0) + 1;
            return acc;
        }, {});

        Object.entries(countsByMonth).sort().forEach(([month, count]) => {
            logger.debug(`Month ${month}: ${count} rows found in du_forecast`);
        });

        res.json({
            forecast,
            actuals: [], // actuals entries table removed
            accountCodes,
            forecastTable,
            actualsTable,
            typeCategories,
            packageCategories
        });
    } catch (error) {
        logger.error('Error fetching finance grid data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
};

/**
 * Upsert Finance Grid Data
 */
const upsertFinancesData = async (req, res) => {
    const { requestId, session } = req;
    const { type, entries, tableData } = req.body; // type: 'forecast' or 'accounting'
    const userId = session.userId || 1;

    try {
        let entryResult = [];
        let tableResult = [];

        if (entries && Array.isArray(entries) && entries.length > 0) {
            if (type === 'forecast') {
                entryResult = await accountingModel.forecastEntries.upsertForecastEntries(requestId, entries, userId);
            } else {
                // actuals entries table removed
                logger.warn('Attempted to upsert accounting entries which are now deprecated.');
            }
        }

        if (tableData && Array.isArray(tableData) && tableData.length > 0) {
            if (type === 'forecast') {
                tableResult = await accountingModel.operationalTables.upsertForecastTable(requestId, tableData, userId);
            } else {
                tableResult = await accountingModel.operationalTables.upsertAccountingTable(requestId, tableData, userId);
            }
        }

        res.json({ success: true, entryCount: entryResult.length, tableCount: tableResult.length });
    } catch (error) {
        logger.error(`Error upserting ${type} data:`, error);
        res.status(500).json({ error: 'Failed to save data' });
    }
};

/**
 * Sync from Yayoi
 * Aggregates acc_yayoi_data by month and account for a specific hotel
 */
const syncFromYayoi = async (req, res) => {
    const { requestId } = req;
    const { hotelId, month } = req.body;

    if (!hotelId || !month) {
        return res.status(400).json({ error: 'Missing hotelId or month' });
    }

    try {
        const pool = getPool(requestId);

        const query = `
            SELECT 
                amas.account_name,
                ac.id as account_code_id,
                amas.total_net_amount as amount
            FROM acc_monthly_account_summary amas
            JOIN acc_departments ad ON amas.department = ad.name
            JOIN acc_account_codes ac ON amas.account_name = ac.name
            WHERE ad.hotel_id = $1 AND amas.month = $2
        `;

        const result = await pool.query(query, [hotelId, month]);

        res.json({
            success: true,
            month,
            hotelId,
            entries: result.rows
        });
    } catch (error) {
        logger.error('Error syncing from Yayoi:', error);
        res.status(500).json({ error: 'Failed to sync from Yayoi' });
    }
};

/**
 * Sync from PMS
 * Converts reservation data to account-level entries for a specific month
 */
const syncFromPMS = async (req, res) => {
    const { requestId } = req;
    const { hotelId, month } = req.body;

    if (!hotelId || !month) {
        return res.status(400).json({ error: 'Missing hotelId or month' });
    }

    try {
        const pool = getPool(requestId);

        const query = `
            WITH mapped_data AS (
                SELECT 
                    rd.amount,
                    COALESCE(
                        m_plan.account_code_id,
                        m_type.account_code_id,
                        m_pkg.account_code_id
                    ) as account_code_id
                FROM reservation_details rd
                JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
                JOIN plans p ON r.plan_id = p.id
                LEFT JOIN acc_accounting_mappings m_plan ON m_plan.hotel_id = r.hotel_id 
                    AND m_plan.target_type = 'plan_hotel' AND m_plan.target_id = p.id
                LEFT JOIN acc_accounting_mappings m_type ON m_type.hotel_id = r.hotel_id 
                    AND m_type.target_type = 'plan_type_category' AND m_type.target_id = p.plan_type_category_id
                LEFT JOIN acc_accounting_mappings m_pkg ON m_pkg.hotel_id = r.hotel_id 
                    AND m_pkg.target_type = 'plan_package_category' AND m_pkg.target_id = p.plan_package_category_id
                WHERE r.hotel_id = $1 
                  AND DATE_TRUNC('month', rd.date) = $2
                  AND rd.cancelled IS NULL
                  AND r.status NOT IN ('hold', 'block')
            ),
            aggregated AS (
                SELECT account_code_id, SUM(amount) as amount
                FROM mapped_data
                WHERE account_code_id IS NOT NULL
                GROUP BY account_code_id
            )
            SELECT a.amount, ac.name as account_name, ac.id as account_code_id
            FROM aggregated a
            JOIN acc_account_codes ac ON a.account_code_id = ac.id
        `;

        const result = await pool.query(query, [hotelId, month]);

        res.json({
            success: true,
            month,
            hotelId,
            entries: result.rows
        });
    } catch (error) {
        logger.error('Error syncing from PMS:', error);
        res.status(500).json({ error: 'Failed to sync from PMS' });
    }
};

module.exports = {
    getFinancesData,
    upsertFinancesData,
    syncFromYayoi,
    syncFromPMS
};