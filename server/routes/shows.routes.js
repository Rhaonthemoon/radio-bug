const express = require('express');
const router = express.Router();
const Show = require('../models/Shows');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { sendShowApprovedEmail, sendShowRejectedEmail } = require('../config/email');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');

// Multer per gestire file in memoria (poi va su Cloudinary)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
            cb(null, true);
        } else {
            cb(new Error('Solo file MP3 sono accettati'), false);
        }
    }
});

// ==================== ROTTE PUBBLICHE ====================

/**
 * GET /api/shows/slug/:slug
 * Ottieni show tramite slug (pubblico)
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
 * Lista tutti gli show con filtri opzionali
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
        res.status(500).json({ error: 'Errore nel recupero degli show' });
    }
});

/**
 * GET /api/shows/:id
 * Ottieni singolo show per ID
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
 * Artista crea richiesta per nuovo show
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

// ==================== UPLOAD AUDIO CON CLOUDINARY ====================

/**
 * POST /api/shows/:id/audio
 * Upload audio per uno show su Cloudinary
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

            console.log(`📤 Upload audio su Cloudinary per show "${show.title}"...`);

            // Elimina vecchio audio da Cloudinary se esiste
            if (show.audio && show.audio.cloudinaryId) {
                try {
                    await cloudinary.uploader.destroy(show.audio.cloudinaryId, {
                        resource_type: 'video' // Cloudinary usa 'video' per audio
                    });
                    console.log(`✔ Vecchio audio eliminato da Cloudinary`);
                } catch (err) {
                    console.warn('Errore eliminazione vecchio audio:', err.message);
                }
            }

            // Salva temporaneamente il file per upload chunked
            const fs = require('fs');
            const path = require('path');
            const os = require('os');

            const tempPath = path.join(os.tmpdir(), `upload_${Date.now()}.mp3`);
            fs.writeFileSync(tempPath, req.file.buffer);

            console.log(`📤 Upload file temporaneo: ${tempPath} (${req.file.size} bytes)`);

            // Upload su Cloudinary con chunked upload per file grandi
            const uploadResult = await cloudinary.uploader.upload(tempPath, {
                resource_type: 'video',
                folder: 'bug-radio/shows',
                public_id: `show_${show._id}_${Date.now()}`,
                chunk_size: 6000000 // 6MB chunks
            });

            // Elimina file temporaneo
            fs.unlinkSync(tempPath);

            console.log(`✔ Upload completato: ${uploadResult.secure_url}`);

            // Aggiorna show con dati audio
            show.audio = {
                filename: req.file.originalname,
                originalName: req.file.originalname,
                url: uploadResult.secure_url,
                cloudinaryId: uploadResult.public_id,
                duration: Math.round(uploadResult.duration || 0),
                bitrate: uploadResult.bit_rate ? Math.round(uploadResult.bit_rate / 1000) : null,
                size: uploadResult.bytes,
                uploadedAt: new Date()
            };

            await show.save();

            res.json({
                message: 'Audio caricato con successo',
                audio: show.audio
            });

        } catch (error) {
            console.error('❌ Errore upload audio Cloudinary:', error);
            res.status(500).json({
                error: 'Errore nel caricamento dell\'audio',
                details: error.message
            });
        }
    }
);

/**
 * DELETE /api/shows/:id/audio
 * Elimina audio di uno show da Cloudinary
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

        if (!show.audio || !show.audio.cloudinaryId) {
            return res.status(404).json({ error: 'Nessun audio da eliminare' });
        }

        // Elimina da Cloudinary
        try {
            await cloudinary.uploader.destroy(show.audio.cloudinaryId, {
                resource_type: 'video'
            });
            console.log(`✔ Audio eliminato da Cloudinary: ${show.audio.cloudinaryId}`);
        } catch (err) {
            console.warn('Errore eliminazione Cloudinary:', err.message);
        }

        // Rimuovi dati audio dallo show
        show.audio = {
            filename: null,
            originalName: null,
            url: null,
            cloudinaryId: null,
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
 * Crea nuovo show (SOLO ADMIN)
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
 * Aggiorna show (SOLO ADMIN)
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
 * Elimina show (SOLO ADMIN)
 */
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const show = await Show.findById(req.params.id);

        if (!show) {
            return res.status(404).json({ error: 'Show non trovato' });
        }

        // Elimina audio da Cloudinary se esiste
        if (show.audio && show.audio.cloudinaryId) {
            try {
                await cloudinary.uploader.destroy(show.audio.cloudinaryId, {
                    resource_type: 'video'
                });
                console.log(`✔ Audio eliminato da Cloudinary insieme allo show`);
            } catch (err) {
                console.warn('Errore eliminazione audio Cloudinary:', err.message);
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