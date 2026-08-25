import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import Coupon from '../models/Coupon.js';
import CouponProduct from '../models/CouponProduct.js';
import CouponUsage from '../models/CouponUsage.js';

/* ── GET /api/admin/coupons ── */
export const listCoupons = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const filter = {};

  if (search) {
    filter.code = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  const now = new Date();

  const [coupons, total] = await Promise.all([
    Coupon.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Coupon.countDocuments(filter),
  ]);

  const enriched = await Promise.all(
    coupons.map(async (c) => {
      const products = await CouponProduct.find({ coupon: c._id }).lean();
      const usageCount = await CouponUsage.countDocuments({ coupon: c._id });
      const isExpired = c.expiryDate && now > c.expiryDate;
      const isScheduled = c.startDate && now < c.startDate;
      let computedStatus = 'active';
      if (!c.active) computedStatus = 'disabled';
      else if (isExpired) computedStatus = 'expired';
      else if (isScheduled) computedStatus = 'scheduled';
      else if (c.usageLimit > 0 && c.usageCount >= c.usageLimit) computedStatus = 'exhausted';

      const productTypeGroups = {};
      for (const p of products) {
        if (!productTypeGroups[p.productType]) productTypeGroups[p.productType] = [];
        productTypeGroups[p.productType].push(p.productId);
      }

      return {
        ...c,
        computedStatus,
        products,
        productTypeGroups,
        usageCount,
        remainingUses: c.usageLimit > 0 ? Math.max(0, c.usageLimit - c.usageCount) : -1,
      };
    }),
  );

  res.json({ coupons: enriched, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

/* ── GET /api/admin/coupons/:id ── */
export const getCouponDetail = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id).populate('createdBy', 'name email').lean();
  if (!coupon) throw ApiError.notFound('Coupon not found');

  const products = await CouponProduct.find({ coupon: coupon._id }).lean();
  const usageHistory = await CouponUsage.find({ coupon: coupon._id })
    .populate('user', 'name email phone')
    .sort({ usedAt: -1 })
    .limit(100)
    .lean();

  // Get total discount given
  const totalDiscount = usageHistory.reduce((s, u) => s + (u.discountAmount || 0), 0);
  const totalOrders = usageHistory.length;

  res.json({ coupon, products, usageHistory, totalDiscount, totalOrders });
});

/* ── POST /api/admin/coupons ── */
export const createCoupon = asyncHandler(async (req, res) => {
  const {
    code, description, discountType, discountValue, maxDiscount, minPurchase,
    usageLimit, usagePerUser, startDate, expiryDate, active, autoApply,
    priority, isReferral, applicableTo, products,
  } = req.body;

  if (!code || !code.trim()) throw ApiError.badRequest('Coupon code is required');
  if (discountValue === undefined || discountValue < 0) throw ApiError.badRequest('Discount value is required');

  const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
  if (existing) throw ApiError.badRequest('Coupon code already exists');

  const coupon = await Coupon.create({
    code: code.toUpperCase().trim(),
    description: description || '',
    discountType: discountType || 'Percentage',
    discountValue,
    maxDiscount: maxDiscount || 0,
    minPurchase: minPurchase || 0,
    usageLimit: usageLimit || 0,
    usagePerUser: usagePerUser || 0,
    startDate: startDate || null,
    expiryDate: expiryDate || null,
    active: active !== undefined ? active : true,
    autoApply: autoApply || false,
    priority: priority || 0,
    isReferral: isReferral || false,
    applicableTo: applicableTo || 'all',
    createdBy: req.user._id,
  });

  if (applicableTo === 'specific' && Array.isArray(products)) {
    const productDocs = products.map((p) => ({
      coupon: coupon._id,
      productType: p.productType,
      productId: p.productId || null,
    }));
    await CouponProduct.insertMany(productDocs);
  }

  res.status(201).json({ success: true, coupon });
});

