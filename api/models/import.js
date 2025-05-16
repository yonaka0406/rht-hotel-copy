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

    // Disable trigger
    await pool.query('ALTER TABLE clients DISABLE TRIGGER log_clients_trigger;');
    await pool.query('ALTER TABLE addresses DISABLE TRIGGER log_addresses_trigger;');    
  
    try {
        await pool.query('BEGIN');

        const valuePlaceholders = [];
        const values = [];
        let valueIndex = 1;

        for (const client of clients) {
            const { name, nameKana, nameKanji } = await processNameString(client.name); // Still process names individually

            valuePlaceholders.push(`($${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++})`);
            values.push(
                client.id,
                name,
                nameKana,
                nameKanji,
                client.legal_or_natural_person,
                client.gender,
                client.phone,
                client.created_by
            );
        }

        const query = `
            INSERT INTO clients (
                id, name, name_kana, name_kanji, legal_or_natural_person, gender, phone, created_by
            ) VALUES ${valuePlaceholders.join(', ')}            
        `;

        await pool.query(query, values);

        await pool.query('COMMIT');
        return { success: true, count: clients.length };
    } catch (err) {
        await pool.query('ROLLBACK'); 
        console.error('Error adding clients (transaction rolled back):', err);
        throw new Error('Database error during client insertion (transaction rolled back)');
    } finally {
        // Reenable trigger
        await pool.query('ALTER TABLE clients ENABLE TRIGGER log_clients_trigger;');
        await pool.query('ALTER TABLE clients ENABLE TRIGGER log_addresses_trigger;');
    }
};
const insertYadomasterReservations = async (requestId, reservations) => {
    const pool = getPool(requestId);    

    // Disable trigger
    await pool.query('ALTER TABLE reservations DISABLE TRIGGER log_reservations_trigger;');
  
    try {
        await pool.query('BEGIN');        

        const valuePlaceholders = [];
        const values = [];
        let valueIndex = 1;

        for (const reservation of reservations) {
            valuePlaceholders.push(`($${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++})`);
            values.push(
                reservation.id,
                reservation.hotel_id,
                reservation.reservation_client_id,
                reservation.check_in,
                reservation.check_in_time,
                reservation.check_out,
                reservation.number_of_people,
                reservation.status,
                reservation.type,
                reservation.agent,
                reservation.comment,
                reservation.created_by,
            );
        }

        const query = `
            INSERT INTO reservations (
                id, hotel_id, reservation_client_id, check_in, check_in_time, check_out, number_of_people, status, type, agent, comment, 
                created_by
            ) VALUES ${valuePlaceholders.join(', ')}            
        `;

        await pool.query(query, values);

        await pool.query('COMMIT');
        
        return { success: true, count: reservations.length };
    } catch (err) {
        await pool.query('ROLLBACK'); 
        console.error('Error adding reservations (transaction rolled back):', err);
        throw new Error('Database error during reservation insertion (transaction rolled back)');
    } finally {
        // Reenable trigger
        await pool.query('ALTER TABLE reservations ENABLE TRIGGER log_reservations_trigger;');
    }
};
const insertYadomasterDetails = async (requestId, details) => {
    const pool = getPool(requestId);

    // Disable trigger
    await pool.query('ALTER TABLE reservation_details DISABLE TRIGGER log_reservation_details_trigger;');
  
    try {
        await pool.query('BEGIN');

        const valuePlaceholders = [];
        const values = [];
        let valueIndex = 1;

        for (const detail of details) {
            valuePlaceholders.push(`($${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++})`);
            values.push(
                detail.id,
                detail.hotel_id,
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
                id, hotel_id, reservation_id, date, room_id, 
                number_of_people, plans_global_id, plans_hotel_id, plan_name, price, cancelled, 
                billable, created_by
            ) VALUES ${valuePlaceholders.join(', ')}            
        `;

        await pool.query(query, values);

        await pool.query('COMMIT');
        return { success: true, count: details.length };
    } catch (err) {
        await pool.query('ROLLBACK'); 
        console.error('Error adding reservation details (transaction rolled back):', err);
        throw new Error('Database error during reservation details insertion (transaction rolled back)');
    } finally {
        // Reenable trigger
        await pool.query('ALTER TABLE reservation_details ENABLE TRIGGER log_reservation_details_trigger;');
    }
};
const insertYadomasterPayments = async (requestId, payments) => {
    const pool = getPool(requestId);

    // Disable trigger
    await pool.query('ALTER TABLE reservation_payments DISABLE TRIGGER log_reservation_payments_trigger;');
  
    try {
        await pool.query('BEGIN');

        const valuePlaceholders = [];
        const values = [];
        let valueIndex = 1;

        for (const payment of payments) {
            valuePlaceholders.push(`($${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++})`);
            values.push(
                payment.hotel_id,
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

        await pool.query(query, values);

        await pool.query('COMMIT');
        return { success: true, count: payments.length };
    } catch (err) {
        await pool.query('ROLLBACK'); 
        console.error('Error adding reservation payments (transaction rolled back):', err);
        throw new Error('Database error during reservation payments insertion (transaction rolled back)');
    } finally {
        // Reenable trigger
        await pool.query('ALTER TABLE reservation_payments ENABLE TRIGGER log_reservation_payments_trigger;');
    }
};
const insertYadomasterAddons = async (requestId, addons) => {
    const pool = getPool(requestId);

    // Disable trigger
    await pool.query('ALTER TABLE reservation_addons DISABLE TRIGGER log_reservation_addons_trigger;');
  
    try {
        await pool.query('BEGIN');

        const valuePlaceholders = [];
        const values = [];
        let valueIndex = 1;

        for (const addon of addons) {
            valuePlaceholders.push(`($${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, 3, 0.1, $${valueIndex++}, $${valueIndex++}, $${valueIndex++})`);
            values.push(
                addon.hotel_id,
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

        await pool.query(query, values);

        await pool.query('COMMIT');
        return { success: true, count: addons.length };
    } catch (err) {
        await pool.query('ROLLBACK'); 
        console.error('Error adding reservation addons (transaction rolled back):', err);
        throw new Error('Database error during reservation addons insertion (transaction rolled back)');
    } finally {
        // Reenable trigger
        await pool.query('ALTER TABLE reservation_addons ENABLE TRIGGER log_reservation_addons_trigger;');
    }
};
const insertYadomasterRates = async (requestId, rates) => {
    const pool = getPool(requestId);

    // Disable trigger
    await pool.query('ALTER TABLE reservation_rates DISABLE TRIGGER log_reservation_rates_trigger;');
  
    try {
        await pool.query('BEGIN');

        const valuePlaceholders = [];
        const values = [];
        let valueIndex = 1;

        for (const rate of rates) {
            valuePlaceholders.push(`($${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++}, $${valueIndex++})`);
            values.push(
                rate.hotel_id,
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

        await pool.query(query, values);

        await pool.query('COMMIT');
        return { success: true, count: rates.length };
    } catch (err) {
        await pool.query('ROLLBACK'); 
        console.error('Error adding reservation rates (transaction rolled back):', err);
        throw new Error('Database error during reservation rates insertion (transaction rolled back)');
    } finally {
        // Reenable trigger
        await pool.query('ALTER TABLE reservation_rates ENABLE TRIGGER log_reservation_rates_trigger;');
    }
};

module.exports = {
    insertYadomasterClients,
    insertYadomasterReservations,
    insertYadomasterDetails,
    insertYadomasterPayments,
    insertYadomasterAddons,
    insertYadomasterRates,
  };