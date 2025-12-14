// routes/streaming.routes.js - Consolidated with inline logic
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const {
    authMiddleware, adminMiddleware
} = require('../middleware/auth');

// ==================== CONFIG ====================
const AIRTIME_URL = process.env.AIRTIME_URL || 'http://localhost';
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads/episodes');
console.log(AIRTIME_URL)
// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Airtime public API instance
const airtimePublicAPI = axios.create({
    baseURL: `${AIRTIME_URL}/api`,
    timeout: 10000
});

// Configure multer for file uploads
const upload = multer({
    dest: path.join(__dirname, '../uploads/temp'),
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB max
    },
    fileFilter: (req, file, cb) => {
        const audioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac'];
        if (audioTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'));
        }
    }
});

// ==================== MIDDLEWARE ====================

// ==================== ROUTES ====================

/**
 * @route   GET /api/admin/streaming/live-info
 * @desc    Get current stream status and what's playing
 * @access  Admin
 */
router.get('/live-info', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const response = await airtimePublicAPI.get('/live-info-v2'); // <-- CORRETTO
        const data = response.data;
        console.log(data);

        const liveInfo = {
            status: data.station?.schedulerTime ? 'live' : 'offline',
            currentTrack: data.currentShow && data.currentShow.name ? {
                id: data.currentShow.id,
                title: data.currentShow.name,
                artist: data.currentShow.starts || '',
                show: data.currentShow.name,
                artwork: data.currentShow.image_path || null,
                duration: data.currentShow.duration ? parseInt(data.currentShow.duration) : 0,
                elapsed: data.currentShow.elapsed ? parseInt(data.currentShow.elapsed) : 0,
                startTime: data.currentShow.start_timestamp || new Date().toISOString()
            } : null,
            nextTracks: (data.nextShow || []).map(show => ({
                id: show.id,
                title: show.name,
                artist: show.starts || '',
                duration: show.duration ? parseInt(show.duration) : 0
            })),
            listeners: {
                current: data.station?.listener_count || 0,
                max: 100,
                peak: data.station?.max_listeners || 0
            },
            bitrate: 192,
            uptime: data.station?.uptime || 'N/A'
        };

        res.json(liveInfo);
    } catch (error) {
        console.error('Error fetching live info:', error);
        res.json({
            status: 'offline',
            currentTrack: null,
            nextTracks: [],
            listeners: { current: 0, max: 100, peak: 0 },
            bitrate: 192,
            uptime: 'N/A',
            error: 'Unable to connect to Airtime server'
        });
    }
});

router.get('/live-info-test', async (req, res) => {
    try {
        const response = await airtimePublicAPI.get('/live-info-v2', {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            },
            timeout: 5000
        });

        res.json({ ok: true, data: response.data });
    } catch (error) {
        console.error("Airtime ERROR:", {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            data: error.response?.data
        });

        res.json({ ok: false, error: error.message });
    }
});

/**
 * @route   GET /api/admin/streaming/current-show
 * @desc    Get currently broadcasting show
 * @access  Admin
 */
