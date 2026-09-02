// ============================================================
// routes/students.js  —  mounted at /api/students
// Admin-managed student directory (used by the admin CRM UI).
// ============================================================
import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import User from '../models/User.js';

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/', asyncHandler(async (req, res) => {
  const students = await User.find({ role: 'student', isDeleted: { $ne: true } }).sort({ createdAt: -1 });
  res.json(students);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const deleted = await User.findByIdAndUpdate(req.params.id, { isDeleted: true, status: 'banned' }, { returnDocument: 'after' });
  if (!deleted) throw ApiError.notFound('Student not found');
  res.json({ success: true, msg: 'Student deactivated and archived' });
}));

router.put('/profile/:id', asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'email', 'phone', 'city', 'style', 'level', 'status', 'dateOfBirth', 'avatar'];
  const updates = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const updated = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { returnDocument: 'after', runValidators: true });
  if (!updated) throw ApiError.notFound('Student not found');
  res.json(updated);
}));

export default router;
