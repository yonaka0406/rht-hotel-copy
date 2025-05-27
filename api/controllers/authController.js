//const bcrypt = require('bcrypt');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../utils/jwtUtils');
const { sendResetEmail, sendAdminResetEmail } = require('../utils/emailUtils');
const sessionService = require('../services/sessionService');
const { findUserByEmail, updatePasswordHash, findUserByProviderId, linkGoogleAccount, createUserWithGoogle } = require('../models/user');
const { OAuth2Client } = require('google-auth-library');
const { getGoogleOAuth2Client } = require('../config/oauth');
const crypto = require('crypto');

// Initialize Google Auth Client
const googleAuthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const googleOAuth2Client = getGoogleOAuth2Client(); // Assuming this is correctly configured
const scopes = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await findUserByEmail(req.requestId, email);    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'パスワードの誤差がありました。' });
    }

    if (user.status_id !== 1) {
      return res.status(401).json({ error: 'ユーザーが無効になっています。' });
    }

    const token = generateToken(user);
    res.json({ message: 'ログインしました。', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const forgot = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await findUserByEmail(req.requestId, email);
    if (!user) {
      return res.status(400).json({ error: 'ユーザー見つかりません。' });
    }

    // Generate a reset token    
    const resetToken = jwt.sign({ email: user.email }, process.env.JWT_RESET_SECRET, { expiresIn: '15m' });
        
    // Send the email with the reset link
    await sendResetEmail(req.requestId, user.email, resetToken);

    // Respond to the client
    res.json({ message: 'パスワードのリセットリンクが送られました。' });
  } catch (err) {
    res.status(500).json({ error: 'Error occurred while sending the email.' });
  }
}

const forgotAdmin = async (req, res) => {
  const { email } = req.body;
  try {

    // Generate a reset token    
    const resetToken = jwt.sign({ email: email }, process.env.JWT_RESET_SECRET, { expiresIn: '15m' });
    // console.log('email:', email);    
    // console.log('resetToken:', resetToken);  
    // Send the email with the reset link
    await sendAdminResetEmail(req.requestId, email, resetToken);

    // Respond to the client
    res.json({ message: 'パスワードのリセットリンクが送られました。' });
  } catch (err) {
    console.error('Error occurred while sending the email:', err);
    res.status(500).json({ error: 'Error occurred while sending the email.' });
  }
}

const reset = async (req, res) => {
  const { token, password } = req.body;  

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);

    // Extract the userId from the decoded token
    const email = decoded.email;

    // Find user by reset token    
    const user = await findUserByEmail(req.requestId, email);
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const updated_by = user.id;    

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and reset the token
    await updatePasswordHash(req.requestId, email, hashedPassword, updated_by);    
    
    res.json({ message: 'パスワードが正常にリセットされました。' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Error occurred while resetting password' });
  }
}

const getActiveUsers = async (req, res) => {
  try {
    const count = await sessionService.getActiveSessions();
    res.json({ activeUsers: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get active users' });
  }
};


// --- Google OAuth Functions ---

const googleLogin = (req, res) => {
  // 1. Generate a random string for the state parameter
  const state = crypto.randomBytes(32).toString('hex');

  // 2. Store this state value in req.session.oauth_state
  // Ensure session middleware is active for this to work
  if (!req.session) {
    console.error('Session middleware not active or configured correctly.');
    return res.status(500).json({ error: 'Session configuration error.' });
  }
  req.session.oauth_state = state;

  console.log(`Generated OAuth state: ${state} for session ID: ${req.sessionID}`);

  // 3. Include this state parameter in the authorization URL
  const authorizeUrl = googleOAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent screen for development/testing if needed
    hd: process.env.GOOGLE_HOSTED_DOMAIN,
    state: state,
  });
  res.redirect(authorizeUrl);
};

