const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');

const credentialsPath = path.join(__dirname, '../config/google_sheets_credentials.json');
const storedRefreshTokenPath = path.join(__dirname, '../config/refresh_token.json'); // Path to store/read refresh token

const redirectUri = 'http://localhost:3000';
const parentFolderId = '12iQrSGoy6_nduDbF45JdQ-b-HO8krV32';

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

async function createSheet(authClient, title, folderId) {
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
/*
    // Move the new sheet to the specified folder
    await drive.files.update({
      fileId: spreadsheetId,
      addParents: folderId,
      removeParents: 'root', // Remove from root if it was created there
    });
*/
    console.log(`Spreadsheet created with ID: ${spreadsheetId}`);
    return spreadsheetId;
  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    throw error;
  }
}

async function appendDataToSheet(authClient, spreadsheetId, range, values) {
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: values,
      },
    });
    console.log('Append response:', response.data);
    return response.data;
  } catch (err) {
    console.error('Error appending data:', err);
    throw err;
  }
}

async function main() {
  try {
    const authClient = await authorize();
    const newSheetId = await createSheet(authClient, 'Hotel PMS Data', parentFolderId);
    const range = 'Sheet1!A1'; // The range to append data to
    const dataToAppend = [['New Booking ID', 'Guest Name', 'Check-in Date'], ['1011', 'Sophia Miller', '2025-04-28']]; // Example data

    await appendDataToSheet(authClient, newSheetId, range, dataToAppend);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();