// ============================================================
// routes/soma.js — SOMA Wellness Center
// Mounted at /api/soma
// ============================================================
import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import * as soma from '../controllers/somaController.js';
import * as somaAdmin from '../controllers/somaAdminController.js';

const router = express.Router();

// ── Public ───────────────────────────────────────────────────
router.get('/catalog', soma.getCatalog);
router.get('/founding/status', soma.getFoundingStatus);
router.get('/pricing/membership', soma.previewMembershipPrice);
router.get('/pricing/service', soma.previewServicePrice);
router.get('/appointments/slots', soma.getAppointmentSlots);
router.post('/quote', soma.createQuoteRequest);
router.post('/corporate-lead', soma.createCorporateLead);
router.get('/daily/content', soma.getDailyContent);

// ── Authenticated user ───────────────────────────────────────
const userLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: 'Too many requests' });

router.post('/appointments', requireAuth, userLimiter, soma.createAppointment);
router.post('/appointments/:id/cancel', requireAuth, soma.cancelAppointment);
router.get('/appointments/:id/cancel-preview', requireAuth, soma.previewCancellationFee);

router.post('/gift-vouchers', requireAuth, soma.createGiftVoucher);
router.post('/gift-vouchers/redeem', requireAuth, soma.redeemGiftVoucher);
router.get('/gift-vouchers/:code', requireAuth, soma.getVoucherByCode);

router.get('/me/dashboard', requireAuth, soma.getMySomaDashboard);
router.post('/daily/subscribe', requireAuth, soma.subscribeDaily);
router.post('/passes/purchase', requireAuth, soma.purchasePass);
router.post('/passes/:id/consume', requireAuth, soma.consumePass);
router.post('/reset/purchase', requireAuth, soma.purchaseReset);
router.post('/reset/:id/progress', requireAuth, soma.updateResetProgress);

// Quote creation is also allowed anonymously but rate-limited
router.post('/quote-anon', rateLimit({ windowMs: 15*60*1000, max: 5, message: 'Too many quote requests' }), soma.createQuoteRequest);

// ── Admin (all requireAdmin) ─────────────────────────────────
const adminRouter = express.Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/founding', somaAdmin.getFoundingAdmin);
adminRouter.put('/founding', somaAdmin.updateFoundingAdmin);

adminRouter.get('/vouchers', somaAdmin.listVouchersAdmin);
adminRouter.post('/vouchers', somaAdmin.createVoucherAdmin);
adminRouter.patch('/vouchers/:id/void', somaAdmin.voidVoucherAdmin);

adminRouter.get('/corporate-leads', somaAdmin.listCorporateLeadsAdmin);
adminRouter.patch('/corporate-leads/:id', somaAdmin.updateCorporateLeadAdmin);

adminRouter.get('/appointments', somaAdmin.listAppointmentsAdmin);
adminRouter.patch('/appointments/:id', somaAdmin.updateAppointmentAdmin);

adminRouter.get('/health-disclosures', somaAdmin.listHealthDisclosuresAdmin);
adminRouter.get('/passes', somaAdmin.listPassesAdmin);
adminRouter.get('/resets', somaAdmin.listResetsAdmin);

adminRouter.get('/daily-content', somaAdmin.listDailyContentAdmin);
adminRouter.post('/daily-content', somaAdmin.createDailyContentAdmin);
adminRouter.put('/daily-content/:id', somaAdmin.updateDailyContentAdmin);
adminRouter.delete('/daily-content/:id', somaAdmin.deleteDailyContentAdmin);

adminRouter.get('/catalog', somaAdmin.getCatalogAdmin);
adminRouter.put('/catalog', somaAdmin.updateCatalogAdmin);

// Mount admin sub-router
router.use('/admin', adminRouter);

export default router;
