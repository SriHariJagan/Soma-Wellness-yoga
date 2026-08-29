// ============================================================
// routes/otp.js — mounted at /api/auth/otp
// ============================================================
import express from 'express';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate, schemas } from '../middleware/validate.js';
import { sendOtp, verifyOtp } from '../controllers/otpController.js';

const router = express.Router();

const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many OTP requests, please try later.',
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many verification attempts, please try later.',
});

router.post('/send', otpSendLimiter, validate(schemas.otpSend), sendOtp);
router.post('/verify', otpVerifyLimiter, validate(schemas.otpVerify), verifyOtp);

export default router;
