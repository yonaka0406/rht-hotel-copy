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
const processNameStringWithSubstitutions = (name, nameKanji) => {
    if (typeof name !== 'string' || typeof nameKanji !== 'string') {
        // Or handle more gracefully depending on expected inputs, maybe return original name
        console.warn('processNameStringWithSubstitutions: name and nameKanji must be strings.');
        return name;
    }

    const substitutions = [
        { pattern: 'japan', replacement: ' Japan ', kanji_match: 'ジャパン' },
        { pattern: 'nihon', replacement: ' Nihon ', kanji_match: '日本' },
        { pattern: 'hokkaidou', replacement: ' Hokkaido ', kanji_match: '北海道' },
        { pattern: 'sapporo', replacement: ' Sapporo ', kanji_match: '札幌' },
        { pattern: 'kensetsu', replacement: ' Kensetsu ', kanji_match: '建設' },
        { pattern: 'setsubi', replacement: ' Setsubi ', kanji_match: '設備' },
        { pattern: 'kabushikigaisha', replacement: ' K.K ', kanji_match: '株式会社' },
        { pattern: 'kougyou', replacement: ' Kogyo ', kanji_match: '工業' },
        { pattern: 'kougyou', replacement: ' Kogyo ', kanji_match: '興業' },
        { pattern: 'kougyou', replacement: ' Kogyo ', kanji_match: '鋼業' },
        { pattern: 'sangyou', replacement: ' Sangyo ', kanji_match: '産業' },
        { pattern: 'tekkou', replacement: ' Tekkou ', kanji_match: '鉄工' },
        { pattern: 'kikou', replacement: ' Kikou ', kanji_match: '機工' },
        { pattern: 'denkou', replacement: ' Denkou ', kanji_match: '電工' },
        { pattern: 'tosou', replacement: ' Tosou ', kanji_match: '塗装' },
        { pattern: 'kureen', replacement: ' Crane ', kanji_match: 'クレーン' },
        { pattern: 'koumuten', replacement: ' Koumuten ', kanji_match: '工務店' },
        { pattern: 'giken', replacement: ' Giken ', kanji_match: '技研' },
        { pattern: 'gijutsu', replacement: ' Gijutsu ', kanji_match: '技術' },
        { pattern: 'guruupu', replacement: ' Group ', kanji_match: 'グループ' },
        { pattern: 'hoomu', replacement: ' Home ', kanji_match: 'ホーム' },
        { pattern: 'hausu', replacement: ' House ', kanji_match: 'ハウス' },
        { pattern: 'shisutemu', replacement: ' System ', kanji_match: 'システム' },
        { pattern: 'hoorudeingusu', replacement: ' Holdings ', kanji_match: 'ホールディングス' },
        { pattern: 'konsarutanto', replacement: ' Consultant ', kanji_match: 'コンサルタント' }
    ];

    let updatedName = name;

    for (const sub of substitutions) {
        // Check for kanji_match presence (simple substring check)
        if (nameKanji.includes(sub.kanji_match)) {
            // Create a case-insensitive regex for the pattern
            try {
                const regex = new RegExp(sub.pattern, 'gi'); // 'g' for global, 'i' for case-insensitive
                if (regex.test(updatedName)) {
                    updatedName = updatedName.replace(regex, sub.replacement);
                }
            } catch (e) {
                console.error(`Error creating RegExp with pattern: ${sub.pattern}`, e);
                // Skip this substitution if regex is invalid
            }
        }
    }

    // Trim whitespace, replace multiple spaces with a single space
    updatedName = updatedName.trim().replace(/\s+/g, ' ');

    // Apply INITCAP (capitalize the first letter of each word)
    updatedName = updatedName
        .split(' ')
        .map(word => {
            if (word.length === 0) return '';
            // Preserve K.K as is, otherwise INITCAP
            if (word === 'K.K') return 'K.K';
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');

    return updatedName;
};
const processNameString = async (nameString) => {
  if (!nameString) {
    throw new Error('processNameString: nameString is required');
  }
  if (typeof nameString !== 'string') {
    throw new Error(`processNameString: Expected a string but ${nameString} is ${typeof nameString}`);
  }

  const kanjiRegex = /[\u4E00-\u9FAF]/; // Kanji
  const kanaRegex = /[\u3040-\u309F\u30A0-\u30FF]/; // Full-width Kana
  const halfKanaRegex = /[\uFF65-\uFF9F]/; // Half-width Katakana
  const { convertText } = await import('../utils/japaneseUtils.mjs');

  let name = nameString;
  let nameKana = null;
  let nameKanji = null;

  if (halfKanaRegex.test(nameString)) {
    // Normalize half-width kana to full-width katakana first for consistent processing
    nameKana = toKatakana(toFullWidthKana(nameString));
  }

  if (kanjiRegex.test(nameString)) {
    nameKanji = nameString;
    const tempKana = await convertText(nameString); // convertText likely returns Hiragana or mixed
    nameKana = toKatakana(tempKana); // Ensure it's Katakana
    name = await transliterateKanaToRomaji(nameKana);
  } else if (kanaRegex.test(nameString) || halfKanaRegex.test(nameString)) { // Process Kana or already converted half-width
    const fullKanaForProcessing = nameKana || (halfKanaRegex.test(nameString)
      ? toFullWidthKana(nameString)
      : nameString);

    // Convert full-width numbers/alpha to half-width, full-width spaces to half-width spaces
    const normalizedKana = fullKanaForProcessing
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
      .replace(/　/g, ' ');

    nameKana = toKatakana(normalizedKana); // Ensure it's Katakana
    name = await transliterateKanaToRomaji(nameKana);
  } else {
    // Input is likely Romaji or other non-Japanese script
    name = nameString
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
      .replace(/　/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  if (nameKanji) {
    name = processNameStringWithSubstitutions(name, nameKanji);
  }

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
  const groupQuery = `
    SELECT clients.*
    FROM 
      clients
        JOIN
      client_group
        ON client_group.id = clients.client_group_id
    WHERE clients.client_group_id = (SELECT client_group_id FROM clients WHERE id = $1)
    ORDER BY clients.legal_or_natural_person, clients.name_kana, clients.name_kanji, clients.name
  `;
  const values = [clientId];

  try {
    const clientResult = await pool.query(clientQuery, values);
    const addressResult = await pool.query(addressQuery, values);
    const groupResult = await pool.query(groupQuery, values);
    return {
      client: clientResult.rows[0],
      addresses: addressResult.rows,
      group: groupResult.rows,
    };
  }
  catch (err) {
    console.error('Error selecting client and addresses:', err);
    throw new Error('Database error');
  }
};
const selectGroup = async (requestId, groupId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT 
      client_group.name as group_name
      ,client_group.comment as group_comment
      ,clients.*
      ,COALESCE(clients.name_kanji, clients.name_kana, clients.name) as display_name
    FROM 
      clients
        JOIN
      client_group
        ON client_group.id = clients.client_group_id
    WHERE clients.client_group_id = $1
    ORDER BY clients.legal_or_natural_person, clients.name_kana, clients.name_kanji, clients.name
  `;
  const values = [groupId];
  try {
    const result = await pool.query(query, values);    
    return result.rows;
  }
  catch (err) {
    console.error('Error selecting group:', err);
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
const selectClientGroups = async (requestId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT 
      client_group.id
      ,client_group.name
      ,client_group.comment
      ,COUNT(clients.id) as client_count
    FROM 
      client_group
        JOIN
      clients
        ON clients.client_group_id = client_group.id
    GROUP BY
      client_group.id
      ,client_group.name
      ,client_group.comment
    ORDER BY client_group.name  
  `;

  try {
    const result = await pool.query(query);
    return result.rows; // Return total count
  } catch (err) {
    console.error('Error retrieving client groups:', err);
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
const addClientGroup = async (requestId, user_id, group) => {  
  const pool = getPool(requestId);
  const client = await pool.connect();

  if(!group.name){
    throw new Error('Group name is required');
  }

  let query = '';
  let values = '';
  
  try {
    await client.query('BEGIN');

    query = `
      INSERT INTO client_group (
        name, comment, created_by
      ) VALUES ($1, $2, $3)
      RETURNING *;
    `;
    values = [
      group.name,
      group.comment,    
      user_id
    ];

    const groupResult = await client.query(query, values);
    const newGroupId = groupResult.rows[0].id;

    query = `
      UPDATE clients SET 
        client_group_id = $1,
        updated_by = $2
      WHERE id = $3;
    `;
    values = [
      newGroupId,
      user_id,
      group.clientId
    ];

    const clientResult = await client.query(query, values);
    
    await client.query('COMMIT');
    return {success: true};

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error adding client group and updating client:', err);
    throw new Error('Database error');
  } finally {
    client.release();
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
const editClientGroup = async (requestId, clientId, groupId, user_id) => {
  const pool = getPool(requestId);
  let query = '';
  let values = '';
  
  if(groupId !== 'null'){    
    query = `
      UPDATE clients SET
        client_group_id = $1,      
        updated_by = $2
      WHERE id = $3
      RETURNING *;
    `;
    values = [
      groupId,     
      user_id,
      clientId
    ];
  } else{    
    query = `
      UPDATE clients SET
        client_group_id = NULL,      
        updated_by = $1
      WHERE id = $2
      RETURNING *;
    `;
    values = [      
      user_id,
      clientId
    ];
  }

  try {
    const result = await pool.query(query, values);
    return result.rows;    
  } catch (err) {
    console.error('Error updating client:', err);
    throw err;
  }
};
const editGroup = async (requestId, groupId, data, user_id) => {
  const pool = getPool(requestId);
  const query = `
    UPDATE client_group SET
      name = $1
      ,comment = $2
      ,updated_by = $3
    WHERE id = $4
  `;
  const values = [
    data.name,
    data.comment,
    user_id,
    groupId
  ];
  try {
    const result = await pool.query(query, values);
    return result.rows;    
  } catch (err) {
    console.error('Error updating group:', err);
    throw err;
  }
};
const selectClientReservations = async (requestId, clientId) => {
  const pool = getPool(requestId);
  const query = `
    WITH unionData AS (
      SELECT hotel_id, id, client_id, MIN(index) AS index
      FROM (
        SELECT DISTINCT hotel_id, id, reservation_client_id as client_id, 1 AS index
        FROM reservations
        WHERE reservation_client_id = $1
        
        UNION ALL
        
        SELECT DISTINCT rd.hotel_id, rd.reservation_id, rc.client_id, 2
        FROM reservation_details rd
        JOIN reservation_clients rc
          ON rc.hotel_id = rd.hotel_id AND rc.reservation_details_id = rd.id
        WHERE rc.client_id = $1
        
        UNION ALL
        
        SELECT DISTINCT hotel_id, reservation_id, client_id, 3
        FROM reservation_payments
        WHERE client_id = $1
      ) AS all_union
      GROUP BY hotel_id, id, client_id
    )

    SELECT	
      reservations.hotel_id
      ,hotels.formal_name
      ,COALESCE(clients.name_kanji, clients.name_kana, clients.name) as client_name
      ,clients.name_kana as client_name_kana
      ,reservations.id 
      ,reservations.status
      ,reservations.check_in	
      ,reservations.check_out
      ,reservations.type
      ,reservations.created_at
      ,details.total_stays
      ,details.total_people
      ,CASE unionData.index
          WHEN 1 THEN details.total_price
          WHEN 2 THEN details_client.total_price	
          WHEN 3 THEN payments.payments		
        END AS total_price
      ,CASE unionData.index
          WHEN 1 THEN '予約者'
          WHEN 2 THEN '宿泊者'
          WHEN 3 THEN '支払者'
        END AS client_role
    FROM 
      unionData
        JOIN 
      hotels 
        ON hotels.id = unionData.hotel_id
        JOIN
      clients
        ON clients.id = unionData.client_id
        JOIN 
      reservations 
        ON reservations.hotel_id = unionData.hotel_id AND reservations.id = unionData.id
        JOIN		
      (
        SELECT
          reservation_details.hotel_id
          ,reservation_details.reservation_id
          ,COUNT(reservation_details.id) as total_stays
          ,SUM(reservation_details.number_of_people) as total_people
          ,SUM(CASE WHEN reservation_details.billable = TRUE THEN
            reservation_details.price + COALESCE(reservation_addons.price, 0)
            ELSE 0 END
          ) as total_price
        FROM
        reservation_details			
          LEFT JOIN
        reservation_addons
          ON reservation_addons.hotel_id = reservation_details.hotel_id AND reservation_addons.reservation_detail_id = reservation_details.id
        GROUP BY
          reservation_details.hotel_id
          ,reservation_details.reservation_id
      ) as details
        ON details.hotel_id = reservations.hotel_id AND details.reservation_id = reservations.id
        LEFT JOIN		
      (
        SELECT
          reservation_details.hotel_id
          ,reservation_details.reservation_id
          ,COUNT(reservation_details.id) as total_stays
          ,SUM(reservation_details.number_of_people) as total_people
          ,SUM(CASE WHEN reservation_details.billable = TRUE THEN
            reservation_details.price + COALESCE(reservation_addons.price, 0)
            ELSE 0 END
          ) as total_price
        FROM
        reservation_details			
          LEFT JOIN
        reservation_addons
          ON reservation_addons.hotel_id = reservation_details.hotel_id AND reservation_addons.reservation_detail_id = reservation_details.id
          JOIN 
        reservation_clients
          ON reservation_clients.hotel_id = reservation_details.hotel_id AND reservation_clients.reservation_details_id = reservation_details.id
        WHERE reservation_clients.client_id = $1
        GROUP BY
          reservation_details.hotel_id
          ,reservation_details.reservation_id
      ) as details_client
        ON details_client.hotel_id = reservations.hotel_id AND details_client.reservation_id = reservations.id
        LEFT JOIN 
	    (
        SELECT hotel_id, reservation_id, SUM(value) as payments FROM reservation_payments 
	      WHERE client_id = $1
	      GROUP BY hotel_id, reservation_id
      ) as payments
        ON reservations.hotel_id = payments.hotel_id AND reservations.id = payments.reservation_id
      ORDER BY reservations.check_in DESC
    ;    
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
  selectGroup,
  selectCustomerID,
  selectClientGroups,
  addClientByName,
  addNewClient,
  addNewAddress,
  addClientGroup,
  editClient,
  editClientFull,
  editAddress,
  editClientGroup,
  editGroup,
  selectClientReservations,
  deleteClient,
  deleteAddress,
};
