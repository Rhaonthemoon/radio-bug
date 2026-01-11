const mongoose = require('mongoose');

const episodeSchema = new mongoose.Schema({
    showId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Show',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    airDate: {
        type: Date,
        required: true
    },
    duration: {
        type: Number, // in minuti
        min: 0
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },
    featured: {
        type: Boolean,
        default: false
    },

    // File audio (Cloudinary)
    audioFile: {
        filename: String,           // nome originale del file
        storedFilename: String,     // public_id su Cloudinary
        url: String,                // URL Cloudinary (secure_url)
        cloudinaryId: String,       // ID per eliminazione
        path: String,               // deprecato - per retrocompatibilità
        size: Number,               // dimensione in bytes
        mimetype: String,           // tipo MIME
        bitrate: Number,            // bitrate in kbps (es. 320)
        duration: Number,           // durata in secondi
        uploadedAt: Date,
        exists: {
            type: Boolean,
            default: false
        }
    },

    // Immagine episodio (Cloudinary)
    image: {
        filename: String,
        storedFilename: String,
        url: String,
        cloudinaryId: String,
        path: String,               // deprecato
        size: Number,
        mimetype: String,
        uploadedAt: Date,
        exists: {
            type: Boolean,
            default: false
        }
    },

    // Link esterni (opzionali)
    externalLinks: {
        mixcloudUrl: {
            type: String,
            trim: true,
            validate: {
                validator: function(v) {
                    if (!v) return true;
                    return /^https?:\/\/(www\.)?mixcloud\.com\/.+/.test(v);
                },
                message: 'Invalid Mixcloud URL'
            }
        },
        youtubeUrl: {
            type: String,
            trim: true,
            validate: {
                validator: function(v) {
                    if (!v) return true;
                    return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/.test(v);
                },
                message: 'Invalid YouTube URL'
            }
        },
        spotifyUrl: {
            type: String,
            trim: true,
            validate: {
                validator: function(v) {
                    if (!v) return true;
                    return /^https?:\/\/open\.spotify\.com\/.+/.test(v);
                },
                message: 'Invalid Spotify URL'
            }
        }
    },

    // Mixcloud integration
    mixcloud: {
        status: {
            type: String,
            enum: ['pending', 'uploading', 'uploaded', 'failed'],
            default: 'pending'
        },
        key: String,
        uploadedAt: Date,
        error: String
    },

    // Metadati
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Stats
    stats: {
        plays: { type: Number, default: 0 },
        downloads: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

// Index per query efficienti
episodeSchema.index({ showId: 1, airDate: -1 });
episodeSchema.index({ status: 1 });
episodeSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Episode', episodeSchema);