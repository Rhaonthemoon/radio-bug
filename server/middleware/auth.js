const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware per verificare il token JWT
 */
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    console.log(token);
    
    if (!token) {
      return res.status(401).json({ error: 'Token mancante' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_change_me');
    req.user = await User.findById(decoded.id);
    
    if (!req.user) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token non valido' });
  }
};

/**
 * Middleware per verificare che l'utente sia admin
 */
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accesso negato - Solo admin' });
  }
  next();
};

/**
 * Middleware per verificare che l'utente sia artista
 */
const artistMiddleware = (req, res, next) => {
  if (req.user.role !== 'artist') {
    return res.status(403).json({ error: 'Accesso negato - Solo artisti' });
  }
  next();
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  artistMiddleware
};
