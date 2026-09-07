// ============================================================
// routes/mpesaRoutes.js — MPESA payment endpoints
// ============================================================
import { Router } from "express";
import { initiateStkPush, stkCallback, queryTransaction } from "../controllers/mpesaController.js";
import { getPaymentModeStatus, simulateTestPayment } from "../controllers/testPaymentController.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

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

export default router;
