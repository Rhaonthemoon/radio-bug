require('dotenv').config();  // ← PRIMA RIGA! Carica .env subito

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const passport = require('./config/passport');

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());

// Inizializza Passport
app.use(passport.initialize());

// Serve file statici
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== DATABASE CONNECTION ====================
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
    .then(() => console.log('✓ MongoDB connesso'))
    .catch(err => console.error('✗ Errore MongoDB:', err));

// ==================== IMPORT ROUTES ====================
const authRoutes = require('./routes/auth.routes');
const showsRoutes = require('./routes/shows.routes');
const episodesRoutes = require('./routes/episodes.routes');
const uploadRoutes = require('./routes/upload.routes');
const streamingRoutes = require('./routes/streaming.routes');

// ==================== TEST ROUTE ====================
app.get('/api/admin/streaming/test-no-auth', (req, res) => {
  res.json({ test: 'works', timestamp: new Date() });
});

// ==================== USE ROUTES ====================
app.use('/api/auth', authRoutes);
app.use('/api/shows', showsRoutes);
app.use('/api/episodes', episodesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin/streaming', streamingRoutes);

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==================== SERVE FRONTEND ====================
// Aggiungi qui la configurazione per servire il frontend in produzione

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server in esecuzione sulla porta ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`📦 Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
});

// ==================== GESTIONE ERRORI GLOBALI ====================
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});