// controllers/streaming.controller.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Airtime configuration (public API only)
const AIRTIME_URL = process.env.AIRTIME_URL || 'http://localhost';

// Create axios instance with base config (public API only)
const airtimePublicAPI = axios.create({
  baseURL: `${AIRTIME_URL}/api`,
  timeout: 10000
});

// Local storage configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads/episodes');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Get current stream status and live info
 */
exports.getLiveInfo = async (req, res) => {
  try {
    const response = await airtimePublicAPI.get('/live-info/v2');
    const data = response.data;

    // Transform Airtime response to our format
    const liveInfo = {
      status: data.station.schedulerTime ? 'live' : 'offline',
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
        max: 100, // Questo va configurato
        peak: data.station?.max_listeners || 0
      },
      bitrate: 192, // Da configurare o leggere da Icecast
      uptime: data.station?.uptime || 'N/A'
    };

    res.json(liveInfo);
  } catch (error) {
    console.error('Error fetching live info:', error.message);

    // Se Airtime non è raggiungibile, restituisci dati offline
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
};

/**
 * Get current show information
 */
exports.getCurrentShow = async (req, res) => {
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
};

/**
 * Get week schedule from Airtime
 */
exports.getWeekSchedule = async (req, res) => {
  try {
    const response = await airtimePublicAPI.get('/week-info');
    const data = response.data;

    // Transform Airtime week schedule to our format
    const schedule = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    days.forEach(day => {
      schedule[day] = [];
    });

    // Airtime returns schedule in different format, adjust based on actual response
    if (Array.isArray(data)) {
      data.forEach(show => {
        const showDay = new Date(show.starts).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        if (schedule[showDay]) {
          schedule[showDay].push({
            id: show.id,
            title: show.name,
            startTime: new Date(show.starts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
            endTime: new Date(show.ends).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
            artist: show.dj || 'Unknown'
          });
        }
      });
    }

    res.json(schedule);
  } catch (error) {
    console.error('Error fetching week schedule:', error.message);
    res.status(500).json({
      error: 'Failed to fetch week schedule',
      message: error.message
    });
  }
};

/**
 * Get stream statistics
 */
exports.getStatistics = async (req, res) => {
  try {
    // Get live info for current stats
    const liveResponse = await airtimePublicAPI.get('/live-info/v2');
    const liveData = liveResponse.data;

    // You might want to store these stats in your own database over time
    const stats = {
      peakListeners: liveData.station?.max_listeners || 0,
      uptime: liveData.station?.uptime || 'N/A',
      currentListeners: liveData.station?.listener_count || 0,
      // These would come from your own tracking/database
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
};

/**
 * Upload episode audio file to LOCAL SERVER
 * Admin then manually uploads to Airtime via Airtime dashboard
 */
exports.uploadEpisodeToServer = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided'
      });
    }

    const { episodeId } = req.params;

    // 1. Get episode from database
    const Episode = require('../models/Episode');
    const episode = await Episode.findById(episodeId).populate('showId');

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // 2. Generate unique filename
    const timestamp = Date.now();
    const originalName = path.parse(req.file.originalname);
    const filename = `${episodeId}-${timestamp}${originalName.ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // 3. Save file with original buffer (multer already saved it)
    // Move from temp location if needed, or just use req.file.path
    fs.copyFileSync(req.file.path, filepath);

    // 4. Update episode in database
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

    // Reset airtime status since it's a new upload
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
};

/**
 * Get list of uploaded episodes available for manual Airtime upload
 */
exports.getUploadedEpisodes = async (req, res) => {
  console.log('🔍 getUploadedEpisodes CALLED');  // ⭐ AGGIUNGI QUI
  try {
    console.log('📦 Cercando episodi...');  // ⭐ AGGIUNGI QUI

    const Episode = require('../models/Episode');

    const episodes = await Episode.find({
      'localFile.exists': true
    })
        .select('title localFile airtime status showId createdAt')
        .populate('showId', 'title artist')
        .sort({ 'localFile.uploadedAt': -1 });

    console.log('✅ Episodi trovati:', episodes.length);  // ⭐ AGGIUNGI QUI

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
    console.error('❌ ERROR in getUploadedEpisodes:', error.message);  // ⭐ AGGIUNGI QUI
    console.error('Stack:', error.stack);  // ⭐ AGGIUNGI QUI
    res.status(500).json({
      error: 'Failed to fetch episodes',
      message: error.message
    });
  }
};

/**
 * Download episode file from server
 * Admin can then manually upload to Airtime
 */
exports.downloadEpisode = async (req, res) => {
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
};

/**
 * Delete uploaded episode file from server
 */
exports.deleteEpisodeFile = async (req, res) => {
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
};

/**
 * Mark episode as uploaded to Airtime
 * This is done manually by admin via Airtime dashboard
 */
exports.markAsUploadedToAirtime = async (req, res) => {
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

    // Update episode
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
};

/**
 * Schedule episode on Airtime calendar (using public API)
 * This adds the file to a specific show instance
 */
exports.scheduleEpisode = async (req, res) => {
  try {
    const { episodeId } = req.params;
    const { airDate, timeSlot, showInstanceId } = req.body;

    // 1. Get episode
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

    // NOTE: Since we only have public API access, we cannot directly schedule via API
    // This would need to be done via Airtime's web interface
    // This function is kept for reference/future use if admin API becomes available

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
};

/**
 * Remove episode from Airtime schedule
 * Can only be done via Airtime dashboard since we don't have admin API access
 */
exports.removeFromSchedule = async (req, res) => {
  try {
    const { episodeId } = req.params;

    const Episode = require('../models/Episode');
    const episode = await Episode.findById(episodeId);

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // Update local status only
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
};

/**
 * Test Airtime connection (public API only)
 */
exports.testConnection = async (req, res) => {
  try {
    // Test public API
    const publicResponse = await airtimePublicAPI.get('/live-info');

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
};