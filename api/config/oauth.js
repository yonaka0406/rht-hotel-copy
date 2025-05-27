const { google } = require('googleapis');
require('dotenv').config({ path: './api/.env' });

/**
 * Creates and configures a Google OAuth2 client.
 * @returns {OAuth2Client} Configured Google OAuth2 client
 */
function getGoogleOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
  );
  return oauth2Client;
}

module.exports = { getGoogleOAuth2Client };
