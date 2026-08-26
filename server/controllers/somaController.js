// ============================================================
// controllers/somaController.js — SOMA Wellness Center
// Public catalog, founding status, booking/appointment, passes,
// gift vouchers, SOMA DAILY, RESET, health disclosure etc.
// ============================================================
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import * as catalog from '../config/somaCatalog.js';
import { checkFoundingEligibility, foundingRateExpiresAt } from '../services/foundingService.js';
import { resolveMembershipPrice, resolveServicePrice, resolveBasketTotal } from '../services/pricingEngine.js';
import { getSignatureSurcharge } from '../services/surchargeService.js';
import { calculateCancellationFee } from '../services/cancellationService.js';
import { resetAllowances, allowanceStatus } from '../services/allowanceService.js';
import FoundingSettings from '../models/FoundingSettings.js';
import Membership from '../models/Membership.js';
import Appointment from '../models/Appointment.js';
import GiftVoucher from '../models/GiftVoucher.js';
import CorporateLead from '../models/CorporateLead.js';
import QuoteRequest from '../models/QuoteRequest.js';
import HealthDisclosure from '../models/HealthDisclosure.js';
import SomaPass from '../models/SomaPass.js';
import SomaResetProgress from '../models/SomaResetProgress.js';
import SomaDailySubscription from '../models/SomaDailySubscription.js';
import SomaContent from '../models/SomaContent.js';
import UserService from '../models/UserService.js';
import Settings from '../models/Settings.js';

// ── Public catalog ───────────────────────────────────────────
export const getCatalog = asyncHandler(async (req, res) => {
  res.json({
    currency: catalog.CURRENCY,
    vatInclusive: catalog.VAT_INCLUDED,
    location: catalog.LOCATION,
    membershipTiers: catalog.MEMBERSHIP_TIERS,
    payAheadTerms: catalog.PAY_AHEAD_TERMS,
    payAheadPricing: catalog.PAY_AHEAD_PRICING,
    foundingMonthly: catalog.FOUNDING_MONTHLY,
    trial: catalog.TRIAL,
    classPasses: catalog.CLASS_PASSES,
    fees: catalog.FEES,
    somaDaily: catalog.SOMA_DAILY,
    privateRates: catalog.PRIVATE_RATES,
    lifeStages: catalog.LIFE_STAGES,
    lifeStagesExtras: catalog.LIFE_STAGES_EXTRAS,
    massageTreatments: catalog.MASSAGE_TREATMENTS,
    signatureExperiences: catalog.SIGNATURE_EXPERIENCES,
    signatureSurcharge: catalog.SIGNATURE_SURCHARGE,
    somaReset: catalog.SOMA_RESET,
    academy: catalog.ACADEMY,
    corporate: catalog.CORPORATE,
    retail: catalog.RETAIL,
  });
});

// ── Founding status (public, wired to counter/date) ────────
export const getFoundingStatus = asyncHandler(async (req, res) => {
  const singleton = await FoundingSettings.getSingleton();
  const now = new Date();
  const eligibility = checkFoundingEligibility({
    currentCount: singleton.count,
    openingDate: singleton.openingDate,
    now,
  });
  res.json({
    cap: singleton.cap,
    windowDays: singleton.windowDays,
    lockMonths: singleton.lockMonths,
    count: singleton.count,
    remainingSlots: eligibility.remainingSlots,
    daysRemaining: eligibility.daysRemaining,
    eligible: eligibility.eligible,
    openingDate: singleton.openingDate,
    reason: eligibility.reason,
    windowEnd: eligibility.windowEnd,
  });
});

// ── Pricing preview (membership + basket) ────────────────────
export const previewMembershipPrice = asyncHandler(async (req, res) => {
  const { tier, termMonths, founding } = req.query;
  if (!tier) throw ApiError.badRequest('tier query required (JUA|AMANI|UZIMA|FAMILY)');
  const term = Number(termMonths) || 1;
  // Check founding eligibility for this request if founding flag requested
  let foundingEligible = founding === 'true' || founding === '1';
  if (foundingEligible) {
    const s = await FoundingSettings.getSingleton();
    const e = checkFoundingEligibility({ currentCount: s.count, openingDate: s.openingDate });
    foundingEligible = e.eligible;
  }
  const result = resolveMembershipPrice(tier, term, { foundingEligible });
  res.json(result);
});

