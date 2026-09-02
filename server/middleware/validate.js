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
  register: z.object({
    name: z.string().min(1, 'Name is required').max(100).trim(),
    email: z.string().email('Invalid email').max(255).trim().toLowerCase(),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128).optional(),
    phone: z.string().max(20).optional().default(''),
    city: z.string().max(100).optional().default(''),
    style: z.string().optional().default('Hatha'),
    level: z.string().optional().default('Beginner'),
    ref: z.string().optional(),
  }),

  login: z.object({
    email: z.string().email('Invalid email').trim().toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  }),

  forgotPassword: z.object({
    email: z.string().email('Invalid email').trim().toLowerCase(),
  }),

  resetPassword: z.object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
  }),

  updateProfile: z.object({
    name: z.string().min(1).max(100).trim().optional(),
    phone: z.string().max(20).optional(),
    city: z.string().max(100).optional(),
    style: z.string().optional(),
    level: z.string().optional(),
    bio: z.string().max(500).optional(),
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128).optional(),
    currentPassword: z.string().min(1).max(128).optional(),
  }),

  createOrder: z.object({
    amount: z.number().int().min(100, 'Minimum amount is 1 unit').max(100000000),
  }),

  verifyPayment: z.object({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
    userId: z.string().optional(),
    amount: z.number().optional(),
    totalAmount: z.number().optional(),
    description: z.string().optional(),
  }),

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
  }),

  lead: z.object({
    name: z.string().min(1, 'Name is required').max(200).trim(),
    phone: z.string().max(20).optional().default(''),
    email: z.string().email('Invalid email').max(255).trim().toLowerCase().optional().or(z.literal('')),
    interestType: z.string().max(100).optional().default(''),
    notes: z.string().max(2000).optional().default(''),
  }),

  otpSend: z.object({
    email: z.string().email('Invalid email').max(255).trim().toLowerCase().optional(),
    phone: z.string().max(20).trim().optional(),
    identifier: z.string().max(255).trim().optional(),
    channel: z.enum(['email', 'sms', 'mobile', 'phone']).optional(),
    name: z.string().max(100).trim().optional(),
  }).refine((d) => d.email || d.phone || d.identifier, { message: 'Provide email or phone' }),

  otpVerify: z.object({
    email: z.string().email('Invalid email').max(255).trim().toLowerCase().optional(),
    phone: z.string().max(20).trim().optional(),
    identifier: z.string().max(255).trim().optional(),
    channel: z.enum(['email', 'sms', 'mobile', 'phone']).optional(),
    otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
    name: z.string().max(100).trim().optional(),
    ref: z.string().max(50).trim().optional(),
  }).refine((d) => d.email || d.phone || d.identifier, { message: 'Provide email or phone' }),
};

export default validate;
