const express = require('express');
const router = express.Router();
const Episode = require('../models/Episode');
const Show = require('../models/Shows');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

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
    }).sort({ airDate: -1 });

    res.json(episodes);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero degli episodi' });
  }
});

// ==================== ROTTE PROTETTE - VISUALIZZAZIONE ====================

/**
 * GET /api/episodes
 * Lista episodi con filtri opzionali
 * ACCESSIBILE A: Admin e Artist (solo visualizzazione)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { showId, status } = req.query;
    const filter = {};

    if (showId) filter.showId = showId;
    if (status) filter.status = status;

    // Se artista, mostra solo episodi dei suoi show (READ-ONLY)
    if (req.user.role === 'artist') {
      const userShows = await Show.find({ createdBy: req.user._id }).select('_id');
      filter.showId = { $in: userShows.map(s => s._id) };
    }

    const episodes = await Episode.find(filter)
        .populate('showId', 'title slug')
        .populate('createdBy', 'name email')
        .sort({ airDate: -1 });

    res.json(episodes);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero degli episodi' });
  }
});

/**
 * GET /api/episodes/:id
 * Ottieni singolo episodio
 * ACCESSIBILE A: Admin e Artist (solo visualizzazione)
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.id)
        .populate('showId', 'title slug artist')
        .populate('createdBy', 'name email');

    if (!episode) {
      return res.status(404).json({ error: 'Episodio non trovato' });
    }

    // Se artista, verifica che l'episodio sia del suo show
    if (req.user.role === 'artist') {
      const show = await Show.findById(episode.showId);
      if (show.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Non autorizzato a visualizzare questo episodio' });
      }
    }

    res.json(episode);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero dell\'episodio' });
  }
});

// ==================== ROTTE PROTETTE - GESTIONE (SOLO ADMIN) ====================

/**
 * POST /api/episodes
 * Crea nuovo episodio (SOLO ADMIN)
 */
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Verifica che lo show esista
    const show = await Show.findById(req.body.showId);
    if (!show) {
      return res.status(404).json({ error: 'Show non trovato' });
    }

    const episode = new Episode({
      ...req.body,
      createdBy: req.user._id
    });

    await episode.save();

    // Aggiorna contatore episodi nello show
    await Show.findByIdAndUpdate(req.body.showId, {
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
 * Aggiorna episodio (SOLO ADMIN)
 */
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.id);

    if (!episode) {
      return res.status(404).json({ error: 'Episodio non trovato' });
    }

    Object.assign(episode, req.body, { updatedAt: Date.now() });
    await episode.save();

    res.json(episode);
  } catch (error) {
    console.error('Errore aggiornamento episodio:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento dell\'episodio' });
  }
});

/**
 * DELETE /api/episodes/:id
 * Elimina episodio (SOLO ADMIN)
 */
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.id);

    if (!episode) {
      return res.status(404).json({ error: 'Episodio non trovato' });
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

module.exports = router;