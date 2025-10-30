const { getPool } = require('../config/database');
const format = require('pg-format');
const logger = require('../config/logger');

// Helper
const transliterateKanaToRomaji = async (kanaString) => {
  const { toRomaji } = await import('../utils/japaneseUtils.mjs');

  const halfWidthString = kanaString
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace(/　/g, ' ') // Replace full-width spaces
    .replace(/[｡-ﾟ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0)); //convert half width katakana to half width

  let romaji = toRomaji(halfWidthString);

  romaji = romaji
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  return romaji
};
const toFullWidthKana = (str) => {
  return str.normalize('NFKC').replace(/[｡-ﾟ]/g, (char) => {
      const code = char.charCodeAt(0) - 0xFF61 + 0x30A1;
      return String.fromCharCode(code);
  });
};
const toKatakana = (str) => str.replace(/[぀-ゟ]/g, (char) =>
  String.fromCharCode(char.charCodeAt(0) + 0x60)
);
const processNameStringWithSubstitutions = (name, nameKanji) => {
    if (typeof name !== 'string' || typeof nameKanji !== 'string') {
        console.warn('processNameStringWithSubstitutions: name and nameKanji must be strings.');
        return name;
    }

    const substitutions = [
        { pattern: 'deeta', replacement: ' Data ', kanji_match: 'データ' },
        { pattern: 'denkou', replacement: ' Denkou ', kanji_match: '電工' },
        { pattern: 'gijutsu', replacement: ' Gijutsu ', kanji_match: '技術' },
        { pattern: 'giken', replacement: ' Giken ', kanji_match: '技研' },
        { pattern: 'guruupu', replacement: ' Group ', kanji_match: 'グループ' },
        { pattern: 'hausu', replacement: ' House ', kanji_match: 'ハウス' },
        { pattern: 'hokkaidou', replacement: ' Hokkaido ', kanji_match: '北海道' },
        { pattern: 'hoomu', replacement: ' Home ', kanji_match: 'ホーム' },
        { pattern: 'hoorudeingusu', replacement: ' Holdings ', kanji_match: 'ホールディングス' },
        { pattern: 'japan', replacement: ' Japan ', kanji_match: 'ジャパン' },
        { pattern: 'kabushikigaisha', replacement: ' K.K ', kanji_match: '株式会社' },
        { pattern: 'kensetsu', replacement: ' Kensetsu ', kanji_match: '建設' },
        { pattern: 'kikou', replacement: ' Kikou ', kanji_match: '機工' },
        { pattern: 'konsarutanto', replacement: ' Consultant ', kanji_match: 'コンサルタント' },
        { pattern: 'kougyou', replacement: ' Kogyo ', kanji_match: '工業' },
        { pattern: 'kougyou', replacement: ' Kogyo ', kanji_match: '興業' },
        { pattern: 'kougyou', replacement: ' Kogyo ', kanji_match: '鋼業' },
        { pattern: 'koumuten', replacement: ' Koumuten ', kanji_match: '工務店' },
        { pattern: 'kureen', replacement: ' Crane ', kanji_match: 'クレーン' },
        { pattern: 'nihon', replacement: ' Nihon ', kanji_match: '日本' },
        { pattern: 'sangyou', replacement: ' Sangyo ', kanji_match: '産業' },
        { pattern: 'setsubi', replacement: ' Setsubi ', kanji_match: '設備' },
        { pattern: 'shisutemu', replacement: ' System ', kanji_match: 'システム' },
        { pattern: 'sapporo', replacement: ' Sapporo ', kanji_match: '札幌' },
        { pattern: 'tekkou', replacement: ' Tekkou ', kanji_match: '鉄工' },
        { pattern: 'tosou', replacement: ' Tosou ', kanji_match: '塗装' }
    ];

    let updatedName = name;

    for (const sub of substitutions) {
        if (nameKanji.includes(sub.kanji_match)) {
            try {
                const regex = new RegExp(sub.pattern, 'gi');
                if (regex.test(updatedName)) {
                    updatedName = updatedName.replace(regex, sub.replacement);
                }
            } catch (e) {
                console.error(`Error creating RegExp with pattern: ${sub.pattern}`, e);
            }
        }
    }
    updatedName = updatedName.trim().replace(/\s+/g, ' ');
    // Do not change casing, just return the updatedName as-is
    return updatedName;
};
const processNameString = async (nameString) => {
  if (!nameString) {
    throw new Error('processNameString: nameString is required');
  }
  if (typeof nameString !== 'string') {
    throw new Error(`processNameString: Expected a string but ${nameString} is ${typeof nameString}`);
  }

  const kanjiRegex = /[一-龯]/;
  const kanaRegex = /[぀-ゟ゠-ヿ]/;
  const halfKanaRegex = /[･-ﾟ]/;
  const { convertText } = await import('../utils/japaneseUtils.mjs');

  let name = nameString;
  let nameKana = null;
  let nameKanji = null;

  if (halfKanaRegex.test(nameString)) {
    nameKana = toKatakana(toFullWidthKana(nameString));
  }

  if (kanjiRegex.test(nameString)) {
    nameKanji = nameString;
    const tempKana = await convertText(nameString);
    nameKana = toKatakana(tempKana);
    name = await transliterateKanaToRomaji(nameKana);
  } else if (kanaRegex.test(nameString) || halfKanaRegex.test(nameString)) {
    const fullKanaForProcessing = nameKana || (halfKanaRegex.test(nameString)
      ? toFullWidthKana(nameString)
      : nameString);
    const normalizedKana = fullKanaForProcessing
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
      .replace(/　/g, ' ');
    nameKana = toKatakana(normalizedKana);
    name = await transliterateKanaToRomaji(nameKana);
  } else {
    name = nameString
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
      .replace(/　/g, ' ');
    // Do not change casing
  }

  if (nameKanji) {
    name = processNameStringWithSubstitutions(name, nameKanji);
  }
  return { name, nameKana, nameKanji };
};