export const previewServicePrice = asyncHandler(async (req, res) => {
  const { basePrice, tierKey, slotStart } = req.query;
  if (basePrice == null) throw ApiError.badRequest('basePrice required');
  let surchargePct = 0;
  if (slotStart) {
    const { surchargePct: sp } = getSignatureSurcharge(new Date(slotStart));
    surchargePct = sp;
  }
  const result = resolveServicePrice(Number(basePrice), { tierKey, surchargePct });
  res.json(result);
});

// ── Appointment booking (protected) ──────────────────────────
export const createAppointment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const {
    type,
    slotStart,
    slotEnd,
    basePrice,
    isQuoteBased,
    childDob,
    notes,
    healthDisclosure,
    therapyDisclaimerAccepted,
  } = req.body;

  if (!type || !slotStart) throw ApiError.badRequest('type and slotStart are required');

  // Quote-based home/hotel should not instant-checkout — create QuoteRequest instead
  if (isQuoteBased) {
    throw ApiError.badRequest('Quote-based sessions must use /api/soma/quote flow, not instant booking');
  }

  const start = new Date(slotStart);
  const end = slotEnd ? new Date(slotEnd) : new Date(start.getTime() + 60 * 60000);
  if (start < new Date()) throw ApiError.badRequest('Slot must be in the future');

  // Enforce health-disclosure for terapia/massage/pregnancy/senior/signature
  const needsDisclosure = ['therapy_assessment', 'therapy_session', 'massage', 'signature_STILLNESS', 'signature_ACACIA', 'signature_FOR_TWO', 'life_stage'].includes(type);
  let disclosureDoc = null;
  if (needsDisclosure) {
    if (!healthDisclosure || healthDisclosure.consentGiven !== true) {
      throw ApiError.badRequest('Health disclosure consent is required before booking this service');
    }
    disclosureDoc = await HealthDisclosure.create({
      user: userId,
      bookingType: type,
      ...healthDisclosure,
      consentGiven: true,
      consentedAt: new Date(),
    });
  }

  // Therapy requires disclaimer checkbox
  const isTherapy = type === 'therapy_assessment' || type === 'therapy_session';
  if (isTherapy && !therapyDisclaimerAccepted) {
    throw ApiError.badRequest('Therapy disclaimer must be accepted before booking therapy');
  }

  // Double-booking prevention: same user same slot
  const clash = await Appointment.findOne({
    user: userId,
    slotStart: start,
    status: { $nin: ['cancelled', 'no_show'] },
  });
  if (clash) throw ApiError.conflict('You already have a booking at this time');

  // Instructor double-book if instructor provided
  if (req.body.instructor) {
    const iclash = await Appointment.findOne({
      instructor: req.body.instructor,
      slotStart: start,
      status: { $nin: ['cancelled', 'no_show'] },
    });
    if (iclash) throw ApiError.conflict('This instructor is already booked at this time');
  }

  // Compute pricing with membership discount + surcharge
  const membership = await Membership.findOne({ user: userId, status: 'active' }).sort({ createdAt: -1 });
  const tierKey = membership?.tier || null;
  let surchargePct = 0;
  if (type.startsWith('signature')) {
    const { surchargePct: sp } = getSignatureSurcharge(start);
    surchargePct = sp;
  }
  const pricing = resolveServicePrice(Number(basePrice) || 0, { tierKey, surchargePct });
  const discountAmount = Math.round((Number(basePrice) || 0) * pricing.discountApplied);
  const surchargeAmount = Math.round(pricing.breakdown.afterDiscount * surchargePct);

  // Age grouping for YOUNG
  let childAgeGroup = '';
  if (childDob) {
    const dob = new Date(childDob);
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 86400000));
    if (age < 5) throw ApiError.badRequest('Child must be at least 5 years old for SOMA YOUNG');
    if (age > 17) throw ApiError.badRequest('SOMA YOUNG is for ages 5-17');
    childAgeGroup = age <= 12 ? '5-12' : '13-17';
  }

  const appt = await Appointment.create({
    user: userId,
    type,
    serviceName: req.body.serviceName || type,
    instructor: req.body.instructor || null,
    slotStart: start,
    slotEnd: end,
    durationMin: Math.round((end - start) / 60000),
    basePrice: Number(basePrice) || 0,
    surchargePct,
    surchargeAmount,
    discountPct: pricing.discountApplied,
    discountAmount,
    finalPrice: pricing.finalPrice,
    currency: 'KES',
    healthDisclosure: disclosureDoc?._id || null,
    therapyDisclaimerAccepted: !!therapyDisclaimerAccepted,
    childDob: childDob ? new Date(childDob) : null,
    childAgeGroup,
    notes: notes || '',
    status: 'scheduled',
  });

  res.status(201).json(appt);
});

