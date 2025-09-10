const { getPool } = require('../config/database');

// Helper
const transliterateKanaToRomaji = async (kanaString) => {  
    const { toRomaji } = await import('../utils/japaneseUtils.mjs');
  
    const halfWidthString = kanaString
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
      .replace(/　/g, ' ') // Replace full-width spaces
      .replace(/[\uFF61-\uFF9F]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0)); //convert half width katakana to half width
  
    let romaji = toRomaji(halfWidthString);
    //console.log('Kana $1 became $2',[kanaString,romaji]);
  
    // Capitalize the first letter and return the result  
    romaji = romaji
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    return romaji
};
const processNameString = async (nameString) => {
    if (!nameString) {
        throw new Error('processNameString: nameString is required');
    }

    const kanjiRegex = /[\u4E00-\u9FAF]/; // Kanji
    const kanaRegex = /[\u3040-\u309F\u30A0-\u30FF]/; // Kana
    const halfKanaRegex = /[\uFF65-\uFF9F]/; // Half-width Kana
    const { convertText } = await import('../utils/japaneseUtils.mjs');
    
    const toFullWidthKana = (str) => {
        return str.normalize('NFKC').replace(/[\uFF61-\uFF9F]/g, (char) => {
            const code = char.charCodeAt(0) - 0xFF61 + 0x30A1;
            return String.fromCharCode(code);
    });
};

const toKatakana = (str) => str.replace(/[\u3040-\u309F]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60)
);

let name = nameString; // Default
let nameKana = null;
let nameKanji = null;

if(halfKanaRegex.test(nameString)){ 
    //console.log('Half-width kana provided: ', nameString);
    nameKana = toFullWidthKana(nameString);
    //console.log('Half-width kana converted: ', nameKana);
};

if (kanjiRegex.test(nameString)) {
    nameKanji = nameString;
    nameKana = await convertText(nameString);
    nameKana = toKatakana(nameKana);
    name = await transliterateKanaToRomaji(nameKana);
} else if (kanaRegex.test(nameString) || halfKanaRegex.test(nameString)) {
    const fullKana = halfKanaRegex.test(nameString)
    ? toFullWidthKana(nameString)
    : nameString;

    const halfWidthName = fullKana
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace(/　/g, ' ') // Replace full-width spaces
    .replace(/[\uFF61-\uFF9F]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0));

    nameKana = toKatakana(halfWidthName);
    name = await transliterateKanaToRomaji(nameKana);
} else {
    // Handle full-width alphabet and spaces
    name = nameString
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace(/　/g, ' ') // Replace full-width spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

//console.log([name, nameKana, nameKanji]);

return { name, nameKana, nameKanji };
};

