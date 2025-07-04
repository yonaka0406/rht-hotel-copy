const nodemailer = require('nodemailer');

// Get .env accordingly
let envFrontend;

if (process.env.NODE_ENV === 'production') {
  envFrontend = process.env.PROD_FRONTEND_URL  
} else {
  envFrontend = process.env.FRONTEND_URL  
}

// Function to send the reset email
const sendResetEmail = async (email, resetToken) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Use your preferred email service
    auth: {
      user: process.env.EMAIL_USER, // Email address
      pass: process.env.EMAIL_PASS, // Email password or app-specific password
    },
  });

  const resetLink = `${envFrontend}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'パスワードのリセットがリクエストされました。',
    text: `パスワードのリセットをリクエストしました。パスワードをリセットするには、次のリンクをクリックしてください。 ${resetLink}`,
    html: `<p>パスワードのリセットをリクエストしました。パスワードをリセットするには、次のリンクをクリックしてください。</p><a href="${resetLink}">${resetLink}</a>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    // console.log('Password reset email sent to:', email);
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

  const resetLink = `${envFrontend}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '管理者がパスワードのリセットをリクエストしました。',
    text: `管理者が次のメールアドレスを使用してユーザーのパスワードのリセットをリクエストしました: ${email}。パスワードをリセットするには、次のリンクをクリックしてください。 ${resetLink}`,
    html: `<p>管理者が次のメールアドレスを使用してユーザーのパスワードのリセットをリクエストしました: ${email}。パスワードをリセットするには、次のリンクをクリックしてください。</p><a href="${resetLink}">${resetLink}</a>`,
  };

  try {
    await transporter.sendMail(mailOptions);    
  } catch (error) {
    console.error('Error sending admin reset email:', error);
    throw new Error('Failed to send admin reset email');
  }
};

// Function to send waitlist notification email
const sendWaitlistNotificationEmail = async (email, clientName, hotelName, checkInDate, checkOutDate, numberOfGuests, numberOfRooms, confirmationLink, expiryDate) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `${hotelName} - ご希望のお部屋に空きが出ました！`,
    text: `${clientName}様

ご希望のお部屋に空きが出ました！

【予約詳細】
ホテル: ${hotelName}
チェックイン: ${checkInDate}
チェックアウト: ${checkOutDate}
宿泊人数: ${numberOfGuests}名
希望部屋数: ${numberOfRooms}室

この空き室を確保するには、以下のリンクをクリックしてご確認ください。
${confirmationLink}

※このリンクは ${expiryDate} まで有効です。

※リンクが利用できない場合は、予約センターまでお問い合わせください。

ご不明な点がございましたら、お気軽にお問い合わせください。

よろしくお願いいたします。`,
    html: `<div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">ご希望のお部屋に空きが出ました！</h2>
      
      <p style="font-size: 16px; line-height: 1.6;">${clientName}様</p>
      
      <p style="font-size: 16px; line-height: 1.6;">ご希望のお部屋に空きが出ました！</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #2c3e50; margin-top: 0;">【予約詳細】</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 120px;">ホテル:</td>
            <td style="padding: 8px 0;">${hotelName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">チェックイン:</td>
            <td style="padding: 8px 0;">${checkInDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">チェックアウト:</td>
            <td style="padding: 8px 0;">${checkOutDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">宿泊人数:</td>
            <td style="padding: 8px 0;">${numberOfGuests}名</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">希望部屋数:</td>
            <td style="padding: 8px 0;">${numberOfRooms}室</td>
          </tr>
        </table>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6;">この空き室を確保するには、以下のリンクをクリックしてご確認ください。</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${confirmationLink}" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">予約を確認する</a>
      </div>
      
      <p style="font-size: 14px; color: #7f8c8d; margin-top: 20px;">※このリンクは ${expiryDate} まで有効です。</p>
      
      <p style="font-size: 14px; color: #e74c3c; margin-top: 15px;">※リンクが利用できない場合は、予約センターまでお問い合わせください。</p>
      
      <p style="font-size: 16px; line-height: 1.6;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
      
      <p style="font-size: 16px; line-height: 1.6;">よろしくお願いいたします。</p>
    </div>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Waitlist notification email sent to:', email);
  } catch (error) {
    console.error('Error sending waitlist notification email:', error);
    throw new Error('Failed to send waitlist notification email');
  }
};

module.exports = {
  sendResetEmail,
  sendAdminResetEmail,
  sendWaitlistNotificationEmail,
};
