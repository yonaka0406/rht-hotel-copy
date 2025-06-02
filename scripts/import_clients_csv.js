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

/**
 * Processes a name string to extract Kanji, Kana, and Romaji parts.
 * @param {string} nameKanjiFull - The full name in Kanji.
 * @param {string} nameKanaFull - The full name in Kana.
 * @returns {{name: string, name_kana: string, name_kanji: string}}
 */
function processNameString(nameKanjiFull, nameKanaFull) {
    // TODO: Implement a more sophisticated version based on api/models/clients.js
    // For now, directly use provided fields and a placeholder for Romaji.
    const name_kanji = nameKanjiFull ? nameKanjiFull.trim() : '';
    const name_kana = nameKanaFull ? nameKanaFull.trim() : '';

    // Placeholder for Romaji name - ideally, this would involve transliteration
    const name = name_kanji || name_kana || 'Unknown'; // Basic placeholder

    return {
        name,
        name_kana,
        name_kanji,
    };
}

async function importCSV(dryRun) {
    console.log(`Starting CSV import ${dryRun ? '(dry run)' : ''}...`);
    let pool; // Declared here for potential pool.end() in finally, if needed
    let client; // Database client

    try {
        // Read CSV file content
        const fileContent = fs.readFileSync(CSV_FILE_PATH, { encoding: 'utf8' });

        // Parse CSV content using the promisified helper
        // This will wait until all records are parsed before proceeding.
        const records = await parseCsvPromise(fileContent, {
            columns: true, // Use the first row as column headers
            skip_empty_lines: true,
            from_line: 1, // Start from the first data record after header
        });

        console.log(`Found ${records.length} records in CSV.`);
        let successCount = 0;
        let failureCount = 0;

        // Connect to DB only if not a dry run AND there are records to process
        if (!dryRun && records.length > 0) {
            const requestId = crypto.randomUUID();
            pool = getPool(requestId); // Initialize pool here if you plan to use pool.end()
            client = await pool.connect();
            console.log('Database client connected.');
        } else if (!dryRun && records.length === 0) {
            console.log('No records to import, database connection not initiated.');
        }

        // Loop through the records. This code runs AFTER parsing is fully complete.
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            console.log(`\nProcessing record ${i + 1}/${records.length}: ${record['顧客ID']} - ${record['取引先名']}`);
            // Optional: Add timestamp for detailed timing
            // console.log(`[${new Date().toISOString()}] Iteration for record ${i + 1} BEGINS.`);

            try {
                const processedNames = processNameString(record['取引先名'], record['取引先名（かな）']);

                const clientData = {
                    customer_id: record['顧客ID'] || null,
                    name: processedNames.name,
                    name_kana: processedNames.name_kana,
                    name_kanji: processedNames.name_kanji,
                    legal_or_natural_person: 'legal', // Default
                    email: record['代表E-mail'] || null,
                    phone: record['代表電話'] || null,
                    fax: record['代表Fax'] || null,
                    website: record['Web サイト'] || null,
                    billing_preference: 'paper', // Default, to be updated
                    comment: '', // To be constructed
                    created_by: USER_ID_PLACEHOLDER,
                    updated_by: USER_ID_PLACEHOLDER,
                };

                // Billing preference
                const billingMethod = record['請求書発行方法'] || '';
                if (billingMethod.includes('メール')) {
                    clientData.billing_preference = 'digital';
                } else if (billingMethod.includes('紙') || billingMethod.includes('郵送')) {
                    clientData.billing_preference = 'paper';
                }

                // Construct comment
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

                // --- Billing Address ---
                const billingAddress = {
                    address_name: '請求先', // Billing destination
                    street: `${record['住所(請求先)'] || ''} ${record['ビル名（請求先）'] || ''}`.trim(),
                    state: record['都道府県(請求先)'] || null,
                    city: null, // To be populated by improved logic below
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
                            billingCity = billingAddressFull.split(' ')[0]; // Simplest fallback
                        }
                    }
                }
                billingAddress.city = billingCity;

                // --- Invoice Mailing Address (optional) ---
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
                            address_name: '請求書送付先', // Invoice mailing destination
                            representative_name: invoiceCompany || null,
                            street: tempInvoiceStreet,
                            state: tempInvoiceState,
                            city: null, // To be populated
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
                                    invoiceCity = invoiceAddressFull.split(' ')[0]; // Simplest fallback
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
                    // Ensure client is available (it should be if not dryRun and records > 0)
                    if (!client) {
                        console.error(`Database client not available for record ${record['顧客ID']}. Skipping.`);
                        failureCount++;
                        continue; // Skip to next record
                    }

                    // --- Database Operations ---
                    // Optional: Add timestamp for detailed timing
                    // console.log(`[${new Date().toISOString()}] Attempting BEGIN for record ${record['顧客ID']}`);
                    try {
                        await client.query('BEGIN'); // This is approximately your original line 255

                        // Insert client
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

                        // Insert billing address
                        const addressInsertQuery = `
                            INSERT INTO addresses (
                                client_id, address_name, representative_name, street, state, city, postal_code, country,
                                phone, fax, created_by, updated_by, created_at
                            ) VALUES (
                                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
                            );
                        `;
                        await client.query(addressInsertQuery, [
                            newClientId, billingAddress.address_name, null /* representative_name for billing */,
                            billingAddress.street, billingAddress.state, billingAddress.city, billingAddress.postal_code,
                            billingAddress.country, null /* phone for billing */, null /* fax for billing */,
                            billingAddress.created_by, billingAddress.updated_by
                        ]);

                        // Insert invoice mailing address if present
                        if (invoiceMailingAddress) {
                            await client.query(addressInsertQuery, [
                                newClientId, invoiceMailingAddress.address_name, invoiceMailingAddress.representative_name,
                                invoiceMailingAddress.street, invoiceMailingAddress.state, invoiceMailingAddress.city,
                                invoiceMailingAddress.postal_code, invoiceMailingAddress.country, invoiceMailingAddress.phone,
                                invoiceMailingAddress.fax, invoiceMailingAddress.created_by, invoiceMailingAddress.updated_by
                            ]);
                        }

                        await client.query('COMMIT');
                        // Optional: Add timestamp for detailed timing
                        // console.log(`[${new Date().toISOString()}] COMMITTED record ${record['顧客ID']}`);
                        console.log(`Successfully inserted client ${clientData.customer_id} and addresses.`);
                        successCount++;
                    } catch (dbError) {
                        // Log distinct error for DB transaction failure
                        console.error(`DB TRANSACTION FAILED for record ${record['顧客ID']}:`, dbError.message, dbError.stack ? `\nStack: ${dbError.stack}` : '');
                        failureCount++;
                        if (client) { // Check if client exists before trying to rollback
                            try {
                                await client.query('ROLLBACK');
                            } catch (rollbackError) {
                                console.error(`Rollback ALSO FAILED for record ${record['顧客ID']}:`, rollbackError.message, rollbackError.stack ? `\nStack: ${rollbackError.stack}` : '');
                            }
                        }
                    }
                }
            } catch (processError) {
                // Log distinct error for general processing failure
                console.error(`GENERAL PROCESSING ERROR for record ${record['顧客ID']}:`, processError.message, processError.stack ? `\nStack: ${processError.stack}` : '');
                failureCount++;
            }
            // Optional: Add timestamp for detailed timing
            // console.log(`[${new Date().toISOString()}] Iteration for record ${i + 1} ENDS.`);
        }

        console.log(`\nImport summary:`);
        console.log(`Total records processed: ${records.length}`);
        console.log(`Successful inserts: ${successCount}`);
        console.log(`Failed inserts: ${failureCount}`);

    } catch (error) { // Catches errors from readFile, parseCsvPromise, or pool.connect
        console.error('MAJOR SCRIPT ERROR during import process:', error.message, error.stack ? `\nStack: ${error.stack}` : '');
    } finally {
        if (client && !dryRun) { // client would only be defined if not dryRun and records.length > 0
            try {
                client.release();
                console.log('Database client released.');
            } catch (releaseError) {
                console.error('Error releasing database client:', releaseError.message, releaseError.stack ? `\nStack: ${releaseError.stack}` : '');
            }
        }
        // For a standalone script, you might consider ending the pool if it's no longer needed.
        // This depends on how getPool() is implemented and if the pool is shared.
        // if (pool) {
        //     try {
        //         await pool.end();
        //         console.log('Database pool closed.');
        //     } catch (poolEndError) {
        //         console.error('Error closing database pool:', poolEndError.message, poolEndError.stack ? `\nStack: ${poolEndError.stack}` : '');
        //     }
        // }
    }
}

// --- Main execution ---
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

importCSV(dryRun).catch(err => {
    console.error("UNHANDLED PROMISE REJECTION in importCSV:", err.message, err.stack ? `\nStack: ${err.stack}` : '');
});
