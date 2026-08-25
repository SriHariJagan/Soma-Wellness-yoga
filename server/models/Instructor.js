import mongoose from 'mongoose';

const InstructorSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    email:       { type: String, default: '', lowercase: true, trim: true },
    phone:       { type: String, default: '' },
    avatar:      { type: String, default: '' },
    bio:         { type: String, default: '' },
    specialties: { type: [String], default: [] },
    active:      { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Instructor = mongoose.models.Instructor || mongoose.model('Instructor', InstructorSchema, 'Instructor');
export default Instructor;
