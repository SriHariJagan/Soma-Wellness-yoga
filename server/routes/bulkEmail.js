// ============================================================
// routes/bulkEmail.js — mounted at /api/bulk-email
// Weekly bulk-email campaigns (schedules + runs).
// Auth: requireAuth + requirePermission('communications.bulk').
// admin/manager bypass; reception needs the explicit grant;
// students are always rejected (see middleware/auth.js).
// ============================================================
import express from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import * as ctrl from '../controllers/bulkEmailController.js';

const router = express.Router();
router.use(requireAuth, requirePermission('communications.bulk'));

const bulkLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: 'Too many bulk operations, slow down.' });

router.get('/schedules', ctrl.listSchedules);
router.post('/schedules', bulkLimiter, ctrl.createSchedule);
router.put('/schedules/:id', bulkLimiter, ctrl.updateSchedule);
router.delete('/schedules/:id', bulkLimiter, ctrl.deleteSchedule);
router.get('/schedules/:id/preview', ctrl.previewSchedule);
router.post('/schedules/:id/test', bulkLimiter, ctrl.testSend);
router.post('/schedules/:id/run', bulkLimiter, ctrl.triggerRun);
router.get('/runs', ctrl.listRuns);

export default router;