const insertYadomasterClients = async (requestId, clients) => {
    const pool = getPool(requestId);
    
    const client = await pool.connect();

    // Disable trigger
    await client.query('ALTER TABLE clients DISABLE TRIGGER log_clients_trigger;');
    await client.query('ALTER TABLE addresses DISABLE TRIGGER log_addresses_trigger;');    
  
    try {
        await client.query('BEGIN');

        const valuePlaceholders = [];
        const values = [];
        let valueIndex = 1;

        for (const c of clients) {
            const { name, nameKana, nameKanji } = await processNameString(c.name); // Still process names individually

            valuePlaceholders.push(`($${valueIndex++}::uuid, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++})`);
            values.push(
                c.id,
                name,
                nameKana,
                nameKanji,
                c.legal_or_natural_person,
                c.gender,
                c.phone,
                c.created_by,
                'Imported from Yadomaster'
            );
        }

        const query = `
            INSERT INTO clients (
                id, name, name_kana, name_kanji, legal_or_natural_person, gender, phone, created_by, comment
            ) VALUES ${valuePlaceholders.join(', ')}            
        `;

        await client.query(query, values);

        await client.query('COMMIT');
        return { success: true, count: clients.length };
    } catch (err) {
        await client.query('ROLLBACK'); 
        console.error('Error adding clients (transaction rolled back):', err);
        throw new Error('Database error during client insertion (transaction rolled back)');
    } finally {
        // Reenable trigger
        await client.query('ALTER TABLE clients ENABLE TRIGGER log_clients_trigger;');
        await client.query('ALTER TABLE addresses ENABLE TRIGGER log_addresses_trigger;');
        client.release();
    }
};
const insertYadomasterReservations = async (requestId, reservations) => {
    const pool = getPool(requestId);
    
    const client = await pool.connect();

    // Disable trigger
    await client.query('ALTER TABLE reservations DISABLE TRIGGER log_reservations_trigger;');
  
    try {
        await client.query('BEGIN');        

        const valuePlaceholders = [];
        const values = [];
        let valueIndex = 1;

        for (const reservation of reservations) {
            valuePlaceholders.push(`($${valueIndex++}, $${valueIndex++}::uuid, $${valueIndex++}::uuid, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++})`);
            values.push(
                parseInt(reservation.hotel_id, 10),
                reservation.id,  
                reservation.reservation_client_id,  
                reservation.check_in,
                reservation.check_in_time,
                reservation.check_out,
                reservation.number_of_people,
                reservation.status,
                reservation.type,
                reservation.ota_reservation_id,
                reservation.agent,
                reservation.comment,
                reservation.created_by,
            );
        }

        const query = `
            INSERT INTO reservations (
                hotel_id, id, reservation_client_id, check_in, check_in_time, check_out, number_of_people, status, type, ota_reservation_id, agent, comment, 
                created_by
            ) VALUES ${valuePlaceholders.join(', ')}            
        `;
        
        await client.query(query, values);

        await client.query('COMMIT');
        
        return { success: true, count: reservations.length };
    } catch (err) {
        await client.query('ROLLBACK'); 
        console.error('Error adding reservations (transaction rolled back):', err);
        throw new Error('Database error during reservation insertion (transaction rolled back)');
    } finally {
        // Reenable trigger
        await pool.query('ALTER TABLE reservations ENABLE TRIGGER log_reservations_trigger;');
        client.release();
    }
};
const insertYadomasterDetails = async (requestId, details) => {
    const pool = getPool(requestId);

    const client = await pool.connect();

    // Disable trigger
    await client.query('ALTER TABLE reservation_details DISABLE TRIGGER log_reservation_details_trigger;');
  
    try {
        await client.query('BEGIN');

        const valuePlaceholders = [];
        const values = [];
        let valueIndex = 1;

        for (const detail of details) {
            valuePlaceholders.push(`($${valueIndex++}, $${valueIndex++}::uuid, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++})`);
            values.push(
                parseInt(detail.hotel_id, 10),
                detail.id,
                detail.reservation_id,
                detail.date,
                detail.room_id,
                detail.number_of_people,
                detail.plans_global_id,
                detail.plans_hotel_id,
                detail.plan_name,
                detail.price,
                detail.cancelled,
                detail.billable,
                detail.created_by,
            );
        }

        const query = `
            INSERT INTO reservation_details (
                hotel_id, id, reservation_id, date, room_id, 
                number_of_people, plans_global_id, plans_hotel_id, plan_name, price, cancelled, 
                billable, created_by
            ) VALUES ${valuePlaceholders.join(', ')}            
        `;

        await client.query(query, values);

        await client.query('COMMIT');
        return { success: true, count: details.length };
    } catch (err) {
        await client.query('ROLLBACK'); 
        console.error('Error adding reservation details (transaction rolled back):', err);
        throw new Error('Database error during reservation details insertion (transaction rolled back)');
    } finally {
        // Reenable trigger
        await client.query('ALTER TABLE reservation_details ENABLE TRIGGER log_reservation_details_trigger;');
        client.release();
    }
};
const insertYadomasterPayments = async (requestId, payments) => {
    const pool = getPool(requestId);

    const client = await pool.connect();

    // Disable trigger
    await client.query('ALTER TABLE reservation_payments DISABLE TRIGGER log_reservation_payments_trigger;');
  
    try {
        await client.query('BEGIN');

        const valuePlaceholders = [];
        const values = [];
        let valueIndex = 1;

        for (const payment of payments) {
            valuePlaceholders.push(`($${valueIndex++}, $${valueIndex++}::uuid, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++})`);
            values.push(
                parseInt(payment.hotel_id, 10),
                payment.reservation_id,
                payment.date,
                payment.room_id,
                payment.client_id,
                payment.payment_type_id,
                payment.value,
                payment.comment,
                payment.created_by,
            );
        }

        const query = `
            INSERT INTO reservation_payments (
                hotel_id, reservation_id, date, room_id, client_id, 
                payment_type_id, value, comment, created_by
            ) VALUES ${valuePlaceholders.join(', ')}            
        `;

        await client.query(query, values);

        await client.query('COMMIT');
        return { success: true, count: payments.length };
    } catch (err) {
        await client.query('ROLLBACK'); 
        console.error('Error adding reservation payments (transaction rolled back):', err);
        throw new Error('Database error during reservation payments insertion (transaction rolled back)');
    } finally {
        // Reenable trigger
        await client.query('ALTER TABLE reservation_payments ENABLE TRIGGER log_reservation_payments_trigger;');
        client.release();
    }
};
const insertYadomasterAddons = async (requestId, addons) => {
    const pool = getPool(requestId);

    const client = await pool.connect();

    // Disable trigger
    await client.query('ALTER TABLE reservation_addons DISABLE TRIGGER log_reservation_addons_trigger;');
  
    try {
        await client.query('BEGIN');

        const valuePlaceholders = [];
        const values = [];
        let valueIndex = 1;

        for (const addon of addons) {
            valuePlaceholders.push(`($${valueIndex++}, $${valueIndex++}::uuid, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, 3, 0.1, $${valueIndex++}, $${valueIndex++}, $${valueIndex++})`);
            values.push(
                parseInt(addon.hotel_id, 10),
                addon.reservation_detail_id,
                addon.addons_global_id,
                addon.addons_hotel_id,
                addon.addon_name,
                addon.addon_type,
                addon.quantity,
                addon.price,
                addon.created_by,
            );
        }

        const query = `
            INSERT INTO reservation_addons (
                hotel_id, reservation_detail_id, addons_global_id, addons_hotel_id, addon_name, addon_type, tax_type_id, tax_rate, quantity, price, created_by
            ) VALUES ${valuePlaceholders.join(', ')}            
        `;

        await client.query(query, values);

        await client.query('COMMIT');
        return { success: true, count: addons.length };
    } catch (err) {
        await client.query('ROLLBACK'); 
        console.error('Error adding reservation addons (transaction rolled back):', err);
        throw new Error('Database error during reservation addons insertion (transaction rolled back)');
    } finally {
        // Reenable trigger
        await client.query('ALTER TABLE reservation_addons ENABLE TRIGGER log_reservation_addons_trigger;');
        client.release();
    }
};
const insertYadomasterRates = async (requestId, rates) => {
    const pool = getPool(requestId);

    const client = await pool.connect();

    // Disable trigger
    await client.query('ALTER TABLE reservation_rates DISABLE TRIGGER log_reservation_rates_trigger;');
  
    try {
        await client.query('BEGIN');

        const valuePlaceholders = [];
        const values = [];
        let valueIndex = 1;

        for (const rate of rates) {
            valuePlaceholders.push(`($${valueIndex++}, $${valueIndex++}::uuid, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++})`);
            values.push(
                parseInt(rate.hotel_id, 10),
                rate.reservation_details_id,
                rate.adjustment_value,
                rate.tax_type_id,
                rate.tax_rate,
                rate.price,
                rate.created_by,
            );
        }

        const query = `
            INSERT INTO reservation_rates (
                hotel_id, reservation_details_id, adjustment_value, tax_type_id, tax_rate, price, created_by
            ) VALUES ${valuePlaceholders.join(', ')}            
        `;

        await client.query(query, values);

        await client.query('COMMIT');
        return { success: true, count: rates.length };
    } catch (err) {
        await client.query('ROLLBACK'); 
        console.error('Error adding reservation rates (transaction rolled back):', err);
        throw new Error('Database error during reservation rates insertion (transaction rolled back)');
    } finally {
        // Reenable trigger
        await client.query('ALTER TABLE reservation_rates ENABLE TRIGGER log_reservation_rates_trigger;');
        client.release();
    }
};

