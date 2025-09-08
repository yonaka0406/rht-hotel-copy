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

const sheetExistsCache = new Map();

// Connection pooling and rate limiting
class SheetsConnectionManager {
    constructor() {
        this.authClient = null;
        this.sheetsService = null;
        this.requestQueue = [];
        this.isProcessing = false;
        this.maxConcurrentRequests = 1; // Reduced for better memory management
        this.requestDelay = 1001; // 1s between requests
        this.activeRequests = 0;
    }

    async getAuthClient() {
        if (!this.authClient) {
            this.authClient = await authorize();
            this.sheetsService = google.sheets({ version: 'v4', auth: this.authClient });
        }
        return this.authClient;
    }

    async executeRequest(requestFn) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ requestFn, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessing || this.activeRequests >= this.maxConcurrentRequests) {
            return;
        }

        if (this.requestQueue.length === 0) {
            return;
        }

        this.isProcessing = true;
        this.activeRequests++;

        const { requestFn, resolve, reject } = this.requestQueue.shift();

        try {
            await this.getAuthClient();
            const result = await requestFn(this.sheetsService);
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.activeRequests--;
            this.isProcessing = false;

            // Add delay between requests to prevent rate limiting
            setTimeout(() => {
                this.processQueue();
            }, this.requestDelay);
        }
    }

    // Cleanup method to release resources
    cleanup() {
        this.authClient = null;
        this.sheetsService = null;
        this.requestQueue = [];
    }
}

// Global connection manager instance
const connectionManager = new SheetsConnectionManager();

/**
 * Authorizes the client with Google API using OAuth2 and a refresh token.
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
 * Checks if a specific sheet (tab) exists within a spreadsheet.
 */
async function checkSheetExists(spreadsheetId, sheetName) {
    const context = { operation: 'checkSheetExists', spreadsheetId, sheetName };
    const cacheKey = `${spreadsheetId}_${sheetName}`;

    if (sheetExistsCache.has(cacheKey)) {
        logger.debug(`Cache hit for sheet existence: "${sheetName}"`, context);
        return sheetExistsCache.get(cacheKey);
    }

    return connectionManager.executeRequest(async (sheetsService) => {
        try {
            logger.debug('Checking if sheet exists (API call)', context);
            const response = await sheetsService.spreadsheets.get({
                spreadsheetId: spreadsheetId,
                fields: 'sheets.properties.title'
            });
            const exists = response.data.sheets.some(sheet => sheet.properties.title === sheetName);
            
            sheetExistsCache.set(cacheKey, exists);
            setTimeout(() => sheetExistsCache.delete(cacheKey), 300000); // 5 minute cache

            logger.debug(`Sheet existence check result for "${sheetName}"`, { ...context, exists });
            return exists;
        } catch (err) {
            logger.error('Error checking if sheet exists', { ...context, error: err });
            if (err.code === 404) {
                sheetExistsCache.set(cacheKey, false);
                setTimeout(() => sheetExistsCache.delete(cacheKey), 300000); // 5 minute cache
                return false;
            }
            throw err;
        }
    });
}

/**
 * Creates a new sheet (tab) within an existing spreadsheet.
 */
async function createSheetInSpreadsheet(spreadsheetId, sheetName) {
    const context = { operation: 'createSheetInSpreadsheet', spreadsheetId, sheetName };

    return connectionManager.executeRequest(async (sheetsService) => {
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
            const cacheKey = `${spreadsheetId}_${sheetName}`;
            sheetExistsCache.set(cacheKey, true);
            setTimeout(() => sheetExistsCache.delete(cacheKey), 300000); // 5 minute cache

            logger.info(`Sheet "${sheetName}" created successfully`, context);
            return response.data;
        } catch (err) {
            logger.error('Error creating sheet', { ...context, error: err });
            throw err;
        }
    });
}

/**
 * Creates a new Google Sheet file (spreadsheet).
 */
async function createSheet(title) {
    const context = { operation: 'createSheet', title };

    return connectionManager.executeRequest(async (sheetsService) => {
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
    });
}

/**
 * Clears all data from a sheet and writes the headers.
 */
