// ============================================================
// controllers/offeringController.js
// Public + Admin CRUD for the unified Offering catalog.
// ============================================================
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import Offering from '../models/Offering.js';
import ActivityLog from '../models/ActivityLog.js';
import { sanitizeFields } from '../utils/sanitize.js';
import {
  OFFERING_CATEGORIES,
  OFFERING_STATUSES,
  OFFERING_VISIBILITY,
} from '../shared/constants/offering.types.js';
import logger from '../notification/logger.js';

const MODULE = 'OfferingCtrl';

async function log(action, req, target = null, meta = {}) {
  try {
    await ActivityLog.create({
      action,
      performedBy: req.user?._id,
      targetUser: target,
      meta,
    });
  } catch (e) {
    logger.error(MODULE, 'ActivityLog failed', { error: e.message });
  }
}

// ── PUBLIC ─────────────────────────────────────────────────

/**
 * GET /api/public/offerings
 * Public catalog: only returns offerings that are publicly visible,
 * have status 'available' or 'upcoming', and are not hidden/draft/archived.
 */
export const listPublicOfferings = asyncHandler(async (req, res) => {
  const { category, tag, featured, search } = req.query;

  const filter = {
    visibility: 'public',
    status: { $in: ['available', 'upcoming'] },
  };

  if (category) filter.category = category;
  if (tag) filter.tags = { $in: Array.isArray(tag) ? tag : [tag] };
  if (featured === 'true') filter.featured = true;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { subtitle: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const offerings = await Offering.find(filter)
    .select('-createdBy -updatedBy -__v')
    .sort({ displayOrder: 1, featured: -1, name: 1 })
    .lean();

  res.json(offerings);
});

/**
 * GET /api/public/offerings/:slug
 * Single offering detail for public.
 */
export const getPublicOffering = asyncHandler(async (req, res) => {
  const offering = await Offering.findOne({
    slug: req.params.slug,
    visibility: 'public',
    status: { $in: ['available', 'upcoming'] },
  })
    .select('-createdBy -updatedBy -__v')
    .lean();

  if (!offering) throw ApiError.notFound('Offering not found');
  res.json(offering);
});

/**
 * GET /api/public/offerings/categories
 * Returns available categories with counts.
 */
export const listCategories = asyncHandler(async (req, res) => {
  const categories = await Offering.aggregate([
    { $match: { visibility: 'public', status: { $in: ['available', 'upcoming'] } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  res.json(categories.map((c) => ({ category: c._id, count: c.count })));
});

// ── ADMIN ──────────────────────────────────────────────────

/**
 * GET /api/admin/offerings
 * Admin: list all offerings with optional filters.
 */
export const adminListOfferings = asyncHandler(async (req, res) => {
  const { status, visibility, category, search, page = 1, limit = 50 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (visibility) filter.visibility = visibility;
  if (category) filter.category = category;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { subtitle: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [offerings, total] = await Promise.all([
    Offering.find(filter)
      .sort({ displayOrder: 1, name: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Offering.countDocuments(filter),
  ]);

  res.json({
    offerings,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
});

/**
 * GET /api/admin/offerings/:id
 * Admin: single offering detail.
 */
export const adminGetOffering = asyncHandler(async (req, res) => {
  const offering = await Offering.findById(req.params.id).lean();
  if (!offering) throw ApiError.notFound('Offering not found');
  res.json(offering);
});

/**
 * POST /api/admin/offerings
 * Admin: create offering.
 */
export const adminCreateOffering = asyncHandler(async (req, res) => {
  const {
    name, subtitle, description, category, subcategory, tags,
    price, originalPrice, currency, pricingModel,
    sessions, sessionDuration, validityDuration, validityUnit,
    whatIncluded, benefits, image, gallery, icon,
    displayOrder, featured, isPopular, status, visibility,
    bookingEnabled, startDate, endDate, capacity,
  } = req.body;

  sanitizeFields(req.body, ['name', 'subtitle', 'description', 'subcategory']);

  const offering = await Offering.create({
    name, subtitle, description, category, subcategory, tags: tags || [],
    price: price || 0, originalPrice, currency: currency || 'KES',
    pricingModel: pricingModel || 'flat',
    sessions: sessions || 0, sessionDuration: sessionDuration || 60,
    validityDuration: validityDuration || 0, validityUnit: validityUnit || 'single',
    whatIncluded: whatIncluded || [], benefits: benefits || [],
    image: image || '', gallery: gallery || [], icon: icon || '',
    displayOrder: displayOrder || 0, featured: !!featured, isPopular: !!isPopular,
    status: status || 'draft', visibility: visibility || 'public',
    bookingEnabled: bookingEnabled !== false,
    startDate: startDate || null, endDate: endDate || null,
    capacity: capacity || 0,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  await log('offering_created', req, null, { offeringId: offering._id, name: offering.name });
  res.status(201).json(offering);
});

/**
 * PUT /api/admin/offerings/:id
 * Admin: update offering.
 */
export const adminUpdateOffering = asyncHandler(async (req, res) => {
  const offering = await Offering.findById(req.params.id);
  if (!offering) throw ApiError.notFound('Offering not found');

  const allowedFields = [
    'name', 'subtitle', 'description', 'category', 'subcategory', 'tags',
    'price', 'originalPrice', 'currency', 'pricingModel',
    'sessions', 'sessionDuration', 'validityDuration', 'validityUnit',
    'whatIncluded', 'benefits', 'image', 'gallery', 'icon',
    'displayOrder', 'featured', 'isPopular', 'status', 'visibility',
    'bookingEnabled', 'startDate', 'endDate', 'capacity',
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  sanitizeFields(updates, ['name', 'subtitle', 'description', 'subcategory']);

  // Validate category if being changed
  if (updates.category && !OFFERING_CATEGORIES.includes(updates.category)) {
    throw ApiError.badRequest(`Invalid category. Must be one of: ${OFFERING_CATEGORIES.join(', ')}`);
  }

  // Validate status if being changed
  if (updates.status && !OFFERING_STATUSES.includes(updates.status)) {
    throw ApiError.badRequest(`Invalid status. Must be one of: ${OFFERING_STATUSES.join(', ')}`);
  }

  // Validate visibility if being changed
  if (updates.visibility && !OFFERING_VISIBILITY.includes(updates.visibility)) {
    throw ApiError.badRequest(`Invalid visibility. Must be one of: ${OFFERING_VISIBILITY.join(', ')}`);
  }

  updates.updatedBy = req.user._id;

  const updated = await Offering.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  await log('offering_updated', req, null, {
    offeringId: updated._id,
    name: updated.name,
    changedFields: Object.keys(updates),
  });

  res.json(updated);
});

/**
 * DELETE /api/admin/offerings/:id
 * Admin: soft-delete offering (set status to archived, visibility to hidden).
 */
export const adminDeleteOffering = asyncHandler(async (req, res) => {
  const offering = await Offering.findById(req.params.id);
  if (!offering) throw ApiError.notFound('Offering not found');

  // Check for active enrollments (UserService references this service)
  // We soft-delete instead of hard-delete to preserve historical data
  offering.status = 'archived';
  offering.visibility = 'hidden';
  offering.updatedBy = req.user._id;
  await offering.save();

  await log('offering_archived', req, null, { offeringId: offering._id, name: offering.name });
  res.json({ success: true, message: 'Offering archived' });
});

/**
 * PATCH /api/admin/offerings/:id/toggle
 * Admin: toggle offering active status.
 */
export const adminToggleOffering = asyncHandler(async (req, res) => {
  const offering = await Offering.findById(req.params.id);
  if (!offering) throw ApiError.notFound('Offering not found');

  const { field } = req.body;
  const validToggleFields = ['featured', 'isPopular', 'bookingEnabled'];

  if (!validToggleFields.includes(field)) {
    throw ApiError.badRequest(`Invalid toggle field. Must be one of: ${validToggleFields.join(', ')}`);
  }

  offering[field] = !offering[field];
  offering.updatedBy = req.user._id;
  await offering.save();

  await log('offering_toggled', req, null, {
    offeringId: offering._id,
    field,
    newValue: offering[field],
  });

  res.json(offering);
});

/**
 * PATCH /api/admin/offerings/:id/status
 * Admin: set offering status.
 */
export const adminSetOfferingStatus = asyncHandler(async (req, res) => {
  const offering = await Offering.findById(req.params.id);
  if (!offering) throw ApiError.notFound('Offering not found');

  const { status, visibility } = req.body;

  if (status && !OFFERING_STATUSES.includes(status)) {
    throw ApiError.badRequest(`Invalid status. Must be one of: ${OFFERING_STATUSES.join(', ')}`);
  }
  if (visibility && !OFFERING_VISIBILITY.includes(visibility)) {
    throw ApiError.badRequest(`Invalid visibility. Must be one of: ${OFFERING_VISIBILITY.join(', ')}`);
  }

  if (status) offering.status = status;
  if (visibility) offering.visibility = visibility;
  offering.updatedBy = req.user._id;
  await offering.save();

  await log('offering_status_changed', req, null, {
    offeringId: offering._id,
    status: offering.status,
    visibility: offering.visibility,
  });

  res.json(offering);
});

/**
 * PATCH /api/admin/offerings/reorder
 * Admin: batch update display orders.
 */
export const adminReorderOfferings = asyncHandler(async (req, res) => {
  const { orders } = req.body; // [{ id, displayOrder }]

  if (!Array.isArray(orders)) {
    throw ApiError.badRequest('orders must be an array of { id, displayOrder }');
  }

  const bulkOps = orders.map(({ id, displayOrder }) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { displayOrder, updatedBy: req.user._id } },
    },
  }));

  await Offering.bulkWrite(bulkOps);
  res.json({ success: true, updated: orders.length });
});

/**
 * GET /api/admin/offerings/stats
 * Admin: catalog statistics.
 */
export const adminOfferingStats = asyncHandler(async (req, res) => {
  const [statusCounts, categoryCounts, total] = await Promise.all([
    Offering.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Offering.aggregate([
      { $match: { status: { $ne: 'archived' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    Offering.countDocuments(),
  ]);

  res.json({
    total,
    byStatus: statusCounts.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
    byCategory: categoryCounts.reduce((acc, c) => { acc[c._id] = c.count; return acc; }, {}),
  });
});
