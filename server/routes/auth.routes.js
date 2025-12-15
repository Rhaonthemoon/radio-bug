const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('../config/passport');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Registrazione nuovo utente
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

    // Crea nuovo utente
    const user = new User({
      email,
      password: hashedPassword,
      name: name || 'Artista',
      artistName: artistName || name || 'Artista',
      role: 'artist',
      authProvider: 'local'
    });

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
        email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Errore registrazione:', error);
    res.status(500).json({ error: 'Errore durante la registrazione' });
  }
});

/**
 * POST /api/auth/login
 * Login utente
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
        avatar: user.avatar
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
        // Genera token JWT per l'utente autenticato
        const token = jwt.sign(
            { id: req.user._id },
            process.env.JWT_SECRET || 'secret_key_change_me',
            { expiresIn: '7d' }
        );

        // Redirect al frontend con il token
        // Modifica questo URL in base alla tua configurazione frontend
        const frontendURL = process.env.FRONTEND_URL || 'http://localhost:8080';
        setTimeout(() => {
          res.redirect(`${frontendURL}/auth/callback?token=${token}`);
        }, 10000)
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
      authProvider: req.user.authProvider
    });
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero profilo' });
  }
});

module.exports = router;