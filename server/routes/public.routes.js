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
        // Fetch shows approvati e attivi
        const shows = await Show.find({
            requestStatus: 'approved',
            status: 'active'
        })
            .sort({ createdAt: -1 })
            .limit(8);

        // Schedule: prossimi episodi (da oggi in poi, max 5 giorni)
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const maxDate = new Date(now);
        maxDate.setDate(maxDate.getDate() + 5); // Prossimi 5 giorni

        const upcomingEpisodes = await Episode.find({
            status: 'published',
            airDate: { $gte: now, $lt: maxDate }
        })
            .populate('showId', 'title')
            .sort({ airDate: 1 });

        // Raggruppa episodi per giorno
        const scheduleByDay = [];
        const groupedByDate = {};

        upcomingEpisodes.forEach(episode => {
            const airDate = new Date(episode.airDate);
            const dateKey = airDate.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
            }

            groupedByDate[dateKey].push({
                time: airDate.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                title: episode.title,
                showTitle: episode.showId?.title || null
            });
        });

        // Converti in array ordinato
        for (const date in groupedByDate) {
            scheduleByDay.push({
                date: date,
                episodes: groupedByDate[date]
            });
        }

        res.render('home', {
            title: 'BUG Radio',
            shows,
            scheduleByDay
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
router.get('/about', async (req, res) => {
    try {

        res.render('about', {
            title: 'Shows - BUG Radio'
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

// Schedule completo con calendario
router.get('/schedule', async (req, res) => {
    try {
        // Parametri per mese/anno (default: mese corrente)
        const now = new Date();
        const month = parseInt(req.query.month) || (now.getMonth() + 1);
        const year = parseInt(req.query.year) || now.getFullYear();

        // Calcola primo e ultimo giorno del mese
        const firstDayOfMonth = new Date(year, month - 1, 1);
        const lastDayOfMonth = new Date(year, month, 0, 23, 59, 59);

        // Fetch tutti gli episodi del mese
        const monthEpisodes = await Episode.find({
            status: 'published',
            airDate: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }
        })
            .populate('showId', 'title slug')
            .sort({ airDate: 1 });

        // Raggruppa episodi per giorno
        const scheduleByDay = [];
        const groupedByDate = {};

        monthEpisodes.forEach(episode => {
            const airDate = new Date(episode.airDate);
            const dateKey = airDate.toISOString().split('T')[0]; // YYYY-MM-DD per ordinamento
            const displayDate = airDate.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = {
                    dateKey: dateKey,
                    displayDate: displayDate,
                    dayNumber: airDate.getDate(),
                    episodes: []
                };
            }

            groupedByDate[dateKey].episodes.push({
                id: episode._id,
                time: airDate.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                title: episode.title,
                showTitle: episode.showId?.title || null,
                showSlug: episode.showId?.slug || null,
                description: episode.description || null
            });
        });

        // Converti in array ordinato per data
        for (const dateKey in groupedByDate) {
            scheduleByDay.push(groupedByDate[dateKey]);
        }
        scheduleByDay.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

        // Genera dati per il calendario
        const calendarDays = generateCalendarDays(year, month, groupedByDate);

        // Mese precedente e successivo per navigazione
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;

        const monthName = firstDayOfMonth.toLocaleDateString('en-GB', { month: 'long' });

        res.render('schedule', {
            title: 'Schedule - BUG Radio',
            scheduleByDay,
            calendarDays,
            currentMonth: month,
            currentYear: year,
            monthName,
            prevMonth,
            prevYear,
            nextMonth,
            nextYear,
            today: now.toISOString().split('T')[0]
        });
    } catch (err) {
        console.error('Schedule error:', err);
        res.status(500).send('Errore server');
    }
});

// Helper: genera giorni del calendario
function generateCalendarDays(year, month, groupedByDate) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const calendarDays = [];

    // Giorni vuoti prima del primo del mese (per allineamento)
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarDays.push({ empty: true });
    }

    // Giorni del mese
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasEpisodes = groupedByDate[dateKey] && groupedByDate[dateKey].episodes.length > 0;
        const episodeCount = hasEpisodes ? groupedByDate[dateKey].episodes.length : 0;

        calendarDays.push({
            day: day,
            dateKey: dateKey,
            hasEpisodes: hasEpisodes,
            episodeCount: episodeCount
        });
    }

    return calendarDays;
}

module.exports = router;