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
    enrolledUsers: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      enrolledAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);
export default Course;
