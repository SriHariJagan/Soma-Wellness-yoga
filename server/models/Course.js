import mongoose from 'mongoose';
import { COURSE_MODES } from '../shared/constants/index.js';

const CourseSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true },
    duration:    { type: String, default: '' },     // e.g. "3 Weeks"
    mode:        { type: String, enum: COURSE_MODES, default: 'Online' },
    price:       { type: Number, default: 0 },
    description: { type: String, default: '' },
    active:      { type: Boolean, default: true },
    // SOMA Academy extensions
    hours:           { type: Number, default: null }, // 25/100/200
    earlyPrice:      { type: Number, default: null }, // 145000 for 200h
    earlyCutoffDate: { type: Date, default: null },
    earlyCap:        { type: Number, default: null }, // seat count
    earlyEnrolled:   { type: Number, default: 0 },
    installmentsAllowed: { type: Boolean, default: false },
    installmentsConfig: {
      count: { type: Number, default: 3 },
      interval: { type: String, enum: ['monthly', 'biweekly', 'weekly'], default: 'monthly' },
    },
    category:        { type: String, enum: ['academy', 'group', 'other'], default: 'academy' },
    currency:        { type: String, default: 'KES' },
    enrolledUsers: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      enrolledAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);
export default Course;
