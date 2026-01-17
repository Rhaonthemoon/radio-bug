const express = require('express');
const router = express.Router();
const Show = require('../models/Shows');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { sendShowApprovedEmail, sendShowRejectedEmail, sendNewShowRequestEmail } = require('../config/email');
const { b2, B2_BUCKET, B2_BASE_URL } = require('../config/backblaze');
const multer = require('multer');
const musicMetadata = require('music-metadata');

// Multer per gestire file in memoria
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB - nessun limite pratico con B2!
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
            cb(null, true);
        } else {
            cb(new Error('Solo file MP3 sono accettati'), false);
        }
    }
});

// ==================== HELPER: Upload to B2 ====================

const uploadToB2 = async (buffer, filename, contentType = 'audio/mpeg') => {
    const params = {
        Bucket: B2_BUCKET,
        Key: filename,
        Body: buffer,
        ContentType: contentType
    };

    const result = await b2.upload(params).promise();
    return {
        key: filename,
        url: `${B2_BASE_URL}/${filename}`,
        etag: result.ETag
    };
};

const deleteFromB2 = async (filename) => {
    const params = {
        Bucket: B2_BUCKET,
        Key: filename
    };

    await b2.deleteObject(params).promise();
};

// ==================== ROTTE PUBBLICHE ====================

/**
 * GET /api/shows/slug/:slug
 */
router.get('/slug/:slug', async (req, res) => {
    try {
        const show = await Show.findOne({ slug: req.params.slug });
        if (!show) {
            return res.status(404).json({ error: 'Show non trovato' });
        }
        res.json(show);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero dello show' });
    }
});

// ==================== ROTTE PROTETTE - VISUALIZZAZIONE ====================

/**
 * GET /api/shows
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { status, featured, genre } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (featured) filter.featured = featured === 'true';
        if (genre) filter.genres = genre;

        if (req.user.role === 'artist') {
            filter.createdBy = req.user._id;
        }

        const shows = await Show.find(filter)
            .populate('createdBy', 'name email')
            .sort({ updatedAt: -1 });

        res.json(shows);
    } catch (error) {
        console.error('❌ ERRORE GET SHOWS:', error);
        res.status(500).json({ error: 'Errore nel recupero degli show' });
    }
});

/**
 * GET /api/shows/:id
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const show = await Show.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!show) {
            return res.status(404).json({ error: 'Show non trovato' });
        }

        if (req.user.role === 'artist' && show.createdBy._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        res.json(show);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero dello show' });
    }
});

// ==================== ROTTE ARTISTI ====================

/**
 * POST /api/shows/artist/request
 */
router.post('/artist/request', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'artist') {
            return res.status(403).json({ error: 'Solo gli artisti possono richiedere show' });
        }

        const show = new Show({
            ...req.body,
            createdBy: req.user._id,
            requestStatus: 'pending',
            status: 'inactive',
            featured: false
        });

        await show.save();

        // Invia notifica email all'admin
        try {
            await sendNewShowRequestEmail(
                req.user.artistName || req.user.name,
                req.user.email,
                show.title,
                show.description
            );
            console.log('✅ Email notifica nuova richiesta inviata');
        } catch (emailError) {
            console.error('❌ Errore invio email notifica:', emailError);
            // Non bloccare la creazione dello show se l'email fallisce
        }

        res.json(show);
    } catch (error) {
        console.error('Errore creazione richiesta:', error);
        res.status(500).json({ error: 'Errore nella creazione della richiesta' });
    }
});

/**
 * GET /api/shows/artist/my-shows
 */
router.get('/artist/my-shows', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'artist') {
            return res.status(403).json({ error: 'Solo per artisti' });
        }

        const shows = await Show.find({ createdBy: req.user._id })
            .sort({ updatedAt: -1 });

        res.json(shows);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero degli show' });
    }
});

/**
 * GET /api/shows/artist/approved
 */
