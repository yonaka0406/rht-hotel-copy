const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');

const credentialsPath = path.join(__dirname, '../config/google_sheets_credentials.json');
const redirectUri = 'http://localhost:3000';

async function authorize() {
  try {
    const credentials = await fs.readFile(credentialsPath);
    const key = JSON.parse(credentials).web;

    const client = new google.auth.OAuth2(
      key.client_id,
      key.client_secret,
      redirectUri
    );

    const tokenResponse = await client.request({
      url: 'https://oauth2.googleapis.com/token',
      method: 'POST',
      params: {
        grant_type: 'client_credentials',
        scope: 'https://www.googleapis.com/auth/drive.file',
      },
    });

    client.setCredentials(tokenResponse.data);
    return client;

  } catch (err) {
    console.error('Error during authorization:', err);
    throw err;
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
    const fileId = '1xkqZn9yt1VsbbG9WdWiqFRUnkDS2Hhpb9OI_E3zfCLc';
    const range = 'Sheet1!A1'; // The range to append data to
    const dataToAppend = [['Trial Booking', 'Test User', '2025-04-18']]; // Example data

    await appendDataToSheet(authClient, fileId, range, dataToAppend);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();