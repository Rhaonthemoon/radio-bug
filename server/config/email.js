const nodemailer = require('nodemailer');

/**
 * Configurazione Email - SendGrid API vs IONOS SMTP
 * SendGrid API funziona su Render (non usa porte SMTP)
 */

// Determina quale servizio usare
const useSendGrid = process.env.USE_SENDGRID === 'true' || process.env.SENDGRID_API_KEY;

let transporter;

if (useSendGrid) {
    // ===== SENDGRID API CONFIGURATION =====
    console.log('📧 Using SendGrid API for emails');

    // IMPORTANTE: Usa SendGrid API, non SMTP!
    // Render blocca TUTTE le porte SMTP (incluso smtp.sendgrid.net)
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Crea transporter wrapper per compatibilità con nodemailer
    transporter = {
        sendMail: async (mailOptions) => {
            const msg = {
                to: mailOptions.to,
                from: mailOptions.from,
                subject: mailOptions.subject,
                html: mailOptions.html
            };

            try {
                const result = await sgMail.send(msg);
                console.log('✅ Email inviata via SendGrid API');
                return { messageId: result[0].headers['x-message-id'] };
            } catch (error) {
                console.error('❌ SendGrid API error:', error.response?.body || error.message);
                throw error;
            }
        },
        verify: (callback) => {
            // SendGrid API non ha verify, simula success
            console.log('✅ SendGrid API pronto');
            if (callback) callback(null, true);
        }
    };

} else {
    // ===== IONOS SMTP CONFIGURATION (per sviluppo locale) =====
    console.log('📧 Using IONOS SMTP for emails');

    transporter = nodemailer.createTransport({
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

    // Verifica connessione SMTP
    transporter.verify(function(error, success) {
        if (error) {
            console.error('❌ Errore connessione SMTP:', error.message);
        } else {
            console.log('✅ Server SMTP pronto');
        }
    });
}

/**
 * Invia email di verifica account
 */
const sendVerificationEmail = async (email, name, verificationToken) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const mailOptions = {
        from: `"BUG Radio" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
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
        from: `"BUG Radio" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
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
        from: `"BUG Radio" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
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
            <p>We're excited to inform you that your show has been approved!</p>
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
            <p>You can now start uploading episodes for your show!</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${showUrl}" class="button">Upload Episodes</a>
              <a href="${dashboardUrl}" class="button" style="background: #6b7280;">Dashboard</a>
            </div>
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
        from: `"BUG Radio" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
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
            <h3 style="color: #667eea; margin-top: 20px;">📻 ${showTitle}</h3>
            <p>Unfortunately, we're unable to approve your show at this time.</p>
            <div class="admin-notes">
              <strong>📝 Feedback:</strong>
              <p style="margin: 10px 0 0;">${adminNotes}</p>
            </div>
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="button">Dashboard</a>
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
        from: `"BUG Radio" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
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
            <p>We received a request to reset your password.</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            <div class="warning-box">
              <p style="margin: 0;"><strong>⚠️ Important:</strong> Link expires in 1 hour</p>
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
        from: `"BUG Radio" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>✅ Password Changed</h1></div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>Your password has been successfully changed.</p>
            <p><strong>Changed on:</strong> ${new Date().toLocaleString()}</p>
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/login" class="button">Log In</a>
            </div>
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

/**
 * Invia email di notifica all'admin per nuova richiesta show
 */
const sendNewShowRequestEmail = async (artistName, artistEmail, showTitle, showDescription) => {
    const adminEmail = process.env.ADMIN_EMAIL || 'onair.onsite@gmail.com';
    const dashboardUrl = `${process.env.FRONTEND_URL}/admin/shows`;

    const mailOptions = {
        from: `"BUG Radio" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to: adminEmail,
        subject: `🆕 New Show Request: "${showTitle}"`,
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: #fff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>🆕 New Show Request</h1></div>
          <div class="content">
            <h2>A new show request needs your review!</h2>
            
            <div class="info-box">
              <p><strong>📻 Show Title:</strong> ${showTitle}</p>
              <p><strong>👤 Artist:</strong> ${artistName}</p>
              <p><strong>📧 Email:</strong> ${artistEmail}</p>
            </div>
            
            ${showDescription ? `
              <div class="info-box">
                <strong>📝 Description:</strong>
                <p style="margin: 10px 0 0;">${showDescription.substring(0, 300)}${showDescription.length > 300 ? '...' : ''}</p>
              </div>
            ` : ''}
            
            <p>Please review this request and approve or reject it.</p>
            
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="button">Review Request</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email notifica admin inviata:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Errore invio email notifica admin:', error);
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
    sendPasswordChangedEmail,
    sendNewShowRequestEmail
};