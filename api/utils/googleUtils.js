const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');

const credentialsPath = path.join(__dirname, '../config/google_sheets_credentials.json');
const fileId = '1xkqZn9yt1VsbbG9WdWiqFRUnkDS2Hhpb9OI_E3zfCLc';

async function authorize() {
  try {
    const credentials = await fs.readFile(credentialsPath);
    const key = JSON.parse(credentials).web;

    const client = new google.auth.OAuth2(
      key.client_id,
      key.client_secret,
      key.redirect_uris[0]
    );

    const tokens = await client.getToken({
      scope: 'https://www.googleapis.com/auth/drive.file',
    });
    client.setCredentials(tokens);
    return client;

  } catch (err) {
    console.error('Error loading credentials or authorizing:', err);
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
    const range = 'Sheet1!A1'; // The range to append data to
    const dataToAppend = [['New Booking ID', 'Guest Name', 'Check-in Date'], ['789', 'Alice Brown', '2025-04-25']]; // Example data

    await appendDataToSheet(authClient, fileId, range, dataToAppend);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();