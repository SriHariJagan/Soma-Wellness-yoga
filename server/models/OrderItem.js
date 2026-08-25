import mongoose from 'mongoose';
import { CART_ITEM_TYPES } from '../shared/constants/index.js';

const OrderItemSchema = new mongoose.Schema(
  {
    order:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    itemType:  { type: String, enum: CART_ITEM_TYPES, required: true },
    itemId:    { type: String, required: true },
    name:      { type: String, required: true },
    image:     { type: String, default: '' },
    quantity:  { type: Number, default: 1, min: 1 },
    price:     { type: Number, required: true, min: 0 },
    discount:  { type: Number, default: 0, min: 0 },
    finalPrice:{ type: Number, required: true, min: 0 },
    coupon:    { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
  },
  { timestamps: true }
);

const OrderItem = mongoose.models.OrderItem || mongoose.model('OrderItem', OrderItemSchema);
export default OrderItem;