router.get('/artist/approved', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'artist') {
            return res.status(403).json({ error: 'Solo per artisti' });
        }

        const shows = await Show.find({
            createdBy: req.user._id,
            requestStatus: 'approved',
            status: 'active'
        })
            .select('_id title slug status requestStatus')
            .sort({ title: 1 });

        res.json(shows);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero degli show approvati' });
    }
});

// ==================== UPLOAD AUDIO CON BACKBLAZE B2 ====================

/**
 * POST /api/shows/:id/audio
 * Upload audio per uno show su Backblaze B2
 */
router.post('/:id/audio',
    authMiddleware,
    upload.single('audio'),
    async (req, res) => {
        try {
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

            if (!isAdmin && show.requestStatus === 'rejected') {
                return res.status(403).json({
                    error: 'Non puoi caricare audio per show rifiutati'
                });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'Nessun file caricato' });
            }

            console.log(`📤 Upload audio su Backblaze B2 per show "${show.title}"...`);

            // Analizza metadata audio
            const metadata = await musicMetadata.parseBuffer(req.file.buffer);
            const duration = Math.round(metadata.format.duration || 0);
            const bitrate = metadata.format.bitrate ? Math.round(metadata.format.bitrate / 1000) : null;

            console.log(`✔ Durata: ${duration}s, Bitrate: ${bitrate}kbps`);

            // Elimina vecchio audio da B2 se esiste
            if (show.audio && show.audio.b2Key) {
                try {
                    await deleteFromB2(show.audio.b2Key);
                    console.log(`✔ Vecchio audio eliminato da B2`);
                } catch (err) {
                    console.warn('Errore eliminazione vecchio audio:', err.message);
                }
            }

            // Upload su B2
            const filename = `shows/${show._id}_${Date.now()}.mp3`;
            const uploadResult = await uploadToB2(req.file.buffer, filename);

            console.log(`✔ Upload completato: ${uploadResult.url}`);

            // Aggiorna show con dati audio
            show.audio = {
                filename: req.file.originalname,
                originalName: req.file.originalname,
                url: uploadResult.url,
                b2Key: uploadResult.key,
                duration: duration,
                bitrate: bitrate,
                size: req.file.size,
                uploadedAt: new Date()
            };

            await show.save();

            res.json({
                message: 'Audio caricato con successo',
                audio: show.audio
            });

        } catch (error) {
            console.error('❌ Errore upload audio B2:', error);
            res.status(500).json({
                error: 'Errore nel caricamento dell\'audio',
                details: error.message
            });
        }
    }
);

/**
 * DELETE /api/shows/:id/audio
 */
router.delete('/:id/audio', authMiddleware, async (req, res) => {
    try {
        const show = await Show.findById(req.params.id);

        if (!show) {
            return res.status(404).json({ error: 'Show non trovato' });
        }

        const isAdmin = req.user.role === 'admin';
        const isOwner = show.createdBy.toString() === req.user._id.toString();

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        if (!show.audio || !show.audio.b2Key) {
            return res.status(404).json({ error: 'Nessun audio da eliminare' });
        }

        // Elimina da B2
        try {
            await deleteFromB2(show.audio.b2Key);
            console.log(`✔ Audio eliminato da B2: ${show.audio.b2Key}`);
        } catch (err) {
            console.warn('Errore eliminazione B2:', err.message);
        }

        // Rimuovi dati audio dallo show
        show.audio = {
            filename: null,
            originalName: null,
            url: null,
            b2Key: null,
            duration: null,
            bitrate: null,
            size: null,
            uploadedAt: null
        };

        await show.save();

        res.json({ message: 'Audio eliminato con successo' });
    } catch (error) {
        console.error('Errore eliminazione audio:', error);
        res.status(500).json({ error: 'Errore nell\'eliminazione dell\'audio' });
    }
});

// ==================== ROTTE ADMIN ====================