const insertForecastData = async (requestId, forecasts, user_id) => {
    // Ensure forecasts is an array and not empty
    if (!Array.isArray(forecasts) || forecasts.length === 0) {
        //console.log('insertForecastData: No forecast data provided or forecasts array is empty.');
        return { success: true, count: 0, message: 'No forecast data to process.' };
    }

    const pool = getPool(requestId);
    const client = await pool.connect();    

    try {
        await client.query('BEGIN');        

        const query = `
            INSERT INTO du_forecast (
                hotel_id, forecast_month,
                accommodation_revenue, operating_days,
                available_room_nights, rooms_sold_nights,
                created_by                    
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (hotel_id, forecast_month) DO UPDATE SET
                accommodation_revenue = CASE
                                            WHEN $3 IS NOT NULL THEN EXCLUDED.accommodation_revenue
                                            ELSE du_forecast.accommodation_revenue
                                        END,
                operating_days = CASE
                                    WHEN $4 IS NOT NULL THEN EXCLUDED.operating_days
                                    ELSE du_forecast.operating_days
                                    END,
                available_room_nights = CASE
                                            WHEN $5 IS NOT NULL THEN EXCLUDED.available_room_nights
                                            ELSE du_forecast.available_room_nights
                                        END,
                rooms_sold_nights = CASE
                                        WHEN $6 IS NOT NULL THEN EXCLUDED.rooms_sold_nights
                                        ELSE du_forecast.rooms_sold_nights
                                    END,
                created_by = EXCLUDED.created_by                    
            RETURNING id;
        `;

        // Map each forecast item to a promise that executes its query
        const queryPromises = forecasts.map(forecast => {
            // Prepare the values for the query for the current forecast
            // Ensure numeric fields are correctly parsed or null
            const currentValues = [
                parseInt(forecast.hotel_id, 10),
                forecast.month, // Assuming this is a date string like 'YYYY/MM/DD' or 'YYYY-MM-DD'
                forecast.accommodation_revenue !== undefined && forecast.accommodation_revenue !== null ? parseFloat(forecast.accommodation_revenue) : null,
                forecast.operating_days !== undefined && forecast.operating_days !== null ? parseInt(forecast.operating_days, 10) : null,
                forecast.available_room_nights !== undefined && forecast.available_room_nights !== null ? parseInt(forecast.available_room_nights, 10) : null,
                forecast.rooms_sold_nights !== undefined && forecast.rooms_sold_nights !== null ? parseInt(forecast.rooms_sold_nights, 10) : null,
                user_id
            ];

            /*
            console.log(`Executing UPSERT for hotel_id: ${forecast.hotel_id}, month: ${forecast.month}`, {
                accommodation_revenue: currentValues[2],
                operating_days: currentValues[3],
                available_room_nights: currentValues[4],
                rooms_sold_nights: currentValues[5]
            });
            */

            // Return the promise from client.query
            return client.query(query, currentValues)
                .then(res => {
                    // Attach forecast info to the result for easier processing/logging after Promise.all
                    return { res, forecast };
                })
                .catch(err => {
                    // Log specific error context here, then re-throw to ensure Promise.all fails
                    console.error(`Error during database query for hotel_id: ${forecast.hotel_id}, month: ${forecast.month}. Query: ${query.substring(0,200)}... Values: ${JSON.stringify(currentValues)}`, err.stack);
                    throw err; // Important: re-throw error to make Promise.all reject
                });
        });
            
        const allResults = await Promise.all(queryPromises);

        await client.query('COMMIT');
        // console.log('Transaction committed successfully. Records processed:', forecasts.length);
        return { success: true, count: forecasts.length };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in insertForecastData:', error.stack);
        return { success: false, error: error.message, stack: error.stack, count: 0 };
    } finally {
        client.release();
    }
};

