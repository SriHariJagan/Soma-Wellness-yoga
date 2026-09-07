// ============================================================
// routes/mpesaRoutes.js — MPESA payment endpoints
// ============================================================
import { Router } from "express";
import { initiateStkPush, stkCallback, queryTransaction } from "../controllers/mpesaController.js";
import { getPaymentModeStatus, simulateTestPayment, provisionTestAccount } from "../controllers/testPaymentController.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();

// Backend-reported payment mode (source of truth for the frontend).
// Public: the test UI must be able to detect test mode before login.
router.get("/mode", getPaymentModeStatus);

// Initiate STK Push (public for checkout)
router.post("/stkpush", optionalAuth, initiateStkPush);

// Daraja callback (unauthenticated — Safaricom calls this)
// NOTE: live callback behaviour is unchanged in all modes.
router.post("/callback", stkCallback);

// Query transaction status (public for checkout — same guest flow as stkpush)
router.post("/query", optionalAuth, queryTransaction);

// ── TEST MODE ONLY (PAYMENT_MODE=test) ──
// Auth required. Returns 403 "Test payment mode is disabled" in live mode.
router.post("/test", requireAuth, simulateTestPayment);

// ── TEST MODE ONLY: instant guest account provisioning ──
// No auth (new users have none); 403 in live mode. 409 for existing emails.
const provisionLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: "Too many account creation attempts, please try again later." });
router.post("/test/provision", provisionLimiter, provisionTestAccount);

export default router;
