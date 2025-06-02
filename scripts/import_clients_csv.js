// Node.js script to import clients from a CSV file

const fs = require('fs');
const { parse } = require('csv-parse');
const crypto = require('crypto'); // Added for UUID generation
const { getPool } = require('../api/config/database'); // Adjust path as necessary

const CSV_FILE_PATH = './temp/顧客マスター - 顧客.csv'; // Changed to relative path
const USER_ID_PLACEHOLDER = 1; // Placeholder for created_by/updated_by

/**
 * Helper function to promisify the CSV parsing.
 * This allows us to use async/await with the parse function.
 * @param {string} fileContent - The content of the CSV file.
 * @param {object} options - Options for the csv-parse library.
 * @returns {Promise<Array<object>>} A promise that resolves with an array of records.
 */
function parseCsvPromise(fileContent, options) {
    return new Promise((resolve, reject) => {
        parse(fileContent, options, (err, records) => {
            if (err) {
                reject(err);
            } else {
                resolve(records);
            }
        });
    });
}

// --- Name Processing Helper Functions (adapted from api/models/clients.js) ---

/**
 * Transliterates Kana string to Romaji, capitalizing words.
 * Assumes japaneseUtils.mjs exports toRomaji.
 * @param {string} kanaString - The Kana string to transliterate.
 * @returns {Promise<string>} The Romaji string.
 */
async function transliterateKanaToRomaji(kanaString) {
    if (!kanaString) return ''; // Handle null or empty input

    // Assuming japaneseUtils.mjs is in PROJECT_ROOT/utils/japaneseUtils.mjs
    // and this script is in PROJECT_ROOT/scripts/import_clients_csv.js
    // The path for dynamic import is relative to this file.
    const { toRomaji } = await import('../api/utils/japaneseUtils.mjs');

    const halfWidthString = kanaString
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0)) // Full-width alpha-num to half-width
        .replace(/　/g, ' ') // Replace full-width spaces with regular spaces
        .replace(/[\uFF61-\uFF9F]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0)); // Half-width Katakana to (what seems to be an attempt at half-width, ensure toRomaji handles this)

    let romaji = toRomaji(halfWidthString); // Call the utility function

    // Capitalize the first letter of each word
    romaji = romaji
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    return romaji;
}

/**
 * Converts a string to full-width Katakana.
 * Normalizes NFKC, then converts half-width Katakana characters.
 * @param {string} str - The input string.
 * @returns {string|null} Full-width Katakana string or null if input is null/undefined.
 */
function toFullWidthKana(str) {
    if (str === null || typeof str === 'undefined') return null;
    return str.normalize('NFKC').replace(/[\uFF61-\uFF9F]/g, (char) => { // Half-width Katakana range
        const code = char.charCodeAt(0) - 0xFF61 + 0x30A1; // Offset to full-width Katakana start
        return String.fromCharCode(code);
    });
}

/**
 * Converts Hiragana characters in a string to Katakana.
 * @param {string} str - The input string.
 * @returns {string|null} String with Hiragana converted to Katakana or null if input is null/undefined.
 */
function toKatakana(str) {
    if (str === null || typeof str === 'undefined') return null;
    return str.replace(/[\u3040-\u309F]/g, (char) => // Hiragana range
        String.fromCharCode(char.charCodeAt(0) + 0x60) // Offset to Katakana
    );
}

/**
 * Processes name strings from CSV to extract/derive Kanji, Kana, and Romaji.
 * Uses helper functions for conversion and transliteration.
 * @param {string} nameKanjiFullCsv - The full name in Kanji (from CSV's "取引先名").
 * @param {string} nameKanaFullCsv - The full name in Kana (from CSV's "取引先名（かな）").
 * @returns {Promise<{name: string, name_kana: string, name_kanji: string}>}
 */