export const cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const appt = await Appointment.findById(id);
  if (!appt) throw ApiError.notFound('Appointment not found');
  if (String(appt.user) !== String(req.user._id) && req.user.role !== 'admin') {
    throw ApiError.forbidden('Not your appointment');
  }
  if (appt.status === 'cancelled') throw ApiError.badRequest('Already cancelled');
  if (appt.status === 'no_show' || appt.status === 'completed') throw ApiError.badRequest(`Cannot cancel ${appt.status} appointment`);

  const now = new Date();
  const { feeDue, pct, category, hoursBefore } = calculateCancellationFee({
    appointmentTime: appt.slotStart,
    cancellationTime: now,
    fee: appt.finalPrice || appt.basePrice,
    isNoShow: false,
  });

  appt.status = 'cancelled';
  appt.cancellation = {
    cancelledAt: now,
    cancelledBy: req.user._id,
    feeDue,
    feePct: pct,
    category,
    hoursBefore,
  };
  await appt.save();

  res.json({ appointment: appt, fee: { feeDue, pct, category, hoursBefore } });
});

// Preview cancellation fee without cancelling
export const previewCancellationFee = asyncHandler(async (req, res) => {
  const appt = await Appointment.findById(req.params.id);
  if (!appt) throw ApiError.notFound('Appointment not found');
  const now = req.query.now ? new Date(req.query.now) : new Date();
  const result = calculateCancellationFee({
    appointmentTime: appt.slotStart,
    cancellationTime: now,
    fee: appt.finalPrice || appt.basePrice,
    isNoShow: req.query.noShow === 'true',
  });
  res.json(result);
});

// ── Quote request (home/hotel, corporate) ────────────────────
export const createQuoteRequest = asyncHandler(async (req, res) => {
  const {
    name, email, phone, city,
    type, distanceKm, groupSize, durationMin, venueAddress, preferredDate, preferredTime,
    companyName, headcount, venue, programme, notes,
  } = req.body;
  if (!name || !email) throw ApiError.badRequest('name and email are required');

  // Corporate fixed single session (18k ≤20) may still be instant-bookable — if they explicitly request quote, still create lead
  const doc = await QuoteRequest.create({
    user: req.user?._id || null,
    name, email, phone: phone || '', city: city || '',
    type: type || 'home_hotel',
    distanceKm: distanceKm ?? null,
    groupSize: groupSize ?? 1,
    durationMin: durationMin ?? 60,
    venueAddress: venueAddress || '',
    preferredDate: preferredDate ? new Date(preferredDate) : null,
    preferredTime: preferredTime || '',
    companyName: companyName || '',
    headcount: headcount ?? null,
    venue: venue || '',
    programme: programme || '',
    notes: notes || '',
    status: 'pending',
  });

  // Also mirror to CorporateLead if corporate type
  if (type === 'corporate' || companyName) {
    await CorporateLead.create({
      companyName: companyName || name,
      contactName: name,
      email,
      phone: phone || '',
      headcount: headcount || groupSize || 0,
      venue: venue || venueAddress || '',
      programme: programme || '',
      notes: notes || '',
      status: 'new',
    });
  }

  res.status(201).json(doc);
});

