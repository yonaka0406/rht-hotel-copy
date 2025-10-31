const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline').promises;

const credentialsPath = path.join(__dirname, '../config/google_sheets_credentials.json');
const tokenPath = path.join(__dirname, '../config/refresh_token.json');
const redirectUri = 'http://localhost:3000'; // Use a consistent redirect URI

/*
  cd api/config
  node getRefreshToken.js
*/

async function getAccessToken() {
  try {
    const credentials = await fs.readFile(credentialsPath);
    const key = JSON.parse(credentials).web;

    const oAuth2Client = new google.auth.OAuth2(
      key.client_id,
      key.client_secret,
      redirectUri
    );

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline', // Request a refresh token
      scope: ['https://www.googleapis.com/auth/drive.file'],
      redirect_uri: redirectUri,
      prompt: 'consent',
    });

    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const code = await rl.question('Enter the code from the URL after granting permission: ');
    rl.close();

    const tokenResponse = await oAuth2Client.getToken(code);
    await fs.writeFile(tokenPath, JSON.stringify({ refresh_token: tokenResponse.tokens.refresh_token }));
    console.log('Token stored to', tokenPath);
  } catch (error) {
    console.error('Error getting token:', error);
  }
}

getAccessToken();