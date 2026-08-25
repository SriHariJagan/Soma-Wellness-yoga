import mongoose from 'mongoose';
import { SERVICE_MODES, PRICING_MODELS, VALIDITY_UNITS } from '../shared/constants/index.js';

const TimeSlotSchema = new mongoose.Schema({
  day:       { type: String, default: '' },
  time:      { type: String, default: '' },
  instructor:{ type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', default: null },
  label:     { type: String, default: '' },
}, { _id: false });

const ServiceSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },
    slug:          { type: String, default: '', trim: true },
    description:   { type: String, default: '' },
    category:      { type: String, default: 'General' },
    type:          { type: String, default: '' },
    mode:          { type: String, enum: SERVICE_MODES, default: 'offline' },
    instructor:    { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', default: null },
    instructors:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Instructor' }],
    timeSlots:     [TimeSlotSchema],
    price:         { type: Number, default: 0, min: 0 },
    pricingModel:  { type: String, enum: PRICING_MODELS, default: 'flat' },
    contactEmail:  { type: String, default: '' },
    contactPhone:  { type: String, default: '' },
    sessionDuration:{ type: Number, default: 60 },
    totalSessions: { type: Number, default: 0 },
    validityDuration:{ type: Number, default: 0 },
    validityUnit:  { type: String, enum: VALIDITY_UNITS, default: 'weeks' },
    durationWeeks: { type: Number, default: 0 },
    scheduleDays:  { type: [String], default: [] },
    scheduleTime:  { type: String, default: '' },
    image:         { type: String, default: '' },
    images:        [{ type: String }],
    icon:          { type: String, default: '' },
    tags:          { type: [String], default: [] },
    active:        { type: Boolean, default: true },
    isPopular:     { type: Boolean, default: false },
    featured:      { type: Boolean, default: false },
    visibility:    { type: String, enum: ['public', 'private', 'hidden'], default: 'public' },
    displayOrder:  { type: Number, default: 0 },
    createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Pre-save: auto-generate slug from name
ServiceSchema.pre('save', function () {
  if (!this.slug || this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
});

const Service = mongoose.models.Service || mongoose.model('Service', ServiceSchema, 'Service');
export default Service;