async function processNameString(nameKanjiFullCsv, nameKanaFullCsv) {
    const name_kanji = nameKanjiFullCsv ? nameKanjiFullCsv.trim() : null;
    // Normalize CSV Kana input to full-width Katakana
    let name_kana = nameKanaFullCsv ? toKatakana(toFullWidthKana(nameKanaFullCsv.trim())) : null;

    let name_romaji = 'Unknown'; // This will be the 'name' field

    if (name_kana) {
        // If Kana is provided in the CSV, use it as the primary source for Romaji
        name_romaji = await transliterateKanaToRomaji(name_kana);
    } else if (name_kanji) {
        // If Kana is not in CSV, but Kanji is, try to derive Kana from Kanji, then get Romaji
        try {
            // Assuming japaneseUtils.mjs exports convertText for Kanji to Kana (likely Hiragana)
            const { convertText } = await import('../api/utils/japaneseUtils.mjs');
            const derivedKanaFromKanji = await convertText(name_kanji); // e.g., "山田太郎" -> "やまだたろう"

            if (derivedKanaFromKanji && derivedKanaFromKanji !== name_kanji) { // Check if conversion happened
                const katakanaFromKanji = toKatakana(toFullWidthKana(derivedKanaFromKanji)); // "やまだたろう" -> "ヤマダタロウ"
                if (katakanaFromKanji) {
                    name_romaji = await transliterateKanaToRomaji(katakanaFromKanji);
                    // We don't automatically populate name_kana here from derivedKana,
                    // as name_kana is intended to reflect the CSV's Kana column.
                    // If the CSV Kana column was empty, name_kana remains null.
                } else {
                    name_romaji = name_kanji; // Fallback if derived Kana is empty
                }
            } else {
                 name_romaji = name_kanji; // Fallback if convertText doesn't change Kanji (or returns null/empty)
            }
        } catch (e) {
            console.warn(`Could not derive Kana from Kanji "${name_kanji}" for Romaji conversion: ${e.message}. Using Kanji as Romaji fallback.`);
            name_romaji = name_kanji; // Fallback to Kanji itself if conversion process fails
        }
    }
    // If name_romaji is still 'Unknown' (neither CSV Kana nor derived Kana from Kanji worked),
    // use Kanji as a last resort if available.
    if (name_romaji === 'Unknown' && name_kanji) {
        name_romaji = name_kanji;
    }


    return {
        name: name_romaji || 'Unknown', // Ensure 'name' (Romaji) is never null
        name_kana: name_kana,       // This is from CSV "取引先名（かな）", normalized
        name_kanji: name_kanji,      // This is from CSV "取引先名"
    };
}

/**
 * Main function to import clients from the CSV file.
 * @param {boolean} dryRun - If true, simulates the import without DB changes.
 */
