const nodemailer = require('nodemailer');

/**
 * Configurazione SMTP per IONOS
 */
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ionos.it',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

/**
 * Verifica la connessione SMTP
 */
transporter.verify(function(error, success) {
    if (error) {
        console.error('❌ Errore connessione SMTP:', error);
    } else {
        console.log('✅ Server SMTP pronto per inviare email');
    }
});

/**
 * Invia email di verifica account
 */
const sendVerificationEmail = async (email, name, verificationToken) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const mailOptions = {
        from: `"BUG Radio" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Confirm Your Account - BUG Radio',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>🎵 BUG Radio</h1></div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Thank you for registering with BUG Radio!</p>
            <p>To complete your registration, please click the button below to confirm your email address:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Confirm Email</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
            <p><strong>Note:</strong> This link is valid for 24 hours.</p>
            <p>If you didn't request this registration, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} BUG Radio. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email verifica inviata:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Errore invio email verifica:', error);
        throw error;
    }
};

/**
 * Invia email di benvenuto
 */
const sendWelcomeEmail = async (email, name) => {
    const mailOptions = {
        from: `"BUG Radio" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Welcome to BUG Radio! 🎉',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>🎵 Welcome to BUG Radio!</h1></div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Your account has been successfully verified! 🎉</p>
            <p>You can now access all BUG Radio features:</p>
            <ul>
              <li>📻 Manage your shows</li>
              <li>🎵 Upload episodes</li>
              <li>📊 View listening statistics</li>
            </ul>
            <p>Log in now to get started:</p>
            <p><a href="${process.env.FRONTEND_URL}/login" style="color: #667eea;">Go to Dashboard</a></p>
            <p>Have fun!</p>
          </div>
        </div>
      </body>
      </html>
    `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email benvenuto inviata:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Errore invio email benvenuto:', error);
        throw error;
    }
};

/**
 * Invia email di notifica approvazione show
 */
const sendShowApprovedEmail = async (email, artistName, showTitle, showSlug, adminNotes) => {
    const showUrl = `${process.env.FRONTEND_URL}/artist/my-episodes?show=${showSlug}`;
    const dashboardUrl = `${process.env.FRONTEND_URL}/artist/dashboard`;

    const mailOptions = {
        from: `"BUG Radio" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: `🎉 Your Show "${showTitle}" Has Been Approved!`,
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .show-badge { display: inline-block; padding: 8px 16px; background: #22c55e; color: white; border-radius: 20px; font-weight: bold; margin: 10px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 10px 10px 0; font-weight: bold; }
          .admin-notes { background: #fff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>🎉 Show Approved!</h1></div>
          <div class="content">
            <h2>Great news, ${artistName}!</h2>
            <p>We're excited to inform you that your show has been approved and is now live on BUG Radio!</p>
            <div style="text-align: center;">
              <span class="show-badge">✓ APPROVED</span>
            </div>
            <h3 style="color: #667eea; margin-top: 20px;">📻 ${showTitle}</h3>
            ${adminNotes ? `
              <div class="admin-notes">
                <strong>📝 Admin Notes:</strong>
                <p style="margin: 10px 0 0;">${adminNotes}</p>
              </div>
            ` : ''}
            <h3 style="margin-top: 30px;">What's Next?</h3>
            <p>You can now start uploading episodes for your show! Here's what you can do:</p>
            <ul style="line-height: 1.8;">
              <li>📤 <strong>Upload your first episode</strong></li>
              <li>✏️ <strong>Edit show details</strong> anytime</li>
              <li>📊 <strong>Track your show's performance</strong></li>
              <li>🎵 <strong>Manage your content</strong></li>
            </ul>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${showUrl}" class="button">Upload Episodes</a>
              <a href="${dashboardUrl}" class="button" style="background: #6b7280;">Go to Dashboard</a>
            </div>
            <p style="color: #6b7280; margin-top: 20px;">We can't wait to hear what you create! 🎧</p>
          </div>
        </div>
      </body>
      </html>
    `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email approvazione show inviata:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Errore invio email approvazione show:', error);
        throw error;
    }
};

/**
 * Invia email di notifica rifiuto show
 */
const sendShowRejectedEmail = async (email, artistName, showTitle, adminNotes) => {
    const dashboardUrl = `${process.env.FRONTEND_URL}/artist/dashboard`;

    const mailOptions = {
        from: `"BUG Radio" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: `Update on Your Show Request: "${showTitle}"`,
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .admin-notes { background: #fff; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0 10px 0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>📋 Show Request Update</h1></div>
          <div class="content">
            <h2>Hello ${artistName},</h2>
            <p>Thank you for your interest in creating a show on BUG Radio. We've reviewed your submission for:</p>
            <h3 style="color: #667eea; margin-top: 20px;">📻 ${showTitle}</h3>
            <p>Unfortunately, we're unable to approve your show at this time. Please see the feedback below:</p>
            <div class="admin-notes">
              <strong>📝 Feedback from our team:</strong>
              <p style="margin: 10px 0 0;">${adminNotes}</p>
            </div>
            <h3 style="margin-top: 30px;">What You Can Do:</h3>
            <ul style="line-height: 1.8;">
              <li>📝 <strong>Review the feedback</strong> carefully</li>
              <li>✏️ <strong>Make necessary changes</strong> to your show concept</li>
              <li>🔄 <strong>Submit a new request</strong> when ready</li>
              <li>💬 <strong>Contact us</strong> if you have questions</li>
            </ul>
            <p style="margin-top: 20px;">We encourage you to refine your show based on our feedback and submit again. We're here to help you succeed!</p>
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email rifiuto show inviata:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Errore invio email rifiuto show:', error);
        throw error;
    }
};

/**
 * Invia email per reset password
 */
const sendPasswordResetEmail = async (email, name, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
        from: `"BUG Radio" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Reset Your Password - BUG Radio',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>🔐 Password Reset</h1></div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>We received a request to reset your password for your BUG Radio account.</p>
            <p>Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            <div class="warning-box">
              <p style="margin: 0;"><strong>⚠️ Important:</strong></p>
              <ul style="margin: 10px 0 0; padding-left: 20px;">
                <li>This link expires in <strong>1 hour</strong></li>
                <li>If you didn't request this reset, ignore this email</li>
                <li>Your password won't change until you create a new one</li>
              </ul>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email reset password inviata:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Errore invio email reset:', error);
        throw error;
    }
};

/**
 * Invia email di conferma cambio password
 */
const sendPasswordChangedEmail = async (email, name) => {
    const mailOptions = {
        from: `"BUG Radio" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your Password Has Been Changed - BUG Radio',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .alert-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>✅ Password Changed</h1></div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>This email confirms that your password has been successfully changed.</p>
            <p><strong>Changed on:</strong> ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
            <div class="alert-box">
              <p style="margin: 0;"><strong>⚠️ Didn't make this change?</strong></p>
              <p style="margin: 10px 0 0;">If you didn't change your password, please contact our support team immediately to secure your account.</p>
            </div>
            <p>You can now log in to BUG Radio with your new password:</p>
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/login" class="button">Log In</a>
            </div>
            <p style="margin-top: 30px;"><strong>Security Tips:</strong></p>
            <ul>
              <li>Use a unique password for BUG Radio</li>
              <li>Never share your password with anyone</li>
              <li>Enable two-factor authentication if available</li>
            </ul>
          </div>
        </div>
      </body>
      </html>
    `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email conferma cambio password inviata:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Errore invio email conferma:', error);
        throw error;
    }
};

module.exports = {
    transporter,
    sendVerificationEmail,
    sendWelcomeEmail,
    sendShowApprovedEmail,
    sendShowRejectedEmail,
    sendPasswordResetEmail,
    sendPasswordChangedEmail
};