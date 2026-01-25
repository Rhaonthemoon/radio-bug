// routes/upload.routes.js
// Route per upload diretto a Backblaze B2 (immagini e audio)

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { b2, B2_BUCKET, B2_BASE_URL } = require('../config/backblaze');
const Episode = require('../models/Episode');
const Show = require('../models/Shows');
const multer = require('multer');

// ==================== MULTER CONFIG (memoria, non disco) ====================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per immagini
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Solo immagini JPG, PNG, WebP, GIF sono accettate'), false);
        }
    }
});

// ==================== HELPER: Upload immagine a B2 ====================
const uploadImageToB2 = async (buffer, filename, contentType) => {
    const params = {
        Bucket: B2_BUCKET,
        Key: filename,
        Body: buffer,
        ContentType: contentType
    };

    await b2.upload(params).promise();
    return `${B2_BASE_URL}/${filename}`;
};

// ==================== HELPER: Elimina da B2 ====================
const deleteFromB2 = async (key) => {
    try {
        await b2.deleteObject({
            Bucket: B2_BUCKET,
            Key: key
        }).promise();
        console.log(`✔ File eliminato da B2: ${key}`);
        return true;
    } catch (err) {
        console.warn('Errore eliminazione B2:', err.message);
        return false;
    }
};

// ==================== UPLOAD IMMAGINI SU B2 ====================

