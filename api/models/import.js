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
    const insertedClients = [];
  
    try {
        await pool.query('BEGIN');

        for (const client of clients) {
            const { name, nameKana, nameKanji } = await processNameString(client.name);

            const query = `
                INSERT INTO clients (
                id, name, name_kana, name_kanji, legal_or_natural_person, gender, phone, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *;
            `;
            const values = [
                client.id,
                name,
                nameKana,
                nameKanji,
                client.legal_or_natural_person,
                client.gender,    
                client.phone,
                client.created_by
            ];
            const result = await pool.query(query, values);
            insertedClients.push(result.rows[0]);
        }

        await pool.query('COMMIT');
        return insertedClients;
    } catch (err) {
        await pool.query('ROLLBACK'); 
        console.error('Error adding clients (transaction rolled back):', err);
        throw new Error('Database error during client insertion (transaction rolled back)');
    }
};
const insertYadomasterReservations = async (requestId, reservations) => {
    const pool = getPool(requestId);
    const insertedReservations = [];
  
    try {
        await pool.query('BEGIN');

        for (const reservation of reservations) {
            const query = `
                INSERT INTO reservations (
                id, hotel_id, reservation_client_id, check_in, check_in_time, check_out, number_of_people, status, type, agent, comment, 
                created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *;
            `;
            const values = [
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
            ];
            const result = await pool.query(query, values);
            insertedReservations.push(result.rows[0]);
        }

        await pool.query('COMMIT');
        return insertedReservations;
    } catch (err) {
        await pool.query('ROLLBACK'); 
        console.error('Error adding reservations (transaction rolled back):', err);
        throw new Error('Database error during reservation insertion (transaction rolled back)');
    }
};
const insertYadomasterDetails = async (requestId, details) => {
    const pool = getPool(requestId);
    const insertedDetails = [];
  
    try {
        await pool.query('BEGIN');

        for (const detail of details) {
            const query = `
                INSERT INTO reservation_details (
                id, hotel_id, reservation_id, date, room_id, 
                number_of_people, plans_global_id, plans_hotel_id, price, cancelled, 
                billable, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *;
            `;
            const values = [
                detail.id,
                detail.hotel_id,
                detail.reservation_id,
                detail.date,
                detail.room_id,
                detail.number_of_people,
                detail.plans_global_id,
                detail.plans_hotel_id,                
                detail.price,
                detail.cancelled,
                detail.billable,
                detail.created_by,
            ];
            const result = await pool.query(query, values);
            insertedDetails.push(result.rows[0]);
        }

        await pool.query('COMMIT');
        return insertedDetails;
    } catch (err) {
        await pool.query('ROLLBACK'); 
        console.error('Error adding reservation details (transaction rolled back):', err);
        throw new Error('Database error during reservation details insertion (transaction rolled back)');
    }
};
const insertYadomasterPayments = async (requestId, payments) => {
    const pool = getPool(requestId);
    const insertedPayments = [];
  
    try {
        await pool.query('BEGIN');

        for (const payment of payments) {
            const query = `
                INSERT INTO reservation_payments (
                hotel_id, reservation_id, date, room_id, client_id, 
                payment_type_id, value, comment, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *;
            `;
            const values = [
                payment.hotel_id,
                payment.reservation_id,
                payment.date,
                payment.room_id,
                payment.client_id,
                payment.payment_type_id,
                payment.value,
                payment.comment,
                payment.created_by,
            ];
            const result = await pool.query(query, values);
            insertedPayments.push(result.rows[0]);
        }

        await pool.query('COMMIT');
        return insertedPayments;
    } catch (err) {
        await pool.query('ROLLBACK'); 
        console.error('Error adding reservation payments (transaction rolled back):', err);
        throw new Error('Database error during reservation payments insertion (transaction rolled back)');
    }
};
const insertYadomasterAddons = async (requestId, addons) => {
    const pool = getPool(requestId);
    const insertedAddons = [];
  
    try {
        await pool.query('BEGIN');

        for (const addon of addons) {
            const query = `
                INSERT INTO reservation_addons (
                hotel_id, reservation_detail_id, addons_global_id, addons_hotel_id, quantity, price, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *;
            `;
            const values = [
                addon.hotel_id,
                addon.reservation_detail_id,
                addon.addons_global_id,
                addon.addons_hotel_id,
                addon.quantity,
                addon.price,
                addon.created_by,
            ];
            const result = await pool.query(query, values);
            insertedAddons.push(result.rows[0]);
        }

        await pool.query('COMMIT');
        return insertedAddons;
    } catch (err) {
        await pool.query('ROLLBACK'); 
        console.error('Error adding reservation addons (transaction rolled back):', err);
        throw new Error('Database error during reservation addons insertion (transaction rolled back)');
    }
};

module.exports = {
    insertYadomasterClients,
    insertYadomasterReservations,
    insertYadomasterDetails,
    insertYadomasterPayments,
    insertYadomasterAddons,
  };