// ============================================================
// controllers/galleryController.js
// Admin CRUD + public listing for GalleryImage.
// Storage: existing local /uploads pipeline (multer). Images are
// optimized with sharp when available (WebP + thumbnail); the
// storage layer is abstracted (buildImageUrls) so a persistent
// object store (S3/R2/Cloudinary) can replace local disk later
// without changing the API (see PRODUCTION note in final report).
// ============================================================
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import GalleryImage from '../models/GalleryImage.js';
import ActivityLog from '../models/ActivityLog.js';
import { isValidGalleryCategory } from '../shared/constants/gallery.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GALLERY_DIR = path.resolve(__dirname, '..', 'uploads', 'gallery');
const THUMB_DIR = path.join(GALLERY_DIR, 'thumbs');
for (const d of [GALLERY_DIR, THUMB_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

let _sharp = null;
let _sharpTried = false;
async function getSharp() {
  if (_sharpTried) return _sharp;
  _sharpTried = true;
  try {
    const mod = await import('sharp');
    _sharp = mod.default || mod;
  } catch {
    _sharp = null;
  }
  return _sharp;
}

export const galleryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB max upload
  fileFilter(req, file, cb) {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    if (!ok) return cb(new Error('Only JPG, PNG, WebP or GIF images are allowed (max 8 MB)'));
    cb(null, true);
  },
});

async function optimizeAndStore(buffer, originalName) {
  const base = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const sharp = await getSharp();
  if (!sharp) {
    // Fallback: store original only (no optimization available).
    const ext = path.extname(originalName).toLowerCase() || '.jpg';
    const file = `${base}${ext}`;
    fs.writeFileSync(path.join(GALLERY_DIR, file), buffer);
    return { imageUrl: `/uploads/gallery/${file}`, thumbnailUrl: `/uploads/gallery/${file}`, width: 0, height: 0, optimized: false };
  }
  const meta = await sharp(buffer).metadata().catch(() => ({}));
  const image = await sharp(buffer)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const thumb = await sharp(buffer)
    .rotate()
    .resize({ width: 480, withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer();
  const imageFile = `${base}.webp`;
  const thumbFile = `${base}-thumb.webp`;
  fs.writeFileSync(path.join(GALLERY_DIR, imageFile), image);
  fs.writeFileSync(path.join(THUMB_DIR, thumbFile), thumb);
  return {
    imageUrl: `/uploads/gallery/${imageFile}`,
    thumbnailUrl: `/uploads/gallery/thumbs/${thumbFile}`,
    width: meta.width || 0,
    height: meta.height || 0,
    optimized: true,
  };
}

// ── ADMIN ────────────────────────────────────────────────────
export const adminListGallery = asyncHandler(async (req, res) => {
  const { category, active, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (active !== undefined && active !== '') filter.active = active === 'true';
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    GalleryImage.find(filter).sort({ order: 1, createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    GalleryImage.countDocuments(filter),
  ]);
  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

export const adminCreateGallery = asyncHandler(async (req, res) => {
  const { title, description = '', category = 'Other', order = 0, active = true, altText = '' } = req.body;
  if (!title || !String(title).trim()) throw ApiError.badRequest('Title is required');
  if (!isValidGalleryCategory(category)) throw ApiError.badRequest('Invalid category');
  if (!req.file?.buffer) throw ApiError.badRequest('Image file is required');

  const stored = await optimizeAndStore(req.file.buffer, req.file.originalname);
  const doc = await GalleryImage.create({
    title: String(title).trim(),
    description: String(description).slice(0, 1000),
    imageUrl: stored.imageUrl,
    thumbnailUrl: stored.thumbnailUrl,
    category,
    order: Number(order) || 0,
    active: active !== 'false' && active !== false,
    altText: String(altText || title).slice(0, 200),
    width: stored.width,
    height: stored.height,
    createdBy: req.user?._id || null,
  });
  try { await ActivityLog.create({ action: 'gallery_image_created', performedBy: req.user?._id, meta: { id: String(doc._id) } }); } catch { /* ignore */ }
  res.status(201).json({ ...doc.toObject(), optimized: stored.optimized });
});

export const adminUpdateGallery = asyncHandler(async (req, res) => {
  const doc = await GalleryImage.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Gallery image not found');
  const { title, description, category, order, active, altText } = req.body;
  if (title !== undefined) {
    if (!String(title).trim()) throw ApiError.badRequest('Title is required');
    doc.title = String(title).trim();
  }
  if (description !== undefined) doc.description = String(description).slice(0, 1000);
  if (category !== undefined) {
    if (!isValidGalleryCategory(category)) throw ApiError.badRequest('Invalid category');
    doc.category = category;
  }
  if (order !== undefined) doc.order = Number(order) || 0;
  if (active !== undefined) doc.active = !(active === 'false' || active === false);
  if (altText !== undefined) doc.altText = String(altText).slice(0, 200);
  if (req.file?.buffer) {
    const stored = await optimizeAndStore(req.file.buffer, req.file.originalname);
    doc.imageUrl = stored.imageUrl;
    doc.thumbnailUrl = stored.thumbnailUrl;
    doc.width = stored.width;
    doc.height = stored.height;
  }
  await doc.save();
  res.json(doc);
});

export const adminDeleteGallery = asyncHandler(async (req, res) => {
  const doc = await GalleryImage.findByIdAndDelete(req.params.id);
  if (!doc) throw ApiError.notFound('Gallery image not found');
  // Best-effort local file cleanup (DB record is source of truth).
  for (const url of [doc.imageUrl, doc.thumbnailUrl]) {
    try {
      const abs = path.resolve(__dirname, '..', url.replace(/^\//, ''));
      if (abs.startsWith(GALLERY_DIR) && fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch { /* ignore */ }
  }
  res.json({ success: true });
});

export const adminReorderGallery = asyncHandler(async (req, res) => {
  const { orders } = req.body; // [{ id, order }]
  if (!Array.isArray(orders) || !orders.length) throw ApiError.badRequest('orders array is required');
  const ops = orders.slice(0, 200).map(({ id, order }) => ({
    updateOne: { filter: { _id: id }, update: { $set: { order: Number(order) || 0 } } },
  }));
  await GalleryImage.bulkWrite(ops);
  res.json({ success: true, updated: ops.length });
});

// ── PUBLIC (cached, active only) ─────────────────────────────
export const publicListGallery = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
  const { category, page = 1, limit = 24 } = req.query;
  const filter = { active: true };
  if (category && category !== 'All') {
    if (!isValidGalleryCategory(category)) throw ApiError.badRequest('Invalid category');
    filter.category = category;
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    GalleryImage.find(filter).select('-createdBy').sort({ order: 1, createdAt: -1 }).skip(skip).limit(Math.min(Number(limit), 60)).lean(),
    GalleryImage.countDocuments(filter),
  ]);
  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Math.min(Number(limit), 60)) });
});
