import mongoose from 'mongoose';
import { USER_ROLES, USER_STATUSES, YTTC_ENROLLMENT_STATUSES, YTTC_MODES } from '../shared/constants/index.js';
import { ALL_PERMISSIONS } from '../shared/constants/permissions.js';

const UserSchema = new mongoose.Schema(
  {
    // ── Basic identity ──
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    // ── Access control ──
    role:   { type: String, enum: USER_ROLES, default: 'student', index: true },
    status: { type: String, enum: USER_STATUSES, default: 'active', index: true },

    // ── Granular permissions (reception role only) ──
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator: (v) => v.every((p) => ALL_PERMISSIONS.includes(p)),
        message: (props) => `Invalid permission key: ${props.value}`,
      },
    },

    // ── Profile ──
    phone:           { type: String, default: '' },
    phoneVerified:   { type: Boolean, default: false },
    emailVerified:   { type: Boolean, default: false },
    city:            { type: String, default: '' },
    style:           { type: String, default: 'Hatha' },
    level:           { type: String, default: 'Beginner' },
    avatar:          { type: String, default: '' },
    bio:             { type: String, default: '' },
    notes:           { type: String, default: '' },
    gender:          { type: String, default: '' },
    dateOfBirth:     { type: Date, default: null },
    birthMonth:      { type: Number, default: null },
    birthDay:        { type: Number, default: null },
    emergencyContact:{ type: String, default: '' },

    // ── Cached / denormalised counters (kept in sync by services) ──
    planMonths:          { type: Number, default: 0 },
    referralCount:       { type: Number, default: 0 },
    unreadNotifications: { type: Number, default: 0 },
    months:              { type: Number, default: 0 },
    certifs:             { type: Number, default: 0 },

    stats: {
      classes:       { type: Number, default: 0 },
      attendancePct: { type: Number, default: 0 },
    },

    progress: {
      flexibility: { type: Number, default: 0 },
      strength:    { type: Number, default: 0 },
      breathing:   { type: Number, default: 0 },
      meditation:  { type: Number, default: 0 },
    },

    badges:    { type: [String], default: [] },
    lastLogin: { type: Date, default: null },

    // ── YTTC Enrollment ──
    yttcEnrollment: {
      isEnrolled: { type: Boolean, default: false, index: true },
      mode: {
        type: String,
        enum: YTTC_MODES,
        default: '',
      },
      status: {
        type: String,
        enum: YTTC_ENROLLMENT_STATUSES,
        default: 'not_enrolled',
        index: true,
      },
      enrolledAt: { type: Date, default: null },
    },

    // ── OAuth providers ──
    oauth: [{
      provider:   { type: String, enum: ["google", "facebook", "instagram"] },
      providerId: { type: String },
    }],

    // ── Refresh-token rotation (hashed sessions) ──
    refreshTokens: { type: [String], default: [], select: false },

    // ── Password reset ──
    resetTokenHash:    { type: String, default: null, select: false },
    resetTokenExpires: { type: Date, default: null, select: false },

    // ── Temporary password (guest checkout auto-accounts) ──
    // Hashed temp password expiry. After this date password login is
    // rejected and the user must reset via Forgot password.
    tempPasswordExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.index({ birthMonth: 1, birthDay: 1 });

UserSchema.pre('save', function () {
  if (this.dateOfBirth) {
    this.birthMonth = this.dateOfBirth.getMonth() + 1;
    this.birthDay = this.dateOfBirth.getDate();
  }
});

// Never leak sensitive fields when serialised to JSON.
UserSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.refreshTokens;
    delete ret.resetTokenHash;
    delete ret.resetTokenExpires;
    delete ret.tempPasswordExpiresAt;
    return ret;
  },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema, 'users');
export default User;