const insertAccountingData = async (requestId, accountingEntries, user_id) => {
    if (!Array.isArray(accountingEntries) || accountingEntries.length === 0) {
        //console.log('insertAccountingData: No accounting data provided or accountingEntries array is empty.');
        return { success: true, count: 0, message: 'No accounting data to process.' };
    }

    const pool = getPool(requestId);
    const client = await pool.connect();  
    try {
        await client.query('BEGIN');

        const query = `
            INSERT INTO du_accounting (
                hotel_id, accounting_month,
                accommodation_revenue,
                created_by
            ) VALUES ($1, $2, $3, $4)
            ON CONFLICT (hotel_id, accounting_month) DO UPDATE SET
                accommodation_revenue = CASE
                                          WHEN EXCLUDED.accommodation_revenue IS NOT NULL THEN EXCLUDED.accommodation_revenue
                                          ELSE du_accounting.accommodation_revenue -- Keep existing if new value is null
                                        END,
                created_by = EXCLUDED.created_by              
            RETURNING id;
        `;

        // Map each accounting entry item to a promise that executes its query
        const queryPromises = accountingEntries.map(entry => {
            // Prepare the values for the query for the current entry
            // Ensure numeric fields are correctly parsed or null
            const currentValues = [
                parseInt(entry.hotel_id, 10),
                entry.month, // Assuming this is a date string like 'YYYY-MM-DD' and the DB column is DATE
                entry.accommodation_revenue !== undefined && entry.accommodation_revenue !== null ? parseFloat(entry.accommodation_revenue) : null,
                user_id
            ];

            // Return the promise from client.query
            return client.query(query, currentValues)
                .then(res => {
                    // Attach entry info to the result for easier processing/logging after Promise.all
                    if (res.rowCount === 0) {
                         console.warn(`No rows affected for hotel_id: ${entry.hotel_id}, month: ${entry.month}. This might indicate an issue if an insert or update was expected.`);
                    }
                    return { res, entry };
                })
                .catch(err => {
                    // Log specific error context here, then re-throw to ensure Promise.all fails
                    console.error(`Error during database query for hotel_id: ${entry.hotel_id}, month: ${entry.month}. Query: ${query.substring(0,250)}... Values: ${JSON.stringify(currentValues)}`, err.stack);
                    throw err; // Important: re-throw error to make Promise.all reject
                });
        });
            
        const allResults = await Promise.all(queryPromises);

        await client.query('COMMIT');
        
        return { success: true, count: accountingEntries.length, results: allResults.map(r => ({id: r.res.rows[0]?.id, ...r.entry})) };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in insertAccountingData transaction:', error.stack);
        return { success: false, error: error.message, stack: error.stack, count: 0 };
    } finally {
        client.release();
    }
}

module.exports = {
    insertYadomasterClients,
    insertYadomasterReservations,
    insertYadomasterDetails,
    insertYadomasterPayments,
    insertYadomasterAddons,
    insertYadomasterRates,
    insertForecastData,
    insertAccountingData
  };