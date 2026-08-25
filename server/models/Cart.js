import mongoose from 'mongoose';

const CartSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  },
  { timestamps: true }
);

const Cart = mongoose.models.Cart || mongoose.model('Cart', CartSchema);
export default Cart;
