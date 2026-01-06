const express = require('express');
const router = express.Router();
const Episode = require('../models/Episode');
const Show = require('../models/Shows');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const {
    upload,
    validateMP3Bitrate,
    deleteAudioFile,
    checkFileExists,
    uploadImage,
    validateImage,
    deleteImageFile,
    checkImageExists
} = require('../middleware/uploadMiddleware');
const { uploadToMixcloud, getMixcloudEmbedUrl } = require('../services/mixcloudService');

// ==================== HELPER FUNCTIONS ====================

/**
 * Verifica se un utente può gestire un episodio
 */
const canManageEpisode = async (userId, userRole, episodeId) => {
    if (userRole === 'admin') return true;

    if (userRole === 'artist') {
        const episode = await Episode.findById(episodeId).populate('showId');
        if (!episode) return false;

        // L'artista può gestire solo episodi dei propri show
        return episode.showId.createdBy.toString() === userId.toString();
    }

    return false;
};

/**
 * ✅ Verifica se un utente può creare episodi per uno show
 * Controlla anche che lo show sia APPROVATO e ATTIVO
 */
const canCreateEpisodeForShow = async (userId, userRole, showId) => {
    const show = await Show.findById(showId);
    if (!show) return { allowed: false, reason: 'Show non trovato' };

    // Admin può creare per qualsiasi show
    if (userRole === 'admin') {
        return { allowed: true };
    }

    // Artist: controlli stringenti
    if (userRole === 'artist') {
        // 1. Verifica ownership
        if (show.createdBy.toString() !== userId.toString()) {
            return { allowed: false, reason: 'Non puoi creare episodi per show di altri artisti' };
        }

        // 2. ✅ Verifica che lo show sia APPROVATO
        if (show.requestStatus !== 'approved') {
            return {
                allowed: false,
                reason: `Lo show deve essere approvato dall'admin prima di poter creare episodi. Stato attuale: ${show.requestStatus}`
            };
        }

        // 3. ✅ Verifica che lo show sia ATTIVO
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
 * Ottieni episodi pubblici di uno show (no auth)
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
            .select('-audioFile.path -image.path'); // Non esporre path completi

        res.json(episodes);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero degli episodi' });
    }
});

/**
 * GET /api/episodes/public/:id/stream
 * Stream audio pubblico di un episodio pubblicato
 */
router.get('/public/:id/stream', async (req, res) => {
    try {
        const episode = await Episode.findById(req.params.id);

        if (!episode || episode.status !== 'published') {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        if (!episode.audioFile || !episode.audioFile.exists) {
            return res.status(404).json({ error: 'File audio non disponibile' });
        }

        const path = require('path');
        const fs = require('fs');
        const filePath = episode.audioFile.path;

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File non trovato sul server' });
        }

        // Incrementa contatore plays
        episode.stats.plays += 1;
        await episode.save();

        // Stream del file con supporto Range
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'audio/mpeg',
            });

            file.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'audio/mpeg',
            });
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (error) {
        console.error('Errore streaming:', error);
        res.status(500).json({ error: 'Errore nello streaming' });
    }
});

// ==================== ROTTE PROTETTE - VISUALIZZAZIONE ====================

