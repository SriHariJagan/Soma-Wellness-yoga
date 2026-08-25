import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ShippingRule from '../models/ShippingRule.js';
import ActivityLog from '../models/ActivityLog.js';
import shippingService from '../services/shippingService.js';
import { SHIPPING_TYPES } from '../shared/constants/index.js';

// ─────────────────────────────────────────────────────────────
// shippingController — delivery availability + admin rule CRUD.
// ─────────────────────────────────────────────────────────────

/* ── POST /api/shipping/check-availability (public) ── */
export const checkAvailability = asyncHandler(async (req, res) => {
  const { pincode, state, country } = req.body || {};
  if (!pincode) throw ApiError.badRequest('PIN code is required');
  if (!/^\d{6}$/.test(String(pincode).trim())) throw ApiError.badRequest('Enter a valid 6-digit PIN code');

  const result = await shippingService.checkAvailability({ pincode, state, country });

  res.json({
    available: result.available,
    ...(result.available
      ? {
          shippingCharge: result.shippingAmount,
          shippingType: result.shippingType,
          freeShippingThreshold: result.freeShippingThreshold,
          estimatedDelivery: { minDays: result.deliveryMinDays, maxDays: result.deliveryMaxDays },
        }
      : { reason: result.reason || 'Delivery is currently unavailable for this PIN code' }),
  });
});

/* ── GET /api/admin/shipping/rules ── */
export const listRules = asyncHandler(async (req, res) => {
  const rules = await ShippingRule.find().sort({ priority: -1, createdAt: 1 }).lean();
  const settings = await shippingService.getShippingSettings();
  res.json({ rules, settings });
});

/* ── POST /api/admin/shipping/rules ── */
export const createRule = asyncHandler(async (req, res) => {
  const data = validateRulePayload(req.body);
  const rule = await ShippingRule.create({ ...data, status: data.status || 'active' });

  await ActivityLog.create({
    action: 'shipping_rule_created',
    performedBy: req.user._id,
    meta: { ruleId: rule._id, name: rule.name, country: rule.country, states: rule.states, shippingAmount: rule.shippingAmount },
  });

  res.status(201).json({ success: true, rule });
});

/* ── PUT /api/admin/shipping/rules/:id ── */
export const updateRule = asyncHandler(async (req, res) => {
  const rule = await ShippingRule.findById(req.params.id);
  if (!rule) throw ApiError.notFound('Shipping rule not found');

  const data = validateRulePayload(req.body, { isUpdate: true });
  const old = { name: rule.name, status: rule.status, states: rule.states, shippingAmount: rule.shippingAmount };
  Object.assign(rule, data);
  await rule.save();

  await ActivityLog.create({
    action: 'shipping_rule_updated',
    performedBy: req.user._id,
    meta: { ruleId: rule._id, before: old, after: { name: rule.name, status: rule.status, states: rule.states, shippingAmount: rule.shippingAmount } },
  });

  res.json({ success: true, rule });
});

/* ── PATCH /api/admin/shipping/rules/:id/status ── */
export const toggleRule = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) throw ApiError.badRequest('Status must be active or inactive');
  const rule = await ShippingRule.findById(req.params.id);
  if (!rule) throw ApiError.notFound('Shipping rule not found');

  const oldStatus = rule.status;
  rule.status = status;
  await rule.save();

  await ActivityLog.create({
    action: 'shipping_rule_status_changed',
    performedBy: req.user._id,
    meta: { ruleId: rule._id, from: oldStatus, to: status },
  });

  res.json({ success: true, rule });
});

/* ── DELETE /api/admin/shipping/rules/:id ── */
export const deleteRule = asyncHandler(async (req, res) => {
  const rule = await ShippingRule.findByIdAndDelete(req.params.id);
  if (!rule) throw ApiError.notFound('Shipping rule not found');

  await ActivityLog.create({
    action: 'shipping_rule_deleted',
    performedBy: req.user._id,
    meta: { ruleId: rule._id, name: rule.name },
  });

  res.json({ success: true, msg: 'Shipping rule deleted' });
});

