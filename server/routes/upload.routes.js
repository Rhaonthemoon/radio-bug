// routes/upload.routes.js
// Route per generare URL firmati per upload diretto a Backblaze B2

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { b2, B2_BUCKET, B2_BASE_URL } = require('../config/backblaze');
const Episode = require('../models/Episode');
const Show = require('../models/Shows');

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
        // NON includere ContentType - causa SignatureDoesNotMatch
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
            try {
                await b2.deleteObject({
                    Bucket: B2_BUCKET,
                    Key: episode.audioFile.b2Key
                }).promise();
                console.log('✔ Vecchio audio eliminato da B2');
            } catch (err) {
                console.warn('Errore eliminazione vecchio audio:', err.message);
            }
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
        // NON includere ContentType - causa SignatureDoesNotMatch
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
            try {
                await b2.deleteObject({
                    Bucket: B2_BUCKET,
                    Key: show.audio.b2Key
                }).promise();
                console.log('✔ Vecchio audio show eliminato da B2');
            } catch (err) {
                console.warn('Errore eliminazione vecchio audio:', err.message);
            }
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