// api/jobs/loyaltyTierJob.js
const cron = require('node-cron');
const db = require('../config/database');
const pgFormat = require('pg-format');

// Helper function to calculate past date based on period
const getStartDateForPeriod = (numberOfMonths) => {
    const date = new Date();
    date.setMonth(date.getMonth() - numberOfMonths);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

const assignLoyaltyTiers = async () => {
    console.log('Starting loyalty tier assignment job...');

    // Get a client from the production pool
    const client = await db.getProdPool().connect();

    try {
        await client.query('BEGIN');

        // Disable trigger before any client updates
        await client.query('ALTER TABLE clients DISABLE TRIGGER log_clients_trigger;');
        console.log('Temporarily disabled log_clients_trigger.');

        // 1. Initialize all clients to 'newbie'
        console.log('Initializing clients to newbie...');
        await client.query("UPDATE clients SET loyalty_tier = 'newbie'");

        // 2. Assign 'prospect' to clients with no reservations, reservation_clients, or reservation_payments entries
        console.log('Assigning "prospect" tier to clients with no reservation-related entries...');
        const prospectQuery = `
            UPDATE clients c SET loyalty_tier = 'prospect'
            WHERE c.id NOT IN (
                SELECT DISTINCT reservation_client_id FROM reservations WHERE reservation_client_id IS NOT NULL
                UNION
                SELECT DISTINCT client_id FROM reservation_clients WHERE client_id IS NOT NULL
                UNION
                SELECT DISTINCT client_id FROM reservation_payments WHERE client_id IS NOT NULL
            );
        `;
        const { rowCount: prospectCount } = await client.query(prospectQuery);
        console.log(`Prospect update affected ${prospectCount} rows.`);

        // Fetch all tier settings
        const { rows: settings } = await client.query('SELECT * FROM loyalty_tiers ORDER BY tier_name, hotel_id');
        console.log(`Found ${settings.length} loyalty tier settings.`);

        const brandLoyalSetting = settings.find(s => s.tier_name === 'brand_loyal');
        const hotelLoyalSettings = settings.filter(s => s.tier_name === 'hotel_loyal');
        const repeaterSetting = settings.find(s => s.tier_name === 'repeater');

        // 3. Evaluate 'BRAND_LOYAL'
        if (brandLoyalSetting) {
            console.log('Evaluating Brand Loyal tier...');
            const startDate = getStartDateForPeriod(brandLoyalSetting.time_period_months);
            console.log(`Brand Loyal evaluation period: from ${startDate}`);

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
                        WHERE r.status IN ('confirmed', 'checked_in', 'checked_out')
                          AND rd.date >= $1
                          AND r.reservation_client_id IS NOT NULL
                        GROUP BY r.reservation_client_id
                        HAVING ${havingClause}
                    )`;
                const { rowCount: brandLoyalCount } = await client.query(brandLoyalQuery, [startDate]);
                console.log(`Brand Loyal update affected ${brandLoyalCount} rows.`);
            } else {
                console.log('No conditions defined for Brand Loyal tier, skipping.');
            }
        } else {
            console.log('No Brand Loyal tier configuration found, skipping.');
        }

        // 4. Evaluate 'HOTEL_LOYAL' for clients still 'Newbie' or other configurable previous tiers
        if (hotelLoyalSettings.length > 0) {
            console.log(`Evaluating Hotel Loyal tier for ${hotelLoyalSettings.length} hotels...`);
            for (const setting of hotelLoyalSettings) {
                const startDate = getStartDateForPeriod(setting.time_period_months);
                console.log(`Hotel Loyal evaluation for hotel ${setting.hotel_id}: from ${startDate}`);

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
                    // Apply HOTEL_LOYAL only if client is currently Newbie or Prospect.
                    // Brand Loyal is higher, so we don't want to overwrite it.
                    const hotelLoyalQuery = `
                        UPDATE clients c SET loyalty_tier = 'hotel_loyal'
                        WHERE c.loyalty_tier IN ('newbie', 'prospect') AND c.id IN (
                            SELECT r.reservation_client_id
                            FROM reservations r
                            JOIN reservation_details rd ON r.id = rd.reservation_id AND r.hotel_id = rd.hotel_id
                            WHERE r.status IN ('confirmed', 'checked_in', 'checked_out')
                              AND r.hotel_id = $1
                              AND rd.date >= $2
                              AND r.reservation_client_id IS NOT NULL
                            GROUP BY r.reservation_client_id
                            HAVING ${havingClause}
                        )`;
                    const { rowCount: hotelLoyalCount } = await client.query(hotelLoyalQuery, [setting.hotel_id, startDate]);
                    console.log(`Hotel Loyal update for hotel ${setting.hotel_id} affected ${hotelLoyalCount} rows.`);
                } else {
                    console.log(`No conditions defined for Hotel Loyal tier (hotel ${setting.hotel_id}), skipping.`);
                }
            }
        } else {
            console.log('No Hotel Loyal tier configurations found, skipping.');
        }

        // 5. Evaluate 'REPEATER' for clients still 'Newbie' or 'Prospect'
        if (repeaterSetting && repeaterSetting.min_bookings) {
            console.log('Evaluating Repeater tier...');
            const startDate = getStartDateForPeriod(repeaterSetting.time_period_months);
            console.log(`Repeater evaluation period: from ${startDate}, min bookings: ${repeaterSetting.min_bookings}`);

            // Apply REPEATER only if client is currently Newbie or Prospect.
            // Brand Loyal and Hotel Loyal are higher.
            const repeaterQuery = `
                UPDATE clients c SET loyalty_tier = 'repeater'
                WHERE c.loyalty_tier IN ('newbie', 'prospect') AND c.id IN (
                    SELECT r.reservation_client_id
                    FROM reservations r
                    JOIN reservation_details rd ON r.id = rd.reservation_id AND r.hotel_id = rd.hotel_id
                    WHERE r.status IN ('confirmed', 'checked_in', 'checked_out')
                      AND rd.date >= $1
                      AND r.reservation_client_id IS NOT NULL
                    GROUP BY r.reservation_client_id
                    HAVING COUNT(DISTINCT r.id) >= $2
                )
            `;
            const { rowCount: repeaterCount } = await client.query(repeaterQuery, [startDate, repeaterSetting.min_bookings]);
            console.log(`Repeater update affected ${repeaterCount} rows.`);
        } else {
            console.log('No Repeater tier configuration found or min_bookings not set, skipping.');
        }

        await client.query('COMMIT');
        console.log('Loyalty tier assignment job completed successfully.');

        // Log final counts for verification
        const finalCounts = await client.query(`
            SELECT loyalty_tier, COUNT(*) as count
            FROM clients
            GROUP BY loyalty_tier
            ORDER BY loyalty_tier
        `);
        console.log('Final loyalty tier counts:', finalCounts.rows);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in loyalty tier assignment job:', error);
        throw error;
    } finally {
        try {
            // Always try to re-enable the trigger, even if there was an error
            await client.query('ALTER TABLE clients ENABLE TRIGGER log_clients_trigger;');
            console.log('Re-enabled log_clients_trigger.');
        } catch (enableTriggerError) {
            console.error('CRITICAL: Failed to re-enable log_clients_trigger:', enableTriggerError);
            // This is critical - you might want to send an alert here
        }

        // Release the client back to the pool
        client.release();
        console.log('Database client released.');
    }
};

// Schedule the job to run daily at 2 AM
const scheduleLoyaltyTierJob = () => {
    // Runs hourly at the start of the hour
    cron.schedule('0 * * * *', async () => {
        try {
            console.log('Loyalty tier assignment job triggered by cron schedule.');
            await assignLoyaltyTiers();
        } catch (error) {
            console.error('Loyalty tier assignment job failed:', error);
            // You might want to send an alert or notification here
        }
    }, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });
    console.log('Loyalty tier assignment job scheduled hourly at the start of the hour (JST).');
};

module.exports = { assignLoyaltyTiers, scheduleLoyaltyTierJob };
