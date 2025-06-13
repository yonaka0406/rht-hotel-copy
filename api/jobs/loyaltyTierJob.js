// api/jobs/loyaltyTierJob.js
const cron = require('node-cron');
const db = require('../config/database'); // Assuming db connection pool
const pgFormat = require('pg-format');

// Helper function to calculate past date based on period
const getStartDateForPeriod = (numberOfMonths) => {
    const date = new Date();
    date.setMonth(date.getMonth() - numberOfMonths);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

const assignLoyaltyTiers = async () => {
    console.log('Starting loyalty tier assignment job...');
    const client = await db.getClient(); // Get a client from the pool for transaction

    try {
        await client.query('BEGIN');

        // 1. Initialize all clients to 'Newbie'
        console.log('Initializing clients to Newbie...');
        await client.query("UPDATE clients SET loyalty_tier = 'newbie'");

        // Fetch all tier settings
        const { rows: settings } = await client.query('SELECT * FROM loyalty_tiers ORDER BY tier_name, hotel_id');

        const brandLoyalSetting = settings.find(s => s.tier_name === 'brand_loyal');
        const hotelLoyalSettings = settings.filter(s => s.tier_name === 'hotel_loyal');
        const repeaterSetting = settings.find(s => s.tier_name === 'repeater');

        // 2. Evaluate 'BRAND_LOYAL'
        if (brandLoyalSetting) {
            console.log('Evaluating Brand Loyal tier...');
            const startDate = getStartDateForPeriod(brandLoyalSetting.time_period_months);

            const conditions = [];
            if (brandLoyalSetting.min_bookings) {
                conditions.push(pgFormat('COUNT(DISTINCT r.id) >= %L', brandLoyalSetting.min_bookings));
            }
            if (brandLoyalSetting.min_spending) {
                conditions.push(pgFormat(
                    '(COALESCE((SELECT SUM(rp.value) FROM reservation_payments rp WHERE rp.client_id = r.reservation_client_id AND rp.date >= %L), 0)) >= %L',
                    startDate, brandLoyalSetting.min_spending
                ));
            }

            if (conditions.length > 0) {
                const havingClause = conditions.join(pgFormat(' %s ', brandLoyalSetting.logic_operator || 'OR'));
                const brandLoyalQuery = `
                    UPDATE clients c SET loyalty_tier = 'brand_loyal'
                    WHERE c.id IN (
                        SELECT r.reservation_client_id
                        FROM reservations r
                        JOIN reservation_details rd ON r.id = rd.reservation_id AND r.hotel_id = rd.hotel_id
                        WHERE r.status IN ('checked_out', 'confirmed') AND rd.date >= $1
                        GROUP BY r.reservation_client_id
                        HAVING ${havingClause}
                    )`;
                await client.query(brandLoyalQuery, [startDate]);
                console.log(`Brand Loyal update affected ${client.rowCount} rows.`);
            }
        }

        // 3. Evaluate 'HOTEL_LOYAL' for clients still 'Newbie' or other configurable previous tiers
        if (hotelLoyalSettings.length > 0) {
            console.log('Evaluating Hotel Loyal tier...');
            for (const setting of hotelLoyalSettings) {
                const startDate = getStartDateForPeriod(setting.time_period_months);
                const conditions = [];
                if (setting.min_bookings) {
                    conditions.push(pgFormat('COUNT(DISTINCT r.id) >= %L', setting.min_bookings));
                }
                if (setting.min_spending) {
                    conditions.push(pgFormat(
                        '(COALESCE((SELECT SUM(rp.value) FROM reservation_payments rp WHERE rp.client_id = r.reservation_client_id AND rp.hotel_id = %L AND rp.date >= %L), 0)) >= %L',
                        setting.hotel_id, startDate, setting.min_spending
                    ));
                }

                if (conditions.length > 0) {
                    const havingClause = conditions.join(pgFormat(' %s ', setting.logic_operator || 'OR'));
                    // Apply HOTEL_LOYAL only if client is currently Newbie.
                    // Brand Loyal is higher, so we don't want to overwrite it.
                    const hotelLoyalQuery = `
                        UPDATE clients c SET loyalty_tier = 'hotel_loyal'
                        WHERE c.loyalty_tier = 'newbie' AND c.id IN (
                            SELECT r.reservation_client_id
                            FROM reservations r
                            JOIN reservation_details rd ON r.id = rd.reservation_id AND r.hotel_id = rd.hotel_id
                            WHERE r.status IN ('checked_out', 'confirmed') AND r.hotel_id = $1 AND rd.date >= $2
                            GROUP BY r.reservation_client_id
                            HAVING ${havingClause}
                        )`;
                    await client.query(hotelLoyalQuery, [setting.hotel_id, startDate]);
                    console.log(`Hotel Loyal update for hotel ${setting.hotel_id} affected ${client.rowCount} rows.`);
                }
            }
        }

        // 4. Evaluate 'REPEATER' for clients still 'Newbie'
        if (repeaterSetting) {
            console.log('Evaluating Repeater tier...');
            const startDate = getStartDateForPeriod(repeaterSetting.time_period_months);
            // Apply REPEATER only if client is currently Newbie.
            // Brand Loyal and Hotel Loyal are higher.
            let repeaterQuery = `
                UPDATE clients c SET loyalty_tier = 'repeater'
                WHERE c.loyalty_tier = 'newbie' AND c.id IN (
                    SELECT r.reservation_client_id
                    FROM reservations r
                    JOIN reservation_details rd ON r.id = rd.reservation_id AND r.hotel_id = rd.hotel_id
                    WHERE r.status IN ('checked_out', 'confirmed') AND rd.date >= $1
                    GROUP BY r.reservation_client_id
                    HAVING COUNT(DISTINCT r.id) >= $2
                )
            `;
             await client.query(repeaterQuery, [startDate, repeaterSetting.min_bookings]);
             console.log(`Repeater update affected ${client.rowCount} rows.`);
        }

        await client.query('COMMIT');
        console.log('Loyalty tier assignment job completed successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in loyalty tier assignment job:', error);
    } finally {
        client.release();
    }
};

// Schedule the job to run daily at 2 AM
// Adjust cron expression as needed e.g. '0 2 * * *' for 2 AM daily.
// For testing, you might use a more frequent schedule like '*/5 * * * *' (every 5 minutes)
const scheduleLoyaltyTierJob = () => {
    // Runs daily at 2:00 AM
    cron.schedule('0 2 * * *', assignLoyaltyTiers, {
        scheduled: true,
        timezone: "Asia/Tokyo" // Or your server's timezone
    });
    console.log('Loyalty tier assignment job scheduled daily at 2 AM.');
};

module.exports = { assignLoyaltyTiers, scheduleLoyaltyTierJob };
