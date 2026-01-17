const express = require('express');
const router = express.Router();
const Episode = require('../models/Episode');
const Show = require('../models/Shows');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { b2, B2_BUCKET, B2_BASE_URL } = require('../config/backblaze');
const multer = require('multer');
const musicMetadata = require('music-metadata');
const { uploadToMixcloud, getMixcloudEmbedUrl } = require('../services/mixcloudService');

// Multer per gestire file in memoria
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

// ==================== HELPER: B2 Functions ====================

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

// ==================== HELPER: Permission Functions ====================

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
                reason: `Lo show deve essere approvato prima di poter creare episodi. Stato attuale: ${show.requestStatus}`
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
            .select('-audioFile.b2Key -image.b2Key');

        res.json(episodes);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero degli episodi' });
    }
});

/**
 * GET /api/episodes/public/:id/stream
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

        // Redirect all'URL di B2
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

        // Verifica esistenza file
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
        console.error('❌ ERRORE GET EPISODES:', error);
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
                return res.status(403).json({ error: 'Non autorizzato' });
            }
        }

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
            return res.status(403).json({ error: 'Non autorizzato' });
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
        res.status(500).json({ error: 'Errore nell\'aggiornamento' });
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
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        // Elimina audio da B2
        if (episode.audioFile && episode.audioFile.b2Key) {
            try {
                await deleteFromB2(episode.audioFile.b2Key);
                console.log(`✔ Audio eliminato da B2`);
            } catch (err) {
                console.warn('Errore eliminazione audio B2:', err.message);
            }
        }

        // Elimina immagine da B2
        if (episode.image && episode.image.b2Key) {
            try {
                await deleteFromB2(episode.image.b2Key);
                console.log(`✔ Immagine eliminata da B2`);
            } catch (err) {
                console.warn('Errore eliminazione immagine B2:', err.message);
            }
        }

        await Episode.findByIdAndDelete(req.params.id);

        await Show.findByIdAndUpdate(episode.showId, {
            $inc: { 'stats.totalEpisodes': -1 }
        });

        res.json({ message: 'Episodio eliminato con successo' });
    } catch (error) {
        console.error('Errore eliminazione episodio:', error);
        res.status(500).json({ error: 'Errore nell\'eliminazione' });
    }
});

// ==================== UPLOAD AUDIO SU B2 ====================

/**
 * POST /api/episodes/:id/upload
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
                return res.status(403).json({ error: 'Non autorizzato' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'Nessun file caricato' });
            }

            console.log(`📤 Upload audio episodio su B2...`);

            // Analizza metadata
            const metadata = await musicMetadata.parseBuffer(req.file.buffer);
            const duration = Math.round(metadata.format.duration || 0);
            const bitrate = metadata.format.bitrate ? Math.round(metadata.format.bitrate / 1000) : null;

            console.log(`✔ Durata: ${duration}s, Bitrate: ${bitrate}kbps`);

            // Elimina vecchio audio da B2
            if (episode.audioFile && episode.audioFile.b2Key) {
                try {
                    await deleteFromB2(episode.audioFile.b2Key);
                    console.log(`✔ Vecchio audio eliminato da B2`);
                } catch (err) {
                    console.warn('Errore eliminazione vecchio audio:', err.message);
                }
            }

            // Upload su B2
            const filename = `episodes/${episode._id}_${Date.now()}.mp3`;
            const uploadResult = await uploadToB2(req.file.buffer, filename);

            console.log(`✔ Upload completato: ${uploadResult.url}`);

            // Aggiorna episodio
            episode.audioFile = {
                filename: req.file.originalname,
                storedFilename: uploadResult.key,
                url: uploadResult.url,
                b2Key: uploadResult.key,
                size: req.file.size,
                mimetype: 'audio/mpeg',
                bitrate: bitrate,
                duration: duration,
                uploadedAt: new Date(),
                exists: true
            };

            if (!episode.duration && duration) {
                episode.duration = Math.round(duration / 60);
            }

            await episode.save();

            res.json({
                message: 'File audio caricato con successo',
                episode: episode,
                audioMetadata: { duration, bitrate, size: req.file.size }
            });

        } catch (error) {
            console.error('❌ Errore upload audio B2:', error);
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
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        if (!episode.audioFile || !episode.audioFile.b2Key) {
            return res.status(404).json({ error: 'Nessun file audio da eliminare' });
        }

        // Elimina da B2
        try {
            await deleteFromB2(episode.audioFile.b2Key);
            console.log(`✔ Audio eliminato da B2: ${episode.audioFile.b2Key}`);
        } catch (err) {
            console.warn('Errore eliminazione B2:', err.message);
        }

        episode.audioFile = undefined;
        await episode.save();

        res.json({ message: 'File audio eliminato con successo' });

    } catch (error) {
        console.error('Errore eliminazione audio:', error);
        res.status(500).json({ error: 'Errore nell\'eliminazione' });
    }
});

/**
 * GET /api/episodes/:id/stream
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

        res.redirect(episode.audioFile.url);
    } catch (error) {
        console.error('Errore streaming:', error);
        res.status(500).json({ error: 'Errore nello streaming' });
    }
});

// ==================== UPLOAD IMAGE SU B2 ====================

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
                return res.status(403).json({ error: 'Non autorizzato' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'Nessun file caricato' });
            }

            console.log(`📤 Upload immagine episodio su B2...`);

            // Elimina vecchia immagine da B2
            if (episode.image && episode.image.b2Key) {
                try {
                    await deleteFromB2(episode.image.b2Key);
                    console.log(`✔ Vecchia immagine eliminata da B2`);
                } catch (err) {
                    console.warn('Errore eliminazione vecchia immagine:', err.message);
                }
            }

            // Upload su B2
            const ext = req.file.originalname.split('.').pop();
            const filename = `episodes/images/${episode._id}_${Date.now()}.${ext}`;
            const uploadResult = await uploadToB2(req.file.buffer, filename, req.file.mimetype);

            console.log(`✔ Immagine caricata: ${uploadResult.url}`);

            episode.image = {
                filename: req.file.originalname,
                storedFilename: uploadResult.key,
                url: uploadResult.url,
                b2Key: uploadResult.key,
                size: req.file.size,
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
            console.error('❌ Errore upload immagine B2:', error);
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
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        if (!episode.image || !episode.image.b2Key) {
            return res.status(404).json({ error: 'Nessuna immagine da eliminare' });
        }

        try {
            await deleteFromB2(episode.image.b2Key);
            console.log(`✔ Immagine eliminata da B2: ${episode.image.b2Key}`);
        } catch (err) {
            console.warn('Errore eliminazione B2:', err.message);
        }

        episode.image = undefined;
        await episode.save();

        res.json({ message: 'Immagine eliminata con successo' });

    } catch (error) {
        console.error('Errore eliminazione immagine:', error);
        res.status(500).json({ error: 'Errore nell\'eliminazione' });
    }
});

// ==================== MIXCLOUD INTEGRATION ====================

/**
 * POST /api/episodes/:id/publish-mixcloud
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