/* ── PUT /api/admin/shipping/settings ── */
export const updateSettings = asyncHandler(async (req, res) => {
  const { freeShippingThreshold, defaultShippingCharge, deliveryMinDays, deliveryMaxDays } = req.body || {};
  const patch = {};

  if (freeShippingThreshold !== undefined) {
    const v = Number(freeShippingThreshold);
    if (!Number.isFinite(v) || v < 0) throw ApiError.badRequest('Free shipping threshold must be a non-negative number');
    patch.freeShippingThreshold = Math.round(v * 100) / 100;
  }
  if (defaultShippingCharge !== undefined) {
    const v = Number(defaultShippingCharge);
    if (!Number.isFinite(v) || v < 0) throw ApiError.badRequest('Default shipping charge must be a non-negative number');
    patch.defaultShippingCharge = Math.round(v * 100) / 100;
  }
  if (deliveryMinDays !== undefined) {
    const v = Number(deliveryMinDays);
    if (!Number.isInteger(v) || v < 0) throw ApiError.badRequest('Delivery min days must be a non-negative integer');
    patch.deliveryMinDays = v;
  }
  if (deliveryMaxDays !== undefined) {
    const v = Number(deliveryMaxDays);
    if (!Number.isInteger(v) || v < 0) throw ApiError.badRequest('Delivery max days must be a non-negative integer');
    patch.deliveryMaxDays = v;
  }

  const settings = await shippingService.saveShippingSettings(patch);
  await ActivityLog.create({
    action: 'shipping_settings_updated',
    performedBy: req.user._id,
    meta: patch,
  });

  res.json({ success: true, settings });
});

function validateRulePayload(body, { isUpdate = false } = {}) {
  const b = body || {};
  const data = {};

  if (b.name !== undefined) {
    const name = String(b.name).trim();
    if (!name) throw ApiError.badRequest('Rule name is required');
    data.name = name;
  } else if (!isUpdate) {
    throw ApiError.badRequest('Rule name is required');
  }

  if (b.priority !== undefined) {
    const p = Number(b.priority);
    if (!Number.isFinite(p)) throw ApiError.badRequest('Priority must be a number');
    data.priority = p;
  }
  if (b.status !== undefined) {
    if (!['active', 'inactive'].includes(b.status)) throw ApiError.badRequest('Status must be active or inactive');
    data.status = b.status;
  }

  if (b.country !== undefined) data.country = String(b.country).trim() || 'India';
  if (b.states !== undefined) {
    data.states = Array.isArray(b.states) ? b.states.map((s) => String(s).trim()).filter(Boolean) : [];
    data.states = [...new Set(data.states)];
  }
  if (b.allowedPincodes !== undefined) {
    data.allowedPincodes = validatePincodeList(b.allowedPincodes, 'Allowed PINs');
  }
  if (b.blockedPincodes !== undefined) {
    data.blockedPincodes = validatePincodeList(b.blockedPincodes, 'Blocked PINs');
  }
  if (b.pincodeRanges !== undefined) {
    if (!Array.isArray(b.pincodeRanges)) throw ApiError.badRequest('PIN ranges must be an array');
    data.pincodeRanges = b.pincodeRanges.map((r) => {
      const from = String(r.from || '').trim();
      const to = String(r.to || '').trim();
      if (!/^\d{6}$/.test(from) || !/^\d{6}$/.test(to)) throw ApiError.badRequest('PIN ranges need valid 6-digit from/to values');
      if (parseInt(from, 10) > parseInt(to, 10)) throw ApiError.badRequest(`Invalid PIN range ${from}–${to}`);
      return { from, to };
    });
  }

  if (b.shippingType !== undefined) {
    if (!SHIPPING_TYPES.includes(b.shippingType)) throw ApiError.badRequest(`Shipping type must be one of: ${SHIPPING_TYPES.join(', ')}`);
    data.shippingType = b.shippingType;
  }
  if (b.shippingAmount !== undefined) {
    const v = Number(b.shippingAmount);
    if (!Number.isFinite(v) || v < 0) throw ApiError.badRequest('Shipping amount must be a non-negative number');
    data.shippingAmount = Math.round(v * 100) / 100;
  }
  if (b.freeShippingThreshold !== undefined) {
    const v = Number(b.freeShippingThreshold);
    if (!Number.isFinite(v) || v < 0) throw ApiError.badRequest('Free shipping threshold must be a non-negative number');
    data.freeShippingThreshold = Math.round(v * 100) / 100;
  }
  if (b.deliveryMinDays !== undefined) {
    const v = Number(b.deliveryMinDays);
    if (!Number.isInteger(v) || v < 0) throw ApiError.badRequest('Delivery min days must be a non-negative integer');
    data.deliveryMinDays = v;
  }
  if (b.deliveryMaxDays !== undefined) {
    const v = Number(b.deliveryMaxDays);
    if (!Number.isInteger(v) || v < 0) throw ApiError.badRequest('Delivery max days must be a non-negative integer');
    data.deliveryMaxDays = v;
  }
  if (b.notes !== undefined) data.notes = String(b.notes).trim().slice(0, 500);

  return data;
}

function validatePincodeList(list, label) {
  if (!Array.isArray(list)) throw ApiError.badRequest(`${label} must be an array`);
  const clean = list.map((p) => String(p).trim());
  for (const p of clean) {
    if (!/^\d{6}$/.test(p)) throw ApiError.badRequest(`${label} must contain valid 6-digit PIN codes`);
  }
  return [...new Set(clean)];
}

export default { checkAvailability, listRules, createRule, updateRule, toggleRule, deleteRule, updateSettings };