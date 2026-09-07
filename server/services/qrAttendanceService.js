import crypto from 'crypto';
import User from '../models/User.js';
import Branch from '../models/Branch.js';
import BranchAttendance from '../models/BranchAttendance.js';
import ActivityLog from '../models/ActivityLog.js';
import Membership from '../models/Membership.js';
import ApiError from '../utils/ApiError.js';
import logger from '../notification/logger.js';

const MODULE = 'QRAttendanceSvc';
const QR_TOKEN_PREFIX = 'SW-ATT-';

export function generateQRToken() {
  const randomPart = crypto.randomUUID();
  return `${QR_TOKEN_PREFIX}${randomPart}`;
}

export async function ensureQRToken(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  if (!user.attendanceQrToken) {
    user.attendanceQrToken = generateQRToken();
    await user.save();
  }
  return user.attendanceQrToken;
}

export async function getUserByQRToken(qrToken) {
  const user = await User.findOne({ attendanceQrToken: qrToken });
  if (!user) {
    return null;
  }
  return user;
}

export async function getBranchAttendance({ user, branch, date }) {
  const dayStr = getBusinessDayStr(date);
  return BranchAttendance.findOne({ user, branch, attendanceDay: dayStr });
}

export async function createBranchAttendance({ user, branch, scannedBy, date }) {
  const dayStr = getBusinessDayStr(date);
  const now = new Date();

  const attendance = await BranchAttendance.create({
    user,
    branch,
    scannedBy,
    attendanceDate: new Date(date),
    attendanceDay: dayStr,
    scannedAt: now,
    method: 'QR',
    status: 'PRESENT',
  });

  try {
    await ActivityLog.create({
      action: 'ATTENDANCE_CREATED',
      performedBy: scannedBy,
      targetUser: user._id,
      meta: {
        branchId: branch,
        method: 'QR',
        attendanceDate: dayStr,
        attendanceId: attendance._id,
      },
    });
  } catch (e) {
    logger.error(MODULE, 'ActivityLog failed for attendance', { error: e.message });
  }

  return attendance;
}

export async function scanQR({ qrToken, branchId, adminUser }) {
  if (!qrToken) {
    throw ApiError.badRequest('QR token is required');
  }

  const user = await getUserByQRToken(qrToken);
  if (!user) {
    throw ApiError.forbidden('Invalid or unrecognized attendance QR code.');
  }

  if (user.status !== 'active') {
    throw ApiError.forbidden('This member is currently inactive.');
  }

  const branch = await Branch.findById(branchId);
  if (!branch || !branch.isActive) {
    throw ApiError.badRequest('Invalid or inactive branch.');
  }

  const membership = await Membership.findOne({ user: user._id, status: 'active' });
  if (!membership || membership.expiryDate < new Date()) {
    throw ApiError.forbidden('This member has no active membership.');
  }

  const today = new Date();
  const existing = await getBranchAttendance({ user: user._id, branch: branchId, date: today });
  if (existing && existing.status === 'PRESENT') {
    throw ApiError.conflict('Attendance already recorded for today.');
  }

  const attendance = await createBranchAttendance({
    user: user._id,
    branch: branchId,
    scannedBy: adminUser._id,
    date: today,
  });

  return { attendance, user, branch };
}

export async function getAttendanceHistory({ branch, date, page = 1, limit = 50, search = '' }) {
  const query = {};
  if (branch) query.branch = branch;

  const dayStr = date ? getBusinessDayStr(date) : getBusinessDayStr(new Date());
  if (dayStr) query.attendanceDay = dayStr;

  if (search) {
    query['user'] = { $exists: true };
  }

  const total = await BranchAttendance.countDocuments(query);
  const records = await BranchAttendance.find(query)
    .populate('user', 'name email memberId avatar')
    .populate('branch', 'name')
    .populate('scannedBy', 'name')
    .sort({ scannedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return { records, total, page, limit };
}

export async function getUserAttendanceHistory(userId, page = 1, limit = 50) {
  const records = await BranchAttendance.find({ user: userId })
    .populate('branch', 'name')
    .populate('scannedBy', 'name')
    .sort({ scannedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  return records;
}

export async function regenerateQRToken(userId, adminUser) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  const oldToken = user.attendanceQrToken;
  user.attendanceQrToken = generateQRToken();
  await user.save();

  try {
    await ActivityLog.create({
      action: 'QR_TOKEN_REGENERATED',
      performedBy: adminUser._id,
      targetUser: user._id,
      meta: { oldToken, newToken: user.attendanceQrToken },
    });
  } catch { /* noop */ }

  return user.attendanceQrToken;
}

export async function getAttendanceStats(branchId) {
  const today = new Date();
  const dayStr = getBusinessDayStr(today);

  const todayCount = await BranchAttendance.countDocuments({ branch: branchId, attendanceDay: dayStr, status: 'PRESENT' });

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStr = getBusinessDayStr(weekAgo);
  const weekCount = await BranchAttendance.countDocuments({ branch: branchId, attendanceDay: { $gte: weekStr }, status: 'PRESENT' });

  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthStr = getBusinessDayStr(monthAgo);
  const monthCount = await BranchAttendance.countDocuments({ branch: branchId, attendanceDay: { $gte: monthStr }, status: 'PRESENT' });

  const activeMembers = await User.countDocuments({ role: 'student', status: 'active', _id: { $in: await BranchAttendance.distinct('user', { branch: branchId, attendanceDay: dayStr }) } });

  return { today: todayCount, thisWeek: weekCount, thisMonth: monthCount, activeMembersToday: activeMembers };
}

function getBusinessDayStr(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default {
  generateQRToken,
  ensureQRToken,
  getUserByQRToken,
  getBranchAttendance,
  createBranchAttendance,
  scanQR,
  getAttendanceHistory,
  getUserAttendanceHistory,
  regenerateQRToken,
  getAttendanceStats,
};