/**
 * POST /api/shows
 */
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const show = new Show({
            ...req.body,
            createdBy: req.user._id
        });

        await show.save();
        res.json(show);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Esiste già uno show con questo titolo' });
        }
        res.status(500).json({ error: 'Errore nella creazione dello show' });
    }
});

/**
 * PUT /api/shows/:id
 */
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const show = await Show.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );

        if (!show) {
            return res.status(404).json({ error: 'Show non trovato' });
        }

        res.json(show);
    } catch (error) {
        console.error('Errore aggiornamento show:', error);
        res.status(500).json({ error: 'Errore nell\'aggiornamento dello show' });
    }
});

/**
 * DELETE /api/shows/:id
 */
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const show = await Show.findById(req.params.id);

        if (!show) {
            return res.status(404).json({ error: 'Show non trovato' });
        }

        // Elimina audio da B2 se esiste
        if (show.audio && show.audio.b2Key) {
            try {
                await deleteFromB2(show.audio.b2Key);
                console.log(`✔ Audio eliminato da B2 insieme allo show`);
            } catch (err) {
                console.warn('Errore eliminazione audio B2:', err.message);
            }
        }

        await Show.findByIdAndDelete(req.params.id);

        res.json({ message: 'Show eliminato con successo' });
    } catch (error) {
        console.error('Errore eliminazione show:', error);
        res.status(500).json({ error: 'Errore nell\'eliminazione dello show' });
    }
});

// ==================== GESTIONE RICHIESTE ====================

/**
 * GET /api/shows/admin/requests
 */
router.get('/admin/requests', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const shows = await Show.find({ requestStatus: 'pending' })
            .populate('createdBy', 'name email artistName')
            .sort({ createdAt: -1 });

        res.json(shows);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero delle richieste' });
    }
});

/**
 * PUT /api/shows/admin/:id/approve
 */
router.put('/admin/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { adminNotes } = req.body;

        const show = await Show.findByIdAndUpdate(
            req.params.id,
            {
                requestStatus: 'approved',
                status: 'active',
                adminNotes,
                updatedAt: Date.now()
            },
            { new: true }
        ).populate('createdBy', 'name email artistName');

        if (!show) {
            return res.status(404).json({ error: 'Show non trovato' });
        }

        try {
            await sendShowApprovedEmail(
                show.createdBy.email,
                show.createdBy.artistName || show.createdBy.name,
                show.title,
                show.slug,
                adminNotes
            );
            console.log('✅ Email approvazione inviata a:', show.createdBy.email);
        } catch (emailError) {
            console.error('❌ Errore invio email approvazione:', emailError);
        }

        res.json(show);
    } catch (error) {
        console.error('Errore approvazione:', error);
        res.status(500).json({ error: 'Errore nell\'approvazione' });
    }
});

/**
 * PUT /api/shows/admin/:id/reject
 */
router.put('/admin/:id/reject', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { adminNotes } = req.body;

        if (!adminNotes) {
            return res.status(400).json({ error: 'Le note sono obbligatorie per il rifiuto' });
        }

        const show = await Show.findByIdAndUpdate(
            req.params.id,
            {
                requestStatus: 'rejected',
                adminNotes,
                updatedAt: Date.now()
            },
            { new: true }
        ).populate('createdBy', 'name email artistName');

        if (!show) {
            return res.status(404).json({ error: 'Show non trovato' });
        }

        try {
            await sendShowRejectedEmail(
                show.createdBy.email,
                show.createdBy.artistName || show.createdBy.name,
                show.title,
                adminNotes
            );
            console.log('✅ Email rifiuto inviata a:', show.createdBy.email);
        } catch (emailError) {
            console.error('❌ Errore invio email rifiuto:', emailError);
        }

        res.json(show);
    } catch (error) {
        console.error('Errore rifiuto:', error);
        res.status(500).json({ error: 'Errore nel rifiuto' });
    }
});

module.exports = router;