async function clearSheetData(spreadsheetId, sheetName) {
    const context = { operation: 'clearSheetData', spreadsheetId, sheetName };

    try {
        logger.info(`Ensuring sheet "${sheetName}" exists before clearing.`, context);
        await ensureSheetExists(spreadsheetId, sheetName); // Use the helper

        await connectionManager.executeRequest(async (sheetsService) => {
            logger.info(`Clearing sheet: ${sheetName}`, context);
            return sheetsService.spreadsheets.values.clear({
                spreadsheetId: spreadsheetId,
                range: `${sheetName}!A1:Z`,
            });
        });

        await connectionManager.executeRequest(async (sheetsService) => {
            logger.info(`Adding headers to sheet: ${sheetName}`, context);
            return sheetsService.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: `${sheetName}!A1`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: headers,
                },
            });
        });

        logger.info(`Sheet "${sheetName}" cleared and headers added successfully`, context);

    } catch (err) {
        logger.error('Error clearing sheet data', { ...context, error: err });
        throw err;
    }
}

async function ensureSheetExists(spreadsheetId, sheetName) {
    const context = { operation: 'ensureSheetExists', spreadsheetId, sheetName };
    logger.info(`Ensuring sheet "${sheetName}" exists.`, context);
    const sheetExists = await checkSheetExists(spreadsheetId, sheetName);

    if (!sheetExists) {
        logger.info(`Sheet "${sheetName}" does not exist. Creating it and adding headers.`, context);
        await createSheetInSpreadsheet(spreadsheetId, sheetName);
        await connectionManager.executeRequest(async (sheetsService) => {
            return sheetsService.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: `${sheetName}!A1`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: headers },
            });
        });
    }
}

/**
 * MEMORY OPTIMIZED VERSION
 * Appends data to a sheet with better memory management and circuit breaker pattern.
 */
