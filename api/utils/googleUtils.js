const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');

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
  try {
    const credentials = await fs.readFile(credentialsPath);
    const key = JSON.parse(credentials).web;

    const client = new google.auth.OAuth2(
      key.client_id,
      key.client_secret,
      redirectUri
    );

    try {
        const refreshTokenData = await fs.readFile(storedRefreshTokenPath);
        const refreshToken = JSON.parse(refreshTokenData).refresh_token;
        client.setCredentials({
            refresh_token: refreshToken,
        });
        await client.getAccessToken(); // Forces a refresh if needed
        return client;
    } catch (error) {
        console.error('No refresh token found. You need to obtain one first.');
        throw new Error('No refresh token');
        // if no token is available, create a new one?
    }

  } catch (err) {
    console.error('Error during authorization:', err);
    throw err;
  }
}

async function createSheet(authClient, title) {
    /*
        It's easier to edit sheets that were created by the server. 
        Create the file with this, see the id and use it.
    */ 
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const drive = google.drive({ version: 'v3', auth: authClient });

    try {
        const spreadsheet = await sheets.spreadsheets.create({
        resource: {
            properties: {
            title: title,
            },
        },
        });

        const spreadsheetId = spreadsheet.data.spreadsheetId;
  
        console.log(`Spreadsheet created with ID: ${spreadsheetId}`);
        return spreadsheetId;
    } catch (error) {
        console.error('Error creating spreadsheet:', error);
        throw error;
    }
}

async function checkSheetExists(authClient, spreadsheetId, sheetName) {
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    try {
        const response = await sheets.spreadsheets.get({
            spreadsheetId: spreadsheetId,
            fields: 'sheets.properties.title'
        });
        
        return response.data.sheets.some(sheet => 
            sheet.properties.title === sheetName
        );
    } catch (err) {
        console.error('Error checking if sheet exists:', err);
        throw err;
    }
}
async function createSheetInSpreadsheet(authClient, spreadsheetId, sheetName) {
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    try {
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
      
      console.log(`Sheet "${sheetName}" created successfully`);
      return response.data;
    } catch (err) {
      console.error('Error creating sheet:', err);
      throw err;
    }
}
async function clearSheetData(authClient, spreadsheetId, sheetName) {
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    
    try {        
      // First, get sheet information to find its range
      const response = await sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
        fields: 'sheets.properties'
      });
      
      // Find the specified sheet
      const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
      
      if (!sheet) {
        console.log(`Sheet "${sheetName}" not found.`);
        return;
      }
      
      // Clear all content from the sheet
      const clearResponse = await sheets.spreadsheets.values.clear({
        spreadsheetId: spreadsheetId,
        range: `${sheetName}!A1:Z1000`, // Using a large range to ensure all data is cleared
      });
      
      console.log(`Sheet "${sheetName}" cleared successfully`);

      await appendDataToSheet(authClient, spreadsheetId, sheetName, headers)

      console.log(`Sheet "${sheetName}" headers added successfully`);

      return clearResponse.data;
    } catch (err) {
      console.error('Error clearing sheet data:', err);
      throw err;
    }
}

async function appendDataToSheet(authClient, spreadsheetId, sheetName, values) {
    // First check if the sheet exists
    const sheetExists = await checkSheetExists(authClient, spreadsheetId, sheetName);
    const range = `${sheetName}!A1`;
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    
    // If sheet doesn't exist, create it and fill the headers
    if (!sheetExists) {
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
            console.log('Headers added to new sheet');
        } catch (err) {
            console.error('Error appending headers:', err);
            throw err;
        }
    } 
    
    // Break data into batches of 500 rows
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(values.length / BATCH_SIZE);

    // Process batches with delay between them
    for (let i = 0; i < totalBatches; i++) {
        const startIndex = i * BATCH_SIZE;
        const endIndex = Math.min(startIndex + BATCH_SIZE, values.length);
        const batch = values.slice(startIndex, endIndex);

        // console.log(`Appending batch ${i+1}/${totalBatches}：`,batch);

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
            // Add delay between batches, except after the last batch
            if (i < totalBatches - 1) {
                // console.log(`Waiting 2 seconds before processing next batch...`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
            }
            
        } catch (err) {
            console.error(`Error appending batch ${i+1}/${totalBatches}:`, err);
            
            // Implement exponential backoff for rate limit errors
            if (err.code === 429 || (err.response && err.response.status === 429)) {
                const retryDelay = 5000; // 5 seconds
                console.log(`Rate limit hit. Waiting ${retryDelay/1000} seconds before retrying...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                // Retry the same batch (decrement i to retry)
                i--;
                continue;
            }
            
            throw err;
        }
    }

    console.log(`Successfully appended all ${values.length} rows in ${totalBatches} batches`);
    return { status: 'success', rowsAppended: values.length };
};

async function main() {
  try {
    const authClient = await authorize();
    //const sheetId = await createSheet(authClient, 'Hotel PMS Data');
    const sheetName = '1'; // The range to append data to
    const dataToAppend = [['New Booking ID', 'Guest Name', 'Check-in Date'], ['1011', 'Sophia Miller', '2025-04-28']]; // Example data

    await appendDataToSheet(authClient, sheetId, sheetName, dataToAppend);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

//main();

module.exports = {   
    authorize, 
    clearSheetData,
    appendDataToSheet,    
};