const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crea la directory uploads se non esiste
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Directory uploads creata:', uploadsDir);
}

// Configurazione storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Multer destination - uploadsDir:', uploadsDir);
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Genera nome file unico con timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    console.log('Multer filename generato:', filename);
    cb(null, filename);
  }
});

// Filtro per accettare solo immagini
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo file non supportato. Solo JPG, PNG, GIF, WebP'), false);
  }
};

// Configurazione multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: fileFilter
});

module.exports = upload;