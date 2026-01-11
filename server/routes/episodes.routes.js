const express = require('express');
const router = express.Router();
const Episode = require('../models/Episode');
const Show = require('../models/Shows');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const { uploadToMixcloud, getMixcloudEmbedUrl } = require('../services/mixcloudService');

// Multer per gestire file in memoria (poi vanno su Cloudinary)
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

const uploadImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per immagini
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Solo file JPG, PNG e WebP sono accettati'), false);
        }
    }
});

// ==================== HELPER FUNCTIONS ====================

const canManageEpisode = async (userId, userRole, episodeId) => {
    if (userRole === 'admin') return true;

    if (userRole === 'artist') {
        const episode = await Episode.findById(episodeId).populate('showId');
        if (!episode) return false;
        return episode.showId.createdBy.toString() === userId.toString();
    }

    return false;
};

const canCreateEpisodeForShow = async (userId, userRole, showId) => {
    const show = await Show.findById(showId);
    if (!show) return { allowed: false, reason: 'Show non trovato' };

    if (userRole === 'admin') {
        return { allowed: true };
    }

    if (userRole === 'artist') {
        if (show.createdBy.toString() !== userId.toString()) {
            return { allowed: false, reason: 'Non puoi creare episodi per show di altri artisti' };
        }

        if (show.requestStatus !== 'approved') {
            return {
                allowed: false,
                reason: `Lo show deve essere approvato dall'admin prima di poter creare episodi. Stato attuale: ${show.requestStatus}`
            };
        }

        if (show.status !== 'active') {
            return {
                allowed: false,
                reason: `Lo show non è attivo. Stato attuale: ${show.status}`
            };
        }

        return { allowed: true };
    }

    return { allowed: false, reason: 'Ruolo non autorizzato' };
};

// ==================== ROTTE PUBBLICHE ====================

/**
 * GET /api/episodes/public/show/:showSlug
 */
router.get('/public/show/:showSlug', async (req, res) => {
    try {
        const show = await Show.findOne({ slug: req.params.showSlug });
        if (!show) {
            return res.status(404).json({ error: 'Show non trovato' });
        }

        const episodes = await Episode.find({
            showId: show._id,
            status: 'published'
        })
            .sort({ airDate: -1 })
            .select('-audioFile.cloudinaryId -image.cloudinaryId');

        res.json(episodes);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero degli episodi' });
    }
});

/**
 * GET /api/episodes/public/:id/stream
 * Redirect a Cloudinary URL per streaming pubblico
 */
router.get('/public/:id/stream', async (req, res) => {
    try {
        const episode = await Episode.findById(req.params.id);

        if (!episode || episode.status !== 'published') {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        if (!episode.audioFile || !episode.audioFile.url) {
            return res.status(404).json({ error: 'File audio non disponibile' });
        }

        // Incrementa contatore plays
        episode.stats.plays += 1;
        await episode.save();

        // Redirect all'URL di Cloudinary
        res.redirect(episode.audioFile.url);
    } catch (error) {
        console.error('Errore streaming:', error);
        res.status(500).json({ error: 'Errore nello streaming' });
    }
});

// ==================== ROTTE PROTETTE - VISUALIZZAZIONE ====================

/**
 * GET /api/episodes
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { showId, status } = req.query;
        const filter = {};

        if (showId) filter.showId = showId;
        if (status) filter.status = status;

        if (req.user.role === 'artist') {
            const userShows = await Show.find({ createdBy: req.user._id }).select('_id');
            filter.showId = { $in: userShows.map(s => s._id) };
        }

        const episodes = await Episode.find(filter)
            .populate('showId', 'title slug status requestStatus image tags')
            .populate('createdBy', 'name email')
            .sort({ airDate: -1 });

        // Verifica esistenza file (con Cloudinary basta controllare se c'è l'URL)
        for (let episode of episodes) {
            if (episode.audioFile) {
                episode.audioFile.exists = !!episode.audioFile.url;
            }
            if (episode.image) {
                episode.image.exists = !!episode.image.url;
            }
        }

        res.json(episodes);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero degli episodi' });
    }
});

/**
 * GET /api/episodes/:id
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const episode = await Episode.findById(req.params.id)
            .populate('showId', 'title slug createdBy status requestStatus image tags')
            .populate('createdBy', 'name email');

        if (!episode) {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        if (req.user.role === 'artist') {
            if (episode.showId.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Non autorizzato a visualizzare questo episodio' });
            }
        }

        // Verifica esistenza file
        if (episode.audioFile) {
            episode.audioFile.exists = !!episode.audioFile.url;
        }
        if (episode.image) {
            episode.image.exists = !!episode.image.url;
        }

        res.json(episode);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero dell\'episodio' });
    }
});

// ==================== ROTTE PROTETTE - GESTIONE ====================

/**
 * POST /api/episodes
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const permission = await canCreateEpisodeForShow(req.user._id, req.user.role, req.body.showId);

        if (!permission.allowed) {
            return res.status(403).json({ error: permission.reason });
        }

        const episode = new Episode({
            ...req.body,
            createdBy: req.user._id
        });

        await episode.save();

        await Show.findByIdAndUpdate(episode.showId, {
            $inc: { 'stats.totalEpisodes': 1 }
        });

        res.json(episode);
    } catch (error) {
        console.error('Errore creazione episodio:', error);
        res.status(500).json({ error: 'Errore nella creazione dell\'episodio' });
    }
});

/**
 * PUT /api/episodes/:id
 */
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const episode = await Episode.findById(req.params.id);

        if (!episode) {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        const canManage = await canManageEpisode(req.user._id, req.user.role, req.params.id);
        if (!canManage) {
            return res.status(403).json({ error: 'Non autorizzato a modificare questo episodio' });
        }

        Object.assign(episode, req.body, {
            updatedAt: Date.now(),
            updatedBy: req.user._id
        });

        await episode.save();

        await episode.populate('showId', 'title slug');
        await episode.populate('createdBy', 'name email');

        res.json(episode);
    } catch (error) {
        console.error('Errore aggiornamento episodio:', error);
        res.status(500).json({ error: 'Errore nell\'aggiornamento dell\'episodio' });
    }
});

