const mongoose = require('mongoose');

const EpisodeSchema = new mongoose.Schema({
    // Riferimento allo show
    showId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Show',
        required: true
    },

    // Informazioni Episodio
    title: {
        type: String,
        required: true,
        trim: true
    },

    episodeNumber: {
        type: Number,
        // Numero episodio (opzionale, utile per serie)
    },

    description: {
        type: String,
        required: true
    },

    // Immagine episodio (diversa da quella dello show)
    image: {
        url: String,
        alt: String
    },

    // Data di messa in onda
    airDate: {
        type: Date,
        required: true
    },

    // Generi musicali (possono essere diversi da quelli dello show)
    genres: [String],

    // Mixcloud Player
    mixcloudUrl: {
        type: String,
        required: true,
        trim: true
        // Es: https://www.mixcloud.com/username/episode-name/
    },

    // Status
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },

    // Featured (episodio in evidenza)
    featured: {
        type: Boolean,
        default: false
    },

    // Stats
    stats: {
        plays: {
            type: Number,
            default: 0
        },
        likes: {
            type: Number,
            default: 0
        }
    },

    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }, localFile: {
        path: {
            type: String,
            default: null
        },
        filename: String,
        size: Number,
        duration: Number,
        format: String,
        bitrate: Number,
        uploadedAt: Date,
        exists: {
            type: Boolean,
            default: true
        },
        deletedAt: Date
    },

    // Airtime configuration
    airtime: {
        fileId: {
            type: String,
            default: null
        },
        uploaded: {
            type: Boolean,
            default: false
        },
        uploadedAt: Date,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        scheduleId: {
            type: String,
            default: null
        },
        scheduledAt: Date,
        lastError: String,
        uploadFailed: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true
});

// Middleware per aggiornare updatedAt
EpisodeSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Indici
EpisodeSchema.index({ showId: 1, airDate: -1 });
EpisodeSchema.index({ status: 1 });
EpisodeSchema.index({ featured: 1 });

module.exports = mongoose.model('Episode', EpisodeSchema);