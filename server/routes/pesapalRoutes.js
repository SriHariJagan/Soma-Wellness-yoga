// ============================================================
// routes/pesapalRoutes.js — Pesapal redirect + IPN + status.
// ============================================================
import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate, schemas } from '../middleware/validate.js';
import {
  initiatePesapal,
  pesapalStatus,
  pesapalIpnGet,
  pesapalIpnPost,
  pesapalReturn,
  pesapalConfig,
} from '../controllers/pesapalController.js';

const router = Router();

const initiateLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: 'Too many payment attempts, please try again later.' });
const statusLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: 'Too many status checks, please try again later.' });
const ipnLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, message: 'Too many notifications.' });

// Initiate a server-priced Pesapal payment (guest allowed for guest checkout;
// ownership enforced on capture/status).
router.post('/initiate', optionalAuth, initiateLimiter, validate(schemas.pesapalInitiate), initiatePesapal);

// Owner-scoped status (also opportunistically verifies via provider).
router.get('/status', optionalAuth, statusLimiter, pesapalStatus);

// Pesapal IPN — public, no user auth. Verified server-to-server inside.
router.get('/ipn', ipnLimiter, pesapalIpnGet);
router.post('/ipn', ipnLimiter, pesapalIpnPost);

// Browser return landing (API-side; SPA uses /payment/return + /status).
router.get('/return', pesapalReturn);

// Non-secret configuration probe.
router.get('/config', pesapalConfig);

export default router;
