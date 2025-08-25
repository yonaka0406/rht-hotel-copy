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
            const errorMsg = 'No refresh token found';
            logger.error(errorMsg, { ...context, error });
            throw new Error(errorMsg);
        }
    } catch (err) {
        logger.error('Authorization failed', { ...context, error: err });
        throw err;
    }
}

async function createSheet(authClient, title) {
    /*
        It's easier to edit sheets that were created by the server. 
        Create the file with this, see the id and use it.
    */   
    const context = { operation: 'createSheet', title };
    try {
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        const drive = google.drive({ version: 'v3', auth: authClient });

        logger.info('Creating new spreadsheet', context);
        const spreadsheet = await sheets.spreadsheets.create({
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
        logger.error('Error creating spreadsheet', error, context);
        throw error;
    }
}

async function checkSheetExists(authClient, spreadsheetId, sheetName) {
    const context = { operation: 'checkSheetExists', spreadsheetId, sheetName };
    try {
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        logger.debug('Checking if sheet exists', context);
        const response = await sheets.spreadsheets.get({
            spreadsheetId: spreadsheetId,
            fields: 'sheets.properties.title'
        });
        
        logger.debug('Sheet existence check result', { exists: response.data.sheets.some(sheet => sheet.properties.title === sheetName) });
        return response.data.sheets.some(sheet => sheet.properties.title === sheetName);
    } catch (err) {
        logger.error('Error checking if sheet exists', err, context);
        throw err;
    }
}

async function createSheetInSpreadsheet(authClient, spreadsheetId, sheetName) {
    const context = { operation: 'createSheetInSpreadsheet', spreadsheetId, sheetName };
    try {
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        logger.info('Creating new sheet in spreadsheet', context);
        const response = await sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
            resource: {
                requests: [{
                    addSheet: {
                        properties: {
                            title: sheetName
                        }
                    }
                }]
            }
        });
        
        logger.info(`Sheet "${sheetName}" created successfully`, context);
        return response.data;
    } catch (err) {
        logger.error('Error creating sheet', err, context);
        throw err;
    }
}

