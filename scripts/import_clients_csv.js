// Node.js script to import clients from a CSV file
// node scripts/import_clients_csv.js --dev
// node scripts/import_clients_csv.js --prod

const fs = require('fs');
const { parse } = require('csv-parse');

const { getPool, getDevPool, getProdPool } = require('../api/config/database'); // Adjust path as necessary

const CSV_FILE_PATH = './temp/顧客マスター - 顧客.csv';
const USER_ID_PLACEHOLDER = 1;

// Helper function to promisify the CSV parsing
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

// --- Name Processing Helper Functions ---
async function transliterateKanaToRomaji(kanaString) {
    if (!kanaString) return '';
    const { toRomaji } = await import('../api/utils/japaneseUtils.mjs');
    const halfWidthString = kanaString
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
        .replace(/　/g, ' ')
        .replace(/[\uFF61-\uFF9F]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0));
    let romaji = toRomaji(halfWidthString);
    romaji = romaji
        .split(' ')
        .map(word => word === word.toUpperCase() ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    return romaji;
}

function toFullWidthKana(str) {
    if (str === null || typeof str === 'undefined') return null;
    return str.normalize('NFKC').replace(/[\uFF61-\uFF9F]/g, (char) => {
        const code = char.charCodeAt(0) - 0xFF61 + 0x30A1;
        return String.fromCharCode(code);
    });
}

function toKatakana(str) {
    if (str === null || typeof str === 'undefined') return null;
    return str.replace(/[\u3040-\u309F]/g, (char) =>
        String.fromCharCode(char.charCodeAt(0) + 0x60)
    );
}

async function processNameString(nameKanjiFullCsv, nameKanaFullCsv) {
    const name_kanji = nameKanjiFullCsv ? nameKanjiFullCsv.trim() : null;
    let name_kana = nameKanaFullCsv ? toKatakana(toFullWidthKana(nameKanaFullCsv.trim())) : null;
    let name_romaji = 'Unknown';

    if (name_kana) {
        name_romaji = await transliterateKanaToRomaji(name_kana);
    } else if (name_kanji) {
        try {
            const { convertText } = await import('../api/utils/japaneseUtils.mjs');
            const derivedKanaFromKanji = await convertText(name_kanji);
            if (derivedKanaFromKanji && derivedKanaFromKanji !== name_kanji) {
                const katakanaFromKanji = toKatakana(toFullWidthKana(derivedKanaFromKanji));
                if (katakanaFromKanji) {
                    name_romaji = await transliterateKanaToRomaji(katakanaFromKanji);
                } else { name_romaji = name_kanji; }
            } else { name_romaji = name_kanji; }
        } catch (e) {
            console.warn(`Could not derive Kana from Kanji "${name_kanji}" for Romaji conversion: ${e.message}. Using Kanji as Romaji fallback.`);
            name_romaji = name_kanji;
        }
    }
    if (name_romaji === 'Unknown' && name_kanji) {
        name_romaji = name_kanji;
    }
    return {
        name: name_romaji || 'Unknown',
        name_kana: name_kana,
        name_kanji: name_kanji,
    };
}

/**
 * Main function to import clients from the CSV file.
 * @param {boolean} dryRun - If true, simulates the import without DB changes.
 * @param {string} env - The environment ('dev' or 'prod') to determine the DB pool.
 */
async function importCSV(dryRun, env = 'dev') { // Added env parameter
    console.log(`Starting CSV import ${dryRun ? '(dry run)' : ''} for ${env} environment...`);
    let selectedPool; // This will hold the chosen pool (dev or prod)
    let client;     // Database client

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
            // Select pool based on the 'env' argument
            if (env === 'prod') {
                selectedPool = getProdPool(); // Get the production pool
                // The getProdPool function in your database.js already logs "Explicitly selecting production pool"
            } else {
                selectedPool = getDevPool(); // Get the development pool (default)
                // The getDevPool function already logs "Explicitly selecting development pool"
            }
            client = await selectedPool.connect();
        } else if (!dryRun && records.length === 0) {
            console.log('No records to import, database connection not initiated.');
        }

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            console.log(`\nProcessing record ${i + 1}/${records.length}: ${record['顧客ID']} - ${record['取引先名']}`);

            try {
                const processedNames = await processNameString(record['取引先名'], record['取引先名（かな）']);
                const clientData = {
                    customer_id: record['顧客ID'] || null,
                    name: processedNames.name,
                    name_kana: processedNames.name_kana,
                    name_kanji: processedNames.name_kanji,
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
                // ... (rest of your clientData, comments, billingAddress, invoiceMailingAddress setup)
                const billingMethod = record['請求書発行方法'] || '';
                if (billingMethod.includes('メール')) {
                    clientData.billing_preference = 'digital';
                } else if (billingMethod.includes('紙') || billingMethod.includes('郵送')) {
                    clientData.billing_preference = 'paper';
                }

                let comments = [];
                if (record['取引注意フラグ'] && record['取引注意フラグ'] !== '取引可') comments.push(`取引注意: ${record['取引注意フラグ']}`);
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
                        } else { billingCity = billingAddressFull.split(' ')[0]; }
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
                            street: tempInvoiceStreet, state: tempInvoiceState, city: null,
                            postal_code: invoiceZip || null, country: 'Japan',
                            phone: record['TEL(請求書発送先)'] || null, fax: record['FAX(請求書発送先)'] || null,
                            created_by: USER_ID_PLACEHOLDER, updated_by: USER_ID_PLACEHOLDER,
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
                                } else { invoiceCity = invoiceAddressFull.split(' ')[0]; }
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
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()) RETURNING id;`;
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
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW());`;
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
                            try { await client.query('ROLLBACK'); } catch (rollbackError) {
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
        console.error(`MAJOR SCRIPT ERROR during import process for ${env}:`, error.message, error.stack ? `\nStack: ${error.stack}` : '');
    } finally {
        if (client && !dryRun) {
            try {
                client.release();
            } catch (releaseError) {
                console.error('Error releasing database client:', releaseError.message, releaseError.stack ? `\nStack: ${releaseError.stack}` : '');
            }
        }
    }
}

// --- Main execution ---
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
let environment = 'dev'; // Default to 'dev'

if (args.includes('--prod')) {
    environment = 'prod';
}
// No need for 'else if (args.includes('--dev'))' since 'dev' is the default.
// If you want to be explicit or allow only --dev or --prod:
// else if (!args.includes('--dev') && !args.includes('--prod') && args.length > 0 && !dryRun) {
//     console.warn("No --dev or --prod flag specified, defaulting to 'dev'. Use --prod for production.");
// }


importCSV(dryRun, environment).catch(err => {
    console.error("UNHANDLED PROMISE REJECTION in importCSV:", err.message, err.stack ? `\nStack: ${err.stack}` : '');
});