// ── Corporate lead (public form) ─────────────────────────────
export const createCorporateLead = asyncHandler(async (req, res) => {
  const { companyName, contactName, name, email, phone, headcount, venue, programme, notes } = req.body;
  if (!companyName || !email) throw ApiError.badRequest('companyName and email are required');
  const lead = await CorporateLead.create({
    companyName,
    contactName: contactName || name || '',
    email,
    phone: phone || '',
    headcount: headcount || 0,
    venue: venue || '',
    programme: programme || '',
    notes: notes || '',
    status: 'new',
  });
  res.status(201).json(lead);
});

// ── Gift voucher ─────────────────────────────────────────────
export const createGiftVoucher = asyncHandler(async (req, res) => {
  const { amount, recipientEmail, recipientName, message } = req.body;
  if (!amount || Number(amount) < 100) throw ApiError.badRequest('amount must be ≥ 100 KES');
  const voucher = await GiftVoucher.create({
    amount: Number(amount),
    balance: Number(amount),
    purchasedBy: req.user?._id || null,
    purchaserEmail: req.user?.email || req.body.email || '',
    recipientEmail: recipientEmail || '',
    recipientName: recipientName || '',
    message: message || '',
    purchasedAt: new Date(),
    status: 'active',
  });
  res.status(201).json(voucher);
});

export const redeemGiftVoucher = asyncHandler(async (req, res) => {
  const { code, amount } = req.body;
  if (!code || !amount) throw ApiError.badRequest('code and amount are required');
  const voucher = await GiftVoucher.findOne({ code: code.trim().toUpperCase() });
  if (!voucher) throw ApiError.notFound('Voucher not found');
  if (voucher.isExpired) {
    voucher.status = 'expired';
    await voucher.save();
    throw ApiError.badRequest('Voucher has expired (12 months validity)');
  }
  voucher.redeem(Number(amount));
  await voucher.save();
  res.json(voucher);
});

export const getVoucherByCode = asyncHandler(async (req, res) => {
  const voucher = await GiftVoucher.findOne({ code: req.params.code.trim().toUpperCase() });
  if (!voucher) throw ApiError.notFound('Voucher not found');
  res.json(voucher);
});

// ── My dashboard aggregates ──────────────────────────────────
export const getMySomaDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const [membership, passes, vouchers, appointments, resetProgress, dailySub, userServices] = await Promise.all([
    Membership.findOne({ user: userId }).sort({ createdAt: -1 }),
    SomaPass.find({ user: userId }).sort({ createdAt: -1 }),
    GiftVoucher.find({ $or: [{ purchasedBy: userId }, { recipientEmail: req.user.email }] }).sort({ createdAt: -1 }),
    Appointment.find({ user: userId }).sort({ slotStart: 1 }),
    SomaResetProgress.find({ user: userId }).sort({ createdAt: -1 }),
    SomaDailySubscription.find({ user: userId, status: 'active' }).sort({ createdAt: -1 }),
    UserService.find({ user: userId }).sort({ createdAt: -1 }),
  ]);

  const allowanceLines = membership ? allowanceStatus(membership) : [];

  res.json({
    membership,
    allowances: allowanceLines,
    passes,
    giftVouchers: vouchers,
    appointments: appointments.filter((a) => a.status !== 'cancelled').slice(0, 20),
    upcomingBookings: appointments.filter((a) => a.status === 'scheduled' && new Date(a.slotStart) > new Date()),
    resetProgress,
    dailySubscriptions: dailySub,
    packages: userServices,
  });
});

// ── SOMA DAILY subscription (standalone digital) ─────────────
export const subscribeDaily = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { plan } = req.body; // monthly|annual
  if (!['monthly', 'annual'].includes(plan)) throw ApiError.badRequest('plan must be monthly or annual');
  const price = plan === 'monthly' ? catalog.SOMA_DAILY.MONTHLY : catalog.SOMA_DAILY.ANNUAL;
  const now = new Date();
  const expiry = new Date(now);
  if (plan === 'monthly') expiry.setMonth(expiry.getMonth() + 1);
  else expiry.setFullYear(expiry.getFullYear() + 1);

  // If user already has active membership that includes DAILY, mark as included
  const membership = await Membership.findOne({ user: userId, status: 'active' }).sort({ createdAt: -1 });
  const included = membership && catalog.SOMA_DAILY.includedWith.includes(membership.tier);

  const sub = await SomaDailySubscription.create({
    user: userId,
    plan,
    price,
    currency: 'KES',
    startDate: now,
    expiryDate: expiry,
    isIncludedWithMembership: !!included,
    membershipTier: membership?.tier || '',
    status: 'active',
  });
  res.status(201).json(sub);
});

