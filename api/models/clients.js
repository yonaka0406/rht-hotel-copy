const pool = require('../config/database');

const transliterateKanaToRomaji = async (kanaString) => {  
  const { toRomaji } = await import('../utils/japaneseUtils.mjs');

  const halfWidthString = kanaString
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace(/　/g, ' ') // Replace full-width spaces
    .replace(/[\uFF61-\uFF9F]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0)); //convert half width katakana to half width

  let romaji = toRomaji(halfWidthString);
  console.log('Kana $1 became $2',[kanaString,romaji]);

  // Capitalize the first letter and return the result  
  romaji = romaji
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  return romaji
};

const processNameString = async (nameString) => {
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
    console.log('Half-width kana provided: ', nameString);
    nameKana = toFullWidthKana(nameString);
    console.log('Half-width kana converted: ', nameKana);
  };

  if (kanjiRegex.test(nameString)) {
    nameKanji = nameString;
    nameKana = await convertText(nameString);
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

  console.log([name, nameKana, nameKanji]);

  return { name, nameKana, nameKanji };
}

// Return all clients
const getAllClients = async () => {
  const query = 'SELECT clients.*, CONCAT(clients.name, clients.name_kana, clients.name_kanji) AS full_name_key FROM clients ORDER BY name ASC';

  try {
    const result = await pool.query(query);    
    return result.rows; // Return all
  } catch (err) {
    console.error('Error retrieving all clients:', err);
    throw new Error('Database error');
  }
};

// Function to add a new client with minimal info
const addClientByName = async (client) => {
  const { name, nameKana, nameKanji } = await processNameString(client.name);

  const query = `
    INSERT INTO clients (
      name, name_kana, name_kanji, legal_or_natural_person, gender, email, phone, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;

  const values = [
    name,
    nameKana,
    nameKanji,
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

module.exports = {
  getAllClients,
  addClientByName,
};
