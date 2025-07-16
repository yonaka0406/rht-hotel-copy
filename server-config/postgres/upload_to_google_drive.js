#!/usr/bin/env node 
// Use env node to find node executable

const fs = require('fs'); // Use sync fs for stream
const fsPromises = require('fs').promises; // Use promises for async reads
const path = require('path');
const { google } = require('googleapis');

// --- Configuration ---
// !! ADJUST THESE PATHS TO THE SECURE LOCATION ON YOUR VPS !!
const credentialsPath = '/etc/app_config/google/credentials.json';
const storedRefreshTokenPath = '/etc/app_config/google/refresh_token.json';
const redirectUri = 'http://localhost:3000'; // This might not be used for automated refresh, but required by OAuth2 client

// Scope for Google Drive API
const SCOPES = ['https://www.googleapis.com/auth/drive.file']; // drive.file gives access to files created/opened by the app

// --- Authorization Function ---
// This function needs to be able to run independently
async function authorize() {
  try {
    const credentials = await fsPromises.readFile(credentialsPath);
    const key = JSON.parse(credentials).web;

    const client = new google.auth.OAuth2(
      key.client_id,
      key.client_secret,
      redirectUri // Still needed for client initialization
    );

    try {
      const refreshTokenData = await fsPromises.readFile(storedRefreshTokenPath);
      const refreshToken = JSON.parse(refreshTokenData).refresh_token;
      client.setCredentials({
        refresh_token: refreshToken,
      });
      // Using client.getAccessToken() forces a token refresh if needed
      // The refresh token will be used automatically by googleapis library
      await client.getAccessToken();
      console.log('Google OAuth2 client authorized using refresh token.');
      return client;
    } catch (error) {
      console.error('Error reading refresh token or authorizing with it:', error.message);
      console.error('Ensure refresh_token.json exists at', storedRefreshTokenPath, 'and contains a valid refresh_token.');
      throw new Error('Authorization failed: No valid refresh token available.');
    }

  } catch (err) {
    console.error('Error loading credentials from', credentialsPath, 'or during authorization:', err.message);
    throw new Error('Authorization failed: Could not load credentials.');
  }
}

// --- Google Drive Upload Function ---
async function uploadFileToDrive(authClient, filePath, folderId) {
  const drive = google.drive({ version: 'v3', auth: authClient });
  const fileName = path.basename(filePath);
  const mimeType = 'application/octet-stream'; // Generic mime type for backup files

  try {
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId], // Specify the folder ID as a parent
      },
      media: {
        mimeType: mimeType,
        body: fs.createReadStream(filePath), // Use fs.createReadStream for efficiency
      },
      fields: 'id, name, webViewLink', // Request specific fields in the response
    });

    console.log(`File "${response.data.name}" uploaded to Google Drive.`);
    console.log(`View link: ${response.data.webViewLink}`);
    return response.data.id; // Return the uploaded file ID
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error.message);
    // Log more details if available from the Google API error
    if (error.response && error.response.data) {
        console.error('Google API Error Details:', error.response.data);
    }
    throw new Error(`Failed to upload file ${fileName} to Google Drive.`);
  }
}

// --- Main Execution ---
async function main() {
  const args = process.argv.slice(2); // Get command line arguments (skip node and script path)

  if (args.length !== 2) {
    console.error('Usage: upload_to_google_drive.js <local_file_path> <google_drive_folder_id>');
    process.exit(1);
  }

  const localFilePath = args[0];
  const googleDriveFolderId = args[1];

  try {
    // 1. Check if the local file exists
    await fsPromises.access(localFilePath, fsPromises.constants.R_OK);

    // 2. Authorize with Google
    const authClient = await authorize();

    // 3. Upload the file
    await uploadFileToDrive(authClient, localFilePath, googleDriveFolderId);

    console.log('Upload process finished successfully.');
    process.exit(0); // Exit successfully

  } catch (error) {
    console.error('Upload process failed:', error.message);
    process.exit(1); // Exit with an error code
  }
}

main();