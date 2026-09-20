import { z } from 'zod';

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details,
      });
    }
    req.body = result.data;
    next();
  };
}

export const schemas = {
  // ── Auth ─────────────────────────────────────────────────────
  register: z.object({
    name: z.string().min(1, 'Name is required').max(100).trim(),
    email: z.string().email('Invalid email').max(255).trim().toLowerCase(),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128).optional(),
    phone: z.string().max(20).optional().default(''),
    city: z.string().max(100).optional().default(''),
    style: z.string().optional().default('Hatha'),
    level: z.string().optional().default('Beginner'),
    ref: z.string().optional(),
  }).strip(),

  login: z.object({
    email: z.string().email('Invalid email').trim().toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  }).strip(),

  forgotPassword: z.object({
    email: z.string().email('Invalid email').trim().toLowerCase(),
  }).strip(),

  resetPassword: z.object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
  }).strip(),

  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
  }).strip(),

  updateProfile: z.object({
    name: z.string().min(1).max(100).trim().optional(),
    phone: z.string().max(20).optional(),
    city: z.string().max(100).optional(),
    style: z.string().optional(),
    level: z.string().optional(),
    bio: z.string().max(500).optional(),
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128).optional(),
    currentPassword: z.string().min(1).max(128).optional(),
  }).strip(),

  // ── Booking / Lead ───────────────────────────────────────────
  booking: z.object({
    name: z.string().min(1, 'Name is required').max(200).trim(),
    email: z.string().email('Invalid email').max(255).trim().toLowerCase(),
    phone: z.string().min(1, 'Phone is required').max(20).trim(),
    city: z.string().max(100).optional().default(''),
    courseName: z.string().min(1, 'Course name is required').max(200).trim(),
    coursePrice: z.union([z.number(), z.string().min(1, 'Course price is required').max(50)]),
    courseTime: z.string().max(100).optional().default(''),
    paymentMethod: z.string().max(50).optional().default('UPI'),
    transactionId: z.string().max(200).optional().default(''),
    message: z.string().max(2000).optional().default(''),
    status: z.string().optional(),
  }).strip(),

  lead: z.object({
    name: z.string().min(1, 'Name is required').max(200).trim(),
    phone: z.string().max(20).optional().default(''),
    email: z.string().email('Invalid email').max(255).trim().toLowerCase().optional().or(z.literal('')),
    interestType: z.string().max(100).optional().default(''),
    notes: z.string().max(2000).optional().default(''),
  }).strip(),

  // ── OTP ──────────────────────────────────────────────────────
  otpSend: z.object({
    email: z.string().email('Invalid email').max(255).trim().toLowerCase().optional(),
    phone: z.string().max(20).trim().optional(),
    identifier: z.string().max(255).trim().optional(),
    channel: z.enum(['email', 'sms', 'mobile', 'phone']).optional(),
    name: z.string().max(100).trim().optional(),
  }).refine((d) => d.email || d.phone || d.identifier, { message: 'Provide email or phone' }).strip(),

  otpVerify: z.object({
    email: z.string().email('Invalid email').max(255).trim().toLowerCase().optional(),
    phone: z.string().max(20).trim().optional(),
    identifier: z.string().max(255).trim().optional(),
    channel: z.enum(['email', 'sms', 'mobile', 'phone']).optional(),
    otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
    name: z.string().max(100).trim().optional(),
    ref: z.string().max(50).trim().optional(),
  }).refine((d) => d.email || d.phone || d.identifier, { message: 'Provide email or phone' }).strip(),

  otpCheck: z.object({
    email: z.string().email('Invalid email').max(255).trim().toLowerCase().optional(),
    phone: z.string().max(20).trim().optional(),
    identifier: z.string().max(255).trim().optional(),
  }).refine((d) => d.email || d.phone || d.identifier, { message: 'Provide email or phone' }).strip(),

  // ── Offering CRUD ────────────────────────────────────────────
  offeringCreate: z.object({
    name: z.string().min(1, 'Name is required').max(200).trim(),
    subtitle: z.string().max(200).optional().default(''),
    description: z.string().max(5000).optional().default(''),
    category: z.enum([
      'group_yoga', 'membership', 'personal_training', 'meditation',
      'corporate', 'therapy', 'mama', 'signature', 'academy',
    ]),
    subcategory: z.string().max(100).optional().default(''),
    tags: z.array(z.string().max(50)).max(20).optional().default([]),
    price: z.number().min(0).max(100000000).optional().default(0),
    originalPrice: z.number().min(0).max(100000000).optional(),
    currency: z.string().length(3).optional().default('KES'),
    pricingModel: z.enum(['flat', 'per_session', 'per_package', 'monthly', 'contact']).optional().default('flat'),
    sessions: z.number().int().min(0).max(10000).optional().default(0),
    sessionDuration: z.number().int().min(0).max(600).optional().default(60),
    validityDuration: z.number().int().min(0).max(1000).optional().default(0),
    validityUnit: z.enum(['single', 'sessions', 'days', 'weeks', 'months']).optional().default('single'),
    whatIncluded: z.array(z.string().max(200)).max(50).optional().default([]),
    benefits: z.array(z.string().max(200)).max(50).optional().default([]),
    image: z.string().max(500).optional().default(''),
    gallery: z.array(z.string().max(500)).max(20).optional().default([]),
    icon: z.string().max(100).optional().default(''),
    displayOrder: z.number().int().min(0).max(10000).optional().default(0),
    featured: z.boolean().optional().default(false),
    isPopular: z.boolean().optional().default(false),
    status: z.enum(['draft', 'available', 'unavailable', 'upcoming', 'archived']).optional().default('draft'),
    visibility: z.enum(['public', 'private', 'hidden']).optional().default('public'),
    bookingEnabled: z.boolean().optional().default(true),
    startDate: z.string().optional().nullable().default(null),
    endDate: z.string().optional().nullable().default(null),
    capacity: z.number().int().min(0).max(100000).optional().default(0),
  }).strip(),

  offeringUpdate: z.object({
    name: z.string().min(1).max(200).trim().optional(),
    subtitle: z.string().max(200).optional(),
    description: z.string().max(5000).optional(),
    category: z.enum([
      'group_yoga', 'membership', 'personal_training', 'meditation',
      'corporate', 'therapy', 'mama', 'signature', 'academy',
    ]).optional(),
    subcategory: z.string().max(100).optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    price: z.number().min(0).max(100000000).optional(),
    originalPrice: z.number().min(0).max(100000000).optional(),
    currency: z.string().length(3).optional(),
    pricingModel: z.enum(['flat', 'per_session', 'per_package', 'monthly', 'contact']).optional(),
    sessions: z.number().int().min(0).max(10000).optional(),
    sessionDuration: z.number().int().min(0).max(600).optional(),
    validityDuration: z.number().int().min(0).max(1000).optional(),
    validityUnit: z.enum(['single', 'sessions', 'days', 'weeks', 'months']).optional(),
    whatIncluded: z.array(z.string().max(200)).max(50).optional(),
    benefits: z.array(z.string().max(200)).max(50).optional(),
    image: z.string().max(500).optional(),
    gallery: z.array(z.string().max(500)).max(20).optional(),
    icon: z.string().max(100).optional(),
    displayOrder: z.number().int().min(0).max(10000).optional(),
    featured: z.boolean().optional(),
    isPopular: z.boolean().optional(),
    status: z.enum(['draft', 'available', 'unavailable', 'upcoming', 'archived']).optional(),
    visibility: z.enum(['public', 'private', 'hidden']).optional(),
    bookingEnabled: z.boolean().optional(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    capacity: z.number().int().min(0).max(100000).optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  ).strip(),

  offeringToggle: z.object({
    field: z.enum(['featured', 'isPopular', 'bookingEnabled']),
  }).strip(),

  offeringStatus: z.object({
    status: z.enum(['draft', 'available', 'unavailable', 'upcoming', 'archived']).optional(),
    visibility: z.enum(['public', 'private', 'hidden']).optional(),
  }).refine(
    (data) => data.status !== undefined || data.visibility !== undefined,
    { message: 'At least one of status or visibility must be provided' }
  ).strip(),

  offeringReorder: z.object({
    orders: z.array(z.object({
      id: z.string().min(1),
      displayOrder: z.number().int().min(0),
    })).min(1, 'At least one order item required'),
  }).strip(),

  // ── Trial Session ────────────────────────────────────────────
  trialSessionUpdate: z.object({
    title: z.string().min(1).max(200).trim().optional(),
    description: z.string().max(2000).optional(),
    instructor: z.string().max(100).optional(),
    date: z.string().optional(),
    startTime: z.string().max(10).optional(),
    endTime: z.string().max(10).optional(),
    duration: z.number().int().min(1).max(600).optional(),
    meetingPlatform: z.string().max(50).optional(),
    meetingLink: z.string().max(500).optional(),
    location: z.string().max(200).optional(),
    notes: z.string().max(2000).optional(),
    adminNotes: z.string().max(2000).optional(),
    status: z.enum(['scheduled', 'completed', 'missed', 'cancelled', 'rescheduled']).optional(),
    attended: z.boolean().optional(),
    cancelled: z.boolean().optional(),
    cancelReason: z.string().max(500).optional(),
    fileUrl: z.string().max(500).optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided' }
  ).strip(),

  // ── Daily Content ────────────────────────────────────────────
  dailyContentCreate: z.object({
    title: z.string().min(1, 'Title is required').max(200).trim(),
    type: z.enum(['meditation', 'breathwork', 'yoga_nidra', 'pranayama', 'philosophy', 'article', 'insight']),
    cadence: z.enum(['daily', 'weekly', 'monthly', 'special']),
    description: z.string().max(2000).optional().default(''),
    body: z.string().max(50000).optional().default(''),
    audioUrl: z.string().max(500).optional().default(''),
    image: z.string().max(500).optional().default(''),
    readingNotes: z.string().max(5000).optional().default(''),
    releaseAt: z.string().min(1, 'Release date is required'),
    published: z.boolean().optional().default(false),
    access: z.enum(['free', 'daily_subscribers', 'members_only']).optional().default('daily_subscribers'),
    season: z.string().max(50).optional().default(''),
    displayOrder: z.number().int().min(0).max(10000).optional().default(0),
  }).strip(),

  dailyContentUpdate: z.object({
    title: z.string().min(1).max(200).trim().optional(),
    type: z.enum(['meditation', 'breathwork', 'yoga_nidra', 'pranayama', 'philosophy', 'article', 'insight']).optional(),
    cadence: z.enum(['daily', 'weekly', 'monthly', 'special']).optional(),
    description: z.string().max(2000).optional(),
    body: z.string().max(50000).optional(),
    audioUrl: z.string().max(500).optional(),
    image: z.string().max(500).optional(),
    readingNotes: z.string().max(5000).optional(),
    releaseAt: z.string().optional(),
    published: z.boolean().optional(),
    access: z.enum(['free', 'daily_subscribers', 'members_only']).optional(),
    season: z.string().max(50).optional(),
    displayOrder: z.number().int().min(0).max(10000).optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  ).strip(),

  // ── Payment ──────────────────────────────────────────────────
  mpesaCreateOrder: z.object({
    items: z.array(z.object({
      itemType: z.string().min(1),
      itemId: z.string().optional(),
      quantity: z.number().int().min(1).max(100).optional().default(1),
    })).min(1, 'At least one item required'),
    label: z.string().max(200).optional(),
    description: z.string().max(1000).optional(),
    idempotencyKey: z.string().max(100).optional(),
  }).strip(),

  mpesaVerify: z.object({
    razorpay_order_id: z.string().optional(),
    razorpay_payment_id: z.string().optional(),
    razorpay_signature: z.string().optional(),
    mpesaReceiptNumber: z.string().optional(),
    checkoutRequestId: z.string().optional(),
  }).refine(
    (data) => data.mpesaReceiptNumber || data.checkoutRequestId ||
              (data.razorpay_order_id && data.razorpay_payment_id && data.razorpay_signature),
    { message: 'Provide M-Pesa receipt/checkoutId or Razorpay verification fields' }
  ).strip(),

  // ── Bulk Enquiry ─────────────────────────────────────────────
  bulkEnquiry: z.object({
    organisationName: z.string().min(1, 'Organisation name is required').max(200).trim(),
    contactPerson: z.string().min(1, 'Contact person is required').max(150).trim(),
    email: z.string().email('Enter a valid email address').max(255).trim().toLowerCase(),
    phone: z.string().min(1, 'Phone is required').max(20).trim(),
    bookTitle: z.string().max(200).optional().default(''),
    quantity: z.number().int().min(1, 'Minimum quantity is 1').max(100000),
    state: z.string().max(100).optional().default(''),
    pincode: z.string().max(10).optional().default(''),
    message: z.string().max(3000).optional().default(''),
  }).strip(),
};

export default validate;
