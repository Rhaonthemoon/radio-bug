const multer = require('multer');
const path = require('path');
const fs = require('fs');
const musicMetadata = require('music-metadata');

// Directory per gli upload
const UPLOAD_DIR = path.join(__dirname, '../uploads/episodes');
const IMAGES_DIR = path.join(__dirname, '../uploads/episodes/images');

// Crea le directory se non esistono
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log('✔ Directory uploads/episodes creata');
}

if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    console.log('✔ Directory uploads/episodes/images creata');
}

// ==================== AUDIO UPLOAD ====================

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
    // Audio
    upload,
    validateMP3Bitrate,
    deleteAudioFile,
    checkFileExists,
    UPLOAD_DIR,
    // Images
    uploadImage,
    validateImage,
    deleteImageFile,
    checkImageExists,
    getImagePath,
    IMAGES_DIR
};