const express = require('express');
const router = express.Router();
const Show = require('../models/Shows');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

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
 * ACCESSIBILE A: Admin e Artist (solo visualizzazione)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, featured, genre } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (featured) filter.featured = featured === 'true';
    if (genre) filter.genres = genre;

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
 * ACCESSIBILE A: Admin e Artist (solo visualizzazione)
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const show = await Show.findById(req.params.id)
        .populate('createdBy', 'name email');

    if (!show) {
      return res.status(404).json({ error: 'Show non trovato' });
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
    // Verifica che sia un artista
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
 * Artista ottiene i propri show (READ-ONLY)
 */
router.get('/artist/my-shows', authMiddleware, async (req, res) => {
  try {
    const shows = await Show.find({ createdBy: req.user._id })
        .sort({ updatedAt: -1 });

    res.json(shows);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero delle richieste' });
  }
});

// ==================== ROTTE ADMIN - GESTIONE COMPLETA ====================

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
    const show = await Show.findByIdAndDelete(req.params.id);

    if (!show) {
      return res.status(404).json({ error: 'Show non trovato' });
    }

    res.json({ message: 'Show eliminato con successo' });
  } catch (error) {
    console.error('Errore eliminazione show:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione dello show' });
  }
});

// ==================== ROTTE ADMIN - GESTIONE RICHIESTE ====================

/**
 * GET /api/shows/admin/requests
 * Admin: lista richieste pending
 */
router.get('/admin/requests', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const shows = await Show.find({ requestStatus: 'pending' })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });

    res.json(shows);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero delle richieste' });
  }
});

/**
 * PUT /api/shows/admin/:id/approve
 * Admin: approva richiesta show
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
    ).populate('createdBy', 'name email');

    if (!show) {
      return res.status(404).json({ error: 'Show non trovato' });
    }

    res.json(show);
  } catch (error) {
    res.status(500).json({ error: 'Errore nell\'approvazione' });
  }
});

/**
 * PUT /api/shows/admin/:id/reject
 * Admin: rifiuta richiesta show
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
    ).populate('createdBy', 'name email');

    if (!show) {
      return res.status(404).json({ error: 'Show non trovato' });
    }

    res.json(show);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel rifiuto' });
  }
});

module.exports = router;