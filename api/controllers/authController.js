const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../utils/jwtUtils');
const { sendResetEmail, sendAdminResetEmail } = require('../utils/emailUtils');
const sessionService = require('../services/sessionService');
const { findUserByEmail, updatePasswordHash } = require('../models/user');


const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await findUserByEmail(email);    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const token = generateToken(user);
    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const forgot = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'ユーザー見つかりません。' });
    }

    // Generate a reset token    
    const resetToken = jwt.sign({ email: user.email }, process.env.JWT_RESET_SECRET, { expiresIn: '15m' });
        
    // Send the email with the reset link
    await sendResetEmail(user.email, resetToken);

    // Respond to the client
    res.json({ message: 'パスワードのリセットリンクが送られました。' });
  } catch (err) {
    res.status(500).json({ error: 'Error occurred while sending the email.' });
  }
}

const reset = async (req, res) => {
  const { token, password } = req.body;
  const updated_by = 1;

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);

    // Extract the userId from the decoded token
    const email = decoded.email;

    // Find user by reset token    
    const user = await findUserByEmail(email);
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and reset the token
    await updatePasswordHash(email, hashedPassword, updated_by);    
    
    res.json({ message: 'Password has been successfully reset.' });
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

module.exports = { login, forgot, reset, getActiveUsers };