async function importCSV(dryRun) {
    console.log(`Starting CSV import ${dryRun ? '(dry run)' : ''}...`);
    let pool;
    let client;

    try {
        const fileContent = fs.readFileSync(CSV_FILE_PATH, { encoding: 'utf8' });
        const records = await parseCsvPromise(fileContent, {
            columns: true,
            skip_empty_lines: true,
            from_line: 1,
        });

        console.log(`Found ${records.length} records in CSV.`);
        let successCount = 0;
        let failureCount = 0;

        if (!dryRun && records.length > 0) {
            const requestId = crypto.randomUUID();
            pool = getPool(requestId);
            client = await pool.connect();
            console.log('Database client connected.');
        } else if (!dryRun && records.length === 0) {
            console.log('No records to import, database connection not initiated.');
        }

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            console.log(`\nProcessing record ${i + 1}/${records.length}: ${record['顧客ID']} - ${record['取引先名']}`);

            try {
                // Use the new async processNameString
                const processedNames = await processNameString(record['取引先名'], record['取引先名（かな）']);

                const clientData = {
                    customer_id: record['顧客ID'] || null,
                    name: processedNames.name, // This is Romaji
                    name_kana: processedNames.name_kana, // This is Katakana (from CSV Kana or null)
                    name_kanji: processedNames.name_kanji, // This is Kanji (from CSV Kanji or null)
                    legal_or_natural_person: 'legal',
                    email: record['代表E-mail'] || null,
                    phone: record['代表電話'] || null,
                    fax: record['代表Fax'] || null,
                    website: record['Web サイト'] || null,
                    billing_preference: 'paper',
                    comment: '',
                    created_by: USER_ID_PLACEHOLDER,
                    updated_by: USER_ID_PLACEHOLDER,
                };

                const billingMethod = record['請求書発行方法'] || '';
                if (billingMethod.includes('メール')) {
                    clientData.billing_preference = 'digital';
                } else if (billingMethod.includes('紙') || billingMethod.includes('郵送')) {
                    clientData.billing_preference = 'paper';
                }

                let comments = [];
                if (record['取引注意フラグ'] && record['取引注意フラグ'] !== '取引可') {
                    comments.push(`取引注意: ${record['取引注意フラグ']}`);
                }
                if (record['請求書関連備考']) comments.push(`請求書備考: ${record['請求書関連備考']}`);
                if (record['備考']) comments.push(`備考: ${record['備考']}`);
                if (record['業種']) comments.push(`業種: ${record['業種']}`);
                if (record['資本金']) comments.push(`資本金: ${record['資本金']}`);
                if (record['従業員数']) comments.push(`従業員数: ${record['従業員数']}`);
                if (record['工事対応エリア']) comments.push(`工事対応エリア: ${record['工事対応エリア']}`);
                if (record['関連会社']) comments.push(`関連会社: ${record['関連会社']}`);
                if (record['※企業コード']) comments.push(`企業コード: ${record['※企業コード']}`);
                clientData.comment = comments.join('\n');

                const billingAddress = {
                    address_name: '請求先',
                    street: `${record['住所(請求先)'] || ''} ${record['ビル名（請求先）'] || ''}`.trim(),
                    state: record['都道府県(請求先)'] || null,
                    city: null,
                    postal_code: record['郵便番号(請求先)'] || null,
                    country: 'Japan',
                    created_by: USER_ID_PLACEHOLDER,
                    updated_by: USER_ID_PLACEHOLDER,
                };

                let billingCity = null;
                const billingAddressFull = record['住所(請求先)'] || '';
                if (billingAddressFull) {
                    const match = billingAddressFull.match(/(.+?[都道府県])?(.*?[市区町村郡])/);
                    if (match && match[2]) {
                        billingCity = match[2].trim();
                    } else {
                        const parts = billingAddressFull.split(/[市区町村郡]/);
                        if (parts.length > 1 && billingAddressFull.match(/[市区町村郡]/)) {
                             billingCity = parts[0] + billingAddressFull.match(/[市区町村郡]/)[0];
                        } else {
                            billingCity = billingAddressFull.split(' ')[0];
                        }
                    }
                }
                billingAddress.city = billingCity;

                let invoiceMailingAddress = null;
                const invoiceCompany = record['会社名(請求書発送先)'];
                const invoiceZip = record['郵便番号(請求書発送先)'];
                const invoiceStreet1 = record['住所(請求書発送先)'];
                const invoiceStreet2 = record['ビル名(請求書発送先)'];

                if (invoiceCompany || invoiceZip || invoiceStreet1 || invoiceStreet2) {
                    const tempInvoiceStreet = `${invoiceStreet1 || ''} ${invoiceStreet2 || ''}`.trim();
                    const tempInvoiceState = record['都道府県(請求書発送先)'] || null;
                    if (invoiceCompany !== clientData.name_kanji ||
                        invoiceZip !== billingAddress.postal_code ||
                        tempInvoiceStreet !== billingAddress.street ||
                        tempInvoiceState !== billingAddress.state
                    ) {
                        invoiceMailingAddress = {
                            address_name: '請求書送付先',
                            representative_name: invoiceCompany || null,
                            street: tempInvoiceStreet,
                            state: tempInvoiceState,
                            city: null,
                            postal_code: invoiceZip || null,
                            country: 'Japan',
                            phone: record['TEL(請求書発送先)'] || null,
                            fax: record['FAX(請求書発送先)'] || null,
                            created_by: USER_ID_PLACEHOLDER,
                            updated_by: USER_ID_PLACEHOLDER,
                        };
                        let invoiceCity = null;
                        const invoiceAddressFull = invoiceStreet1 || '';
                        if (invoiceAddressFull) {
                            const match = invoiceAddressFull.match(/(.+?[都道府県])?(.*?[市区町村郡])/);
                            if (match && match[2]) {
                                invoiceCity = match[2].trim();
                            } else {
                                const parts = invoiceAddressFull.split(/[市区町村郡]/);
                                if (parts.length > 1 && invoiceAddressFull.match(/[市区町村郡]/)) {
                                    invoiceCity = parts[0] + invoiceAddressFull.match(/[市区町村郡]/)[0];
                                } else {
                                    invoiceCity = invoiceAddressFull.split(' ')[0];
                                }
                            }
                        }
                        invoiceMailingAddress.city = invoiceCity;
                    }
                }

                if (dryRun) {
                    console.log('[Dry Run] Would insert client:', JSON.stringify(clientData, null, 2));
                    console.log('[Dry Run] Would insert billing address:', JSON.stringify(billingAddress, null, 2));
                    if (invoiceMailingAddress) {
                        console.log('[Dry Run] Would insert invoice mailing address:', JSON.stringify(invoiceMailingAddress, null, 2));
                    }
                    successCount++;
                } else {
                    if (!client) {
                        console.error(`Database client not available for record ${record['顧客ID']}. Skipping.`);
                        failureCount++;
                        continue;
                    }
                    try {
                        await client.query('BEGIN');
                        const clientInsertQuery = `
                            INSERT INTO clients (
                                customer_id, name, name_kana, name_kanji, legal_or_natural_person,
                                email, phone, fax, website, billing_preference, comment,
                                created_by, updated_by, created_at
                            ) VALUES (
                                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
                            ) RETURNING id;
                        `;
                        const clientResult = await client.query(clientInsertQuery, [
                            clientData.customer_id, clientData.name, clientData.name_kana, clientData.name_kanji,
                            clientData.legal_or_natural_person, clientData.email, clientData.phone, clientData.fax,
                            clientData.website, clientData.billing_preference, clientData.comment,
                            clientData.created_by, clientData.updated_by
                        ]);
                        const newClientId = clientResult.rows[0].id;

                        const addressInsertQuery = `
                            INSERT INTO addresses (
                                client_id, address_name, representative_name, street, state, city, postal_code, country,
                                phone, fax, created_by, updated_by, created_at
                            ) VALUES (
                                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
                            );
                        `;
                        await client.query(addressInsertQuery, [
                            newClientId, billingAddress.address_name, null,
                            billingAddress.street, billingAddress.state, billingAddress.city, billingAddress.postal_code,
                            billingAddress.country, null, null,
                            billingAddress.created_by, billingAddress.updated_by
                        ]);

                        if (invoiceMailingAddress) {
                            await client.query(addressInsertQuery, [
                                newClientId, invoiceMailingAddress.address_name, invoiceMailingAddress.representative_name,
                                invoiceMailingAddress.street, invoiceMailingAddress.state, invoiceMailingAddress.city,
                                invoiceMailingAddress.postal_code, invoiceMailingAddress.country, invoiceMailingAddress.phone,
                                invoiceMailingAddress.fax, invoiceMailingAddress.created_by, invoiceMailingAddress.updated_by
                            ]);
                        }
                        await client.query('COMMIT');
                        console.log(`Successfully inserted client ${clientData.customer_id} and addresses.`);
                        successCount++;
                    } catch (dbError) {
                        console.error(`DB TRANSACTION FAILED for record ${record['顧客ID']}:`, dbError.message, dbError.stack ? `\nStack: ${dbError.stack}` : '');
                        failureCount++;
                        if (client) {
                            try {
                                await client.query('ROLLBACK');
                            } catch (rollbackError) {
                                console.error(`Rollback ALSO FAILED for record ${record['顧客ID']}:`, rollbackError.message, rollbackError.stack ? `\nStack: ${rollbackError.stack}` : '');
                            }
                        }
                    }
                }
            } catch (processError) {
                console.error(`GENERAL PROCESSING ERROR for record ${record['顧客ID']}:`, processError.message, processError.stack ? `\nStack: ${processError.stack}` : '');
                failureCount++;
            }
        }

        console.log(`\nImport summary:`);
        console.log(`Total records processed: ${records.length}`);
        console.log(`Successful inserts: ${successCount}`);
        console.log(`Failed inserts: ${failureCount}`);

    } catch (error) {
        console.error('MAJOR SCRIPT ERROR during import process:', error.message, error.stack ? `\nStack: ${error.stack}` : '');
    } finally {
        if (client && !dryRun) {
            try {
                client.release();
                console.log('Database client released.');
            } catch (releaseError) {
                console.error('Error releasing database client:', releaseError.message, releaseError.stack ? `\nStack: ${releaseError.stack}` : '');
            }
        }
    }
}

// --- Main execution ---
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

importCSV(dryRun).catch(err => {
    console.error("UNHANDLED PROMISE REJECTION in importCSV:", err.message, err.stack ? `\nStack: ${err.stack}` : '');
});
