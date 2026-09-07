import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import User from '../models/User.js';
import Branch from '../models/Branch.js';
import BranchAttendance from '../models/BranchAttendance.js';
import ActivityLog from '../models/ActivityLog.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { requireAttendanceScan, requireAttendanceView, requireAttendanceManage } from '../middleware/attendancePermission.js';
import {
  generateQRToken,
  ensureQRToken,
  scanQR,
  getAttendanceHistory,
  getUserAttendanceHistory,
  regenerateQRToken,
  getAttendanceStats,
} from '../services/qrAttendanceService.js';

// ── Get own QR Code ─────────────────────────────────
export const getMyAttendanceQR = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+attendanceQrToken');
  if (!user) throw ApiError.notFound('User not found');

  if (!user.attendanceQrToken) {
    user.attendanceQrToken = generateQRToken();
    await user.save();
  }

  res.json({
    success: true,
    data: {
      attendanceQrToken: user.attendanceQrToken,
      memberId: user.memberId || `SW-${String(user._id).slice(-5).toUpperCase()}`,
      name: user.name,
      avatar: user.avatar,
    },
  });
});

// ── Scan QR Attendance ──────────────────────────────
export const scanAttendance = asyncHandler(async (req, res) => {
  const { qrToken, branchId } = req.body;

  if (!branchId) {
    const userBranch = await User.findById(req.user._id).select('branchId');
    if (userBranch?.branchId) {
      req.body.branchId = userBranch.branchId;
    }
  }

  const result = await scanQR({
    qrToken,
    branchId: req.body.branchId,
    adminUser: req.user,
  });

  await ActivityLog.create({
    action: 'ATTENDANCE_CREATED',
    performedBy: req.user._id,
    targetUser: result.user._id,
    meta: {
      branchId: result.branch._id,
      method: 'QR',
      attendanceId: result.attendance._id,
    },
  });

  res.json({
    success: true,
    message: 'Attendance marked successfully',
    attendance: {
      id: result.attendance._id,
      user: {
        id: result.user._id,
        name: result.user.name,
        profileImage: result.user.avatar,
        memberId: result.user.memberId || `SW-${String(result.user._id).slice(-5).toUpperCase()}`,
      },
      branch: {
        id: result.branch._id,
        name: result.branch.name,
      },
      scannedAt: result.attendance.scannedAt,
    },
  });
});

// ── Attendance List (Admin) ──────────────────────────
export const getAttendanceList = asyncHandler(async (req, res) => {
  const { branch, date, page = 1, limit = 50, search } = req.query;

  const result = await getAttendanceHistory({
    branch,
    date,
    page: parseInt(page),
    limit: parseInt(limit),
    search,
  });

  res.json({
    success: true,
    data: result,
  });
});

// ── Attendance Detail ────────────────────────────────
export const getAttendanceDetail = asyncHandler(async (req, res) => {
  const attendance = await BranchAttendance.findById(req.params.id)
    .populate('user', 'name email avatar memberId')
    .populate('branch', 'name address')
    .populate('scannedBy', 'name')
    .lean();

  if (!attendance) throw ApiError.notFound('Attendance record not found');

  res.json({
    success: true,
    data: attendance,
  });
});

// ── User Attendance History ──────────────────────────
export const getMyAttendance = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;

  const records = await getUserAttendanceHistory(req.user._id, page, limit);

  res.json({
    success: true,
    data: records,
  });
});

// ── Regenerate QR Token ──────────────────────────────
export const regenerateQR = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const oldUser = await User.findById(userId);
  if (!oldUser) throw ApiError.notFound('User not found');

  const newToken = await regenerateQRToken(userId, req.user);

  res.json({
    success: true,
    message: 'QR token regenerated successfully',
    attendanceQrToken: newToken,
  });
});

// ── Attendance Statistics ────────────────────────────
export const getAttendanceStatsController = asyncHandler(async (req, res) => {
  const branchId = req.query.branchId || req.user.branchId;

  if (!branchId) {
    throw ApiError.badRequest('Branch ID is required');
  }

  const stats = await getAttendanceStats(branchId);

  res.json({
    success: true,
    data: stats,
  });
});

// ── Branch Selection for Scan ────────────────────────
export const getBranchesForScan = asyncHandler(async (req, res) => {
  const branches = await Branch.find({ isActive: true }).sort({ name: 1 });

  res.json({
    success: true,
    data: branches,
  });
});