/**
 * DELETE /api/episodes/:id
 */
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const episode = await Episode.findById(req.params.id);

        if (!episode) {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        const canManage = await canManageEpisode(req.user._id, req.user.role, req.params.id);
        if (!canManage) {
            return res.status(403).json({ error: 'Non autorizzato a eliminare questo episodio' });
        }

        // Elimina audio da Cloudinary se esiste
        if (episode.audioFile && episode.audioFile.cloudinaryId) {
            try {
                await cloudinary.uploader.destroy(episode.audioFile.cloudinaryId, {
                    resource_type: 'video'
                });
                console.log(`✔ Audio episodio eliminato da Cloudinary`);
            } catch (err) {
                console.warn('Errore eliminazione audio Cloudinary:', err.message);
            }
        }

        // Elimina immagine da Cloudinary se esiste
        if (episode.image && episode.image.cloudinaryId) {
            try {
                await cloudinary.uploader.destroy(episode.image.cloudinaryId);
                console.log(`✔ Immagine episodio eliminata da Cloudinary`);
            } catch (err) {
                console.warn('Errore eliminazione immagine Cloudinary:', err.message);
            }
        }

        await Episode.findByIdAndDelete(req.params.id);

        await Show.findByIdAndUpdate(episode.showId, {
            $inc: { 'stats.totalEpisodes': -1 }
        });

        res.json({ message: 'Episodio eliminato con successo' });
    } catch (error) {
        console.error('Errore eliminazione episodio:', error);
        res.status(500).json({ error: 'Errore nell\'eliminazione dell\'episodio' });
    }
});

// ==================== UPLOAD AUDIO SU CLOUDINARY ====================

/**
 * POST /api/episodes/:id/upload
 * Upload file audio MP3 per un episodio su Cloudinary
 */
