const nodemailer = require('nodemailer');

// Function to send the reset email
const sendResetEmail = async (email, resetToken) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Use your preferred email service
    auth: {
      user: process.env.EMAIL_USER, // Email address
      pass: process.env.EMAIL_PASS, // Email password or app-specific password
    },
  });

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'パスワードのリセットがリクエストされました。',
    text: `パスワードのリセットをリクエストしました。パスワードをリセットするには、次のリンクをクリックしてください。 ${resetLink}`,
    html: `<p>パスワードのリセットをリクエストしました。パスワードをリセットするには、次のリンクをクリックしてください。</p><a href="${resetLink}">${resetLink}</a>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent to:', email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send reset email');
  }
};

// Function to send an admin password reset notification
const sendAdminResetEmail = async (email, resetToken) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const resetLink = `${process.env.FRONTEND_URL}/admin-reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '管理者がパスワードのリセットをリクエストしました。',
    text: `管理者が次のメールアドレスを使用してユーザーのパスワードのリセットをリクエストしました: ${email}。パスワードをリセットするには、次のリンクをクリックしてください。 ${resetLink}`,
    html: `<p>管理者が次のメールアドレスを使用してユーザーのパスワードのリセットをリクエストしました: ${email}。パスワードをリセットするには、次のリンクをクリックしてください。</p><a href="${resetLink}">${resetLink}</a>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Admin reset email sent to:', adminEmail);
  } catch (error) {
    console.error('Error sending admin reset email:', error);
    throw new Error('Failed to send admin reset email');
  }
};

module.exports = {
  sendResetEmail,
  sendAdminResetEmail,
};
