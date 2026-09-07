// ============================================================
// routes/attendanceRoutes.js  —  QR-based branch attendance routes
// ============================================================
import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { requireAttendanceScan, requireAttendanceView, requireAttendanceManage } from '../middleware/attendancePermission.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from '../controllers/attendanceController.js';

const router = express.Router();

// All attendance routes require authentication
router.use(requireAuth);

// ── User QR ───────────────────────────────────────────
router.get('/users/me/attendance-qr', requireAuth, ctrl.getMyAttendanceQR);

// ── Scan QR ───────────────────────────────────────────
router.post('/admin/attendance/scan', requireAdmin, requireAttendanceScan, ctrl.scanAttendance);

// ── Admin Attendance List ─────────────────────────────
router.get('/admin/attendance', requireAdmin, requireAttendanceView, ctrl.getAttendanceList);

// ── Admin Attendance Detail ───────────────────────────
router.get('/admin/attendance/:id', requireAdmin, requireAttendanceView, ctrl.getAttendanceDetail);

// ── Admin Attendance Stats ────────────────────────────
router.get('/admin/attendance/stats', requireAdmin, requireAttendanceView, ctrl.getAttendanceStatsController);

// ── Branches for Scan ─────────────────────────────────
router.get('/admin/attendance/branches', requireAdmin, ctrl.getBranchesForScan);

// ── User Own Attendance ───────────────────────────────
router.get('/users/me/attendance', requireAuth, ctrl.getMyAttendance);

// ── Regenerate QR (Admin/Manage) ─────────────────────
router.post('/admin/users/:id/regenerate-attendance-qr', requireAdmin, requireAttendanceManage, ctrl.regenerateQR);

export default router;