const googleCallback = async (req, res) => {
  const { code, state: receivedState } = req.query;
  const storedState = req.session ? req.session.oauth_state : null;

  // console.log(`Received OAuth callback. Code: ${code ? 'present' : 'missing'}, Received State: ${receivedState}, Stored State: ${storedState}`);

  if (req.session) {
    delete req.session.oauth_state; // Clear state early
  }

  // 1. Verify the state parameter
  if (!receivedState || !storedState || receivedState !== storedState) {
    console.error('Invalid OAuth state parameter. CSRF attack suspected.');
    return res.status(403).json({ error: 'Invalid state parameter. Authentication aborted.' });
  }

  if (!code) {
    return res.status(400).json({ error: 'Authorization code missing.' });
  }

  try {
    // 2. Exchange authorization code for tokens
    const { tokens } = await googleOAuth2Client.getToken(code);
    const idToken = tokens.id_token;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token missing from Google response.' });
    }

    // 3. Verify the ID token
    const ticket = await googleAuthClient.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    // 4. Verify the 'hd' (hosted domain) claim
    if (!payload.hd || payload.hd !== process.env.GOOGLE_HOSTED_DOMAIN) { 
      console.warn(`Domain mismatch: User's domain (<span class="math-inline">\{payload\.hd\}\) vs required domain \(</span>{process.env.FRONTEND_URL})`);
      return res.status(403).json({
        error: `Invalid domain. Please use an account from ${process.env.GOOGLE_HOSTED_DOMAIN}.`
      });
    }

    const googleUserId = payload.sub;
    const userEmail = payload.email;
    const userName = payload.name;

    // 5. User Handling Logic
    let user = await findUserByProviderId(req.requestId, 'google', googleUserId);

    if (!user) {
      const existingUserByEmail = await findUserByEmail(req.requestId, userEmail);
      if (existingUserByEmail) {
        if (existingUserByEmail.auth_provider === 'local' || existingUserByEmail.auth_provider === null) { // Check for null too
          user = await linkGoogleAccount(req.requestId, existingUserByEmail.id, googleUserId);
          // console.log(`Linked existing local user ${userEmail} to Google ID ${googleUserId}`);
        } else if (existingUserByEmail.auth_provider === 'google' && existingUserByEmail.provider_user_id !== googleUserId) {
          console.error(`User ${userEmail} is already associated with a different Google account.`);
          return res.status(409).json({
            error: 'This email is associated with a different Google account. Please sign in with the original Google account or contact support.'
          });
        } else { // User found by email, already correctly linked to this googleId or another provider
          user = existingUserByEmail;
        }
      } else {
        // Consider default role_id and status_id. Assuming 5 and 1 as per previous logic.
        // These could be configurable or based on other logic.
        user = await createUserWithGoogle(req.requestId, googleUserId, userEmail, userName /*, defaultRoleId, defaultStatusId */);
        console.log(`Created new user ${userEmail} with Google ID ${googleUserId}`);
      }
    }

    if (!user) {
      console.error('User object is null after user handling logic.');
      return res.status(500).json({ error: 'User processing failed after authentication.' });
    }

    // 6. JWT Generation
    // Ensure generateToken creates a JWT with the same payload structure as in old routes/auth.js
    // Payload: { userId: user.id, email: user.email, name: user.name, role_id: user.role_id }
    // If generateToken is suitable:
    const jwtToken = generateToken(user);
    // If not, replicate JWT signing:
    // const jwtPayload = { userId: user.id, email: user.email, name: user.name, role_id: user.role_id };
    // const jwtToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '1h' });


    // 7. Redirect user to the frontend with the JWT    
    const frontendRedirectUrl = `${process.env.FRONTEND_URL}/auth/google/callback?token=${jwtToken}`;    
    // console.log('Backend redirecting to frontend with URL:', frontendRedirectUrl);
    res.redirect(frontendRedirectUrl);

  } catch (error) {
    console.error('Error during Google OAuth callback processing:', error);
    if (error.isAxiosError && error.response) {
        console.error('Google API Error Details:', error.response.data);
        return res.status(500).json({ error: `Authentication failed: ${error.response.data.error_description || 'Google API error'}` });
    } else if (error.message && (error.message.includes("Invalid token signature") || error.message.includes("Token used too late"))) {
        return res.status(401).json({ error: `Google ID token validation failed: ${error.message}`});
    }
    return res.status(500).json({ error: 'Authentication processing failed.' });
  }
};

module.exports = { 
  login, 
  forgot, 
  forgotAdmin,
  reset, 
  getActiveUsers,
  googleLogin,
  googleCallback,
};
