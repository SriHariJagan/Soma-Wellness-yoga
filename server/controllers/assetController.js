import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import Download from '../models/Download.js';
import Membership from '../models/Membership.js';
import ActivityLog from '../models/ActivityLog.js';
import Plan from '../models/Plan.js';
import { notifyPlanMembers } from '../services/notificationService.js';
import logger from '../notification/logger.js';

const MODULE = 'AssetCtrl';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, '..');

function fmtSize(bytes) {
  if (!bytes || bytes === 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let s = bytes;
  while (s >= 1024 && i < units.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function typeFromMime(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (['.mp4', '.webm', '.mov', '.avi', '.mkv'].includes(ext)) return 'video';
  if (['.mp3', '.wav', '.ogg', '.aac', '.flac'].includes(ext)) return 'audio';
  if (['.doc', '.docx', '.txt'].includes(ext)) return 'document';
  if (['.csv', '.xlsx'].includes(ext)) return 'worksheet';
  if (['.jpg', '.jpeg', '.png', '.gif', '.svg'].includes(ext)) return 'guide';
  return 'other';
}

function typeFromCategory(category) {
  const c = (category || '').toLowerCase();
  if (['pdf', 'document', 'guide', 'worksheet'].includes(c)) return 'pdf';
  if (['video', 'meditation'].includes(c)) return 'video';
  if (c === 'audio') return 'audio';
  return 'other';
}

async function log(action, req, meta = {}) {
  try {
    await ActivityLog.create({ action, performedBy: req.user._id, meta });
  } catch (e) { /* silent */ }
}

export const uploadAsset = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file provided');

  const { name, category, visibility, allowedPlans, description } = req.body;
  const file = req.file;

  const docName = name || path.parse(file.originalname).name;
  const docType = typeFromMime(file.originalname);
  const docCategory = category || 'General';
  const docVisibility = visibility || 'plan';
  const docAllowedPlans = (() => {
    if (!allowedPlans) return [];
    if (Array.isArray(allowedPlans)) return allowedPlans;
    try { return JSON.parse(allowedPlans); } catch { return String(allowedPlans).split(',').map(s => s.trim()).filter(Boolean); }
  })();

  const relativePath = path.relative(SERVER_ROOT, file.path);

  const asset = await Download.create({
    name: docName,
    type: docType,
    category: docCategory,
    description: description || '',
    size: fmtSize(file.size),
    fileSize: file.size,
    mimeType: file.mimetype,
    originalName: file.originalname,
    storagePath: relativePath,
    url: '',
    uploadedBy: req.user._id,
    visibility: docVisibility,
    allowedPlans: docAllowedPlans,
    downloadCount: 0,
    active: true,
  });

  await log(`Uploaded asset: ${docName}`, req, { assetId: String(asset._id), type: docType, size: file.size });

  logger.debug(MODULE, 'Asset uploaded', { visibility: asset.visibility, allowedPlans: asset.allowedPlans });

  // Notify eligible students about the new asset
  if (asset.visibility === 'plan' && asset.allowedPlans.length > 0) {
    logger.debug(MODULE, 'Triggering notifyPlanMembers (plan)', { assetId: asset._id });
    notifyPlanMembers(asset.allowedPlans, {
      title: 'New Learning Material Available',
      message: `A new <strong>${asset.category || 'General'}</strong> resource "<strong>${asset.name}</strong>" has been added and is available in your Downloads section.`,
      type: 'new_asset',
      asset: asset._id,
      assetName: asset.name,
      category: asset.category,
      link: '/studentdashboard?page=downloads',
    }).catch((err) => { logger.error(MODULE, 'Notify failed', { error: err.message }); });
  } else if (asset.visibility === 'all') {
    logger.debug(MODULE, 'Triggering notifyPlanMembers (all)', { assetId: asset._id });
    notifyPlanMembers([], {
      title: 'New Learning Material Available',
      message: `A new <strong>${asset.category || 'General'}</strong> resource "<strong>${asset.name}</strong>" has been added and is available in your Downloads section.`,
      type: 'new_asset',
      asset: asset._id,
      assetName: asset.name,
      category: asset.category,
      link: '/studentdashboard?page=downloads',
    }).catch((err) => { logger.error(MODULE, 'Notify failed', { error: err.message }); });
  }

  res.status(201).json(asset);
});

export const listAssets = asyncHandler(async (req, res) => {
  const { search, type, visibility, active, page = 1, limit = 50 } = req.query;
  const query = {};

  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { category: new RegExp(search, 'i') },
      { originalName: new RegExp(search, 'i') },
    ];
  }
  if (type) query.type = type;
  if (visibility) query.visibility = visibility;
  if (active !== undefined) query.active = active === 'true';

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
  const [assets, total] = await Promise.all([
    Download.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('uploadedBy', 'name email'),
    Download.countDocuments(query),
  ]);

  res.json({ assets, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

export const getAsset = asyncHandler(async (req, res) => {
  const asset = await Download.findById(req.params.id).populate('uploadedBy', 'name email');
  if (!asset) throw ApiError.notFound('Asset not found');
  res.json(asset);
});

export const updateAsset = asyncHandler(async (req, res) => {
  const allowed = ['name', 'category', 'description', 'visibility', 'allowedPlans'];
  const updates = {};
  for (const f of allowed) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  if (updates.category) {
    updates.type = typeFromCategory(updates.category);
  }

  const asset = await Download.findByIdAndUpdate(req.params.id, { $set: updates }, { returnDocument: 'after', runValidators: true });
  if (!asset) throw ApiError.notFound('Asset not found');

  await log(`Updated asset: ${asset.name}`, req, { assetId: String(asset._id) });

  if (asset.visibility === 'plan' && asset.allowedPlans.length > 0) {
    notifyPlanMembers(asset.allowedPlans, {
      title: 'Learning Material Updated',
      message: `The <strong>${asset.category || 'General'}</strong> resource "<strong>${asset.name}</strong>" has been updated. Check it out in Downloads.`,
      type: 'asset_updated',
      asset: asset._id,
      assetName: asset.name,
      category: asset.category,
      link: '/studentdashboard?page=downloads',
    }).catch((err) => logger.error(MODULE, 'Notify update (plan) failed', { error: err.message }));
  } else if (asset.visibility === 'all') {
    notifyPlanMembers([], {
      title: 'Learning Material Updated',
      message: `The <strong>${asset.category || 'General'}</strong> resource "<strong>${asset.name}</strong>" has been updated. Check it out in Downloads.`,
      type: 'asset_updated',
      asset: asset._id,
      assetName: asset.name,
      category: asset.category,
      link: '/studentdashboard?page=downloads',
    }).catch((err) => logger.error(MODULE, 'Notify update (all) failed', { error: err.message }));
  }

  res.json(asset);
});

export const replaceAssetFile = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file provided');

  const asset = await Download.findById(req.params.id);
  if (!asset) throw ApiError.notFound('Asset not found');

  if (asset.storagePath) {
    const oldPath = path.resolve(SERVER_ROOT, asset.storagePath);
    try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch { /* ignore */ }
  }

  const file = req.file;
  const relativePath = path.relative(SERVER_ROOT, file.path);

  asset.storagePath = relativePath;
  asset.originalName = file.originalname;
  asset.mimeType = file.mimetype;
  asset.fileSize = file.size;
  asset.size = fmtSize(file.size);
  asset.type = typeFromMime(file.originalname);
  await asset.save();

  await log(`Replaced file for asset: ${asset.name}`, req, { assetId: String(asset._id) });

  if (asset.visibility === 'plan' && asset.allowedPlans.length > 0) {
    notifyPlanMembers(asset.allowedPlans, {
      title: 'New Version Available',
      message: `A new version of "<strong>${asset.name}</strong>" (<strong>${asset.category || 'General'}</strong>) has been uploaded. Download the latest version from Downloads.`,
      type: 'asset_replaced',
      asset: asset._id,
      assetName: asset.name,
      category: asset.category,
      link: '/studentdashboard?page=downloads',
    }).catch((err) => logger.error(MODULE, 'Notify replace (plan) failed', { error: err.message }));
  } else if (asset.visibility === 'all') {
    notifyPlanMembers([], {
      title: 'New Version Available',
      message: `A new version of "<strong>${asset.name}</strong>" (<strong>${asset.category || 'General'}</strong>) has been uploaded. Download the latest version from Downloads.`,
      type: 'asset_replaced',
      asset: asset._id,
      assetName: asset.name,
      category: asset.category,
      link: '/studentdashboard?page=downloads',
    }).catch((err) => logger.error(MODULE, 'Notify replace (all) failed', { error: err.message }));
  }

  res.json(asset);
});

export const archiveAsset = asyncHandler(async (req, res) => {
  const { active } = req.body;
  const asset = await Download.findByIdAndUpdate(
    req.params.id,
    { $set: { active: active !== false } },
    { returnDocument: 'after' }
  );
  if (!asset) throw ApiError.notFound('Asset not found');
  await log(`${asset.active ? 'Unarchived' : 'Archived'} asset: ${asset.name}`, req, { assetId: String(asset._id) });
  res.json(asset);
});

export const deleteAsset = asyncHandler(async (req, res) => {
  const asset = await Download.findById(req.params.id);
  if (!asset) throw ApiError.notFound('Asset not found');

  if (asset.storagePath) {
    const fullPath = path.resolve(SERVER_ROOT, asset.storagePath);
    try { if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath); } catch { /* ignore */ }
  }

  await Download.findByIdAndDelete(req.params.id);
  await log(`Deleted asset: ${asset.name}`, req, { assetId: String(asset._id) });
  res.json({ success: true });
});

