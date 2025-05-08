const { getPool } = require('../config/database');
const format = require('pg-format');

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
const toFullWidthKana = (str) => {
  return str.normalize('NFKC').replace(/[\uFF61-\uFF9F]/g, (char) => {
      const code = char.charCodeAt(0) - 0xFF61 + 0x30A1;
      return String.fromCharCode(code);
  });
};
const toKatakana = (str) => str.replace(/[\u3040-\u309F]/g, (char) =>
  String.fromCharCode(char.charCodeAt(0) + 0x60)
);
const processNameString = async (nameString) => {
  if (!nameString) {
    throw new Error('processNameString: nameString is required');
  }
  if (typeof nameString !== 'string') {
    throw new Error(`processNameString: Expected a string but ${nameString} is ${typeof nameString}`);
  }

  const kanjiRegex = /[\u4E00-\u9FAF]/; // Kanji
  const kanaRegex = /[\u3040-\u309F\u30A0-\u30FF]/; // Kana
  const halfKanaRegex = /[\uFF65-\uFF9F]/; // Half-width Kana
  const { convertText } = await import('../utils/japaneseUtils.mjs');
  /*
  const toFullWidthKana = (str) => {
      return str.normalize('NFKC').replace(/[\uFF61-\uFF9F]/g, (char) => {
          const code = char.charCodeAt(0) - 0xFF61 + 0x30A1;
          return String.fromCharCode(code);
      });
  };
  
  const toKatakana = (str) => str.replace(/[\u3040-\u309F]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60)
  );
  */
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

// Return all clients
const getAllClients = async (requestId, limit, offset) => {
  const pool = getPool(requestId);
  const query = `
    SELECT 
      clients.*
      ,CONCAT(clients.name, clients.name_kana, clients.name_kanji) AS full_name_key 
      ,CASE WHEN clients.legal_or_natural_person = 'legal' THEN TRUE ELSE FALSE END AS is_legal_person
    FROM clients
    WHERE id <> '11111111-1111-1111-1111-111111111111'
    ORDER BY name ASC
    LIMIT $1 OFFSET $2
  `;

  try {
    const result = await pool.query(query, [limit, offset]);    
    return result.rows; // Return all
  } catch (err) {
    console.error('Error retrieving all clients:', err);
    throw new Error('Database error');
  }
};
const getTotalClientsCount = async (requestId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT COUNT(*) 
    FROM clients
    WHERE id <> '11111111-1111-1111-1111-111111111111'
  `;

  try {
    const result = await pool.query(query);
    return parseInt(result.rows[0].count); // Return total count
  } catch (err) {
    console.error('Error retrieving total clients count:', err);
    throw new Error('Database error');
  }
};
const selectClient = async (requestId, clientId) => {
  const pool = getPool(requestId);
  const clientQuery = `
    SELECT * FROM clients 
    WHERE id = $1
  `;
  const addressQuery = `
    SELECT *
    FROM addresses
    WHERE client_id = $1
  `;
  const values = [clientId];

  try {
    const clientResult = await pool.query(clientQuery, values);
    const addressResult = await pool.query(addressQuery, values);
    return {
      client: clientResult.rows[0],
      addresses: addressResult.rows,
    };
  }
  catch (err) {
    console.error('Error selecting client and addresses:', err);
    throw new Error('Database error');
  }
};
const selectCustomerID = async (requestId, clientId, customerId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT * FROM clients 
    WHERE id <> $1 AND customer_id = $2
  `;  
  const values = [clientId, customerId];

  try {
    const result = await pool.query(query, values);
    
    return result.rows;
  }
  catch (err) {
    console.error('Error selecting client and addresses:', err);
    throw new Error('Database error');
  }
};

// Function to add a new client with minimal info
const addClientByName = async (requestId, client) => {
  const pool = getPool(requestId);
  let finalName, finalNameKana, finalNameKanji;

  const { name, nameKana, nameKanji } = await processNameString(client.name);

  finalName = name; finalNameKana = nameKana; finalNameKanji = nameKanji;
  if (client.name_kana) {
    finalNameKana = toFullWidthKana(client.name_kana);
  }

  const query = `
    INSERT INTO clients (
      name, name_kana, name_kanji, legal_or_natural_person, gender, email, phone, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;

  const values = [
    finalName,
    finalNameKana,
    finalNameKanji,
    client.legal_or_natural_person,
    client.gender,
    client.email,
    client.phone,
    client.created_by,
    client.updated_by
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the inserted client
  } catch (err) {
    console.error('Error adding client:', err);
    throw new Error('Database error');
  }
};
const addNewClient = async (requestId, user_id, client) => {  
  const pool = getPool(requestId);
  if(!client.name && !client.name_kana && !client.name_kanji){
    throw new Error('Client name is required');
  }
  // At least name or name_kanji must be filled
  if (!client.name && !client.name_kanji) {
    client.name = client.name_kana;
  }

  const query = `
    INSERT INTO clients (
      name, name_kana, name_kanji, date_of_birth, legal_or_natural_person, gender, email, phone, fax, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *;
  `;

  const values = [
    client.name,
    client.name_kana,
    client.name_kanji,    
    client.date_of_birth,
    client.legal_or_natural_person,
    client.gender,
    client.email,
    client.phone,
    client.fax,
    user_id,
    user_id
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the inserted client
  } catch (err) {
    console.error('Error adding client:', err);
    throw new Error('Database error');
  }
};
const addNewAddress = async (requestId, user_id, address) => {  
  const pool = getPool(requestId);
  if(!address.address_name){
    throw new Error('Address name is required');
  }
  
  const query = `
    INSERT INTO addresses (
      client_id, address_name, representative_name, street, state, 
      city, postal_code, country, phone, fax, 
      email, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *;
  `;

  const values = [
    address.client_id,
    address.address_name,
    address.representative_name,    
    address.street,
    address.state,
    address.city,
    address.postal_code,
    address.country,
    address.phone,
    address.fax,
    address.email,
    user_id
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error('Error adding client address:', err);
    throw new Error('Database error');
  }
};

const editClient = async (requestId, clientId, updatedFields, user_id) => {
  const pool = getPool(requestId);
  const query = `
    UPDATE clients SET
      name = $1,
      name_kana = $2,
      name_kanji = $3,
      date_of_birth = $4,
      email = $5,
      phone = $6,
      fax = $7,      
      updated_by = $8
    WHERE id = $9
    RETURNING *;
  `;

  const values = [
    updatedFields.name,
    updatedFields.name_kana,
    updatedFields.name_kanji,
    updatedFields.date_of_birth,
    updatedFields.email,
    updatedFields.phone,
    updatedFields.fax,    
    user_id,
    clientId
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows;    
  } catch (err) {
    console.error('Error updating client:', err);
    throw err;
  }
};
const editClientFull = async (requestId, clientId, updatedFields, user_id) => {
  const pool = getPool(requestId);
  const query = `
    UPDATE clients SET
      name = $1,
      name_kana = $2,
      name_kanji = $3,
      date_of_birth = $4,
      legal_or_natural_person = $5,
      gender = $6,
      email = $7,
      phone = $8,
      fax = $9,
      customer_id = $10,
      website = $11,
      billing_preference = $12,
      comment = $13,
      updated_by = $14
    WHERE id = $15
    RETURNING *;
  `;

  const values = [
    updatedFields.name,
    updatedFields.name_kana,
    updatedFields.name_kanji,
    updatedFields.date_of_birth,
    updatedFields.legal_or_natural_person,
    updatedFields.gender,
    updatedFields.email,
    updatedFields.phone,
    updatedFields.fax,
    updatedFields.customer_id,
    updatedFields.website,
    updatedFields.billing_preference,
    updatedFields.comment,
    user_id,
    clientId
  ];

  try {
    const result = await pool.query(query, values);
    console.log('editClientFull success');
    return result.rows;    
  } catch (err) {
    console.error('Error updating client:', err);
    throw err;
  }
};
const editAddress = async (requestId, addressId, updatedFields, user_id) => {
  const pool = getPool(requestId);
  const query = `
    UPDATE addresses SET
      address_name = $1,
      representative_name = $2,
      street = $3,
      state = $4,
      city = $5,
      postal_code = $6,
      country = $7,      
      phone = $8, 
      fax = $9, 
      email = $10, 
      updated_by = $11
    WHERE id = $12
    RETURNING *;
  `;

  const values = [
    updatedFields.address_name,
    updatedFields.representative_name,
    updatedFields.street,
    updatedFields.state,
    updatedFields.city,
    updatedFields.postal_code,
    updatedFields.country,
    updatedFields.phone,
    updatedFields.fax,
    updatedFields.email,
    user_id,
    addressId
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows;    
  } catch (err) {
    console.error('Error updating address:', err);
    throw err;
  }
};
const selectClientReservations = async (requestId, clientId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT	
      COUNT(distinct reservation_details.hotel_id) AS hotel_count
      ,COUNT(reservation_details.date) as date_count
      ,SUM(
        CASE 
        WHEN COALESCE(plans_hotel.plan_type, plans_global.plan_type) = 'per_room' 
        THEN reservation_details.price / reservation_details.number_of_people
        ELSE reservation_details.price END
        ) AS price_sum	
    FROM 
      reservation_clients
      ,reservation_details
      LEFT JOIN plans_hotel 
        ON plans_hotel.hotel_id = reservation_details.hotel_id 
        AND plans_hotel.id = reservation_details.plans_hotel_id
        LEFT JOIN plans_global 
        ON plans_global.id = reservation_details.plans_global_id
    WHERE
      reservation_clients.client_id = $1
      AND reservation_details.cancelled IS NULL
      AND reservation_clients.reservation_details_id = reservation_details.id      
  `;
  const values = [clientId];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  }
  catch (err) {
    console.error('Error selecting client:', err);
    throw new Error('Database error');
  }
};

const deleteClient = async (requestId, clientId, updatedBy) => {
  const pool = getPool(requestId);
  const query = format(`
    -- Set the updated_by value in a session variable
    SET SESSION "my_app.user_id" = %L;

    DELETE FROM clients
    WHERE id = %L
    RETURNING *;
  `, updatedBy, clientId);

  try {
    const result = await pool.query(query);
    console.log('deleteClient success');
    return result.rowCount;
  } catch (err) {
    console.error('Error deleting client:', err);
    throw new Error('Database error');
  }
};
const deleteAddress = async (requestId, addressId, updatedBy) => {
  const pool = getPool(requestId);
  const query = format(`
    -- Set the updated_by value in a session variable
    SET SESSION "my_app.user_id" = %L;

    DELETE FROM addresses
    WHERE id = %L
    RETURNING *;
  `, updatedBy, addressId);

  try {
    const result = await pool.query(query);    
    return result.rowCount;
  } catch (err) {
    console.error('Error deleting address:', err);
    throw new Error('Database error');
  }
};

module.exports = {
  toFullWidthKana,
  processNameString,
  getAllClients,
  getTotalClientsCount,
  selectClient,
  selectCustomerID,
  addClientByName,
  addNewClient,
  addNewAddress,
  editClient,
  editClientFull,
  editAddress,
  selectClientReservations,
  deleteClient,
  deleteAddress,
};
