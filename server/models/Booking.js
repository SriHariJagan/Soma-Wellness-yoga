import mongoose from 'mongoose';
import { BOOKING_PAYMENT_METHODS, BOOKING_STATUSES } from '../shared/constants/index.js';

const BookingSchema = new mongoose.Schema(
  {
    // Student details
    name:    { type: String, required: true },
    email:   { type: String, required: true },
    phone:   { type: String, required: true },
    city:    { type: String, default: '' },

    // Course details (auto-filled from Book Now)
    courseName:  { type: String, required: true },
    coursePrice: { type: Number, required: true },
    courseTime:  { type: String, default: '' },

    // Payment
    paymentMethod: { type: String, enum: BOOKING_PAYMENT_METHODS, default: 'UPI' },
    transactionId: { type: String, default: '' },
    status:        { type: String, enum: BOOKING_STATUSES, default: 'Pending' },

    // Notes
    message: { type: String, default: '' },
  },
  { timestamps: true }
);

const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
export default Booking;