/**
 * POST /api/upload
 * Upload immagine generica su B2
 */
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nessun file caricato' });
        }

        console.log('📤 Upload immagine su B2:', req.file.originalname);

        // Genera nome file unico
        const ext = req.file.originalname.split('.').pop().toLowerCase();
        const filename = `images/image-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        // Upload su B2
        const imageUrl = await uploadImageToB2(
            req.file.buffer,
            filename,
            req.file.mimetype
        );

        console.log('✔ Immagine caricata su B2:', imageUrl);

        res.json({
            success: true,
            url: imageUrl,
            filename: filename,
            size: req.file.size
        });

    } catch (error) {
        console.error('❌ Errore upload immagine B2:', error);
        res.status(500).json({ error: 'Errore durante l\'upload' });
    }
});

/**
 * DELETE /api/upload/:filename
 * Elimina immagine da B2
 * Il filename può essere l'URL completo o solo la key
 */
router.delete('/:filename', authMiddleware, async (req, res) => {
    try {
        let key = req.params.filename;

        // Se è un URL completo, estrai la key
        if (key.includes(B2_BASE_URL)) {
            key = key.replace(B2_BASE_URL + '/', '');
        }

        // Se è un URL con dominio diverso, estrai il path
        if (key.includes('http')) {
            const url = new URL(key);
            key = url.pathname.substring(1); // Rimuovi lo slash iniziale
        }

        console.log('🗑️ Eliminazione immagine da B2:', key);

        await deleteFromB2(key);

        res.json({ success: true, message: 'Immagine eliminata con successo' });

    } catch (error) {
        console.error('❌ Errore eliminazione:', error);
        res.status(500).json({ error: 'Errore durante l\'eliminazione' });
    }
});

// ==================== PRESIGNED URLs PER AUDIO ====================

/**
 * POST /api/upload/presign/episode/:id
 * Genera URL firmato per upload diretto audio episodio
 */
router.post('/presign/episode/:id', authMiddleware, async (req, res) => {
    try {
        const { filename } = req.body;

        if (!filename) {
            return res.status(400).json({ error: 'Filename richiesto' });
        }

        const episode = await Episode.findById(req.params.id).populate('showId');

        if (!episode) {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        // Verifica permessi
        const isAdmin = req.user.role === 'admin';
        const isOwner = episode.showId.createdBy.toString() === req.user._id.toString();

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        // Genera nome file unico
        const key = `episodes/${episode._id}_${Date.now()}.mp3`;

        // Genera URL firmato per PUT (upload)
        const presignedUrl = b2.getSignedUrl('putObject', {
            Bucket: B2_BUCKET,
            Key: key,
            Expires: 3600 // 1 ora
        });

        // URL finale del file dopo upload
        const fileUrl = `${B2_BASE_URL}/${key}`;

        res.json({
            presignedUrl,
            key,
            fileUrl
        });

    } catch (error) {
        console.error('❌ Errore generazione presigned URL:', error);
        res.status(500).json({ error: 'Errore generazione URL upload' });
    }
});

/**
 * POST /api/upload/confirm/episode/:id
 * Conferma upload completato e salva metadata
 */
router.post('/confirm/episode/:id', authMiddleware, async (req, res) => {
    try {
        const { key, fileUrl, filename, size, duration, bitrate } = req.body;

        const episode = await Episode.findById(req.params.id).populate('showId');

        if (!episode) {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        // Verifica permessi
        const isAdmin = req.user.role === 'admin';
        const isOwner = episode.showId.createdBy.toString() === req.user._id.toString();

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        // Elimina vecchio file da B2 se esiste
        if (episode.audioFile && episode.audioFile.b2Key) {
            await deleteFromB2(episode.audioFile.b2Key);
        }

        // Aggiorna episodio con nuovi dati audio
        episode.audioFile = {
            filename: filename,
            storedFilename: key,
            url: fileUrl,
            b2Key: key,
            size: size,
            mimetype: 'audio/mpeg',
            bitrate: bitrate || null,
            duration: duration || null,
            uploadedAt: new Date(),
            exists: true
        };

        // Aggiorna duration episodio se fornita
        if (duration && !episode.duration) {
            episode.duration = Math.round(duration / 60);
        }

        await episode.save();

        console.log(`✔ Upload diretto confermato per episodio: ${episode.title}`);

        res.json({
            message: 'Upload confermato con successo',
            episode
        });

    } catch (error) {
        console.error('❌ Errore conferma upload:', error);
        res.status(500).json({ error: 'Errore conferma upload' });
    }
});

/**
 * POST /api/upload/presign/show/:id
 * Genera URL firmato per upload diretto audio show
 */
router.post('/presign/show/:id', authMiddleware, async (req, res) => {
    try {
        const { filename } = req.body;

        if (!filename) {
            return res.status(400).json({ error: 'Filename richiesto' });
        }

        const show = await Show.findById(req.params.id);

        if (!show) {
            return res.status(404).json({ error: 'Show non trovato' });
        }

        // Verifica permessi
        const isAdmin = req.user.role === 'admin';
        const isOwner = show.createdBy.toString() === req.user._id.toString();

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        // Genera nome file unico
        const key = `shows/${show._id}_${Date.now()}.mp3`;

        // Genera URL firmato per PUT (upload)
        const presignedUrl = b2.getSignedUrl('putObject', {
            Bucket: B2_BUCKET,
            Key: key,
            Expires: 3600 // 1 ora
        });

        // URL finale del file dopo upload
        const fileUrl = `${B2_BASE_URL}/${key}`;

        res.json({
            presignedUrl,
            key,
            fileUrl
        });

    } catch (error) {
        console.error('❌ Errore generazione presigned URL:', error);
        res.status(500).json({ error: 'Errore generazione URL upload' });
    }
});

/**
 * POST /api/upload/confirm/show/:id
 * Conferma upload show completato e salva metadata
 */
router.post('/confirm/show/:id', authMiddleware, async (req, res) => {
    try {
        const { key, fileUrl, filename, size, duration, bitrate } = req.body;

        const show = await Show.findById(req.params.id);

        if (!show) {
            return res.status(404).json({ error: 'Show non trovato' });
        }

        // Verifica permessi
        const isAdmin = req.user.role === 'admin';
        const isOwner = show.createdBy.toString() === req.user._id.toString();

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        // Elimina vecchio file da B2 se esiste
        if (show.audio && show.audio.b2Key) {
            await deleteFromB2(show.audio.b2Key);
        }

        // Aggiorna show con nuovi dati audio
        show.audio = {
            filename: filename,
            originalName: filename,
            url: fileUrl,
            b2Key: key,
            size: size,
            bitrate: bitrate || null,
            duration: duration || null,
            uploadedAt: new Date()
        };

        await show.save();

        console.log(`✔ Upload diretto show confermato: ${show.title}`);

        res.json({
            message: 'Upload confermato con successo',
            audio: show.audio
        });

    } catch (error) {
        console.error('❌ Errore conferma upload show:', error);
        res.status(500).json({ error: 'Errore conferma upload' });
    }
});

module.exports = router;