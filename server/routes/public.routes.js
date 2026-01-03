const express = require('express');
const router = express.Router();
const Episode = require('../models/Episode');
const Show = require('../models/Shows');

// Middleware per passare il path corrente
router.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
});

// Homepage
router.get('/', async (req, res) => {
    try {
        // Fetch ultimi episodi pubblicati
        const latestEpisodes = await Episode.find({ status: 'published' })
            .populate('showId', 'title slug')
            .sort({ airDate: -1 })
            .limit(10);

        // Fetch shows approvati e attivi
        const shows = await Show.find({
            requestStatus: 'approved',
            status: 'active'
        })
            .sort({ createdAt: -1 })
            .limit(8);

        // Schedule: episodi di oggi
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const schedule = await Episode.find({
            status: 'published',
            airDate: { $gte: today, $lt: tomorrow }
        })
            .populate('showId', 'title')
            .sort({ airDate: 1 });

        res.render('home', {
            title: 'BUG Radio',
            latestEpisodes,
            shows,
            schedule
        });
    } catch (err) {
        console.error('Homepage error:', err);
        res.status(500).send('Errore server');
    }
});

// Lista tutti gli shows con episodi
router.get('/shows', async (req, res) => {
    try {
        const shows = await Show.find({
            requestStatus: 'approved',
            status: 'active'
        }).sort({ createdAt: -1 });

        // Carica ultimi 10 episodi per ogni show
        const showsWithEpisodes = await Promise.all(
            shows.map(async (show) => {
                const episodes = await Episode.find({
                    showId: show._id,
                    status: 'published'
                })
                    .sort({ airDate: -1 })
                    .limit(10);

                return {
                    ...show.toObject(),
                    episodes
                };
            })
        );

        res.render('shows', {
            title: 'Shows - BUG Radio',
            shows: showsWithEpisodes
        });
    } catch (err) {
        console.error('Shows error:', err);
        res.status(500).send('Errore server');
    }
});

// Show singolo
router.get('/shows/:slug', async (req, res) => {
    try {
        const show = await Show.findOne({
            slug: req.params.slug,
            requestStatus: 'approved',
            status: 'active'
        });

        if (!show) {
            return res.status(404).send('Show non trovato');
        }

        // Ultimi 10 episodi dello show
        const episodes = await Episode.find({
            showId: show._id,
            status: 'published'
        })
            .sort({ airDate: -1 })
            .limit(10);

        res.render('show', {
            title: `${show.title} - BUG Radio`,
            show,
            episodes
        });
    } catch (err) {
        console.error('Show error:', err);
        res.status(500).send('Errore server');
    }
});

// Episodio singolo
router.get('/episodes/:id', async (req, res) => {
    try {
        const episode = await Episode.findOne({
            _id: req.params.id,
            status: 'published'
        }).populate('showId', 'title slug artist image');

        if (!episode) {
            return res.status(404).send('Episodio non trovato');
        }

        // Altri episodi dello stesso show
        const relatedEpisodes = await Episode.find({
            showId: episode.showId._id,
            status: 'published',
            _id: { $ne: episode._id }
        })
            .sort({ airDate: -1 })
            .limit(5);

        res.render('episode', {
            title: `${episode.title} - BUG Radio`,
            episode,
            relatedEpisodes
        });
    } catch (err) {
        console.error('Episode error:', err);
        res.status(500).send('Errore server');
    }
});

module.exports = router;