export const getDailyContent = asyncHandler(async (req, res) => {
  const now = new Date();
  const items = await SomaContent.find({ published: true, releaseAt: { $lte: now } })
    .sort({ releaseAt: -1 })
    .limit(50)
    .lean();
  res.json(items);
});

// ── Class passes ─────────────────────────────────────────────
export const purchasePass = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { type } = req.body; // 5_CLASS or 10_CLASS
  if (!['5_CLASS', '10_CLASS'].includes(type)) throw ApiError.badRequest('type must be 5_CLASS or 10_CLASS');
  const def = type === '5_CLASS' ? catalog.CLASS_PASSES.FIVE : catalog.CLASS_PASSES.TEN;
  const pass = await SomaPass.create({
    user: userId,
    type,
    label: def.label,
    totalClasses: def.classes,
    remainingClasses: def.classes,
    perClassRate: def.perClass,
    price: def.price,
    currency: 'KES',
    purchasedAt: new Date(),
    activatedAt: null,
    validityWeeks: def.expiryWeeks || null,
    validityMonths: def.expiryMonths || null,
    status: 'active',
  });
  res.status(201).json(pass);
});

export const consumePass = asyncHandler(async (req, res) => {
  const pass = await SomaPass.findById(req.params.id);
  if (!pass) throw ApiError.notFound('Pass not found');
  if (String(pass.user) !== String(req.user._id) && req.user.role !== 'admin') throw ApiError.forbidden('Not your pass');
  pass.consume(new Date());
  await pass.save();
  res.json(pass);
});

// ── SOMA RESET ───────────────────────────────────────────────
export const purchaseReset = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const prog = await SomaResetProgress.create({
    user: userId,
    price: catalog.SOMA_RESET.price,
    currency: 'KES',
    status: 'active',
    yogaSessionsTotal: catalog.SOMA_RESET.includes.yogaSessions,
    meditationTotal: catalog.SOMA_RESET.includes.meditation,
    massagesTotal: catalog.SOMA_RESET.includes.massages60,
    history: [{ action: 'purchased', note: 'SOMA RESET purchased', at: new Date() }],
  });
  res.status(201).json(prog);
});

export const updateResetProgress = asyncHandler(async (req, res) => {
  const prog = await SomaResetProgress.findById(req.params.id);
  if (!prog) throw ApiError.notFound('RESET not found');
  if (String(prog.user) !== String(req.user._id) && req.user.role !== 'admin') throw ApiError.forbidden('Not your programme');
  const allowed = ['assessmentDone', 'yogaSessionsUsed', 'meditationUsed', 'massagesUsed', 'homePlanDelivered', 'closingReviewDone'];
  for (const k of allowed) if (req.body[k] !== undefined) prog[k] = req.body[k];
  if (req.body.activate && !prog.activatedAt) prog.activate(new Date());
  await prog.save();
  res.json(prog);
});

// ── Appointment slot availability (public) ───────────────────
export const getAppointmentSlots = asyncHandler(async (req, res) => {
  // Simple: return blocked slots for a date so frontend can disable them
  const { date, instructor } = req.query;
  if (!date) throw ApiError.badRequest('date query required (YYYY-MM-DD)');
  const dayStart = new Date(date + 'T00:00:00+03:00');
  const dayEnd = new Date(date + 'T23:59:59+03:00');
  const q = { slotStart: { $gte: dayStart, $lte: dayEnd }, status: { $nin: ['cancelled'] } };
  if (instructor) q.instructor = instructor;
  const appts = await Appointment.find(q).select('slotStart slotEnd status').lean();
  res.json(appts);
});