export const downloadAsset = asyncHandler(async (req, res) => {
  const asset = await Download.findById(req.params.id);
  if (!asset) throw ApiError.notFound('Asset not found');
  if (!asset.active) throw ApiError.forbidden('This asset has been archived');
  if (!asset.storagePath) throw ApiError.notFound('File not found on server');

  const user = req.user;
  if (asset.visibility === 'admin' && user.role !== 'admin') {
    throw ApiError.forbidden('This content is restricted to admins');
  }
  if (asset.visibility === 'plan' && user.role !== 'admin') {
    const membership = await Membership.findOne({ user: user._id, status: 'active', expiryDate: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!membership) throw ApiError.forbidden('Your plan has expired. Renew to access this content.');

    const plan = await Plan.findOne({ name: membership.planType });
    const userPlanName = plan?.name || membership.planType;

    const hasAccess = asset.allowedPlans.length === 0 || asset.allowedPlans.some((ap) => {
      const apLower = ap.toLowerCase();
      return userPlanName.toLowerCase().includes(apLower) || apLower.includes(userPlanName.toLowerCase());
    });
    if (!hasAccess) throw ApiError.forbidden('This content is not included in your current plan');
  }

  await Download.findByIdAndUpdate(req.params.id, { $inc: { downloadCount: 1 } });

  const fullPath = path.resolve(SERVER_ROOT, asset.storagePath);
  if (!fs.existsSync(fullPath)) throw ApiError.notFound('File not found on disk');

  res.download(fullPath, asset.originalName);
});

export const getStudentAssets = asyncHandler(async (req, res) => {
  const user = req.user;

  const membership = user.role === 'admin'
    ? null
    : await Membership.findOne({ user: user._id, status: 'active', expiryDate: { $gt: new Date() } }).sort({ createdAt: -1 });

  let planName = '';
  if (membership) {
    const plan = await Plan.findOne({ name: membership.planType });
    planName = plan?.name || membership.planType;
  }

  const allAssets = await Download.find({ active: true }).sort({ createdAt: -1 });

  const filtered = allAssets.filter((a) => {
    if (a.visibility === 'all') return true;
    if (user.role === 'admin') return true;
    if (a.visibility === 'admin') return false;
    if (!membership) return false;
    if (a.allowedPlans.length === 0) return true;
    return a.allowedPlans.some((ap) => {
      const apLower = ap.toLowerCase();
      return planName.toLowerCase().includes(apLower) || apLower.includes(planName.toLowerCase());
    });
  });

  res.json(filtered);
});

export const getAssetStats = asyncHandler(async (req, res) => {
  const [total, byType, totalDownloads, storageStats] = await Promise.all([
    Download.countDocuments({ active: true }),
    Download.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Download.aggregate([
      { $group: { _id: null, total: { $sum: '$downloadCount' } } },
    ]),
    Download.aggregate([
      { $match: { active: true } },
      { $group: { _id: null, totalBytes: { $sum: '$fileSize' } } },
    ]),
  ]);

  res.json({
    total,
    byType: Object.fromEntries(byType.map((t) => [t._id, t.count])),
    totalDownloads: totalDownloads[0]?.total || 0,
    totalStorageBytes: storageStats[0]?.totalBytes || 0,
    totalStorageFormatted: fmtSize(storageStats[0]?.totalBytes || 0),
  });
});
