const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
const logger = require('../config/logger');

const credentialsPath = path.join(__dirname, '../config/google_sheets_credentials.json');
const storedRefreshTokenPath = path.join(__dirname, '../config/refresh_token.json');

/*
For system DB backup:
sudo mkdir -p /etc/app_config/google/
# Copy your credentials.json to this location
# Make sure to copy the correct file from your backend project
sudo cp /var/www/html/rht-hotel/api/config/google_sheets_credentials.json /etc/app_config/google/credentials.json
# Copy your refresh_token.json to this location
# Make sure you have a valid refresh token generated from an interactive flow
sudo cp /var/www/html/rht-hotel/api/config/refresh_token.json /etc/app_config/google/refresh_token.json
*/
const redirectUri = 'http://localhost:3000';
const sheetId = '1nrtx--UdBvYfB5OH2Zki5YAVc6b9olf_T_VSNNDbZng'; // dev
//const sheetId = '1W10kEbGGk2aaVa-qhMcZ2g3ARvCkUBeHeN2L8SUTqtY'; // prod

const headers = [['施設ID', '施設名', '予約詳細ID', '日付', '部屋タイプ', '部屋番号', '予約者', 'プラン', 'ステータス', '種類', 'エージェント', '更新日時', '表示文字列']];

/**
 * Authorizes the client with Google API using OAuth2 and a refresh token.
 * @returns {Promise<google.auth.OAuth2>} An authorized OAuth2 client.
 */
async function authorize() {
    const context = { operation: 'authorize' };
    logger.debug('Starting Google Sheets authorization', context);

    try {
        const credentials = await fs.readFile(credentialsPath);
        const key = JSON.parse(credentials).web;
        const client = new google.auth.OAuth2(
            key.client_id,
            key.client_secret,
            redirectUri
        );

        try {
            logger.debug('Reading refresh token', { ...context, path: storedRefreshTokenPath });
            const refreshTokenData = await fs.readFile(storedRefreshTokenPath);
            const refreshToken = JSON.parse(refreshTokenData).refresh_token;
            client.setCredentials({ refresh_token: refreshToken });
            await client.getAccessToken();

            logger.info('Successfully authorized with Google API', context);
            return client;
        } catch (error) {
            const errorMsg = 'No refresh token found or failed to set credentials.';
            logger.error(errorMsg, { ...context, error: error.message });
            throw new Error(errorMsg);
        }
    } catch (err) {
        logger.error('Authorization failed catastrophically', { ...context, error: err });
        throw err;
    }
}

/**
 * Helper function to create a sheets service instance.
 * @param {google.auth.OAuth2} authClient - The authorized OAuth2 client.
 * @returns {google.sheets_v4.Sheets}
 */
function getSheetsService(authClient) {
    return google.sheets({ version: 'v4', auth: authClient });
}


/**
 * Checks if a specific sheet (tab) exists within a spreadsheet.
 * @param {google.sheets_v4.Sheets} sheetsService - The Google Sheets service object.
 * @param {string} spreadsheetId - The ID of the spreadsheet.
 * @param {string} sheetName - The name of the sheet to check.
 * @returns {Promise<boolean>}
 */
async function checkSheetExists(sheetsService, spreadsheetId, sheetName) {
    const context = { operation: 'checkSheetExists', spreadsheetId, sheetName };
    try {
        logger.debug('Checking if sheet exists', context);
        const response = await sheetsService.spreadsheets.get({
            spreadsheetId: spreadsheetId,
            fields: 'sheets.properties.title'
        });
        const exists = response.data.sheets.some(sheet => sheet.properties.title === sheetName);
        logger.debug(`Sheet existence check result for "${sheetName}"`, { exists });
        return exists;
    } catch (err) {
        logger.error('Error checking if sheet exists', { ...context, error: err });
        // If the error is 404 on the spreadsheet itself, it's fair to say the sheet doesn't exist.
        if (err.code === 404) {
            return false;
        }
        throw err;
    }
}

/**
 * Creates a new sheet (tab) within an existing spreadsheet.
 * @param {google.sheets_v4.Sheets} sheetsService - The Google Sheets service object.
 * @param {string} spreadsheetId - The ID of the spreadsheet.
 * @param {string} sheetName - The name of the new sheet.
 * @returns {Promise<any>}
 */
async function createSheetInSpreadsheet(sheetsService, spreadsheetId, sheetName) {
    const context = { operation: 'createSheetInSpreadsheet', spreadsheetId, sheetName };
    try {
        logger.info('Creating new sheet in spreadsheet', context);
        const response = await sheetsService.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
            resource: {
                requests: [{
                    addSheet: {
                        properties: { title: sheetName }
                    }
                }]
            }
        });
        logger.info(`Sheet "${sheetName}" created successfully`, context);
        return response.data;
    } catch (err) {
        logger.error('Error creating sheet', { ...context, error: err });
        throw err;
    }
}

/**
 * Creates a new Google Sheet file (spreadsheet).
 * @param {google.auth.OAuth2} authClient The authorized Google API client.
 * @param {string} title The title for the new spreadsheet.
 * @returns {Promise<string>} The ID of the newly created spreadsheet.
 */