/**
 * GET /api/episodes
 * Lista episodi con filtri opzionali
 * ACCESSIBILE A: Admin (tutti) e Artist (solo dei propri show)
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { showId, status } = req.query;
        const filter = {};

        if (showId) filter.showId = showId;
        if (status) filter.status = status;

        // Se artista, mostra solo episodi dei suoi show
        if (req.user.role === 'artist') {
            const userShows = await Show.find({ createdBy: req.user._id }).select('_id');
            filter.showId = { $in: userShows.map(s => s._id) };
        }

        const episodes = await Episode.find(filter)
            .populate('showId', 'title slug status requestStatus image tags')
            .populate('createdBy', 'name email')
            .sort({ airDate: -1 });

        // Verifica esistenza file per ogni episodio
        for (let episode of episodes) {
            if (episode.audioFile && episode.audioFile.storedFilename) {
                episode.audioFile.exists = checkFileExists(episode.audioFile.storedFilename);
            }
            if (episode.image && episode.image.storedFilename) {
                episode.image.exists = checkImageExists(episode.image.storedFilename);
            }
        }

        res.json(episodes);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero degli episodi' });
    }
});

/**
 * GET /api/episodes/:id
 * Ottieni singolo episodio
 * ACCESSIBILE A: Admin e Artist (solo propri episodi)
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const episode = await Episode.findById(req.params.id)
            .populate('showId', 'title slug createdBy status requestStatus image tags')
            .populate('createdBy', 'name email');

        if (!episode) {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        // Verifica permessi
        if (req.user.role === 'artist') {
            if (episode.showId.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Non autorizzato a visualizzare questo episodio' });
            }
        }

        // Verifica esistenza file
        if (episode.audioFile && episode.audioFile.storedFilename) {
            episode.audioFile.exists = checkFileExists(episode.audioFile.storedFilename);
        }
        if (episode.image && episode.image.storedFilename) {
            episode.image.exists = checkImageExists(episode.image.storedFilename);
        }

        res.json(episode);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero dell\'episodio' });
    }
});

// ==================== ROTTE PROTETTE - GESTIONE ====================

/**
 * POST /api/episodes
 * Crea nuovo episodio
 * ACCESSIBILE A: Admin (per qualsiasi show) e Artist (solo per show approvati e attivi)
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        // ✅ Verifica permessi E stato dello show
        const permission = await canCreateEpisodeForShow(req.user._id, req.user.role, req.body.showId);

        if (!permission.allowed) {
            return res.status(403).json({ error: permission.reason });
        }

        const episode = new Episode({
            ...req.body,
            createdBy: req.user._id
        });

        await episode.save();

        // Aggiorna contatore episodi nello show
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
 * Aggiorna episodio
 * ACCESSIBILE A: Admin (qualsiasi) e Artist (solo propri episodi)
 */
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const episode = await Episode.findById(req.params.id);

        if (!episode) {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        // Verifica permessi
        const canManage = await canManageEpisode(req.user._id, req.user.role, req.params.id);
        if (!canManage) {
            return res.status(403).json({ error: 'Non autorizzato a modificare questo episodio' });
        }

        Object.assign(episode, req.body, {
            updatedAt: Date.now(),
            updatedBy: req.user._id
        });

        await episode.save();

        // Popola per la risposta
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
 * Elimina episodio
 * ACCESSIBILE A: Admin (qualsiasi) e Artist (solo propri episodi)
 */
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const episode = await Episode.findById(req.params.id);

        if (!episode) {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        // Verifica permessi
        const canManage = await canManageEpisode(req.user._id, req.user.role, req.params.id);
        if (!canManage) {
            return res.status(403).json({ error: 'Non autorizzato a eliminare questo episodio' });
        }

        // Elimina file audio se esiste
        if (episode.audioFile && episode.audioFile.storedFilename) {
            deleteAudioFile(episode.audioFile.storedFilename);
        }

        // Elimina immagine se esiste
        if (episode.image && episode.image.storedFilename) {
            deleteImageFile(episode.image.storedFilename);
        }

        await Episode.findByIdAndDelete(req.params.id);

        // Decrementa contatore episodi nello show
        await Show.findByIdAndUpdate(episode.showId, {
            $inc: { 'stats.totalEpisodes': -1 }
        });

        res.json({ message: 'Episodio eliminato con successo' });
    } catch (error) {
        console.error('Errore eliminazione episodio:', error);
        res.status(500).json({ error: 'Errore nell\'eliminazione dell\'episodio' });
    }
});

// ==================== UPLOAD AUDIO ====================

