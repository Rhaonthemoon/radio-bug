const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // Campi base
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Non required per utenti Google
    name: { type: String, required: true },
    role: { type: String, enum: ['artist', 'admin'], default: 'artist' },

    // Campi artista
    artistName: String,
    bio: String,

    // Campi Google OAuth
    googleId: { type: String, unique: true, sparse: true },
    avatar: String,
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },

    // Timestamp
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
});

// Indice composto per gestire utenti che possono avere sia email che googleId
UserSchema.index({ email: 1 });
UserSchema.index({ googleId: 1 });

module.exports = mongoose.model('User', UserSchema);