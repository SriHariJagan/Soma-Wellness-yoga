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
  const students = await User.find({ role: 'student' }).sort({ createdAt: -1 });
  res.json(students);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const deleted = await User.findByIdAndDelete(req.params.id);
  if (!deleted) throw ApiError.notFound('Student not found');
  res.json({ success: true, msg: 'Student deleted successfully' });
}));

router.put('/profile/:id', asyncHandler(async (req, res) => {
  const updates = { ...req.body };
  delete updates.role;
  delete updates.password;
  const updated = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { returnDocument: 'after', runValidators: true });
  if (!updated) throw ApiError.notFound('Student not found');
  res.json(updated);
}));

export default router;
