const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const upload = require('../config/multer');
const { authMiddleware } = require('../middleware/auth');

/**
 * POST /api/upload
 * Upload immagine
 */
router.post('/', authMiddleware, (req, res) => {
  console.log('=== INIZIO UPLOAD ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Errore multer:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File troppo grande (max 5MB)' });
      }
      return res.status(400).json({ error: err.message || 'Errore durante l\'upload' });
    }

    try {
      if (!req.file) {
        console.log('Nessun file ricevuto');
        return res.status(400).json({ error: 'Nessun file caricato' });
      }

      console.log('File ricevuto:', {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      // Verifica che il file esista effettivamente
      if (!fs.existsSync(req.file.path)) {
        console.error('File non trovato dopo upload:', req.file.path);
        return res.status(500).json({ error: 'File non salvato correttamente' });
      }

      // URL pubblico dell'immagine
      const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      console.log('Upload completato:', imageUrl);

      res.json({
        success: true,
        url: imageUrl,
        filename: req.file.filename,
        size: req.file.size
      });
    } catch (error) {
      console.error('Errore durante elaborazione upload:', error);
      res.status(500).json({ error: 'Errore durante l\'upload' });
    }
  });
});

/**
 * DELETE /api/upload/:filename
 * Elimina immagine caricata
 */
router.delete('/:filename', authMiddleware, (req, res) => {
  try {
    // Prova diversi percorsi possibili
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const filePath = path.join(uploadsDir, req.params.filename);

    console.log('Tentativo eliminazione file:');
    console.log('- Filename richiesto:', req.params.filename);
    console.log('- Path completo:', filePath);
    console.log('- Directory uploads:', uploadsDir);
    console.log('- Directory uploads esiste:', fs.existsSync(uploadsDir));
    console.log('- File esiste:', fs.existsSync(filePath));

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'Immagine eliminata con successo' });
    } else {
      // Lista i file nella directory per debug
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        console.log('File presenti in uploads:', files);
      }
      res.status(404).json({
        error: 'File non trovato',
        path: filePath,
        filename: req.params.filename
      });
    }
  } catch (error) {
    console.error('Errore eliminazione:', error);
    res.status(500).json({ error: 'Errore durante l\'eliminazione' });
  }
});

module.exports = router;