async function _appendInBatches(spreadsheetId, sheetName, values) {
    const context = { 
        operation: '_appendInBatches',
        spreadsheetId,
        sheetName,
        rowsToAppend: values.length
    };
    
    if (!values || values.length === 0) {
        logger.info('No data to append.', context);
        return { status: 'success', message: 'No data to append.' };
    }

    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 3;
    const CIRCUIT_BREAKER_COOLDOWN = 30000;
    let circuitBreakerOpen = false;
    let lastFailureTime = 0;

    try {
        const BATCH_SIZE = 500;
        const MAX_RETRIES = 3;
        const totalBatches = Math.ceil(values.length / BATCH_SIZE);
        
        logger.info(`Processing ${totalBatches} batch(es) of data`, { ...context, batchSize: BATCH_SIZE });

        for (let i = 0; i < totalBatches; i++) {
            if (circuitBreakerOpen) {
                const timeSinceLastFailure = Date.now() - lastFailureTime;
                if (timeSinceLastFailure < CIRCUIT_BREAKER_COOLDOWN) {
                    logger.error('Circuit breaker is open, aborting operation', { ...context, cooldownRemaining: CIRCUIT_BREAKER_COOLDOWN - timeSinceLastFailure });
                    throw new Error('Circuit breaker is open due to consecutive failures');
                } else {
                    circuitBreakerOpen = false;
                    consecutiveFailures = 0;
                    logger.info('Circuit breaker reset, resuming operations', context);
                }
            }

            const startIndex = i * BATCH_SIZE;
            const batch = values.slice(startIndex, startIndex + BATCH_SIZE);
            const batchContext = { ...context, batchNumber: i + 1, totalBatches, batchSize: batch.length };

            let batchSuccess = false;
            
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    await connectionManager.executeRequest(async (sheetsService) => {
                        return sheetsService.spreadsheets.values.append({
                            spreadsheetId: spreadsheetId,
                            range: `${sheetName}!A1`,
                            valueInputOption: 'USER_ENTERED',
                            insertDataOption: 'INSERT_ROWS',
                            resource: { values: batch },
                        });
                    });
                    
                    logger.info(`Successfully processed batch ${i + 1}/${totalBatches}`, batchContext);
                    batchSuccess = true;
                    consecutiveFailures = 0;
                    break;
                    
                } catch (err) {
                    const isRetryable = err.code === 429 || err.code === 503 || (err.response && (err.response.status === 429 || err.response.status === 503));
                    
                    if (isRetryable && attempt < MAX_RETRIES) {
                        const delay = Math.min(Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 1000), 10000);
                        logger.warn(`Retryable error on batch ${i + 1}. Retrying in ${delay}ms...`, { ...batchContext, attempt, error: err.message });
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        logger.error(`Failed to process batch ${i + 1} after ${attempt} attempts.`, { ...batchContext, error: err.message || err });
                        throw err;
                    }
                }
            }

            if (!batchSuccess) {
                consecutiveFailures++;
                lastFailureTime = Date.now();
                
                if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                    circuitBreakerOpen = true;
                    logger.error('Opening circuit breaker due to consecutive failures', { ...context, consecutiveFailures });
                    throw new Error(`Circuit breaker opened after ${consecutiveFailures} consecutive failures`);
                }
            }

            if (global.gc && i % 10 === 0) {
                global.gc();
            }
            
            if (i < totalBatches - 1) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        logger.info('Successfully completed all batch operations', context);
        return { status: 'success', processedBatches: totalBatches };

    } catch (err) {
        logger.error('Fatal error in appendDataToSheet', { ...context, error: err.message || err });
        connectionManager.cleanup();
        throw err;
    }
}
/*
async function appendDataToSheet(spreadsheetId, sheetName, values) {
    const context = {
        operation: 'appendDataToSheet',
        spreadsheetId,
        sheetName,
        rowsToAppend: values.length
    };

    logger.info('Starting data append to sheet', context);

    if (!values || values.length === 0) {
        logger.info('No data to append. Operation finished.', context);
        return { status: 'success', message: 'No data to append.' };
    }
    
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 3;
    const CIRCUIT_BREAKER_COOLDOWN = 30000;
    let circuitBreakerOpen = false;
    let lastFailureTime = 0;

    try {
        const BATCH_SIZE = 500; // Using larger batch size for fewer requests
        const MAX_RETRIES = 3;
        const totalBatches = Math.ceil(values.length / BATCH_SIZE);

        logger.info(`Processing ${totalBatches} batch(es) of data`, { ...context, batchSize: BATCH_SIZE });

        for (let i = 0; i < totalBatches; i++) {
            if (circuitBreakerOpen) {
                const timeSinceLastFailure = Date.now() - lastFailureTime;
                if (timeSinceLastFailure < CIRCUIT_BREAKER_COOLDOWN) {
                    logger.error('Circuit breaker is open, aborting operation', { ...context, cooldownRemaining: CIRCUIT_BREAKER_COOLDOWN - timeSinceLastFailure });
                    throw new Error('Circuit breaker is open due to consecutive failures');
                } else {
                    circuitBreakerOpen = false;
                    consecutiveFailures = 0;
                    logger.info('Circuit breaker reset, resuming operations', context);
                }
            }

            const startIndex = i * BATCH_SIZE;
            const batch = values.slice(startIndex, startIndex + BATCH_SIZE);
            const batchContext = { ...context, batchNumber: i + 1, totalBatches, batchSize: batch.length };

            let batchSuccess = false;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    await connectionManager.executeRequest(async (sheetsService) => {
                        return sheetsService.spreadsheets.values.append({
                            spreadsheetId: spreadsheetId,
                            range: `${sheetName}!A1`,
                            valueInputOption: 'USER_ENTERED',
                            insertDataOption: 'INSERT_ROWS',
                            resource: { values: batch },
                        });
                    });

                    logger.info(`Successfully processed batch ${i + 1}/${totalBatches}`, batchContext);
                    batchSuccess = true;
                    consecutiveFailures = 0;
                    break;

                } catch (err) {
                    const isRetryable = err.code === 429 || err.code === 503 || (err.response && (err.response.status === 429 || err.response.status === 503));

                    if (isRetryable && attempt < MAX_RETRIES) {
                        const delay = Math.min(Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 1000), 10000);
                        logger.warn(`Retryable error on batch ${i + 1}. Retrying in ${delay}ms...`, { ...batchContext, attempt, error: err.message });
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        logger.error(`Failed to process batch ${i + 1} after ${attempt} attempts.`, { ...batchContext, error: err.message || err });
                        throw err;
                    }
                }
            }

            if (!batchSuccess) {
                consecutiveFailures++;
                lastFailureTime = Date.now();

                if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                    circuitBreakerOpen = true;
                    logger.error('Opening circuit breaker due to consecutive failures', { ...context, consecutiveFailures });
                    throw new Error(`Circuit breaker opened after ${consecutiveFailures} consecutive failures`);
                }
            }

            if (global.gc && i % 10 === 0) {
                global.gc();
            }

            if (i < totalBatches - 1) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        logger.info('Successfully completed all batch operations', context);
        return { status: 'success', processedBatches: totalBatches };

    } catch (err) {
        logger.error('Fatal error in appendDataToSheet', { ...context, error: err.message || err });
        connectionManager.cleanup();
        throw err;
    }
}
*/
async function appendDataToSheet(spreadsheetId, sheetName, values) {
    await ensureSheetExists(spreadsheetId, sheetName);
    return _appendInBatches(spreadsheetId, sheetName, values);
}

