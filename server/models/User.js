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

    // Campi verifica email
    emailVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    verificationTokenExpires: Date,

    // Campi password reset
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // Timestamp
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
});

// Indice composto per gestire utenti che possono avere sia email che googleId
UserSchema.index({ email: 1 });
UserSchema.index({ googleId: 1 });
UserSchema.index({ verificationToken: 1 });
UserSchema.index({ resetPasswordToken: 1 });

// Metodo per generare token di verifica
UserSchema.methods.generateVerificationToken = function() {
    const crypto = require('crypto');
    this.verificationToken = crypto.randomBytes(32).toString('hex');
    this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 ore
    return this.verificationToken;
};

// Metodo per verificare se il token è valido
UserSchema.methods.isVerificationTokenValid = function() {
    return this.verificationTokenExpires && this.verificationTokenExpires > Date.now();
};

// Metodo per generare token di password reset
UserSchema.methods.generatePasswordResetToken = function() {
    const crypto = require('crypto');
    this.resetPasswordToken = crypto.randomBytes(32).toString('hex');
    this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 ora
    return this.resetPasswordToken;
};

// Metodo per verificare se il token di reset è valido
UserSchema.methods.isPasswordResetTokenValid = function() {
    return this.resetPasswordExpires && this.resetPasswordExpires > Date.now();
};

module.exports = mongoose.model('User', UserSchema);