const multer = require('multer');
const path = require('path');
const fs = require('fs');
const musicMetadata = require('music-metadata');

// Directory per gli upload
const UPLOAD_DIR = path.join(__dirname, '../uploads/episodes');
const IMAGES_DIR = path.join(__dirname, '../uploads/episodes/images');
const SHOWS_AUDIO_DIR = path.join(__dirname, '../uploads/shows/audio');

// Crea le directory se non esistono
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log('✔ Directory uploads/episodes creata');
}

if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    console.log('✔ Directory uploads/episodes/images creata');
}

if (!fs.existsSync(SHOWS_AUDIO_DIR)) {
    fs.mkdirSync(SHOWS_AUDIO_DIR, { recursive: true });
    console.log('✔ Directory uploads/shows/audio creata');
}

// ==================== AUDIO UPLOAD (EPISODES) ====================

// Configurazione storage Multer per audio
const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Genera nome file unico: episode_ID_timestamp.mp3
        const episodeId = req.params.id || 'unknown';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `episode_${episodeId}_${timestamp}${ext}`);
    }
});

// Filtro file - solo MP3
const audioFileFilter = (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
        cb(null, true);
    } else {
        cb(new Error('Solo file MP3 sono accettati'), false);
    }
};

// Configurazione Multer per audio
const upload = multer({
    storage: audioStorage,
    fileFilter: audioFileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB max
    }
});

/**
 * Middleware per validare il bitrate dell'MP3
 * Deve essere chiamato DOPO multer
 */
const validateMP3Bitrate = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nessun file caricato' });
        }

        console.log(`Analizzo file: ${req.file.filename}`);

        // Analizza i metadata del file audio
        const metadata = await musicMetadata.parseFile(req.file.path);

        // Estrai informazioni sul bitrate
        const bitrate = Math.round(metadata.format.bitrate / 1000); // Converti in kbps
        const duration = Math.round(metadata.format.duration); // durata in secondi

        console.log(`✔ Bitrate: ${bitrate} kbps`);
        console.log(`✔ Durata: ${duration} secondi`);

        // ✅ VALIDAZIONE: Accetta bitrate >= 256 kbps (con tolleranza per VBR)
        if (bitrate < 256) {
            // Elimina il file se non soddisfa i requisiti
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                error: `Qualità audio troppo bassa. Richiesto: ≥ 320 kbps, Ricevuto: ${bitrate} kbps`,
                bitrate: bitrate
            });
        }

        // Aggiungi metadata alla request per uso successivo
        req.audioMetadata = {
            bitrate: bitrate,
            duration: duration,
            sampleRate: metadata.format.sampleRate,
            channels: metadata.format.numberOfChannels,
            codec: metadata.format.codec
        };

        next();
    } catch (error) {
        console.error('Errore validazione MP3:', error);

        // Elimina il file in caso di errore
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            error: 'Errore nella validazione del file audio',
            details: error.message
        });
    }
};

/**
 * Funzione helper per eliminare un file audio
 */
const deleteAudioFile = (filename) => {
    try {
        const filePath = path.join(UPLOAD_DIR, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✔ File audio eliminato: ${filename}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Errore eliminazione file audio:', error);
        return false;
    }
};

/**
 * Funzione helper per verificare esistenza file audio
 */
const checkFileExists = (filename) => {
    try {
        const filePath = path.join(UPLOAD_DIR, filename);
        return fs.existsSync(filePath);
    } catch (error) {
        return false;
    }
};

// ==================== SHOW AUDIO UPLOAD ====================

// ⚙️ CONFIGURAZIONE AUDIO SHOW - Modifica questi valori per cambiare i limiti
const SHOW_AUDIO_CONFIG = {
    MAX_FILE_SIZE_MB: 500,          // Dimensione massima file in MB
    MAX_DURATION_MINUTES: 60,        // Durata massima in minuti (1 ora)
    MIN_BITRATE_KBPS: 128            // Bitrate minimo in kbps
};

// Configurazione storage Multer per audio degli show
const showAudioStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, SHOWS_AUDIO_DIR);
    },
    filename: (req, file, cb) => {
        // Genera nome file unico: show_ID_timestamp.mp3
        const showId = req.params.id || 'unknown';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `show_${showId}_${timestamp}${ext}`);
    }
});

// Configurazione Multer per audio show
const uploadShowAudio = multer({
    storage: showAudioStorage,
    fileFilter: audioFileFilter, // Riusa lo stesso filtro (solo MP3)
    limits: {
        fileSize: SHOW_AUDIO_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024
    }
});

/**
 * Middleware per validare il bitrate e la durata dell'MP3 dello show
 */