router.post('/:id/upload',
    authMiddleware,
    upload.single('audio'),
    async (req, res) => {
        try {
            const episode = await Episode.findById(req.params.id).populate('showId');

            if (!episode) {
                return res.status(404).json({ error: 'Episodio non trovato' });
            }

            const canManage = await canManageEpisode(req.user._id, req.user.role, req.params.id);
            if (!canManage) {
                return res.status(403).json({ error: 'Non autorizzato a caricare audio per questo episodio' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'Nessun file caricato' });
            }

            console.log(`📤 Upload audio episodio su Cloudinary...`);

            // Elimina vecchio audio da Cloudinary se esiste
            if (episode.audioFile && episode.audioFile.cloudinaryId) {
                try {
                    await cloudinary.uploader.destroy(episode.audioFile.cloudinaryId, {
                        resource_type: 'video'
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
                folder: 'bug-radio/episodes',
                public_id: `episode_${episode._id}_${Date.now()}`,
                chunk_size: 6000000 // 6MB chunks
            });

            // Elimina file temporaneo
            fs.unlinkSync(tempPath);

            console.log(`✔ Upload completato: ${uploadResult.secure_url}`);

            // Aggiorna episodio con dati audio
            episode.audioFile = {
                filename: req.file.originalname,
                storedFilename: uploadResult.public_id,
                url: uploadResult.secure_url,
                cloudinaryId: uploadResult.public_id,
                size: uploadResult.bytes,
                mimetype: 'audio/mpeg',
                bitrate: uploadResult.bit_rate ? Math.round(uploadResult.bit_rate / 1000) : null,
                duration: Math.round(uploadResult.duration || 0),
                uploadedAt: new Date(),
                exists: true
            };

            // Aggiorna duration dell'episodio
            if (!episode.duration && uploadResult.duration) {
                episode.duration = Math.round(uploadResult.duration / 60);
            }

            await episode.save();

            res.json({
                message: 'File audio caricato con successo',
                episode: episode,
                audioMetadata: {
                    duration: uploadResult.duration,
                    bitrate: uploadResult.bit_rate ? Math.round(uploadResult.bit_rate / 1000) : null,
                    size: uploadResult.bytes
                }
            });

        } catch (error) {
            console.error('❌ Errore upload audio Cloudinary:', error);
            res.status(500).json({
                error: 'Errore nel caricamento del file audio',
                details: error.message
            });
        }
    }
);

/**
 * DELETE /api/episodes/:id/audio
 */
router.delete('/:id/audio', authMiddleware, async (req, res) => {
    try {
        const episode = await Episode.findById(req.params.id);

        if (!episode) {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        const canManage = await canManageEpisode(req.user._id, req.user.role, req.params.id);
        if (!canManage) {
            return res.status(403).json({ error: 'Non autorizzato a eliminare l\'audio di questo episodio' });
        }

        if (!episode.audioFile || !episode.audioFile.cloudinaryId) {
            return res.status(404).json({ error: 'Nessun file audio da eliminare' });
        }

        // Elimina da Cloudinary
        try {
            await cloudinary.uploader.destroy(episode.audioFile.cloudinaryId, {
                resource_type: 'video'
            });
            console.log(`✔ Audio eliminato da Cloudinary: ${episode.audioFile.cloudinaryId}`);
        } catch (err) {
            console.warn('Errore eliminazione Cloudinary:', err.message);
        }

        episode.audioFile = undefined;
        await episode.save();

        res.json({ message: 'File audio eliminato con successo' });

    } catch (error) {
        console.error('Errore eliminazione audio:', error);
        res.status(500).json({ error: 'Errore nell\'eliminazione del file audio' });
    }
});

/**
 * GET /api/episodes/:id/stream
 * Stream audio protetto - redirect a Cloudinary
 */
router.get('/:id/stream', authMiddleware, async (req, res) => {
    try {
        const episode = await Episode.findById(req.params.id).populate('showId');

        if (!episode) {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        if (req.user.role === 'artist') {
            if (episode.showId.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Non autorizzato' });
            }
        }

        if (!episode.audioFile || !episode.audioFile.url) {
            return res.status(404).json({ error: 'File audio non disponibile' });
        }

        // Redirect all'URL di Cloudinary
        res.redirect(episode.audioFile.url);
    } catch (error) {
        console.error('Errore streaming:', error);
        res.status(500).json({ error: 'Errore nello streaming' });
    }
});

// ==================== UPLOAD IMAGE SU CLOUDINARY ====================

/**
 * POST /api/episodes/:id/upload-image
 */
router.post('/:id/upload-image',
    authMiddleware,
    uploadImage.single('image'),
    async (req, res) => {
        try {
            const episode = await Episode.findById(req.params.id).populate('showId');

            if (!episode) {
                return res.status(404).json({ error: 'Episodio non trovato' });
            }

            const canManage = await canManageEpisode(req.user._id, req.user.role, req.params.id);
            if (!canManage) {
                return res.status(403).json({ error: 'Non autorizzato a caricare immagini per questo episodio' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'Nessun file caricato' });
            }

            console.log(`📤 Upload immagine episodio su Cloudinary...`);

            // Elimina vecchia immagine da Cloudinary se esiste
            if (episode.image && episode.image.cloudinaryId) {
                try {
                    await cloudinary.uploader.destroy(episode.image.cloudinaryId);
                    console.log(`✔ Vecchia immagine eliminata da Cloudinary`);
                } catch (err) {
                    console.warn('Errore eliminazione vecchia immagine:', err.message);
                }
            }

            // Upload su Cloudinary
            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'bug-radio/episodes/images',
                        public_id: `episode_img_${episode._id}_${Date.now()}`,
                        transformation: [
                            { width: 1200, height: 1200, crop: 'limit' },
                            { quality: 'auto' }
                        ]
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer);
            });

            console.log(`✔ Immagine caricata: ${uploadResult.secure_url}`);

            episode.image = {
                filename: req.file.originalname,
                storedFilename: uploadResult.public_id,
                url: uploadResult.secure_url,
                cloudinaryId: uploadResult.public_id,
                size: uploadResult.bytes,
                mimetype: req.file.mimetype,
                uploadedAt: new Date(),
                exists: true
            };

            await episode.save();

            res.json({
                message: 'Immagine caricata con successo',
                episode: episode
            });

        } catch (error) {
            console.error('❌ Errore upload immagine Cloudinary:', error);
            res.status(500).json({
                error: 'Errore nel caricamento dell\'immagine',
                details: error.message
            });
        }
    }
);

/**
 * DELETE /api/episodes/:id/image
 */
router.delete('/:id/image', authMiddleware, async (req, res) => {
    try {
        const episode = await Episode.findById(req.params.id);

        if (!episode) {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        const canManage = await canManageEpisode(req.user._id, req.user.role, req.params.id);
        if (!canManage) {
            return res.status(403).json({ error: 'Non autorizzato a eliminare l\'immagine di questo episodio' });
        }

        if (!episode.image || !episode.image.cloudinaryId) {
            return res.status(404).json({ error: 'Nessuna immagine da eliminare' });
        }

        // Elimina da Cloudinary
        try {
            await cloudinary.uploader.destroy(episode.image.cloudinaryId);
            console.log(`✔ Immagine eliminata da Cloudinary: ${episode.image.cloudinaryId}`);
        } catch (err) {
            console.warn('Errore eliminazione Cloudinary:', err.message);
        }

        episode.image = undefined;
        await episode.save();

        res.json({ message: 'Immagine eliminata con successo' });

    } catch (error) {
        console.error('Errore eliminazione immagine:', error);
        res.status(500).json({ error: 'Errore nell\'eliminazione dell\'immagine' });
    }
});

// ==================== MIXCLOUD INTEGRATION ====================

/**
 * POST /api/episodes/:id/publish-mixcloud
 * Pubblica episodio su Mixcloud (usa URL Cloudinary)
 */
router.post('/:id/publish-mixcloud', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const episode = await Episode.findById(req.params.id)
            .populate('showId', 'title slug image tags');

        if (!episode) {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        if (episode.status !== 'archived') {
            return res.status(400).json({
                error: 'Solo gli episodi archiviati possono essere pubblicati su Mixcloud'
            });
        }

        if (episode.mixcloud?.status === 'uploaded') {
            return res.status(400).json({
                error: 'Episodio già pubblicato su Mixcloud',
                mixcloudUrl: `https://www.mixcloud.com${episode.mixcloud.key}`
            });
        }

        if (!episode.audioFile || !episode.audioFile.url) {
            return res.status(400).json({ error: 'Episodio senza file audio' });
        }

        episode.mixcloud = {
            status: 'uploading',
            key: null,
            uploadedAt: null,
            error: null
        };
        await episode.save();

        // Per Mixcloud, passiamo l'URL di Cloudinary invece del path locale
        const result = await uploadToMixcloud(episode, episode.showId);

        if (result.success) {
            episode.mixcloud = {
                status: 'uploaded',
                key: result.key,
                uploadedAt: new Date(),
                error: null
            };
            episode.externalLinks = episode.externalLinks || {};
            episode.externalLinks.mixcloudUrl = result.url;

            await episode.save();

            res.json({
                success: true,
                message: 'Episodio pubblicato su Mixcloud con successo',
                mixcloud: {
                    key: result.key,
                    url: result.url,
                    embedUrl: getMixcloudEmbedUrl(result.key)
                }
            });
        } else {
            episode.mixcloud = {
                status: 'failed',
                key: null,
                uploadedAt: null,
                error: typeof result.error === 'string' ? result.error : JSON.stringify(result.error)
            };
            await episode.save();

            res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('Errore pubblicazione Mixcloud:', error);

        try {
            await Episode.findByIdAndUpdate(req.params.id, {
                'mixcloud.status': 'failed',
                'mixcloud.error': error.message
            });
        } catch (e) {}

        res.status(500).json({
            error: 'Errore durante la pubblicazione su Mixcloud',
            details: error.message
        });
    }
});

/**
 * GET /api/episodes/:id/mixcloud-status
 */
router.get('/:id/mixcloud-status', authMiddleware, async (req, res) => {
    try {
        const episode = await Episode.findById(req.params.id)
            .select('mixcloud externalLinks');

        if (!episode) {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        res.json({
            mixcloud: episode.mixcloud,
            mixcloudUrl: episode.externalLinks?.mixcloudUrl,
            embedUrl: episode.mixcloud?.key ? getMixcloudEmbedUrl(episode.mixcloud.key) : null
        });

    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero dello stato Mixcloud' });
    }
});

module.exports = router;