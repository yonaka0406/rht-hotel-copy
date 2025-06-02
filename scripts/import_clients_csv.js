// Node.js script to import clients from a CSV file

const fs = require('fs');
const { parse } = require('csv-parse');
const crypto = require('crypto'); // Added for UUID generation
const { getPool } = require('../api/config/database'); // Adjust path as necessary

const CSV_FILE_PATH = '../temp/顧客マスター - 顧客.csv'; // Changed to relative path
const USER_ID_PLACEHOLDER = 1; // Placeholder for created_by/updated_by

/**
 * Processes a name string to extract Kanji, Kana, and Romaji parts.
 * Simplified version: Assumes specific CSV columns for Kanji and Kana.
 * Romaji conversion might be basic or placeholder.
 * @param {string} nameKanjiFull - The full name in Kanji (e.g., from CSV's "取引先名")
 * @param {string} nameKanaFull - The full name in Kana (e.g., from CSV's "取引先名（かな）")
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
    let pool;
    let client; // Keep client declared here for the finally block

    try {
        if (!dryRun) { // Only setup DB if not a dry run
            const requestId = crypto.randomUUID();
            pool = getPool(requestId);
            client = await pool.connect();
            console.log('Database client connected.');
        }

        const fileContent = fs.readFileSync(CSV_FILE_PATH, { encoding: 'utf8' });

        parse(fileContent, {
            columns: true, // Use the first row as column headers
            skip_empty_lines: true,
            from_line: 1, // Start from the first data record after header
        }, async (err, records) => {
            if (err) {
                console.error('Failed to parse CSV:', err);
                return;
            }

            console.log(`Found ${records.length} records in CSV.`);
            let successCount = 0;
            let failureCount = 0;

            for (let i = 0; i < records.length; i++) {
                const record = records[i];
                console.log(`\nProcessing record ${i + 1}/${records.length}: ${record['顧客ID']} - ${record['取引先名']}`);

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
                        address_name: '請求先',
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
                        // Regex tries to capture:
                        // 1. (Optional) Prefecture (都道府県)
                        // 2. City/Ward/District (市区町村郡)
                        const match = billingAddressFull.match(/(.+?[都道府県])?(.*?[市区町村郡])/);
                        if (match && match[2]) {
                            billingCity = match[2].trim();
                        } else {
                            // Fallback if no specific city/ward/district pattern is found
                            // This might happen for addresses like "東京都千代田区" where state and city are combined.
                            // Or for very short addresses.
                            const parts = billingAddressFull.split(/[市区町村郡]/);
                            if (parts.length > 1) {
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
                        // Basic check if different enough from billing
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
                                city: null, // To be populated by improved logic below
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
                                    if (parts.length > 1) {
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
                        console.log('[Dry Run] Would insert client:', clientData);
                        console.log('[Dry Run] Would insert billing address:', billingAddress);
                        if (invoiceMailingAddress) {
                            console.log('[Dry Run] Would insert invoice mailing address:', invoiceMailingAddress);
                        }
                        successCount++;
                    } else {
                        // --- Database Operations ---
                        try {
                            await client.query('BEGIN');

                            // Insert client
                            const clientInsertQuery = `
                                INSERT INTO clients (
                                    customer_id, name, name_kana, name_kanji, legal_or_natural_person,
                                    email, phone, fax, website, billing_preference, comment,
                                    created_by, updated_by, created_at, updated_at
                                ) VALUES (
                                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
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
                                    phone, fax, created_by, updated_by, created_at, updated_at
                                ) VALUES (
                                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
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
                            console.log(`Successfully inserted client ${clientData.customer_id} and addresses.`);
                            successCount++;
                        } catch (dbError) {
                            await client.query('ROLLBACK');
                            console.error(`Failed to insert record ${record['顧客ID']}:`, dbError);
                            failureCount++;
                        }
                    }
                } catch (processError) {
                    console.error(`Error processing record ${record['顧客ID']}:`, processError);
                    failureCount++;
                }
            }

            console.log(`\nImport summary:`);
            console.log(`Total records processed: ${records.length}`);
            console.log(`Successful inserts: ${successCount}`);
            console.log(`Failed inserts: ${failureCount}`);
        });

    } catch (error) {
        console.error('Error during import process:', error);
    } finally {
        if (client && !dryRun) { // Only release if client was connected and not in dryRun
            client.release();
            console.log('Database client released.');
        }
        // Note: pool.end() should be called when the application is shutting down,
        // not necessarily after each script run if the app is persistent.
        // For a standalone script, it might be okay here or in a main orchestrating function.
        // pool.end(); // Consider if pool needs to be ended, depends on getPool behavior
        // console.log('Database pool closed.');
    }
}

// --- Main execution ---
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

importCSV(dryRun).catch(err => {
    console.error("Unhandled error in importCSV:", err);
});
