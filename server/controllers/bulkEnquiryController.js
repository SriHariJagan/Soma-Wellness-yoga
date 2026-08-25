import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import BulkEnquiry from '../models/BulkEnquiry.js';
import ActivityLog from '../models/ActivityLog.js';
import { BULK_ENQUIRY_STATUSES } from '../shared/constants/index.js';
import { sendBulkEnquiryAdmin, sendBulkEnquiryConfirmation } from '../services/bookEmailService.js';

// ─────────────────────────────────────────────────────────────
// bulkEnquiryController — bulk/wholesale book enquiries.
// Bulk customers do not go through retail checkout; the team
// follows up with a quotation.
// ─────────────────────────────────────────────────────────────

/* ── POST /api/bulk-orders ── (public) */
export const submitBulkEnquiry = asyncHandler(async (req, res) => {
  const { organisationName, contactPerson, email, phone, bookTitle, quantity, state, pincode, message } = req.body || {};

  if (!organisationName || !String(organisationName).trim()) throw ApiError.badRequest('Organisation name is required');
  if (!contactPerson || !String(contactPerson).trim()) throw ApiError.badRequest('Contact person is required');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) throw ApiError.badRequest('Enter a valid email address');
  if (!phone || !/^[6-9]\d{9}$/.test(String(phone).replace(/\s+/g, ''))) throw ApiError.badRequest('Enter a valid 10-digit mobile number');
  if (!quantity || !Number.isInteger(Number(quantity)) || Number(quantity) < 10) {
    throw ApiError.badRequest('Minimum bulk quantity is 10 copies');
  }
  if (pincode && !/^\d{6}$/.test(String(pincode).trim())) throw ApiError.badRequest('Enter a valid 6-digit PIN code');

  const enquiry = await BulkEnquiry.create({
    organisationName: String(organisationName).trim().slice(0, 200),
    contactPerson: String(contactPerson).trim().slice(0, 150),
    email: String(email).trim().toLowerCase(),
    phone: String(phone).replace(/\s+/g, ''),
    bookTitle: String(bookTitle || '').trim().slice(0, 200),
    quantity: Number(quantity),
    state: String(state || '').trim().slice(0, 100),
    pincode: String(pincode || '').trim().slice(0, 10),
    message: String(message || '').trim().slice(0, 3000),
    status: 'NEW',
  });

  sendBulkEnquiryAdmin(enquiry).catch(() => {});
  sendBulkEnquiryConfirmation(enquiry).catch(() => {});

  res.status(201).json({
    success: true,
    msg: 'Enquiry received. Our team will reach out within 2 business days.',
    reference: enquiry.referenceNumber,
  });
});

/* ── GET /api/admin/bulk-enquiries ── */
export const listBulkEnquiries = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const skip = (Math.max(1, parseInt(page)) - 1) * Math.max(1, parseInt(limit));

  const filter = {};
  if (status && BULK_ENQUIRY_STATUSES.includes(status)) filter.status = status;
  if (search) {
    const esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(esc, 'i');
    filter.$or = [{ organisationName: regex }, { contactPerson: regex }, { email: regex }, { referenceNumber: regex }];
  }

  const [enquiries, total] = await Promise.all([
    BulkEnquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Math.max(1, parseInt(limit))).lean(),
    BulkEnquiry.countDocuments(filter),
  ]);

  res.json({ enquiries, total, page: Math.max(1, parseInt(page)), pages: Math.ceil(total / Math.max(1, parseInt(limit))) });
});

/* ── GET /api/admin/bulk-enquiries/:id ── */
export const getBulkEnquiryDetail = asyncHandler(async (req, res) => {
  const enquiry = await BulkEnquiry.findById(req.params.id).lean();
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  res.json({ enquiry });
});

/* ── PATCH /api/admin/bulk-enquiries/:id/status ── */
export const updateBulkEnquiryStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  if (!BULK_ENQUIRY_STATUSES.includes(status)) throw ApiError.badRequest(`Status must be one of: ${BULK_ENQUIRY_STATUSES.join(', ')}`);

  const enquiry = await BulkEnquiry.findById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');

  enquiry.status = status;
  if (notes && String(notes).trim()) enquiry.notes = String(notes).trim().slice(0, 3000);
  enquiry.handledBy = req.user._id;
  await enquiry.save();

  await ActivityLog.create({
    action: 'bulk_enquiry_status_changed',
    performedBy: req.user._id,
    meta: { enquiryId: enquiry._id, reference: enquiry.referenceNumber, to: status },
  });

  res.json({ success: true, enquiry });
});

export default { submitBulkEnquiry, listBulkEnquiries, getBulkEnquiryDetail, updateBulkEnquiryStatus };