async function clearSheetData(authClient, spreadsheetId, sheetName) {
    const context = { operation: 'clearSheetData', spreadsheetId, sheetName };
    try {
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        
        logger.info('Clearing sheet data', context);
        // First, get sheet information to find its range
        const response = await sheets.spreadsheets.get({
            spreadsheetId: spreadsheetId,
            fields: 'sheets.properties'
        });
        
        // Find the specified sheet
        const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
        
        if (!sheet) {
            logger.info(`Sheet "${sheetName}" not found.`, context);
            return;
        }
        
        // Clear all content from the sheet
        const clearResponse = await sheets.spreadsheets.values.clear({
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!A1:Z1000`, // Using a large range to ensure all data is cleared
        });
        
        logger.info(`Sheet "${sheetName}" cleared successfully`, context);

        await appendDataToSheet(authClient, spreadsheetId, sheetName, headers)

        logger.info(`Sheet "${sheetName}" headers added successfully`, context);

        return clearResponse.data;
    } catch (err) {
        logger.error('Error clearing sheet data', err, context);
        throw err;
    }
}

async function appendDataToSheet(authClient, spreadsheetId, sheetName, values) {
    const context = { 
        operation: 'appendDataToSheet',
        spreadsheetId,
        sheetName,
        rowsToAppend: values.length
    };
    
    logger.info('Starting data append to sheet', context);
    
    try {
        // First check if the sheet exists
        logger.debug('Checking if sheet exists', { sheetName });
        const sheetExists = await checkSheetExists(authClient, spreadsheetId, sheetName);
        const range = `${sheetName}!A1`;
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        
        // If sheet doesn't exist, create it and fill the headers
        if (!sheetExists) {
            logger.info('Creating new sheet and adding headers', { sheetName });
            await createSheetInSpreadsheet(authClient, spreadsheetId, sheetName);
            try {
                await sheets.spreadsheets.values.append({
                    spreadsheetId: spreadsheetId,
                    range: range,
                    valueInputOption: 'USER_ENTERED',
                    insertDataOption: 'INSERT_ROWS',
                    resource: {
                        values: headers,
                    },
                });
                logger.info('Headers added to new sheet', { sheetName });
            } catch (err) {
                logger.error('Error appending headers to new sheet', err, { sheetName });
                throw err;
            }
        } 
        
        // Break data into batches of 500 rows
        const BATCH_SIZE = 500;
        const totalBatches = Math.ceil(values.length / BATCH_SIZE);
        let successfulRows = 0;
        let failedBatches = 0;

        logger.info(`Processing ${totalBatches} batch(es) of data`, { 
            totalRows: values.length, 
            batchSize: BATCH_SIZE 
        });

        // Process batches with delay between them
        for (let i = 0; i < totalBatches; i++) {
            const startIndex = i * BATCH_SIZE;
            const endIndex = Math.min(startIndex + BATCH_SIZE, values.length);
            const batch = values.slice(startIndex, endIndex);
            const batchContext = { 
                batchNumber: i + 1, 
                totalBatches,
                batchSize: batch.length,
                startIndex,
                endIndex
            };

            logger.debug(`Processing batch ${i + 1}/${totalBatches}`, batchContext);

            try {
                const response = await sheets.spreadsheets.values.append({
                    spreadsheetId: spreadsheetId,
                    range: range,
                    valueInputOption: 'USER_ENTERED',
                    insertDataOption: 'INSERT_ROWS',
                    resource: {
                        values: batch,
                    },
                });
                
                successfulRows += batch.length;
                logger.debug(`Successfully processed batch ${i + 1}/${totalBatches}`, {
                    ...batchContext,
                    updatedCells: response.data.updates?.updatedCells || 0,
                    updatedRows: response.data.updates?.updatedRows || 0,
                    updatedColumns: response.data.updates?.updatedColumns || 0,
                    updatedRange: response.data.updates?.updatedRange || ''
                });
                
                // Add delay between batches, except after the last batch
                if (i < totalBatches - 1) {
                    const delay = 2000; // 2 second delay
                    logger.debug(`Waiting ${delay}ms before next batch`, { delay });
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
            } catch (err) {
                failedBatches++;
                logger.error(`Error processing batch ${i + 1}/${totalBatches}`, err, {
                    ...batchContext,
                    errorCode: err.code,
                    statusCode: err.response?.status,
                    statusText: err.response?.statusText
                });
                
                // Implement exponential backoff for rate limit errors
                if (err.code === 429 || (err.response && err.response.status === 429)) {
                    const retryDelay = 5000; // 5 seconds
                    logger.warn(`Rate limit hit. Waiting ${retryDelay}ms before retrying...`, { 
                        retryDelay,
                        retryAttempt: 1,
                        maxRetries: 3
                    });
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    i--; // Retry the same batch
                    continue;
                }
                
                // For 503 errors, log and continue with next batch
                if (err.code === 503 || (err.response && err.response.status === 503)) {
                    logger.error('Google Sheets API service unavailable', err, {
                        ...batchContext,
                        action: 'Skipping batch and continuing with next one'
                    });
                    continue;
                }
                
                throw err;
            }
        }

        const summary = {
            totalBatches,
            successfulBatches: totalBatches - failedBatches,
            failedBatches,
            totalRows: values.length,
            successfulRows,
            failedRows: values.length - successfulRows
        };

        if (failedBatches > 0) {
            logger.warn('Completed with partial success', summary);
        } else {
            logger.info('Successfully completed all batch operations', summary);
        }

        return { 
            status: failedBatches > 0 ? 'partial_success' : 'success',
            ...summary
        };

    } catch (err) {
        logger.error('Fatal error in appendDataToSheet', err, {
            ...context,
            errorDetails: {
                code: err.code,
                status: err.response?.status,
                message: err.message,
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
            }
        });
        throw err;
    }
}

async function main() {
    try {
        const authClient = await authorize();
        //const sheetId = await createSheet(authClient, 'Hotel PMS Data');
        const sheetName = '1'; // The range to append data to
        const dataToAppend = [['New Booking ID', 'Guest Name', 'Check-in Date'], ['1011', 'Sophia Miller', '2025-04-28']]; // Example data

        await appendDataToSheet(authClient, sheetId, sheetName, dataToAppend);
    } catch (error) {
        logger.error('An error occurred', error);
    }
}

//main();

module.exports = {   
    authorize, 
    clearSheetData,
    appendDataToSheet,    
};