const getAllClients = async (requestId, limit, offset) => {
  const pool = getPool(requestId);
  const query = `
    SELECT
      clients.*,
      COALESCE(clients.name_kanji, clients.name_kana, clients.name) AS name,
      CONCAT(clients.name, clients.name_kana, clients.name_kanji) AS full_name_key,
      CASE WHEN clients.legal_or_natural_person = 'legal' THEN TRUE ELSE FALSE END AS is_legal_person
    FROM clients
    WHERE id not in('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222')
    ORDER BY COALESCE(clients.name_kanji, clients.name_kana, clients.name) ASC
    LIMIT $1 OFFSET $2
  `;
  try {
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
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
    WHERE id not in('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222')
  `;
  try {
    const result = await pool.query(query);
    return parseInt(result.rows[0].count);
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
    return result.rows;
  } catch (err) {
    console.error('Error retrieving client groups:', err);
    throw new Error('Database error');
  }
};
const addClientByName = async (requestId, client = {}, dbClient = null) => {
  
  const pool = dbClient || getPool(requestId);

  let finalName, finalNameKana, finalNameKanji;
  //logger.warn(`[CLIENT_CREATE] Original name input: ${client.name}`);
  const { name, nameKana, nameKanji } = await processNameString(client.name);
  finalName = name; finalNameKana = nameKana; finalNameKanji = nameKanji;
  //logger.warn(`[CLIENT_CREATE] Capitalized name: ${finalName}`);
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
    //logger.warn('[CLIENT_CREATE] addClientByName input', { client });
    //logger.warn('[CLIENT_CREATE] Processed names', { finalName, finalNameKana, finalNameKanji });
    //logger.warn('[CLIENT_CREATE] Query and values', { query, values });
    const result = await pool.query(query, values);
    //logger.warn('[CLIENT_CREATE] Client inserted', { client_id: result.rows[0]?.id });
    return result.rows[0];
  } catch (err) {
    logger.warn('Error adding client', { error: err.message, stack: err.stack });
    throw new Error('Database error');
  }
};
const addNewClient = async (requestId, user_id, client) => {
  const pool = getPool(requestId);
  if(!client.name && !client.name_kana && !client.name_kanji){
    throw new Error('Client name is required');
  }
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
    return result.rows[0];
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(format('SET SESSION "my_app.user_id" = %L;', updatedBy));
    const query = format(`
      DELETE FROM clients
      WHERE id = %L
      RETURNING *;
    `, clientId);
    const result = await client.query(query);
    await client.query('COMMIT');
    return result.rowCount;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting client:', err);
    throw new Error('Database error');
  } finally {
    client.release();
  }
};
const deleteAddress = async (requestId, addressId, updatedBy) => {
  const pool = getPool(requestId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(format('SET SESSION "my_app.user_id" = %L;', updatedBy));
    const query = format(`
      DELETE FROM addresses
      WHERE id = %L
      RETURNING *;
    `, addressId);
    const result = await client.query(query);
    await client.query('COMMIT');
    return result.rowCount;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting address:', err);
    throw new Error('Database error');
  } finally {
    client.release();
  }
};

// --- Client Relationship Data Access Functions ---

const findRelationshipsByClientId = async (requestId, clientId) => {
  const pool = getPool(requestId);
  const sql = `
    SELECT
        cr.id AS relationship_id,
        c.id AS related_company_id,
        COALESCE(c.name_kanji, c.name_kana, c.name, '') AS related_company_name,
        cr.source_relationship_type AS our_perspective_type,
        cr.target_relationship_type AS their_perspective_type,
        cr.comment
    FROM client_relationships cr JOIN clients c ON cr.target_client_id = c.id
    WHERE cr.source_client_id = $1
    UNION ALL
    SELECT
        cr.id AS relationship_id,
        c.id AS related_company_id,
        COALESCE(c.name_kanji, c.name_kana, c.name, '') AS related_company_name,
        cr.target_relationship_type AS our_perspective_type,
        cr.source_relationship_type AS their_perspective_type,
        cr.comment
    FROM client_relationships cr JOIN clients c ON cr.source_client_id = c.id
    WHERE cr.target_client_id = $1;
  `;
  try {
    const result = await pool.query(sql, [clientId]);
    return result.rows;
  } catch (err) {
    console.error('Error in findRelationshipsByClientId:', err);
    throw new Error('Database error finding client relationships');
  }
};
const insertRelationship = async (requestId, relationshipData) => {
  const pool = getPool(requestId);
  const sql = `
    INSERT INTO client_relationships (
        source_client_id, source_relationship_type,
        target_client_id, target_relationship_type, comment
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const { source_client_id, source_relationship_type, target_client_id, target_relationship_type, comment } = relationshipData;
  const params = [source_client_id, source_relationship_type, target_client_id, target_relationship_type, comment];
  try {
    const result = await pool.query(sql, params);
    return result.rows[0];
  } catch (err) {
    console.error('Error in insertRelationship:', err);
    if (err.code === '23505') { // Unique violation
        throw new Error('This client relationship already exists.');
    }
    throw new Error('Database error inserting relationship');
  }
};
const updateRelationshipById = async (requestId, relationshipId, dataToUpdate) => {
  const pool = getPool(requestId);
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (typeof dataToUpdate.source_relationship_type !== 'undefined') {
    fields.push(`source_relationship_type = $${paramIndex++}`);
    values.push(dataToUpdate.source_relationship_type);
  }
  if (typeof dataToUpdate.target_relationship_type !== 'undefined') {
    fields.push(`target_relationship_type = $${paramIndex++}`);
    values.push(dataToUpdate.target_relationship_type);
  }
  if (typeof dataToUpdate.comment !== 'undefined') {
    fields.push(`comment = $${paramIndex++}`);
    values.push(dataToUpdate.comment);
  }

  if (fields.length === 0) {
    throw new Error("No fields provided for update.");
  }
  values.push(relationshipId);
  const sql = `
    UPDATE client_relationships
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *;
  `;
  try {
    const result = await pool.query(sql, values);
    return result.rows[0];
  } catch (err) {
    console.error('Error in updateRelationshipById:', err);
    throw new Error('Database error updating relationship');
  }
};
const deleteRelationshipById = async (requestId, relationshipId) => {
  const pool = getPool(requestId);
  const sql = `DELETE FROM client_relationships WHERE id = $1 RETURNING *;`;
  try {
    const result = await pool.query(sql, [relationshipId]);
    return result.rows[0];
  } catch (err) {
    console.error('Error in deleteRelationshipById:', err);
    throw new Error('Database error deleting relationship');
  }
};
const findAllCommonRelationshipPairs = async (requestId) => {
  const pool = getPool(requestId);
  const dynamic_common_pairs_sql = `
    SELECT
        source_relationship_type AS source_to_target_type,
        target_relationship_type AS target_to_source_type,
        CONCAT(source_relationship_type, ' / ', target_relationship_type) AS pair_name,
        COUNT(*) AS occurrence_count
    FROM
        client_relationships
    GROUP BY
        source_relationship_type,
        target_relationship_type
    ORDER BY
        occurrence_count DESC, pair_name ASC;
  `;
  try {
    const result = await pool.query(dynamic_common_pairs_sql);
    return result.rows;
  } catch (err) {
    console.error('Error in findAllCommonRelationshipPairs:', err);
    throw new Error('Database error finding common relationship pairs');
  }
};
const findLegalPersonClients = async (requestId, queryParams = {}) => {
    const pool = getPool(requestId);
    const limit = queryParams.limit || 1000;
    const offset = queryParams.offset || 0;
    const sql = `
        SELECT clients.*,
                COALESCE(clients.name_kanji, clients.name_kana, clients.name) AS name,
                CONCAT(clients.name, clients.name_kana, clients.name_kanji) AS full_name_key,
                TRUE AS is_legal_person
        FROM clients
        WHERE id not in('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222')
          AND clients.legal_or_natural_person = 'legal'
        ORDER BY COALESCE(clients.name_kanji, clients.name_kana, clients.name) ASC
        LIMIT $1 OFFSET $2;
    `;
    try {
        const result = await pool.query(sql, [limit, offset]);
        return result.rows;
    } catch (err) {
        console.error('Error in findLegalPersonClients:', err);
        throw new Error('Database error finding legal person clients');
    }
};
const getLegalStatusForClientIds = async (requestId, arrayOfClientIds) => {
  const pool = getPool(requestId);
  const sql = `SELECT id, name, legal_or_natural_person FROM clients WHERE id = ANY($1::uuid[]);`;
  try {
    const result = await pool.query(sql, [arrayOfClientIds]);
    return result.rows;
  } catch (err) {
    console.error('Error in getLegalStatusForClientIds:', err);
    throw new Error('Database error fetching legal status for clients');
  }
};

async function mergeClientData(requestId, oldClientId, newClientId, mergedFields, addressIdsToKeep = [], userId) {
  const pool = getPool(requestId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update the primary client's data
    const updateQuery = `
      UPDATE clients SET
        name = $1, name_kana = $2, name_kanji = $3, date_of_birth = $4, 
        legal_or_natural_person = $5, gender = $6, email = $7, phone = $8, 
        fax = $9, updated_by = $10
      WHERE id = $11
      RETURNING *;
    `;
    const values = [
      mergedFields.name, mergedFields.name_kana, mergedFields.name_kanji, mergedFields.date_of_birth,
      mergedFields.legal_or_natural_person, mergedFields.gender, mergedFields.email, mergedFields.phone,
      mergedFields.fax, userId, newClientId
    ];
    await client.query(updateQuery, values);

    // 2. Re-parent addresses from the old client to the new one
    if (addressIdsToKeep.length > 0) {
      const updateAddressesQuery = `
        UPDATE addresses SET client_id = $1, updated_by = $2 WHERE id = ANY($3::uuid[]);
      `;
      await client.query(updateAddressesQuery, [newClientId, userId, addressIdsToKeep]);
    }

    // 3. Delete addresses from the old client that were not selected to be kept
    const deleteAddressesQuery = `
      DELETE FROM addresses WHERE client_id = $1 AND id NOT IN (SELECT unnest($2::uuid[]));
    `;
    await client.query(deleteAddressesQuery, [oldClientId, addressIdsToKeep]);

    // 4. Update foreign key references in other tables
    const tablesToUpdate = [
      { name: 'reservations', column: 'reservation_client_id' },
      { name: 'reservation_clients', column: 'client_id' },
      { name: 'reservation_payments', column: 'client_id' },
      { name: 'invoices', column: 'client_id' },
      { name: 'waitlist_entries', column: 'client_id' },
      { name: 'crm_actions', column: 'client_id' }
    ];

    for (const table of tablesToUpdate) {
      const query = `UPDATE ${table.name} SET ${table.column} = $1, updated_by = $3 WHERE ${table.column} = $2`;
      await client.query(query, [newClientId, oldClientId, userId]);
    }

    // 5. Update client_relationships (source and target)
    await client.query('UPDATE client_relationships SET source_client_id = $1 WHERE source_client_id = $2', [newClientId, oldClientId]);
    await client.query('UPDATE client_relationships SET target_client_id = $1 WHERE target_client_id = $2', [newClientId, oldClientId]);

    // 6. Update projects JSONB field    
    const projectsQuery = `
      UPDATE projects
      SET related_clients = (
        SELECT jsonb_agg(
          CASE
            WHEN (elem->>'clientId')::uuid = $1::uuid THEN jsonb_set(elem, '{clientId}', to_jsonb($2::text))
            ELSE elem
          END
        )
        FROM jsonb_array_elements(related_clients) AS elem
      )
      WHERE related_clients @> jsonb_build_array(jsonb_build_object('clientId', $1::text));
    `;
    await client.query(projectsQuery, [oldClientId, newClientId]);

    // 7. Finally, delete the old client
    await client.query('DELETE FROM clients WHERE id = $1', [oldClientId]);

    await client.query('COMMIT');
    return { success: true, message: 'Clients merged successfully' };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error merging clients:', error);
    throw new Error('Database error during client merge');
  } finally {
    client.release();
  }
}

// --- Client Impediment Model Methods ---
const createImpediment = async (requestId, impedimentData, userId) => {
  const pool = getPool(requestId);
  const {
    client_id,
    impediment_type,
    restriction_level,
    description,
    is_active = true,
    start_date,
    end_date,
  } = impedimentData;

  const query = `
    INSERT INTO client_impediments (
      client_id,
      impediment_type,
      restriction_level,
      description,
      is_active,
      start_date,
      end_date,
      created_by,
      updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;

  const values = [
    client_id,
    impediment_type,
    restriction_level,
    description,
    is_active,
    start_date,
    end_date,
    userId,
    userId,
  ];

  try {
    const result = await pool.query(query, values);
    logger.info(`[ClientImpediment] New impediment created for client ${client_id} by user ${userId}`);
    return result.rows[0];
  } catch (err) {
    logger.error(`[ClientImpediment] Error creating impediment for client ${client_id}:`, err);
    throw new Error('Database error while creating client impediment.');
  }
};
const getImpedimentsByClientId = async (requestId, clientId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT *
    FROM client_impediments
    WHERE client_id = $1
    ORDER BY created_at DESC;
  `;

  try {
    const result = await pool.query(query, [clientId]);
    return result.rows;
  } catch (err) {
    logger.error(`[ClientImpediment] Error retrieving impediments for client ${clientId}:`, err);
    throw new Error('Database error while retrieving client impediments.');
  }
};
const updateImpediment = async (requestId, impedimentId, updatedFields, userId) => {
  const pool = getPool(requestId);
  
  const fields = [];
  const values = [];
  let paramIndex = 1;

  // Fields that are managed by the server, not by the client
  const serverManagedFields = ['updated_by', 'updated_at'];

  // Dynamically build the SET clause
  for (const [key, value] of Object.entries(updatedFields)) {
    // Skip server-managed fields from updatedFields since we set them explicitly
    if (value !== undefined && !serverManagedFields.includes(key)) {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  }

  // Add updated_by and updated_at
  fields.push(`updated_by = $${paramIndex++}`);
  values.push(userId);
  fields.push(`updated_at = CURRENT_TIMESTAMP`);

  if (fields.length === 0) {
    throw new Error("No fields provided for update.");
  }
  
  values.push(impedimentId);

  const query = `
    UPDATE client_impediments
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('Impediment not found.');
    }
    logger.info(`[ClientImpediment] Impediment ${impedimentId} updated by user ${userId}`);
    return result.rows[0];
  } catch (err) {
    logger.error(`[ClientImpediment] Error updating impediment ${impedimentId}:`, err);
    throw new Error('Database error while updating client impediment.');
  }
};
const deleteImpediment = async (requestId, impedimentId) => {
  const pool = getPool(requestId);
  const query = `
    DELETE FROM client_impediments
    WHERE id = $1
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, [impedimentId]);
    if (result.rows.length === 0) {
      throw new Error('Impediment not found.');
    }
    logger.info(`[ClientImpediment] Impediment ${impedimentId} deleted.`);
    return result.rows[0];
  } catch (err) {
    logger.error(`[ClientImpediment] Error deleting impediment ${impedimentId}:`, err);
    throw new Error('Database error while deleting client impediment.');
  }
};

const getAllClientsForExport = async (requestId, filters = {}) => {
  const pool = getPool(requestId);
  let query = `
    SELECT
      c.name_kanji,
      c.name_kana,
      c.name,
      CASE
        WHEN c.gender = 'male' THEN '男性'
        WHEN c.gender = 'female' THEN '女性'
        ELSE 'その他・未設定'
      END AS gender,
      c.email,
      c.phone,
      c.fax,
      CASE
        WHEN c.billing_preference = 'paper' THEN '紙請求'
        ELSE '電子'
      END AS billing_preference,
      c.website,
      c.customer_id,
      CASE
        WHEN ci.restriction_level = 'block' THEN '取引禁止'
        WHEN ci.restriction_level = 'warning' THEN '取引注意'
        ELSE ci.restriction_level::TEXT
      END AS restriction_level,
      c.id,
      c.comment,
      c.created_at
    FROM
      clients c
      LEFT JOIN (
        SELECT DISTINCT client_id, restriction_level
        FROM client_impediments
        WHERE restriction_level = 'block' AND is_active = true
        UNION ALL
        SELECT DISTINCT client_id, restriction_level
        FROM client_impediments
        WHERE restriction_level = 'warning' AND is_active = true
      ) ci ON c.id = ci.client_id
    WHERE
      c.id NOT IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
  `;
  const values = [];

  if (filters.created_after) {
    values.push(filters.created_after);
    query += ` AND c.created_at >= $${values.length}`;
  }

  query += ` ORDER BY customer_id, name_kana, name_kanji, created_at`;

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving all clients for export:', err);
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
  findRelationshipsByClientId,
  insertRelationship,
  updateRelationshipById,
  deleteRelationshipById,
  findAllCommonRelationshipPairs,
  findLegalPersonClients,
  getLegalStatusForClientIds,
  mergeClientData,
  createImpediment,
  getImpedimentsByClientId,
  updateImpediment,
  deleteImpediment,
  getAllClientsForExport,
};