/**
 * POST /api/episodes/:id/upload
 * Upload file audio MP3 per un episodio
 * ACCESSIBILE A: Admin e Artist (solo propri episodi)
 */
router.post('/:id/upload',
    authMiddleware,
    upload.single('audio'),
    validateMP3Bitrate,
    async (req, res) => {
        try {
            const episode = await Episode.findById(req.params.id).populate('showId');

            if (!episode) {
                if (req.file) deleteAudioFile(req.file.filename);
                return res.status(404).json({ error: 'Episodio non trovato' });
            }

            // Verifica permessi
            const canManage = await canManageEpisode(req.user._id, req.user.role, req.params.id);
            if (!canManage) {
                if (req.file) deleteAudioFile(req.file.filename);
                return res.status(403).json({ error: 'Non autorizzato a caricare audio per questo episodio' });
            }

            // Elimina vecchio file se esiste
            if (episode.audioFile && episode.audioFile.storedFilename) {
                deleteAudioFile(episode.audioFile.storedFilename);
            }

            // Salva informazioni del nuovo file
            episode.audioFile = {
                filename: req.file.originalname,
                storedFilename: req.file.filename,
                path: req.file.path,
                size: req.file.size,
                mimetype: req.file.mimetype,
                bitrate: req.audioMetadata.bitrate,
                duration: req.audioMetadata.duration,
                uploadedAt: new Date(),
                exists: true
            };

            // Aggiorna anche il campo duration dell'episodio se non era impostato
            if (!episode.duration && req.audioMetadata.duration) {
                episode.duration = Math.round(req.audioMetadata.duration / 60); // converti in minuti
            }

            await episode.save();

            res.json({
                message: 'File audio caricato con successo',
                episode: episode,
                audioMetadata: req.audioMetadata
            });

        } catch (error) {
            console.error('Errore upload audio:', error);
            if (req.file) deleteAudioFile(req.file.filename);
            res.status(500).json({
                error: 'Errore nel caricamento del file audio',
                details: error.message
            });
        }
    }
);

/**
 * DELETE /api/episodes/:id/audio
 * Elimina file audio di un episodio
 * ACCESSIBILE A: Admin e Artist (solo propri episodi)
 */
