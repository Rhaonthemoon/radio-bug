const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  // Contenuto
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  content: {
    type: String,
    required: true
  },
  
  // Immagine
  image: {
    filename: String,      // Nome file salvato
    originalName: String,  // Nome originale
    path: String,          // Path completo
    url: String,           // URL pubblico
    mimetype: String,      // image/jpeg, image/png, etc.
    size: Number           // Dimensione in bytes
  },
  
  // Metadata
  slug: {
    type: String,
    unique: true,
    required: false
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
  
  category: {
    type: String,
    enum: ['news', 'event', 'announcement', 'blog'],
    default: 'news'
  },
  
  // Autore
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // SEO
  excerpt: String,        // Breve descrizione
  metaDescription: String,
  
  // Date
  publishedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Genera slug automaticamente dal titolo
PostSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  this.updatedAt = Date.now();
  next();
});

// Indici
PostSchema.index({ slug: 1 });
PostSchema.index({ status: 1, publishedAt: -1 });
PostSchema.index({ author: 1 });
PostSchema.index({ featured: 1 });

module.exports = mongoose.model('Post', PostSchema);
