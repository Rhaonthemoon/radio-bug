const mongoose = require('mongoose');

const ShowSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    artist: {
        name: { type: String, required: true },
        bio: { type: String, required: true },
        email: { type: String, required: true },
        photo: String,
        socialLinks: {
            instagram: String,
            soundcloud: String,
            mixcloud: String,
            youtube: String,
            bandcamp: String,
            website: String
        }
    },
    image: {
        url: { type: String, required: true },
        alt: String
    },
    // Audio promozionale/jingle dello show (Backblaze B2)
    audio: {
        filename: { type: String, default: null },
        originalName: { type: String, default: null },
        url: { type: String, default: null },
        b2Key: { type: String, default: null }, // Key per eliminazione da B2
        duration: { type: Number, default: null }, // durata in secondi
        bitrate: { type: Number, default: null },
        size: { type: Number, default: null }, // dimensione in bytes
        uploadedAt: { type: Date, default: null }
    },
    genres: [String],
    tags: [String],
    schedule: {
        dayOfWeek: String,
        timeSlot: String,
        frequency: { type: String, default: 'irregular' }
    },
    requestStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    adminNotes: String,
    status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'inactive' },
    featured: { type: Boolean, default: false },
    stats: {
        totalEpisodes: { type: Number, default: 0 }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    airtime: {
        showId: {
            type: String,
            default: null
        },
        instanceId: {
            type: String,
            default: null
        },
        autoSync: {
            type: Boolean,
            default: true
        },
        lastSync: {
            type: Date,
            default: null
        }
    }
}, {
    timestamps: true
});

// Auto-generate slug
ShowSchema.pre('validate', function(next) {
    if (!this.slug && this.title) {
        this.slug = this.title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    next();
});

ShowSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Show', ShowSchema);