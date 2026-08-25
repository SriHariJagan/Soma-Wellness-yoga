// ============================================================
// routes/batches.js  —  mounted at /api/batches
// Public read; admin create/update/delete.
// ============================================================
import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import Batch from '../models/Batch.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  res.json(await Batch.find().sort({ createdAt: -1 }));
}));

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { name, timing, trainer, zoomLink, status } = req.body;
  if (!name || !timing || !trainer) throw ApiError.badRequest('Name, timing and trainer are required');
  const batch = await Batch.create({ name, timing, trainer, zoomLink: zoomLink || '', status: status || 'Active' });
  res.status(201).json(batch);
}));

router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { name, timing, trainer, zoomLink, status } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (timing !== undefined) updates.timing = timing;
  if (trainer !== undefined) updates.trainer = trainer;
  if (zoomLink !== undefined) updates.zoomLink = zoomLink;
  if (status !== undefined) updates.status = status;
  const batch = await Batch.findByIdAndUpdate(req.params.id, { $set: updates }, { returnDocument: 'after', runValidators: true });
  if (!batch) throw ApiError.notFound('Batch not found');
  res.json(batch);
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const deleted = await Batch.findByIdAndDelete(req.params.id);
  if (!deleted) throw ApiError.notFound('Batch not found');
  res.json({ success: true, msg: 'Batch deleted' });
}));

export default router;