async function createSheet(authClient, title) {
    const context = { operation: 'createSheet', title };
    const sheetsService = getSheetsService(authClient);
    try {
        logger.info('Creating new spreadsheet file', context);
        const spreadsheet = await sheetsService.spreadsheets.create({
            resource: {
                properties: {
                    title: title,
                },
            },
        });
        const spreadsheetId = spreadsheet.data.spreadsheetId;
        logger.info(`Spreadsheet created with ID: ${spreadsheetId}`, context);
        return spreadsheetId;
    } catch (error) {
        logger.error('Error creating spreadsheet file', { ...context, error });
        throw error;
    }
}


/**
 * RECOMMENDATION 3: OPTIMIZED
 * Clears all data from a sheet and writes the headers. This is now much more efficient.
 * @param {google.auth.OAuth2} authClient - The authorized OAuth2 client.
 * @param {string} spreadsheetId - The ID of the spreadsheet.
 * @param {string} sheetName - The name of the sheet to clear.
 */
async function clearSheetData(authClient, spreadsheetId, sheetName) {
    const context = { operation: 'clearSheetData', spreadsheetId, sheetName };
    const sheetsService = getSheetsService(authClient);

    try {
        logger.info(`Ensuring sheet "${sheetName}" exists before clearing.`, context);
        const sheetExists = await checkSheetExists(sheetsService, spreadsheetId, sheetName);
        if (!sheetExists) {
            logger.info(`Sheet "${sheetName}" does not exist. Creating it.`, context);
            await createSheetInSpreadsheet(sheetsService, spreadsheetId, sheetName);
        }

        // Step 1: Clear the entire sheet in one API call.
        // A1:Z clears all columns from row 1 downwards. More robust than A1:Z1000.
        logger.info(`Clearing sheet: ${sheetName}`, context);
        await sheetsService.spreadsheets.values.clear({
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!A1:Z`,
        });
        logger.info(`Sheet "${sheetName}" cleared successfully`, context);

        // Step 2: Write the headers to the first row in a second API call.
        // Using 'update' is more direct than 'append' for this purpose.
        logger.info(`Adding headers to sheet: ${sheetName}`, context);
        await sheetsService.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: headers,
            },
        });
        logger.info(`Sheet "${sheetName}" headers added successfully`, context);

    } catch (err) {
        logger.error('Error clearing sheet data', { ...context, error: err });
        throw err;
    }
}

/**
 * RECOMMENDATIONS 1 & 2: IMPROVED ERROR HANDLING & BATCHING
 * Appends data to a sheet, creating it if it doesn't exist.
 * Includes robust batching and exponential backoff for retries.
 * @param {google.auth.OAuth2} authClient - The authorized OAuth2 client.
 * @param {string} spreadsheetId - The ID of the spreadsheet.
 * @param {string} sheetName - The name of the sheet.
 * @param {Array<Array<any>>} values - An array of rows to append.
 */
async function appendDataToSheet(authClient, spreadsheetId, sheetName, values) {
    const context = { 
        operation: 'appendDataToSheet',
        spreadsheetId,
        sheetName,
        rowsToAppend: values.length
    };
    
    logger.info('Starting data append to sheet', context);
    const sheetsService = getSheetsService(authClient);
    
    // If there is no data to append, exit early.
    if (!values || values.length === 0) {
        logger.info('No data to append. Operation finished.', context);
        return { status: 'success', message: 'No data to append.' };
    }

    try {
        const BATCH_SIZE = 500;
        const MAX_RETRIES = 5;
        const totalBatches = Math.ceil(values.length / BATCH_SIZE);
        
        logger.info(`Processing ${totalBatches} batch(es) of data`, { ...context, batchSize: BATCH_SIZE });

        for (let i = 0; i < totalBatches; i++) {
            const startIndex = i * BATCH_SIZE;
            const batch = values.slice(startIndex, startIndex + BATCH_SIZE);
            const batchContext = { ...context, batchNumber: i + 1, totalBatches, batchSize: batch.length };

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    logger.debug(`Processing batch ${i + 1}/${totalBatches}, attempt ${attempt}`, batchContext);
                    await sheetsService.spreadsheets.values.append({
                        spreadsheetId: spreadsheetId,
                        range: `${sheetName}!A1`,
                        valueInputOption: 'USER_ENTERED',
                        insertDataOption: 'INSERT_ROWS',
                        resource: { values: batch },
                    });
                    logger.info(`Successfully processed batch ${i + 1}/${totalBatches}`, batchContext);
                    break; // Success, exit retry loop
                } catch (err) {
                    const isRetryable = err.code === 429 || err.code === 503 || (err.response && (err.response.status === 429 || err.response.status === 503));
                    if (isRetryable && attempt < MAX_RETRIES) {
                        const delay = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 1000); // Exponential backoff with jitter
                        logger.warn(`Retryable error on batch ${i + 1}. Retrying in ${delay}ms...`, { ...batchContext, attempt, error: err.message });
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        logger.error(`Failed to process batch ${i + 1} after ${attempt} attempts.`, { ...batchContext, error: err });
                        throw err; // Non-retryable error or max retries exceeded
                    }
                }
            }
        }
        
        logger.info('Successfully completed all batch operations', context);
        return { status: 'success' };

    } catch (err) {
        logger.error('Fatal error in appendDataToSheet', { ...context, error: err });
        throw err;
    }
}

module.exports = {   
    authorize,
    createSheet,
    clearSheetData,
    appendDataToSheet
};