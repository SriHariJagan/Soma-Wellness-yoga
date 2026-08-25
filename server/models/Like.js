import mongoose from 'mongoose';
import { LIKE_TARGET_TYPES } from '../shared/constants/index.js';

const LikeSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType:{ type: String, enum: LIKE_TARGET_TYPES, required: true },
  target:    { type: mongoose.Schema.Types.ObjectId, required: true },
  createdAt: { type: Date, default: Date.now },
});

LikeSchema.index({ user: 1, targetType: 1, target: 1 }, { unique: true });
LikeSchema.index({ targetType: 1, target: 1 });

const Like = mongoose.models.Like || mongoose.model('Like', LikeSchema, 'Like');
export default Like;
