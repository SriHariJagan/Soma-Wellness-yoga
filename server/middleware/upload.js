import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const CATEGORY_DIRS = ['pdf', 'video', 'audio', 'guide', 'worksheet', 'meditation', 'document', 'other', 'cover'];
for (const dir of CATEGORY_DIRS) {
  const p = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    let sub = 'other';
    if (ext === '.pdf') sub = 'pdf';
    else if (['.mp4', '.webm', '.mov', '.avi', '.mkv'].includes(ext)) sub = 'video';
    else if (['.mp3', '.wav', '.ogg', '.aac', '.flac'].includes(ext)) sub = 'audio';
    else if (['.doc', '.docx', '.txt', '.csv', '.xlsx'].includes(ext)) sub = 'document';
    else if (['.jpg', '.jpeg', '.png', '.gif', '.svg'].includes(ext)) sub = 'guide';
    cb(null, path.join(UPLOAD_DIR, sub));
  },
  filename(req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const ALLOWED_TYPES = {
  '.pdf':  'application/pdf',
  '.doc':  'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt':  'text/plain',
  '.csv':  'text/csv',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.mov':  'video/quicktime',
  '.avi':  'video/x-msvideo',
  '.mkv':  'video/x-matroska',
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav',
  '.ogg':  'audio/ogg',
  '.aac':  'audio/aac',
  '.flac': 'audio/flac',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.zip':  'application/zip',
  '.rar':  'application/vnd.rar',
};

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const expectedMime = ALLOWED_TYPES[ext];

  if (!expectedMime) {
    return cb(new Error(`File type ${ext} is not allowed`));
  }

  // Verify MIME type matches the expected type for the extension
  if (file.mimetype && !file.mimetype.startsWith(expectedMime.split('/')[0] + '/')) {
    return cb(new Error(`File content type ${file.mimetype} does not match extension ${ext}`));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

// Dedicated image-only uploader for book cover art — stored in /uploads/cover.
const coverStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(UPLOAD_DIR, 'cover'));
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const coverFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) {
    return cb(new Error(`Image type ${ext} is not allowed — use JPG, PNG, GIF, SVG or WebP`));
  }
  if (file.mimetype && !file.mimetype.startsWith('image/')) {
    return cb(new Error(`File content type ${file.mimetype} is not an image`));
  }
  cb(null, true);
};

const coverUpload = multer({
  storage: coverStorage,
  fileFilter: coverFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max for cover art
});

export default upload;
export { coverUpload };