/* ── PUT /api/admin/coupons/:id ── */
export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');

  const {
    code, description, discountType, discountValue, maxDiscount, minPurchase,
    usageLimit, usagePerUser, startDate, expiryDate, active, autoApply,
    priority, isReferral, applicableTo, products,
  } = req.body;

  if (code && code !== coupon.code) {
    const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (existing) throw ApiError.badRequest('Coupon code already exists');
    coupon.code = code.toUpperCase().trim();
  }

  if (description !== undefined) coupon.description = description;
  if (discountType !== undefined) coupon.discountType = discountType;
  if (discountValue !== undefined) coupon.discountValue = discountValue;
  if (maxDiscount !== undefined) coupon.maxDiscount = maxDiscount;
  if (minPurchase !== undefined) coupon.minPurchase = minPurchase;
  if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
  if (usagePerUser !== undefined) coupon.usagePerUser = usagePerUser;
  if (startDate !== undefined) coupon.startDate = startDate;
  if (expiryDate !== undefined) coupon.expiryDate = expiryDate;
  if (active !== undefined) coupon.active = active;
  if (autoApply !== undefined) coupon.autoApply = autoApply;
  if (priority !== undefined) coupon.priority = priority;
  if (isReferral !== undefined) coupon.isReferral = isReferral;
  if (applicableTo !== undefined) coupon.applicableTo = applicableTo;

  await coupon.save();

  if (applicableTo === 'specific' && Array.isArray(products)) {
    await CouponProduct.deleteMany({ coupon: coupon._id });
    const productDocs = products.map((p) => ({
      coupon: coupon._id,
      productType: p.productType,
      productId: p.productId || null,
    }));
    await CouponProduct.insertMany(productDocs);
  } else if (applicableTo === 'all') {
    await CouponProduct.deleteMany({ coupon: coupon._id });
  }

  res.json({ success: true, coupon });
});

/* ── DELETE /api/admin/coupons/:id ── */
export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  await CouponProduct.deleteMany({ coupon: coupon._id });
  await CouponUsage.deleteMany({ coupon: coupon._id });
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/* ── POST /api/admin/coupons/:id/duplicate ── */
export const duplicateCoupon = asyncHandler(async (req, res) => {
  const original = await Coupon.findById(req.params.id).lean();
  if (!original) throw ApiError.notFound('Coupon not found');

  const newCode = `${original.code}_COPY`;
  const coupon = await Coupon.create({
    code: newCode,
    description: original.description,
    discountType: original.discountType,
    discountValue: original.discountValue,
    maxDiscount: original.maxDiscount,
    minPurchase: original.minPurchase,
    usageLimit: original.usageLimit,
    usagePerUser: original.usagePerUser,
    startDate: original.startDate,
    expiryDate: original.expiryDate,
    active: false,
    autoApply: original.autoApply,
    priority: original.priority,
    isReferral: original.isReferral,
    applicableTo: original.applicableTo,
    createdBy: req.user._id,
  });

  const products = await CouponProduct.find({ coupon: original._id }).lean();
  if (products.length > 0) {
    const productDocs = products.map((p) => ({
      coupon: coupon._id,
      productType: p.productType,
      productId: p.productId,
    }));
    await CouponProduct.insertMany(productDocs);
  }

  res.status(201).json({ success: true, coupon });
});

/* ── POST /api/admin/coupons/:id/toggle ── */
export const toggleCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  coupon.active = !coupon.active;
  await coupon.save();
  res.json({ success: true, active: coupon.active });
});

/* ── GET /api/admin/coupons/stats ── */
export const getCouponStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const [total, active, expired, scheduled, exhausted, totalUsage, totalDiscount] = await Promise.all([
    Coupon.countDocuments(),
    Coupon.countDocuments({ active: true, $or: [{ expiryDate: null }, { expiryDate: { $gt: now } }] }),
    Coupon.countDocuments({ expiryDate: { $lt: now } }),
    Coupon.countDocuments({ startDate: { $gt: now } }),
    Coupon.countDocuments({ usageLimit: { $gt: 0 }, usageCount: { $gte: '$usageLimit' } }),
    CouponUsage.countDocuments(),
    CouponUsage.aggregate([{ $group: { _id: null, total: { $sum: '$discountAmount' } } }]),
  ]);

  const recentlyUsed = await CouponUsage.find()
    .populate('coupon', 'code')
    .populate('user', 'name email')
    .sort({ usedAt: -1 })
    .limit(10)
    .lean();

  res.json({
    total,
    active,
    expired,
    scheduled,
    exhausted,
    totalUsage,
    totalDiscount: totalDiscount[0]?.total || 0,
    recentlyUsed,
  });
});

/* ── GET /api/admin/products/search?type=plan&q=... ── */
export const searchProducts = asyncHandler(async (req, res) => {
  const { type, q } = req.query;
  if (!type) throw ApiError.badRequest('Product type is required');

  const models = {
    plan: (await import('../models/Plan.js')).default,
    service: (await import('../models/Service.js')).default,
    course: (await import('../models/Course.js')).default,
    workshop: (await import('../models/Workshop.js')).default,
    consultation: null,
  };

  const Model = models[type];
  if (!Model) {
    return res.json([]);
  }

  const filter = { active: true };
  if (q && q.length >= 2) {
    const field = type === 'course' ? 'title' : 'name';
    filter[field] = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  const select = type === 'course' ? 'title price active' : 'name price active';
  const docs = await Model.find(filter).select(select).sort({ name: 1 }).limit(20).lean();

  const results = docs.map((d) => ({
    _id: d._id,
    name: d.name || d.title,
    price: d.price || 0,
    productType: type,
  }));

  res.json(results);
});
