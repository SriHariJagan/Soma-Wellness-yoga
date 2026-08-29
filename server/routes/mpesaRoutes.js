// ============================================================
// routes/mpesaRoutes.js — MPESA payment endpoints
// ============================================================
import { Router } from "express";
import { initiateStkPush, stkCallback, queryTransaction } from "../controllers/mpesaController.js";
import { optionalAuth } from "../middleware/auth.js";

const router = Router();

// Initiate STK Push (public for checkout)
router.post("/stkpush", optionalAuth, initiateStkPush);

// Daraja callback (unauthenticated — Safaricom calls this)
router.post("/callback", stkCallback);

// Query transaction status (public for checkout — same guest flow as stkpush)
router.post("/query", optionalAuth, queryTransaction);

export default router;
