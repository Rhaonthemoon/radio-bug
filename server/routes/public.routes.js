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
    
    // Fetch shows approvati
    const shows = await Show.find({ status: 'approved' })
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

module.exports = router;
