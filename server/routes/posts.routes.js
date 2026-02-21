const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { uploadSingle, handleUploadError, uploadImageToB2, deleteImageFromB2 } = require('../middleware/uploadImage');
const path = require('path');

// ==================== ROTTE PUBBLICHE ====================

/**
 * GET /api/posts
 * Lista post pubblicati (pubblico)
 */
router.get('/', async (req, res) => {
    try {
        const { category, featured, limit = 20, page = 1 } = req.query;

        const filter = { status: 'published' };
        if (category) filter.category = category;
        if (featured) filter.featured = featured === 'true';

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const posts = await Post.find(filter)
            .populate('author', 'name email')
            .sort({ publishedAt: -1, createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Post.countDocuments(filter);

        res.json({
            posts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Errore lista post:', error);
        res.status(500).json({ error: 'Error fetching posts' });
    }
});

/**
 * GET /api/posts/slug/:slug
 * Ottieni singolo post tramite slug (pubblico)
 */
router.get('/slug/:slug', async (req, res) => {
    try {
        const post = await Post.findOne({
            slug: req.params.slug,
            status: 'published'
        }).populate('author', 'name email');

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json(post);
    } catch (error) {
        console.error('Errore recupero post:', error);
        res.status(500).json({ error: 'Error fetching post' });
    }
});

/**
 * GET /api/posts/featured
 * Ottieni post in evidenza
 */
router.get('/featured', async (req, res) => {
    try {
        const posts = await Post.find({
            status: 'published',
            featured: true
        })
            .populate('author', 'name email')
            .sort({ publishedAt: -1 })
            .limit(5);

        res.json(posts);
    } catch (error) {
        console.error('Errore post featured:', error);
        res.status(500).json({ error: 'Error fetching featured posts' });
    }
});

// ==================== ROTTE PROTETTE - ADMIN ====================

/**
 * GET /api/posts/admin/all
 * Lista tutti i post (admin) - inclusi draft e archived
 */
router.get('/admin/all', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { status, category } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (category) filter.category = category;

        const posts = await Post.find(filter)
            .populate('author', 'name email')
            .sort({ createdAt: -1 });

        res.json(posts);
    } catch (error) {
        console.error('Errore lista admin post:', error);
        res.status(500).json({ error: 'Error fetching posts' });
    }
});

/**
 * POST /api/posts
 * Crea nuovo post con immagine (admin)
 */
router.post('/', authMiddleware, adminMiddleware, uploadSingle, handleUploadError, async (req, res) => {
    try {
        const { title, content, excerpt, category, status, featured, metaDescription } = req.body;

        // Validazione
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Image is required' });
        }

        console.log(`📤 Upload immagine su Backblaze B2 per post "${title}"...`);

        // Upload su B2
        const ext = path.extname(req.file.originalname).toLowerCase();
        const safeName = path.basename(req.file.originalname, ext)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-');
        const filename = `posts/${safeName}-${Date.now()}${ext}`;

        const uploadResult = await uploadImageToB2(req.file.buffer, filename, req.file.mimetype);

        console.log(`✔ Upload completato: ${uploadResult.url}`);

        // Crea post
        const post = new Post({
            title,
            content,
            excerpt,
            category: category || 'news',
            status: status || 'draft',
            featured: featured === 'true',
            metaDescription,
            author: req.user._id,
            image: {
                filename: req.file.originalname,
                originalName: req.file.originalname,
                url: uploadResult.url,
                b2Key: uploadResult.key,
                mimetype: req.file.mimetype,
                size: req.file.size
            },
            publishedAt: status === 'published' ? new Date() : null
        });

        await post.save();

        const populatedPost = await Post.findById(post._id).populate('author', 'name email');

        console.log('✅ Post creato:', post.title);
        res.json(populatedPost);

    } catch (error) {
        console.error('Errore creazione post:', error);

        if (error.code === 11000) {
            return res.status(400).json({ error: 'A post with this title already exists' });
        }

        res.status(500).json({ error: 'Error creating post' });
    }
});

/**
 * PUT /api/posts/:id
 * Aggiorna post (admin) - con possibilità di cambiare immagine
 */
router.put('/:id', authMiddleware, adminMiddleware, uploadSingle, handleUploadError, async (req, res) => {
    try {
        const { title, content, excerpt, category, status, featured, metaDescription } = req.body;

        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Aggiorna campi
        if (title) post.title = title;
        if (content) post.content = content;
        if (excerpt !== undefined) post.excerpt = excerpt;
        if (category) post.category = category;
        if (status) {
            post.status = status;
            if (status === 'published' && !post.publishedAt) {
                post.publishedAt = new Date();
            }
        }
        if (featured !== undefined) post.featured = featured === 'true';
        if (metaDescription !== undefined) post.metaDescription = metaDescription;

        // Se c'è una nuova immagine, elimina la vecchia da B2 e carica la nuova
        if (req.file) {
            // Elimina vecchia immagine da B2
            if (post.image && post.image.b2Key) {
                try {
                    await deleteImageFromB2(post.image.b2Key);
                    console.log(`✔ Vecchia immagine eliminata da B2`);
                } catch (err) {
                    console.warn('Errore eliminazione vecchia immagine B2:', err.message);
                }
            }

            console.log(`📤 Upload nuova immagine su B2 per post "${post.title}"...`);

            const ext = path.extname(req.file.originalname).toLowerCase();
            const safeName = path.basename(req.file.originalname, ext)
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-');
            const filename = `posts/${safeName}-${Date.now()}${ext}`;

            const uploadResult = await uploadImageToB2(req.file.buffer, filename, req.file.mimetype);

            console.log(`✔ Upload completato: ${uploadResult.url}`);

            post.image = {
                filename: req.file.originalname,
                originalName: req.file.originalname,
                url: uploadResult.url,
                b2Key: uploadResult.key,
                mimetype: req.file.mimetype,
                size: req.file.size
            };
        }

        await post.save();

        const updatedPost = await Post.findById(post._id).populate('author', 'name email');

        console.log('✅ Post aggiornato:', post.title);
        res.json(updatedPost);

    } catch (error) {
        console.error('Errore aggiornamento post:', error);
        res.status(500).json({ error: 'Error updating post' });
    }
});

/**
 * DELETE /api/posts/:id
 * Elimina post (admin)
 */
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Elimina immagine da B2
        if (post.image && post.image.b2Key) {
            try {
                await deleteImageFromB2(post.image.b2Key);
                console.log(`✔ Immagine eliminata da B2`);
            } catch (err) {
                console.warn('Errore eliminazione immagine B2:', err.message);
            }
        }

        await Post.findByIdAndDelete(req.params.id);

        console.log('✅ Post eliminato:', post.title);
        res.json({ message: 'Post deleted successfully' });

    } catch (error) {
        console.error('Errore eliminazione post:', error);
        res.status(500).json({ error: 'Error deleting post' });
    }
});

/**
 * GET /api/posts/:id
 * Ottieni singolo post per ID (admin)
 */
router.get('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate('author', 'name email');

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json(post);
    } catch (error) {
        console.error('Errore recupero post:', error);
        res.status(500).json({ error: 'Error fetching post' });
    }
});

module.exports = router;