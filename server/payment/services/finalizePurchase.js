// ============================================================
// finalizePurchase.js — post-capture bookkeeping shared by the
// verify endpoint and the payment webhook. Runs INSIDE the
// capture transaction (session) so coupon usage and cart clearing
// can never happen without a captured payment, nor twice.
// ============================================================
import mongoose from 'mongoose';
import Cart from '../../models/Cart.js';
import CartItem from '../../models/CartItem.js';
import Coupon from '../../models/Coupon.js';
import CouponUsage from '../../models/CouponUsage.js';
import Order from '../../models/Order.js';
import logger from '../../notification/logger.js';

const MODULE = 'FinalizePurchase';

/**
 * @param {ObjectId|string} userId
 * @param {Object} payment — captured Payment doc (plain object ok)
 * @param {ClientSession} session — active transaction session
 */
export async function finalizePurchase(userId, payment, session) {
  const items = payment.items || [];

  // 1 — Consume coupon (usage was only *reserved* in cart discounts until now)
  const couponEntry = items.find(
    (i) => i.itemType === 'other' && i.metadata && i.metadata.couponId,
  );
  if (couponEntry && mongoose.Types.ObjectId.isValid(couponEntry.metadata.couponId)) {
    await Coupon.findByIdAndUpdate(
      couponEntry.metadata.couponId,
      { $inc: { usageCount: 1 } },
      { session },
    );
    const linkedOrder = await Order.findOne({ payment: payment._id }).session(session).lean();
    await CouponUsage.create([{
      coupon: couponEntry.metadata.couponId,
      user: userId,
      order: linkedOrder ? linkedOrder._id : null,
      discountAmount: couponEntry.metadata.discount || 0,
      usedAt: new Date(),
    }], { session });
    logger.info(MODULE, 'Coupon consumed on capture', {
      couponId: couponEntry.metadata.couponId,
      orderId: linkedOrder ? String(linkedOrder._id) : null,
    });
  }

  // 2 — Remove purchased items from the cart (abandoned checkouts keep theirs)
  const purchased = items
    .filter((i) => i.itemId && !['other', 'order'].includes(i.itemType))
    .map((i) => ({ itemType: i.itemType, itemId: String(i.itemId) }));
  if (purchased.length > 0) {
    const cart = await Cart.findOne({ student: userId }).session(session).lean();
    if (cart) {
      const res = await CartItem.deleteMany({
        cart: cart._id,
        $or: purchased.map((p) => ({ itemType: p.itemType, itemId: p.itemId })),
      }).session(session);
      logger.info(MODULE, 'Purchased items cleared from cart', {
        userId: String(userId),
        cleared: res.deletedCount,
      });
    }
  }
}

export default { finalizePurchase };