router.delete('/:id/audio', authMiddleware, async (req, res) => {
    try {
        const episode = await Episode.findById(req.params.id);

        if (!episode) {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        // Verifica permessi
        const canManage = await canManageEpisode(req.user._id, req.user.role, req.params.id);
        if (!canManage) {
            return res.status(403).json({ error: 'Non autorizzato a eliminare l\'audio di questo episodio' });
        }

        if (!episode.audioFile || !episode.audioFile.storedFilename) {
            return res.status(404).json({ error: 'Nessun file audio da eliminare' });
        }

        // Elimina file dal filesystem
        deleteAudioFile(episode.audioFile.storedFilename);

        // Rimuovi riferimento dal database
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
 * Stream audio protetto (per preview admin/artist)
 * ACCESSIBILE A: Admin e Artist (solo propri episodi)
 */
router.get('/:id/stream', authMiddleware, async (req, res) => {
    try {
        const episode = await Episode.findById(req.params.id).populate('showId');

        if (!episode) {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        // Verifica permessi
        if (req.user.role === 'artist') {
            if (episode.showId.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Non autorizzato' });
            }
        }

        if (!episode.audioFile || !episode.audioFile.exists) {
            return res.status(404).json({ error: 'File audio non disponibile' });
        }

        const path = require('path');
        const fs = require('fs');
        const filePath = episode.audioFile.path;

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File non trovato sul server' });
        }

        // Stream con supporto Range
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'audio/mpeg',
            });

            file.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'audio/mpeg',
            });
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (error) {
        console.error('Errore streaming:', error);
        res.status(500).json({ error: 'Errore nello streaming' });
    }
});

// ==================== UPLOAD IMAGE ====================

/**
 * POST /api/episodes/:id/upload-image
 * Upload immagine per un episodio
 * ACCESSIBILE A: Admin e Artist (solo propri episodi)
 */
router.post('/:id/upload-image',
    authMiddleware,
    uploadImage.single('image'),
    validateImage,
    async (req, res) => {
        try {
            const episode = await Episode.findById(req.params.id).populate('showId');

            if (!episode) {
                if (req.file) deleteImageFile(req.file.filename);
                return res.status(404).json({ error: 'Episodio non trovato' });
            }

            // Verifica permessi
            const canManage = await canManageEpisode(req.user._id, req.user.role, req.params.id);
            if (!canManage) {
                if (req.file) deleteImageFile(req.file.filename);
                return res.status(403).json({ error: 'Non autorizzato a caricare immagini per questo episodio' });
            }

            // Elimina vecchia immagine se esiste
            if (episode.image && episode.image.storedFilename) {
                deleteImageFile(episode.image.storedFilename);
            }

            // Salva informazioni della nuova immagine
            episode.image = {
                filename: req.file.originalname,
                storedFilename: req.file.filename,
                path: req.file.path,
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
            console.error('Errore upload immagine:', error);
            if (req.file) deleteImageFile(req.file.filename);
            res.status(500).json({
                error: 'Errore nel caricamento dell\'immagine',
                details: error.message
            });
        }
    }
);

/**
 * DELETE /api/episodes/:id/image
 * Elimina immagine di un episodio
 * ACCESSIBILE A: Admin e Artist (solo propri episodi)
 */
router.delete('/:id/image', authMiddleware, async (req, res) => {
    try {
        const episode = await Episode.findById(req.params.id);

        if (!episode) {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        // Verifica permessi
        const canManage = await canManageEpisode(req.user._id, req.user.role, req.params.id);
        if (!canManage) {
            return res.status(403).json({ error: 'Non autorizzato a eliminare l\'immagine di questo episodio' });
        }

        if (!episode.image || !episode.image.storedFilename) {
            return res.status(404).json({ error: 'Nessuna immagine da eliminare' });
        }

        // Elimina file dal filesystem
        deleteImageFile(episode.image.storedFilename);

        // Rimuovi riferimento dal database
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
 * Pubblica episodio su Mixcloud
 * ACCESSIBILE A: Solo Admin
 */
router.post('/:id/publish-mixcloud', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const episode = await Episode.findById(req.params.id)
            .populate('showId', 'title slug image tags');

        if (!episode) {
            return res.status(404).json({ error: 'Episodio non trovato' });
        }

        // Verifica che l'episodio sia archiviato
        if (episode.status !== 'archived') {
            return res.status(400).json({
                error: 'Solo gli episodi archiviati possono essere pubblicati su Mixcloud'
            });
        }

        // Verifica che non sia già stato uploadato
        if (episode.mixcloud?.status === 'uploaded') {
            return res.status(400).json({
                error: 'Episodio già pubblicato su Mixcloud',
                mixcloudUrl: `https://www.mixcloud.com${episode.mixcloud.key}`
            });
        }

        // Verifica che ci sia un file audio
        if (!episode.audioFile || !episode.audioFile.exists) {
            return res.status(400).json({ error: 'Episodio senza file audio' });
        }

        // Imposta stato uploading
        episode.mixcloud = {
            status: 'uploading',
            key: null,
            uploadedAt: null,
            error: null
        };
        await episode.save();

        // Esegui upload (passa anche l'immagine dell'episodio se presente)
        const result = await uploadToMixcloud(episode, episode.showId);

        if (result.success) {
            // Aggiorna con successo
            episode.mixcloud = {
                status: 'uploaded',
                key: result.key,
                uploadedAt: new Date(),
                error: null
            };
            // Aggiorna anche externalLinks per retrocompatibilità
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
            // Aggiorna con errore
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

        // Prova a resettare lo stato
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
 * Verifica stato Mixcloud di un episodio
 * ACCESSIBILE A: Admin e Artist
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