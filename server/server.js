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

// ⚠️ IMPORTANTE: Limiti body size PRIMA di tutto (per upload grandi)
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Inizializza Passport
app.use(passport.initialize());

// Serve file statici
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// ==================== TIMEOUT PER UPLOAD GRANDI ====================
// Timeout esteso per upload audio show (PRIMA delle route)
app.use('/api/shows/:id/audio', (req, res, next) => {
    req.setTimeout(600000); // 10 minuti
    res.setTimeout(600000);
    next();
});

// Timeout esteso per upload audio episodi
app.use('/api/episodes/:id/upload', (req, res, next) => {
    req.setTimeout(600000);
    res.setTimeout(600000);
    next();
});

// ==================== DATABASE CONNECTION ====================
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('✔ MongoDB connesso'))
    .catch(err => console.error('✗ Errore MongoDB:', err));

// ==================== IMPORT ROUTES ====================
const authRoutes = require('./routes/auth.routes');
const showsRoutes = require('./routes/shows.routes');
const episodesRoutes = require('./routes/episodes.routes');
const uploadRoutes = require('./routes/upload.routes');
const streamingRoutes = require('./routes/streaming.routes');
const postsRoutes = require('./routes/posts.routes');
const publicRoutes = require('./routes/public.routes');

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
app.use('/api/posts', postsRoutes);
app.use('/', publicRoutes);

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
const server = app.listen(PORT, () => {
    console.log(`\n🚀 Server in esecuzione sulla porta ${PORT}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`📦 Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
});

// ⚠️ TIMEOUT GLOBALI DEL SERVER (per upload grandi)
server.timeout = 600000;         // 10 minuti
server.keepAliveTimeout = 600000;
server.headersTimeout = 610000;  // Leggermente più alto

// ==================== GESTIONE ERRORI GLOBALI ====================
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});