const validateShowAudioBitrate = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nessun file caricato' });
        }

        console.log(`Analizzo audio show: ${req.file.filename}`);

        // Analizza i metadata del file audio
        const metadata = await musicMetadata.parseFile(req.file.path);

        // Estrai informazioni sul bitrate
        const bitrate = Math.round(metadata.format.bitrate / 1000); // Converti in kbps
        const duration = Math.round(metadata.format.duration); // durata in secondi

        console.log(`✔ Bitrate: ${bitrate} kbps`);
        console.log(`✔ Durata: ${duration} secondi (${Math.round(duration / 60)} minuti)`);

        // ✅ VALIDAZIONE BITRATE
        if (bitrate < SHOW_AUDIO_CONFIG.MIN_BITRATE_KBPS) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                error: `Qualità audio troppo bassa. Richiesto: ≥ ${SHOW_AUDIO_CONFIG.MIN_BITRATE_KBPS} kbps, Ricevuto: ${bitrate} kbps`,
                bitrate: bitrate
            });
        }

        // ✅ VALIDAZIONE DURATA
        const maxDurationSeconds = SHOW_AUDIO_CONFIG.MAX_DURATION_MINUTES * 60;
        if (duration > maxDurationSeconds) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                error: `Audio troppo lungo. Durata massima: ${SHOW_AUDIO_CONFIG.MAX_DURATION_MINUTES} minuti, Ricevuto: ${Math.round(duration / 60)} minuti`,
                duration: duration,
                maxDuration: maxDurationSeconds
            });
        }

        // Aggiungi metadata alla request per uso successivo
        req.audioMetadata = {
            bitrate: bitrate,
            duration: duration,
            sampleRate: metadata.format.sampleRate,
            channels: metadata.format.numberOfChannels,
            codec: metadata.format.codec
        };

        next();
    } catch (error) {
        console.error('Errore validazione MP3 show:', error);

        // Elimina il file in caso di errore
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            error: 'Errore nella validazione del file audio',
            details: error.message
        });
    }
};

/**
 * Funzione helper per eliminare un file audio show
 */
const deleteShowAudioFile = (filename) => {
    try {
        const filePath = path.join(SHOWS_AUDIO_DIR, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✔ Audio show eliminato: ${filename}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Errore eliminazione audio show:', error);
        return false;
    }
};

/**
 * Funzione helper per verificare esistenza audio show
 */
const checkShowAudioExists = (filename) => {
    try {
        const filePath = path.join(SHOWS_AUDIO_DIR, filename);
        return fs.existsSync(filePath);
    } catch (error) {
        return false;
    }
};

/**
 * Funzione helper per ottenere il path completo audio show
 */
const getShowAudioPath = (filename) => {
    return path.join(SHOWS_AUDIO_DIR, filename);
};

// ==================== IMAGE UPLOAD ====================

// Configurazione storage Multer per immagini
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, IMAGES_DIR);
    },
    filename: (req, file, cb) => {
        // Genera nome file unico: episode_ID_timestamp.ext
        const episodeId = req.params.id || 'unknown';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `episode_${episodeId}_${timestamp}${ext}`);
    }
});

// Filtro file - solo immagini
const imageFileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo file JPG, PNG e WebP sono accettati'), false);
    }
};

// Configurazione Multer per immagini
const uploadImage = multer({
    storage: imageStorage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max
    }
});

/**
 * Middleware per validare l'immagine
 * Verifica dimensioni minime e altre caratteristiche
 */
const validateImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nessun file caricato' });
        }

        console.log(`✔ Immagine caricata: ${req.file.filename}`);
        console.log(`✔ Dimensione: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);

        // Opzionale: qui potresti aggiungere validazione dimensioni con sharp
        // const sharp = require('sharp');
        // const metadata = await sharp(req.file.path).metadata();
        // if (metadata.width < 500 || metadata.height < 500) { ... }

        next();
    } catch (error) {
        console.error('Errore validazione immagine:', error);

        // Elimina il file in caso di errore
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            error: 'Errore nella validazione dell\'immagine',
            details: error.message
        });
    }
};

/**
 * Funzione helper per eliminare un'immagine
 */
const deleteImageFile = (filename) => {
    try {
        const filePath = path.join(IMAGES_DIR, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✔ Immagine eliminata: ${filename}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Errore eliminazione immagine:', error);
        return false;
    }
};

/**
 * Funzione helper per verificare esistenza immagine
 */
const checkImageExists = (filename) => {
    try {
        const filePath = path.join(IMAGES_DIR, filename);
        return fs.existsSync(filePath);
    } catch (error) {
        return false;
    }
};

/**
 * Funzione helper per ottenere il path completo dell'immagine
 */
const getImagePath = (filename) => {
    return path.join(IMAGES_DIR, filename);
};

module.exports = {
    // Audio Episodes
    upload,
    validateMP3Bitrate,
    deleteAudioFile,
    checkFileExists,
    UPLOAD_DIR,
    // Audio Shows
    uploadShowAudio,
    validateShowAudioBitrate,
    deleteShowAudioFile,
    checkShowAudioExists,
    getShowAudioPath,
    SHOWS_AUDIO_DIR,
    SHOW_AUDIO_CONFIG, // Esporta config per uso nel frontend
    // Images
    uploadImage,
    validateImage,
    deleteImageFile,
    checkImageExists,
    getImagePath,
    IMAGES_DIR
};