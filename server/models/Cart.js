import mongoose from 'mongoose';

const CART_TTL_DAYS = Number(process.env.CART_TTL_DAYS || 30);

const CartSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  },
  { timestamps: true }
);

CartSchema.index({ updatedAt: 1 }, { expireAfterSeconds: CART_TTL_DAYS * 24 * 60 * 60 });

const Cart = mongoose.models.Cart || mongoose.model('Cart', CartSchema);
export default Cart;
