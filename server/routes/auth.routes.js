const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('../config/passport');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const {
    sendVerificationEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,      // ← AGGIUNGI
    sendPasswordChangedEmail      // ← AGGIUNGI
} = require('../config/email');

/**
 * POST /api/auth/register
 * Registrazione nuovo utente con invio email di verifica
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, artistName } = req.body;

        // Verifica se l'email esiste già
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email già registrata' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crea nuovo utente (non ancora verificato)
        const user = new User({
            email,
            password: hashedPassword,
            name: name || 'Artista',
            artistName: artistName || name || 'Artista',
            role: 'artist',
            authProvider: 'local',
            emailVerified: false
        });

        // Genera token di verifica
        const verificationToken = user.generateVerificationToken();
        await user.save();

        // Invia email di verifica
        try {
            await sendVerificationEmail(email, user.name, verificationToken);
            console.log('✅ Email di verifica inviata a:', email);
        } catch (emailError) {
            console.error('❌ Errore invio email:', emailError);
            // Non bloccare la registrazione se l'email fallisce
        }

        res.json({
            message: 'Registrazione completata! Controlla la tua email per verificare l\'account.',
            email: email,
            emailSent: true
        });
    } catch (error) {
        console.error('Errore registrazione:', error);
        res.status(500).json({ error: 'Errore durante la registrazione' });
    }
});

/**
 * GET /api/auth/verify-email
 * Verifica l'email tramite token
 */
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Token mancante' });
        }

        // Trova utente con questo token
        const user = await User.findOne({
            verificationToken: token
        });

        if (!user) {
            return res.status(400).json({ error: 'Token non valido' });
        }

        // Verifica se il token è scaduto
        if (!user.isVerificationTokenValid()) {
            return res.status(400).json({ error: 'Token scaduto. Richiedi un nuovo link di verifica.' });
        }

        // Verifica l'email
        user.emailVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        // Invia email di benvenuto
        try {
            await sendWelcomeEmail(user.email, user.name);
        } catch (emailError) {
            console.error('❌ Errore invio email benvenuto:', emailError);
        }

        // Genera token JWT per login automatico
        const jwtToken = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || 'secret_key_change_me',
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Email verificata con successo!',
            token: jwtToken,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                emailVerified: true
            }
        });
    } catch (error) {
        console.error('Errore verifica email:', error);
        res.status(500).json({ error: 'Errore durante la verifica dell\'email' });
    }
});

/**
 * POST /api/auth/resend-verification
 * Reinvia email di verifica
 */
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }

        if (user.emailVerified) {
            return res.status(400).json({ error: 'Email già verificata' });
        }

        // Genera nuovo token
        const verificationToken = user.generateVerificationToken();
        await user.save();

        // Invia email
        await sendVerificationEmail(email, user.name, verificationToken);

        res.json({
            message: 'Email di verifica inviata nuovamente!',
            email: email
        });
    } catch (error) {
        console.error('Errore reinvio email:', error);
        res.status(500).json({ error: 'Errore durante l\'invio dell\'email' });
    }
});

/**
 * POST /api/auth/login
 * Login utente (richiede email verificata)
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Cerca utente
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Credenziali non valide' });
        }

        // Verifica se l'utente usa Google OAuth
        if (user.authProvider === 'google' && !user.password) {
            return res.status(400).json({
                error: 'Questo account usa Google Sign-In. Usa il pulsante "Accedi con Google".'
            });
        }

        // Verifica password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Credenziali non valide' });
        }

        // Verifica se l'email è stata confermata
        if (!user.emailVerified) {
            return res.status(403).json({
                error: 'Email non verificata. Controlla la tua casella di posta.',
                emailVerified: false,
                email: user.email
            });
        }

        // Aggiorna ultimo login
        user.lastLogin = new Date();
        await user.save();

        // Genera token JWT
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || 'secret_key_change_me',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar: user.avatar,
                emailVerified: user.emailVerified
            }
        });
    } catch (error) {
        console.error('Errore login:', error);
        res.status(500).json({ error: 'Errore durante il login' });
    }
});

/**
 * GET /api/auth/google
 * Inizia il flusso di autenticazione Google
 */
router.get('/google',
    passport.authenticate('google', {
        session: false,
        scope: ['profile', 'email']
    })
);

/**
 * GET /api/auth/google/callback
 * Callback dopo l'autenticazione Google
 */
router.get('/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: '/login?error=google_auth_failed'
    }),
    (req, res) => {
        try {
            // Gli utenti Google sono automaticamente verificati
            req.user.emailVerified = true;
            req.user.save();

            // Genera token JWT per l'utente autenticato
            const token = jwt.sign(
                { id: req.user._id },
                process.env.JWT_SECRET || 'secret_key_change_me',
                { expiresIn: '7d' }
            );

            // Redirect al frontend con il token
            const frontendURL = process.env.FRONTEND_URL || 'http://localhost:8080';
            res.redirect(`${frontendURL}/auth/callback?token=${token}`);
        } catch (error) {
            console.error('Errore callback Google:', error);
            res.redirect('/login?error=token_generation_failed');
        }
    }
);

/**
 * GET /api/auth/me
 * Ottieni info utente corrente
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        res.json({
            id: req.user._id,
            email: req.user.email,
            name: req.user.name,
            role: req.user.role,
            avatar: req.user.avatar,
            authProvider: req.user.authProvider,
            emailVerified: req.user.emailVerified
        });
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero profilo' });
    }
});
/**
 * POST /api/auth/forgot-password
 * Richiesta reset password
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.json({
                message: 'If an account with that email exists, you will receive a password reset link.'
            });
        }

        if (user.authProvider === 'google' && !user.password) {
            return res.status(400).json({
                error: 'This account uses Google Sign-In. Please log in with Google.'
            });
        }

        const resetToken = user.generatePasswordResetToken();
        await user.save();

        try {
            await sendPasswordResetEmail(user.email, user.name, resetToken);
            console.log('✅ Email reset password inviata a:', user.email);
        } catch (emailError) {
            console.error('❌ Errore invio email reset:', emailError);
            return res.status(500).json({ error: 'Unable to send reset email. Please try again later.' });
        }

        res.json({
            message: 'If an account with that email exists, you will receive a password reset link.'
        });

    } catch (error) {
        console.error('Errore forgot password:', error);
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});

/**
 * POST /api/auth/reset-password
 * Reset password con token
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        const user = await User.findOne({ resetPasswordToken: token });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        if (!user.isPasswordResetTokenValid()) {
            return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        try {
            await sendPasswordChangedEmail(user.email, user.name);
        } catch (emailError) {
            console.error('❌ Errore invio email conferma:', emailError);
        }

        const jwtToken = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || 'secret_key_change_me',
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Password reset successful',
            token: jwtToken,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Errore reset password:', error);
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});
module.exports = router;