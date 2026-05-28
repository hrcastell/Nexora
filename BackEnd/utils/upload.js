const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const imageFilter = (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const extOk   = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk  = allowed.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error('Solo se permiten imágenes JPG, PNG o WebP'));
};

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename:    (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2 MB
});

/**
 * makeGarageUpload(subfolder, maxSizeMb)
 *
 * Crea una instancia multer para el Core 1 (Garage Operations).
 * Las fotos se guardan en: uploads/garage/{subfolder}/{schema}/{filename}
 * El schema se extrae de req.garageSchema (inyectado por tenantResolver en la ruta).
 *
 * @param {string} subfolder   - 'customers' | 'employees' | 'vehicles'
 * @param {number} maxSizeMb   - Límite en MB (default 5)
 * @returns {multer.Multer}
 */
function makeGarageUpload(subfolder, maxSizeMb = 5) {
    const garageStorage = multer.diskStorage({
        destination: (req, _file, cb) => {
            const schema = req.garageSchema || 'default';
            const dir = path.join(__dirname, '..', 'uploads', 'garage', subfolder, schema);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (_req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${unique}${path.extname(file.originalname)}`);
        }
    });

    return multer({
        storage:    garageStorage,
        fileFilter: imageFilter,
        limits:     { fileSize: maxSizeMb * 1024 * 1024 }
    });
}

module.exports = upload;
module.exports.makeGarageUpload = makeGarageUpload;
