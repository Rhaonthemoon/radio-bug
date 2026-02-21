const multer = require('multer');
const { b2, B2_BUCKET, B2_BASE_URL } = require('../config/backblaze');

// ==================== MULTER - MEMORY STORAGE ====================

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpg, jpeg, png, gif, webp)'));
        }
    }
});

// Middleware per upload singola immagine
const uploadSingle = upload.single('image');

// Middleware per gestire errori multer
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ error: err.message });
    } else if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
};

// ==================== HELPER B2 ====================

/**
 * Carica un'immagine su Backblaze B2
 * @param {Buffer} buffer - contenuto del file in memoria
 * @param {string} filename - chiave B2 (es. posts/nome-file.jpg)
 * @param {string} contentType - mimetype del file
 * @returns {{ key, url, etag }}
 */
const uploadImageToB2 = async (buffer, filename, contentType = 'image/jpeg') => {
    const params = {
        Bucket: B2_BUCKET,
        Key: filename,
        Body: buffer,
        ContentType: contentType
    };

    const result = await b2.upload(params).promise();
    return {
        key: filename,
        url: `${B2_BASE_URL}/${filename}`,
        etag: result.ETag
    };
};

/**
 * Elimina un'immagine da Backblaze B2
 * @param {string} b2Key - chiave B2 del file da eliminare
 */
const deleteImageFromB2 = async (b2Key) => {
    if (!b2Key) return;
    const params = {
        Bucket: B2_BUCKET,
        Key: b2Key
    };
    await b2.deleteObject(params).promise();
};

module.exports = {
    uploadSingle,
    handleUploadError,
    uploadImageToB2,
    deleteImageFromB2
};