// Utility function to process large datasets in chunks to prevent memory issues
async function processLargeDataset(spreadsheetId, sheetName, dataSource, chunkSize = 1000) {
    const context = { operation: 'processLargeDataset', spreadsheetId, sheetName };
    logger.info('Starting large dataset processing', context);

    let processedRows = 0;
    
    try {
        // Now this only needs to call the helper, which handles all the logic.
        await ensureSheetExists(spreadsheetId, sheetName);

        if (Array.isArray(dataSource)) {
            for (let i = 0; i < dataSource.length; i += chunkSize) {
                const chunk = dataSource.slice(i, i + chunkSize);
                // We call the internal function directly since the sheet is already guaranteed to exist.
                await _appendInBatches(spreadsheetId, sheetName, chunk);
                processedRows += chunk.length;
                logger.info(`Processed ${processedRows} rows so far`, { ...context, processedRows });
                if (global.gc) global.gc();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } else {
            let chunk = [];
            for await (const row of dataSource) {
                chunk.push(row);
                
                if (chunk.length >= chunkSize) {
                    await _appendInBatches(spreadsheetId, sheetName, chunk);
                    processedRows += chunk.length;
                    logger.info(`Processed ${processedRows} rows so far`, { ...context, processedRows });
                    chunk = [];
                    if (global.gc) global.gc();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            if (chunk.length > 0) {
                await _appendInBatches(spreadsheetId, sheetName, chunk);
                processedRows += chunk.length;
            }
        }
        
        logger.info(`Large dataset processing completed. Total rows processed: ${processedRows}`, context);
        return { status: 'success', processedRows };
        
    } catch (err) {
        logger.error('Error in large dataset processing', { ...context, error: err, processedRows });
        throw err;
    }
}

// Graceful shutdown handler
process.on('SIGINT', () => {
    logger.info('Received SIGINT, cleaning up...');
    connectionManager.cleanup();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, cleaning up...');
    connectionManager.cleanup();
    process.exit(0);
});

/**
 * Safe wrapper for appendDataToSheet that handles common parameter mistakes
 */
async function safeAppendDataToSheet(spreadsheetIdOrAuth, sheetNameOrSpreadsheetId, valuesOrSheetName, maybeValues) {
    if (arguments.length === 4 && typeof spreadsheetIdOrAuth === 'object') {
        logger.warn('Detected old function signature with authClient parameter. Please update your code.');
        return appendDataToSheet(sheetNameOrSpreadsheetId, valuesOrSheetName, maybeValues);
    }
    
    return appendDataToSheet(spreadsheetIdOrAuth, sheetNameOrSpreadsheetId, valuesOrSheetName);
}

module.exports = {
    authorize,
    createSheet,
    clearSheetData,
    appendDataToSheet,
    safeAppendDataToSheet,
    processLargeDataset,
    connectionManager
};