router.get('/current-show', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const response = await airtimePublicAPI.get('/live-info');
        const data = response.data;

        if (!data.shows || !data.shows.current) {
            return res.json({
                id: null,
                title: 'No show scheduled',
                artist: '',
                description: '',
                image: null,
                startTime: null,
                endTime: null,
                genres: [],
                airtime: null
            });
        }

        const currentShow = data.shows.current;

        res.json({
            id: currentShow.id,
            title: currentShow.name,
            artist: currentShow.dj || 'Unknown',
            description: currentShow.description || '',
            image: currentShow.image_path || null,
            startTime: currentShow.starts,
            endTime: currentShow.ends,
            genres: currentShow.genre ? [currentShow.genre] : [],
            airtime: {
                showId: currentShow.id,
                instanceId: currentShow.instance_id
            }
        });
    } catch (error) {
        console.error('Error fetching current show:', error.message);
        res.status(500).json({
            error: 'Failed to fetch current show',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/admin/streaming/week-schedule
 * @desc    Get weekly schedule from Airtime
 * @access  Admin
 */
router.get('/week-schedule', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const response = await airtimePublicAPI.get('/week-info');
        const data = response.data;

        const schedule = {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
        };

        // Data è un oggetto con giorni come chiavi
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        validDays.forEach(day => {
            if (Array.isArray(data[day])) {
                console.log(data[day])
                schedule[day] = data[day].map(show => ({
                    id: show.id,
                    title: show.name,
                    description: show.description || '',
                    startTime: show.starts ? show.starts.substring(11, 16) : '', // Format HH:mm
                    endTime: show.ends ? show.ends.substring(11, 16) : '',
                    artist: show.dj || 'Unknown',
                    image: show.image_path || null,
                    record: show.record
                }));
            }
        });
        console.log(response.data)
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching week schedule:', error.message);
        res.status(500).json({
            error: 'Failed to fetch week schedule',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/admin/streaming/statistics
 * @desc    Get streaming statistics
 * @access  Admin
 */
router.get('/statistics', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const liveResponse = await airtimePublicAPI.get('/live-info/v2');
        const liveData = liveResponse.data;

        const stats = {
            peakListeners: liveData.station?.max_listeners || 0,
            uptime: liveData.station?.uptime || 'N/A',
            currentListeners: liveData.station?.listener_count || 0,
            tracksPlayedToday: 0,
            showsToday: 0,
            totalListeningHours: 0,
            averageListeners: 0
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching statistics:', error.message);
        res.status(500).json({
            error: 'Failed to fetch statistics',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/admin/streaming/uploaded-episodes
 * @desc    Get list of episodes uploaded to server
 * @access  Admin
 */
router.get('/uploaded-episodes', authMiddleware, adminMiddleware,  async (req, res) => {
    try {
        const Episode = require('../models/Episode');

        const episodes = await Episode.find({
            'localFile.exists': true
        })
            .select('title localFile airtime status showId createdAt')
            .populate('showId', 'title artist')
            .sort({ 'localFile.uploadedAt': -1 });

        const episodeList = episodes.map(ep => ({
            id: ep._id,
            title: ep.title,
            show: ep.showId?.title || 'Unknown',
            localFile: {
                filename: ep.localFile.filename,
                size: ep.localFile.size,
                uploadedAt: ep.localFile.uploadedAt,
                downloadUrl: `/api/admin/streaming/episodes/${ep._id}/download`
            },
            airtime: {
                uploaded: ep.airtime?.uploaded || false,
                scheduled: !!ep.airtime?.scheduleId
            },
            status: ep.status
        }));

        res.json(episodeList);
    } catch (error) {
        console.error('Error fetching episodes:', error.message);
        res.status(500).json({
            error: 'Failed to fetch episodes',
            message: error.message
        });
    }
});

/**
 * @route   POST /api/admin/streaming/episodes/:episodeId/upload
 * @desc    Upload episode audio file to SERVER
 * @access  Admin
 */
router.post('/episodes/:episodeId/upload', authMiddleware, adminMiddleware, upload.single('audioFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file provided'
            });
        }

        const { episodeId } = req.params;
        const Episode = require('../models/Episode');
        const episode = await Episode.findById(episodeId).populate('showId');

        if (!episode) {
            return res.status(404).json({ error: 'Episode not found' });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const originalName = path.parse(req.file.originalname);
        const filename = `${episodeId}-${timestamp}${originalName.ext}`;
        const filepath = path.join(UPLOAD_DIR, filename);

        // Save file
        fs.copyFileSync(req.file.path, filepath);

        // Update episode
        episode.localFile = {
            filename: filename,
            path: filepath,
            originalName: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype,
            uploadedAt: new Date(),
            uploadedBy: req.user._id,
            exists: true
        };

        episode.airtime = {
            fileId: null,
            uploaded: false,
            uploadedAt: null,
            uploadedBy: null,
            scheduleId: null,
            scheduledAt: null,
            showInstanceId: null
        };

        episode.status = 'draft';
        await episode.save();

        res.json({
            message: 'Episode uploaded to server successfully. You can now download and manually upload to Airtime.',
            file: {
                filename: filename,
                size: req.file.size,
                mimeType: req.file.mimetype
            },
            episode: {
                id: episode._id,
                title: episode.title,
                localFile: {
                    filename: episode.localFile.filename,
                    size: episode.localFile.size,
                    uploadedAt: episode.localFile.uploadedAt
                }
            }
        });

    } catch (error) {
        console.error('Error uploading to server:', error.message);
        res.status(500).json({
            error: 'Failed to upload episode',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/admin/streaming/episodes/:episodeId/download
 * @desc    Download episode file from server
 * @access  Admin
 */
router.get('/episodes/:episodeId/download', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { episodeId } = req.params;
        const Episode = require('../models/Episode');
        const episode = await Episode.findById(episodeId);

        if (!episode || !episode.localFile || !episode.localFile.exists) {
            return res.status(404).json({
                error: 'Episode file not found'
            });
        }

        const filepath = episode.localFile.path;

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({
                error: 'File not found on disk'
            });
        }

        res.download(filepath, episode.localFile.originalName);

    } catch (error) {
        console.error('Error downloading episode:', error.message);
        res.status(500).json({
            error: 'Failed to download episode',
            message: error.message
        });
    }
});

/**
 * @route   DELETE /api/admin/streaming/episodes/:episodeId/file
 * @desc    Delete episode file from server
 * @access  Admin
 */
router.delete('/episodes/:episodeId/file', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { episodeId } = req.params;
        const Episode = require('../models/Episode');
        const episode = await Episode.findById(episodeId);

        if (!episode || !episode.localFile) {
            return res.status(404).json({
                error: 'Episode not found'
            });
        }

        // Delete file from disk
        if (fs.existsSync(episode.localFile.path)) {
            fs.unlinkSync(episode.localFile.path);
        }

        // Update episode
        episode.localFile.exists = false;
        episode.localFile.deletedAt = new Date();
        await episode.save();

        res.json({
            message: 'Episode file deleted successfully',
            episode: {
                id: episode._id,
                title: episode.title
            }
        });

    } catch (error) {
        console.error('Error deleting episode file:', error.message);
        res.status(500).json({
            error: 'Failed to delete episode file',
            message: error.message
        });
    }
});

/**
 * @route   POST /api/admin/streaming/episodes/:episodeId/mark-uploaded
 * @desc    Mark episode as uploaded to Airtime
 * @access  Admin
 */
router.post('/episodes/:episodeId/mark-uploaded', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { episodeId } = req.params;
        const { airtimeFileId } = req.body;

        if (!airtimeFileId) {
            return res.status(400).json({
                error: 'Airtime file ID is required'
            });
        }

        const Episode = require('../models/Episode');
        const episode = await Episode.findById(episodeId);

        if (!episode) {
            return res.status(404).json({
                error: 'Episode not found'
            });
        }

        episode.airtime = {
            fileId: airtimeFileId,
            uploaded: true,
            uploadedAt: new Date(),
            uploadedBy: req.user._id,
            scheduleId: null,
            scheduledAt: null,
            showInstanceId: null
        };
        episode.status = 'uploaded';
        await episode.save();

        res.json({
            message: 'Episode marked as uploaded to Airtime',
            airtimeFileId,
            episode: {
                id: episode._id,
                title: episode.title,
                airtime: episode.airtime
            }
        });

    } catch (error) {
        console.error('Error marking episode as uploaded:', error.message);
        res.status(500).json({
            error: 'Failed to mark episode as uploaded',
            message: error.message
        });
    }
});

/**
 * @route   POST /api/admin/streaming/episodes/:episodeId/schedule
 * @desc    Info about scheduling (must be done via Airtime dashboard)
 * @access  Admin
 */
router.post('/episodes/:episodeId/schedule', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { episodeId } = req.params;
        const { airDate, timeSlot, showInstanceId } = req.body;

        const Episode = require('../models/Episode');
        const episode = await Episode.findById(episodeId);

        if (!episode) {
            return res.status(404).json({ error: 'Episode not found' });
        }

        if (!episode.airtime?.fileId) {
            return res.status(400).json({
                error: 'Episode must be uploaded to Airtime first. Mark as uploaded after manual upload.'
            });
        }

        res.json({
            message: 'Episode scheduling must be done manually via Airtime dashboard',
            note: 'Use Airtime calendar interface to add this episode to the show schedule',
            episode: {
                id: episode._id,
                title: episode.title,
                airtimeFileId: episode.airtime.fileId
            }
        });

    } catch (error) {
        console.error('Error scheduling episode:', error.message);
        res.status(500).json({
            error: 'Failed to schedule episode',
            message: error.message
        });
    }
});

/**
 * @route   DELETE /api/admin/streaming/episodes/:episodeId/schedule
 * @desc    Update local schedule status
 * @access  Admin
 */
router.delete('/episodes/:episodeId/schedule', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { episodeId } = req.params;

        const Episode = require('../models/Episode');
        const episode = await Episode.findById(episodeId);

        if (!episode) {
            return res.status(404).json({ error: 'Episode not found' });
        }

        episode.airtime.scheduleId = null;
        episode.airtime.scheduledAt = null;
        episode.status = 'uploaded';
        await episode.save();

        res.json({
            message: 'Episode schedule status updated. Remove from Airtime calendar via Airtime dashboard.',
            episode: {
                id: episode._id,
                title: episode.title
            }
        });

    } catch (error) {
        console.error('Error removing from schedule:', error.message);
        res.status(500).json({
            error: 'Failed to remove from schedule',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/admin/streaming/test-connection
 * @desc    Test connection to Airtime server
 * @access  Admin
 */
router.get('/test-connection', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const publicResponse = await airtimePublicAPI.get('/live-info');
        console.log(publicResponse)
        res.json({
            connected: true,
            publicAPI: true,
            message: 'Airtime public API connection successful',
            airtimeUrl: AIRTIME_URL,
            version: publicResponse.data?.version || 'Unknown',
            note: 'Admin API not available - all Airtime operations must be done manually via dashboard'
        });

    } catch (error) {
        console.error('Connection test failed:', error.message);
        res.status(500).json({
            connected: false,
            publicAPI: false,
            message: 'Failed to connect to Airtime public API',
            error: error.message,
            airtimeUrl: AIRTIME_URL
        });
    }
});

module.exports = router;