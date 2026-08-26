// ============================================================
// controllers/somaAdminController.js — SOMA admin APIs
// ============================================================
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import FoundingSettings from '../models/FoundingSettings.js';
import Membership from '../models/Membership.js';
import GiftVoucher from '../models/GiftVoucher.js';
import CorporateLead from '../models/CorporateLead.js';
import Appointment from '../models/Appointment.js';
import HealthDisclosure from '../models/HealthDisclosure.js';
import SomaPass from '../models/SomaPass.js';
import SomaResetProgress from '../models/SomaResetProgress.js';
import SomaContent from '../models/SomaContent.js';
import SomaDailySubscription from '../models/SomaDailySubscription.js';
import { checkFoundingEligibility } from '../services/foundingService.js';
import Settings from '../models/Settings.js';
import * as catalog from '../config/somaCatalog.js';

// ── Founding admin ───────────────────────────────────────────
export const getFoundingAdmin = asyncHandler(async (req, res) => {
  const f = await FoundingSettings.getSingleton();
  const eligibility = checkFoundingEligibility({ currentCount: f.count, openingDate: f.openingDate });
  const members = await Membership.find({ isFounding: true }).select('user tier founding_rate_expires_at price').populate('user', 'name email').lean();
  const snapshot = {
    cap: f.cap,
    windowDays: f.windowDays,
    lockMonths: f.lockMonths,
    openingDate: f.openingDate,
    count: f.count,
    remainingSlots: eligibility.remainingSlots,
    daysRemaining: eligibility.daysRemaining,
    eligible: eligibility.eligible,
    windowEnd: eligibility.windowEnd,
    members: members.map((m) => ({
      user: m.user,
      tier: m.tier,
      founding_rate_expires_at: m.founding_rate_expires_at,
      daysLeft: m.founding_rate_expires_at ? Math.max(0, Math.ceil((new Date(m.founding_rate_expires_at) - new Date()) / 86400000)) : null,
      price: m.price,
    })),
  };
  res.json(snapshot);
});

export const updateFoundingAdmin = asyncHandler(async (req, res) => {
  const { openingDate, cap, windowDays, lockMonths, count } = req.body;
  const f = await FoundingSettings.getSingleton();
  if (openingDate !== undefined) f.openingDate = new Date(openingDate);
  if (cap !== undefined) f.cap = Number(cap);
  if (windowDays !== undefined) f.windowDays = Number(windowDays);
  if (lockMonths !== undefined) f.lockMonths = Number(lockMonths);
  if (count !== undefined) f.count = Number(count);
  f.updatedBy = req.user._id;
  await f.save();
  res.json(f);
});

// ── Gift vouchers admin ──────────────────────────────────────
export const listVouchersAdmin = asyncHandler(async (req, res) => {
  const vouchers = await GiftVoucher.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json(vouchers);
});
export const createVoucherAdmin = asyncHandler(async (req, res) => {
  const { amount, recipientEmail, recipientName, purchaserEmail } = req.body;
  if (!amount) throw ApiError.badRequest('amount required');
  const v = await GiftVoucher.create({
    amount: Number(amount),
    balance: Number(amount),
    purchaserEmail: purchaserEmail || req.user.email || '',
    recipientEmail: recipientEmail || '',
    recipientName: recipientName || '',
    purchasedAt: new Date(),
    status: 'active',
    createdBy: req.user._id,
  });
  res.status(201).json(v);
});
export const voidVoucherAdmin = asyncHandler(async (req, res) => {
  const v = await GiftVoucher.findById(req.params.id);
  if (!v) throw ApiError.notFound('Voucher not found');
  v.status = 'cancelled';
  await v.save();
  res.json(v);
});

// ── Corporate leads admin ────────────────────────────────────
export const listCorporateLeadsAdmin = asyncHandler(async (req, res) => {
  const leads = await CorporateLead.find().sort({ createdAt: -1 }).lean();
  res.json(leads);
});
export const updateCorporateLeadAdmin = asyncHandler(async (req, res) => {
  const lead = await CorporateLead.findById(req.params.id);
  if (!lead) throw ApiError.notFound('Lead not found');
  const allowed = ['status', 'quoteAmount', 'quoteNotes', 'assignedTo'];
  for (const k of allowed) if (req.body[k] !== undefined) lead[k] = req.body[k];
  await lead.save();
  res.json(lead);
});

// ── Appointments admin ───────────────────────────────────────
export const listAppointmentsAdmin = asyncHandler(async (req, res) => {
  const { status, type, from, to } = req.query;
  const q = {};
  if (status) q.status = status;
  if (type) q.type = type;
  if (from || to) {
    q.slotStart = {};
    if (from) q.slotStart.$gte = new Date(from);
    if (to) q.slotStart.$lte = new Date(to);
  }
  const items = await Appointment.find(q).populate('user', 'name email').populate('healthDisclosure').sort({ slotStart: 1 }).lean();
  res.json(items);
});
export const updateAppointmentAdmin = asyncHandler(async (req, res) => {
  const appt = await Appointment.findById(req.params.id);
  if (!appt) throw ApiError.notFound('Appointment not found');
  const allowed = ['status', 'internalNotes', 'medicalClearanceRequired', 'medicalClearanceProvided', 'instructor', 'slotStart', 'slotEnd'];
  for (const k of allowed) if (req.body[k] !== undefined) appt[k] = req.body[k];
  await appt.save();
  res.json(appt);
});

// ── Health disclosures admin ─────────────────────────────────
export const listHealthDisclosuresAdmin = asyncHandler(async (req, res) => {
  const items = await HealthDisclosure.find().populate('user', 'name email').populate('appointment').sort({ createdAt: -1 }).limit(200).lean();
  res.json(items);
});

// ── Passes admin ─────────────────────────────────────────────
export const listPassesAdmin = asyncHandler(async (req, res) => {
  const passes = await SomaPass.find().populate('user', 'name email').sort({ createdAt: -1 }).lean();
  res.json(passes);
});

// ── RESET admin ──────────────────────────────────────────────
export const listResetsAdmin = asyncHandler(async (req, res) => {
  const items = await SomaResetProgress.find().populate('user', 'name email').sort({ createdAt: -1 }).lean();
  res.json(items);
});

// ── Daily content admin ──────────────────────────────────────
export const listDailyContentAdmin = asyncHandler(async (req, res) => {
  const items = await SomaContent.find().sort({ releaseAt: -1 }).lean();
  res.json(items);
});
export const createDailyContentAdmin = asyncHandler(async (req, res) => {
  const doc = await SomaContent.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(doc);
});
export const updateDailyContentAdmin = asyncHandler(async (req, res) => {
  const doc = await SomaContent.findByIdAndUpdate(req.params.id, { $set: req.body }, { returnDocument: 'after', runValidators: true });
  if (!doc) throw ApiError.notFound('Content not found');
  res.json(doc);
});
export const deleteDailyContentAdmin = asyncHandler(async (req, res) => {
  const doc = await SomaContent.findByIdAndDelete(req.params.id);
  if (!doc) throw ApiError.notFound('Content not found');
  res.json({ success: true });
});

// ── Catalog overrides admin (simple) ─────────────────────────
export const getCatalogAdmin = asyncHandler(async (req, res) => {
  const s = await Settings.getSingleton();
  res.json({ catalog, settingsSoma: s.soma });
});
export const updateCatalogAdmin = asyncHandler(async (req, res) => {
  const s = await Settings.getSingleton();
  if (req.body.soma) {
    s.soma = { ...s.soma.toObject?.() || s.soma, ...req.body.soma };
    await s.save();
  }
  res.json(s.soma);
});
