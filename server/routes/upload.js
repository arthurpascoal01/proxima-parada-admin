const express = require('express');
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB por arquivo (limite do plano free do Cloudinary é maior para vídeo autenticado, mas mantemos margem segura)
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(new Error('Tipo de arquivo não permitido. Use JPG, PNG, WEBP, MP4, WEBM ou MOV.'));
    }
    cb(null, true);
  }
});

function uploadBuffer(file) {
  const isVideo = file.mimetype.startsWith('video');
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'estabelecimentos', resource_type: isVideo ? 'video' : 'image' },
      (err, result) => {
        if (err) return reject(err);
        resolve({ url: result.secure_url, type: isVideo ? 'video' : 'photo' });
      }
    );
    streamifier.createReadStream(file.buffer).pipe(stream);
  });
}

// POST /api/upload  (multipart/form-data, campo "files", múltiplos arquivos)
router.post('/', requireAuth, upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    const files = await Promise.all(req.files.map(uploadBuffer));
    res.json({ files });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erro ao enviar arquivos.' });
  }
});

module.exports = router;
