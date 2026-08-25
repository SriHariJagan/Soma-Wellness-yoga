import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import Cart from '../models/Cart.js';
import CartItem from '../models/CartItem.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Coupon from '../models/Coupon.js';
import CouponProduct from '../models/CouponProduct.js';
import CouponUsage from '../models/CouponUsage.js';
import { PaymentRepository } from '../payment/repository/PaymentRepository.js';
import { PaymentService } from '../payment/PaymentService.js';
import { OrderService } from '../payment/services/OrderService.js';
import { IdempotencyPlugin } from '../payment/plugins/IdempotencyPlugin.js';
import Membership from '../models/Membership.js';
import UserService from '../models/UserService.js';
import Workshop from '../models/Workshop.js';
import Consultation from '../models/Consultation.js';
import Plan from '../models/Plan.js';
import Service from '../models/Service.js';
import { CART_ITEM_TYPES } from '../shared/constants/index.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import Book from '../models/Book.js';
import { notify } from '../services/notificationService.js';
import { isSingleSessionService, SINGLE_SESSION_VALIDITY_DAYS } from '../utils/serviceHelpers.js';

const DAY = 86400000;

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ student: userId });
  if (!cart) {
    cart = await Cart.create({ student: userId });
  }
  return cart;
}

/* ── GET /api/student/cart ── */
export const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  const items = await CartItem.find({ cart: cart._id }).lean();
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalDiscount = items.reduce((s, i) => s + i.discount * i.quantity, 0);
  const total = items.reduce((s, i) => s + i.finalPrice, 0);
  const appliedCoupon = items.find((i) => i.coupon);
  let couponCode = '';
  let couponDiscount = 0;
  if (appliedCoupon) {
    const coupon = await Coupon.findById(appliedCoupon.coupon).lean();
    if (coupon) {
      couponCode = coupon.code;
      couponDiscount = totalDiscount;
    }
  }
  res.json({
    cart: { _id: cart._id },
    items,
    summary: {
      subtotal,
      discount: totalDiscount,
      couponCode,
      couponDiscount,
      tax: 0,
      total,
      itemCount: items.length,
    },
  });
});

/* ── GET /api/student/cart/count ── */
export const getCartCount = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ student: req.user._id });
  const count = cart ? await CartItem.countDocuments({ cart: cart._id }) : 0;
  res.json({ count });
});

/* ── POST /api/student/cart/add ── */
export const addToCart = asyncHandler(async (req, res) => {
  const { itemType, itemId } = req.body;
  if (!itemType || !itemId) throw ApiError.badRequest('itemType and itemId are required');

  if (!CART_ITEM_TYPES.includes(itemType)) throw ApiError.badRequest('Invalid item type');

  let itemName = '';
  let itemPrice = 0;
  let itemImage = '';

  switch (itemType) {
    case 'plan': {
      const plan = await Plan.findById(itemId).lean();
      if (!plan) throw ApiError.notFound('Plan not found');
      if (!plan.active || plan.visibility === 'hidden') throw ApiError.badRequest('This plan is not available');
      itemName = plan.name;
      itemPrice = plan.price || 0;
      break;
    }
    case 'service': {
      const service = await Service.findById(itemId).lean();
      if (!service) throw ApiError.notFound('Service not found');
      if (!service.active) throw ApiError.badRequest('This service is not available');
      itemName = service.name;
      itemPrice = service.price || 0;
      itemImage = service.image || '';
      break;
    }
    case 'course': {
      const course = await Course.findById(itemId).lean();
      if (!course) throw ApiError.notFound('Course not found');
      if (!course.active) throw ApiError.badRequest('This course is not available');
      itemName = course.title;
      itemPrice = course.price || 0;
      break;
    }
    case 'workshop': {
      const workshop = await Workshop.findById(itemId).lean();
      if (!workshop) throw ApiError.notFound('Workshop not found');
      if (!workshop.isPublished || workshop.archived) throw ApiError.badRequest('This workshop is not available');
      if (workshop.registrations && workshop.registrations.length >= workshop.capacity) throw ApiError.badRequest('Workshop is full');
      itemName = workshop.name;
      itemPrice = workshop.price || 0;
      itemImage = workshop.image || '';
      break;
    }
    case 'consultation': {
      const settings = await Settings.getSingleton();
      itemName = 'Yoga Consultation';
      itemPrice = settings.consultationFee || 300;
      break;
    }
    case 'yttc': {
      const mode = itemId || 'online';
      if (!['online', 'hybrid'].includes(mode)) throw ApiError.badRequest('Invalid YTTC mode');
      itemName = mode === 'online' ? 'YTTC - Online Mode' : 'YTTC - Hybrid Mode';
      itemPrice = mode === 'online' ? 35000 : 45000;
      break;
    }
    case 'book': {
      const book = await Book.findById(itemId).lean();
      if (!book) throw ApiError.notFound('Book not found');
      if (book.status !== 'published') throw ApiError.badRequest('This book is not available');
      const quantity = Math.max(1, Math.min(99, parseInt(req.body.quantity, 10) || 1));
      if (book.trackInventory && !book.allowBackorder) {
        const available = book.stock;
        if (available < quantity) throw ApiError.badRequest(`Only ${Math.max(0, available)} copy(-ies) of "${book.title}" available`);
      }
      itemName = book.title;
      itemPrice = book.price || 0;
      itemImage = book.coverImage || '';
      break;
    }
    default:
      throw ApiError.badRequest('Invalid item type');
  }

  const cart = await getOrCreateCart(req.user._id);

  const existing = await CartItem.findOne({ cart: cart._id, itemType, itemId });
  const cartCount = await CartItem.countDocuments({ cart: cart._id });

  if (existing) {
    if (itemType === 'book') {
      const quantity = Math.max(1, Math.min(99, parseInt(req.body.quantity, 10) || 1));
      const updated = await CartItem.findByIdAndUpdate(
        existing._id,
        { $inc: { quantity }, finalPrice: (existing.price - existing.discount) * (existing.quantity + quantity) },
        { new: true }
      );
      return res.json({ success: true, msg: 'Quantity updated in cart', item: updated, alreadyInCart: true, cartCount });
    }
    return res.json({ success: true, msg: 'Already in cart', item: existing, alreadyInCart: true, cartCount });
  }

  const quantity = itemType === 'book' ? Math.max(1, Math.min(99, parseInt(req.body.quantity, 10) || 1)) : 1;

  const item = await CartItem.create({
    cart: cart._id,
    itemType,
    itemId,
    name: itemName,
    image: itemImage,
    price: itemPrice,
    discount: 0,
    finalPrice: itemPrice,
    quantity,
  });

  const newCartCount = cartCount + 1;
  res.status(201).json({ success: true, msg: 'Added to cart', item, cartCount: newCartCount });
});

/* ── POST /api/student/cart/update ── (quantity for books) */
export const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId, quantity } = req.body;
  if (!itemId) throw ApiError.badRequest('itemId is required');
  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw ApiError.badRequest('Quantity must be between 1 and 99');

  const cart = await Cart.findOne({ student: req.user._id });
  if (!cart) throw ApiError.notFound('Cart not found');

  const item = await CartItem.findOne({ _id: itemId, cart: cart._id });
  if (!item) throw ApiError.notFound('Item not found in cart');

  if (item.itemType === 'book') {
    const book = await Book.findById(item.itemId).lean();
    if (book && book.trackInventory && !book.allowBackorder) {
      const available = book.stock;
      if (available < qty) throw ApiError.badRequest(`Only ${Math.max(0, available)} copy(-ies) of "${book.title}" available`);
    }
  }

  const basePrice = item.price - item.discount;
  item.quantity = qty;
  item.finalPrice = Math.round(basePrice * qty * 100) / 100;
  await item.save();

  const items = await CartItem.find({ cart: cart._id }).lean();
  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const totalDiscount = items.reduce((s, i) => s + i.discount, 0);
  const total = items.reduce((s, i) => s + i.finalPrice, 0);

  res.json({
    success: true,
    msg: 'Quantity updated',
    item,
    summary: { subtotal, discount: totalDiscount, tax: 0, total, itemCount: items.length },
  });
});

/* ── DELETE /api/student/cart/item/:id ── */
export const removeFromCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ student: req.user._id });
  if (!cart) throw ApiError.notFound('Cart not found');
  const item = await CartItem.findOneAndDelete({ _id: req.params.id, cart: cart._id });
  if (!item) throw ApiError.notFound('Item not found in cart');
  const cartCount = await CartItem.countDocuments({ cart: cart._id });
  res.json({ success: true, msg: 'Removed from cart', cartCount });
});

/* ── POST /api/student/cart/apply-coupon ── */
export const applyCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) throw ApiError.badRequest('Coupon code is required');

  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
  if (!coupon) throw ApiError.notFound('Coupon not found');
  if (!coupon.active) throw ApiError.badRequest('This coupon is no longer active');
  if (coupon.expiryDate && new Date() > coupon.expiryDate) throw ApiError.badRequest('Coupon expired');
  if (coupon.startDate && new Date() < coupon.startDate) throw ApiError.badRequest('Coupon is not yet valid');
  if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) throw ApiError.badRequest('Coupon usage limit reached');
  if (coupon.usagePerUser > 0) {
    const userUsage = await CouponUsage.countDocuments({ coupon: coupon._id, user: req.user._id });
    if (userUsage >= coupon.usagePerUser) throw ApiError.badRequest('You have already used this coupon the maximum number of times');
  }

  const cart = await getOrCreateCart(req.user._id);
  let items = await CartItem.find({ cart: cart._id }).lean();

  if (items.length === 0) throw ApiError.badRequest('Cart is empty');

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  if (coupon.minPurchase > 0 && subtotal < coupon.minPurchase) {
    throw ApiError.badRequest(`Minimum purchase amount of ₹${coupon.minPurchase} required`);
  }

  let applicableItemIds = [];
  let applicableSubtotal = 0;

  if (coupon.applicableTo === 'specific') {
    const cp = await CouponProduct.find({ coupon: coupon._id }).lean();
    for (const item of items) {
      const match = cp.find((p) => p.productType === item.itemType && (!p.productId || p.productId.toString() === item.itemId.toString()));
      if (match) {
        applicableItemIds.push(item._id);
        applicableSubtotal += item.price * item.quantity;
      }
    }
    if (applicableItemIds.length === 0) throw ApiError.badRequest('Coupon does not apply to any items in your cart');
  } else {
    applicableSubtotal = subtotal;
    applicableItemIds = items.map((i) => i._id);
  }

  let discountAmount = 0;
  if (coupon.discountType === 'Percentage') {
    discountAmount = Math.round(applicableSubtotal * (coupon.discountValue / 100) * 100) / 100;
    if (coupon.maxDiscount > 0 && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }
  } else {
    discountAmount = coupon.discountValue;
  }

  if (discountAmount > applicableSubtotal) discountAmount = applicableSubtotal;

  // Per-unit discount (applied per copy for quantity items like books).
  const perUnitDiscount = discountAmount / items
    .filter((i) => applicableItemIds.some((id) => id.toString() === i._id.toString()))
    .reduce((s, i) => s + i.quantity, 0);

  for (const itemId of applicableItemIds) {
    const item = items.find((i) => i._id.toString() === itemId.toString());
    if (item) {
      const unitDiscount = Math.round(perUnitDiscount * 100) / 100;
      await CartItem.findByIdAndUpdate(itemId, {
        discount: unitDiscount,
        finalPrice: Math.round(Math.max(0, item.price - unitDiscount) * item.quantity * 100) / 100,
        coupon: coupon._id,
      });
    }
  }

  const updatedItems = await CartItem.find({ cart: cart._id }).lean();
  const newTotal = updatedItems.reduce((s, i) => s + i.finalPrice, 0);
  const newDiscount = updatedItems.reduce((s, i) => s + i.discount, 0);

  res.json({
    success: true,
    msg: `Coupon ${coupon.code} applied`,
    coupon: { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue },
    discount: newDiscount,
    total: newTotal,
  });
});

/* ── POST /api/student/cart/remove-coupon ── */
export const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ student: req.user._id });
  if (!cart) throw ApiError.notFound('Cart not found');

  const items = await CartItem.find({ cart: cart._id, coupon: { $ne: null } }).lean();
  for (const item of items) {
    await CartItem.findByIdAndUpdate(item._id, { discount: 0, finalPrice: Math.round(item.price * item.quantity * 100) / 100, coupon: null });
  }

  const updatedItems = await CartItem.find({ cart: cart._id }).lean();
  const subtotal = updatedItems.reduce((s, i) => s + i.price, 0);
  const totalDiscount = updatedItems.reduce((s, i) => s + i.discount, 0);
  const total = updatedItems.reduce((s, i) => s + i.finalPrice, 0);

  res.json({
    success: true,
    msg: 'Coupon removed',
    summary: { subtotal, discount: totalDiscount, tax: 0, total, itemCount: updatedItems.length },
  });
});

/* ── POST /api/student/cart/checkout ── */
export const checkout = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const idempotencyKey = req.body?.idempotencyKey;

  const paymentRepo = new PaymentRepository();
  const orderService = new OrderService();
  const idempotencyPlugin = new IdempotencyPlugin();

  /* Idempotency: if same key was used before, return existing order */
  if (idempotencyKey) {
    const existing = await Order.findOne({ student: userId, transactionId: idempotencyKey }).lean();
    if (existing) {
      const orderItems = await OrderItem.find({ order: existing._id }).lean();
      return res.status(200).json({
        success: true, msg: 'Checkout already completed', order: { _id: existing._id, orderNumber: existing.orderNumber, total: existing.total, itemCount: existing.itemCount }, items: orderItems,
      });
    }
  }

  const cart = await Cart.findOne({ student: userId });

  if (!cart) throw ApiError.badRequest('Cart is empty');
  const items = await CartItem.find({ cart: cart._id }).lean();
  if (items.length === 0) throw ApiError.badRequest('Cart is empty');

  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const totalDiscount = items.reduce((s, i) => s + i.discount, 0);
  const total = items.reduce((s, i) => s + i.finalPrice, 0);

  const appliedCoupon = items.find((i) => i.coupon);
  let couponId = null;
  let couponCode = '';
  let couponDiscount = 0;

  if (appliedCoupon) {
    const coupon = await Coupon.findById(appliedCoupon.coupon);
    if (coupon) {
      couponId = coupon._id;
      couponCode = coupon.code;
      couponDiscount = totalDiscount;
    }
  }

  /* ── Validate all items are still purchasable ── */
  for (const item of items) {
    switch (item.itemType) {
      case 'plan': {
        const plan = await Plan.findById(item.itemId).lean();
        if (!plan || !plan.active || plan.visibility === 'hidden') throw ApiError.badRequest(`${item.name} is no longer available`);
        const existing = await Membership.findOne({ user: userId, plan: item.itemId, status: 'active', expiryDate: { $gt: new Date() } });
        if (existing) throw ApiError.badRequest(`You already have an active ${item.name} membership`);
        break;
      }
      case 'service': {
        const service = await Service.findById(item.itemId).lean();
        if (!service || !service.active) throw ApiError.badRequest(`${item.name} is no longer available`);
        const enrolledActive = await UserService.findOne({ user: userId, service: item.itemId, status: 'active' });
        if (enrolledActive) throw ApiError.badRequest(`You already have an active enrollment for ${item.name}`);
        break;
      }
      case 'course': {
        const course = await Course.findById(item.itemId).lean();
        if (!course || !course.active) throw ApiError.badRequest(`${item.name} is no longer available`);
        break;
      }
      case 'workshop': {
        const workshop = await Workshop.findById(item.itemId).lean();
        if (!workshop || !workshop.isPublished || workshop.archived) throw ApiError.badRequest(`${item.name} is no longer available`);
        if (workshop.registrations && workshop.registrations.length >= workshop.capacity) throw ApiError.badRequest(`${item.name} is full`);
        if (workshop.registrations.some((r) => r.user && r.user.toString() === userId.toString())) throw ApiError.badRequest(`You are already registered for ${item.name}`);
        break;
      }
      case 'consultation': {
        break;
      }
      case 'yttc': {
        const mode = item.itemId || 'online';
        if (!['online', 'hybrid'].includes(mode)) throw ApiError.badRequest(`Invalid YTTC mode`);
        const yttcUser = await User.findById(userId).select('yttcEnrollment').lean();
        if (yttcUser?.yttcEnrollment?.isEnrolled) throw ApiError.badRequest('You are already enrolled in YTTC');
        break;
      }
      case 'book': {
        throw ApiError.badRequest('Books are checked out separately (they need a shipping address). Please remove books from the cart and use the book checkout.');
      }
    }
    await CartItem.findByIdAndUpdate(item._id, { name: item.name || 'Service' });
  }

  const now = new Date();

  if (total > 0) {
    /* ── PAID FLOW: Create Razorpay order + pending payment (no activation yet) ── */
    // Convert cart itemTypes to payment service itemTypes
    const paymentItems = items.map((item) => ({
      itemType: item.itemType === 'plan' ? 'membership' : item.itemType,
      itemId: item.itemId,
      name: item.name,
      quantity: 1,
      unitPrice: Math.round(item.finalPrice * 100),
      totalPrice: Math.round(item.finalPrice * 100),
      metadata: {
        originalPrice: item.price,
        discount: item.discount,
        couponId: item.coupon ? String(item.coupon) : undefined,
        image: item.image || '',
      },
    }));

    // Attach coupon metadata at the payment level
    if (couponCode) {
      paymentItems.push({
        itemType: 'other',
        itemId: null,
        name: `Coupon: ${couponCode}`,
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        metadata: { couponId: couponId ? String(couponId) : undefined, couponCode, discount: couponDiscount },
      });
    }

    // Use idempotency plugin to prevent duplicate checkout
    const initiateCheckout = async () => {
      // Create Razorpay order with the cart-calculated total (includes coupon discounts)
      const receipt = `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const razorpayOrder = await orderService.createRazorpayOrder(Math.round(total * 100), receipt);

      // Create Payment in pending status — NOT paid yet. Fulfillment happens after verify.
      const payment = await paymentRepo.create({
        user: userId,
        label: `Order ${items.map((i) => i.name).join(', ')}`,
        description: `Cart checkout – ${items.length} item(s), coupon: ${couponCode || 'none'}`,
        items: paymentItems,
        amount: Math.round(total * 100),
        currency: 'INR',
        gateway: 'razorpay',
        razorpayOrderId: razorpayOrder.id,
        paymentStatus: 'pending',
        pendingAt: now,
        idempotencyKey: idempotencyKey || undefined,
        initiatedAt: now,
        auditTrail: [{
          action: 'checkout_initiate',
          from: 'initiated',
          to: 'pending',
          by: userId,
          timestamp: now,
        }],
        attempts: [{
          attempt: 1,
          action: 'checkout',
          gatewayResponse: { razorpayOrderId: razorpayOrder.id, amount: razorpayOrder.amount },
          timestamp: now,
        }],
      });

      // Create pending Order — completed only after PaymentService.verify()
      const order = await Order.create({
        student: userId,
        subtotal,
        discount: totalDiscount,
        tax: 0,
        total,
        coupon: couponId,
        couponCode,
        couponDiscount,
        status: 'pending',
        paymentMethod: 'Razorpay',
        transactionId: idempotencyKey || payment._id.toString(),
        payment: payment._id,
        itemCount: items.length,
      });

      // Record order items (no activation — stored for fulfillment after payment)
      for (const item of items) {
        await OrderItem.create({
          order: order._id,
          itemType: item.itemType,
          itemId: item.itemId,
          name: item.name,
          image: item.image || '',
          price: item.price,
          discount: item.discount,
          finalPrice: item.finalPrice,
          coupon: item.coupon,
        });
      }

      // Link the order to the payment and add order fulfillment item
      // The order item will be processed by FulfillmentService during verify-payment,
      // which sets order.status = 'completed'
      await paymentRepo.addOrderLink(payment._id, order._id, {
        itemType: 'order',
        itemId: order._id,
        name: `Order #${order.orderNumber}`,
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        metadata: { orderNumber: order.orderNumber },
      });
      await paymentRepo.addAuditEntry(payment._id, {
        action: 'order_created',
        from: 'pending',
        to: 'pending',
        by: userId,
        metadata: { orderId: String(order._id), orderNumber: order.orderNumber },
      });

      // Update coupon usage (reserve the coupon)
      if (couponId) {
        await Coupon.findByIdAndUpdate(couponId, { $inc: { usageCount: 1 } });
        await CouponUsage.create({
          coupon: couponId,
          user: userId,
          order: order._id,
          discountAmount: couponDiscount,
          usedAt: now,
        });
      }

      // Clear the cart
      await CartItem.deleteMany({ cart: cart._id });

      return { payment, order, razorpayOrder };
    };

    let result;
    if (idempotencyKey) {
      result = await idempotencyPlugin.executeWithIdempotency(idempotencyKey, 300, initiateCheckout);
    } else {
      result = await initiateCheckout();
    }

    const { payment, order, razorpayOrder } = result;

    // Notify that order is pending payment
    try {
      await notify(userId, {
        title: 'Order initiated',
        message: `Your order <strong>#${order.orderNumber}</strong> of ₹${total.toLocaleString('en-IN')} has been initiated. Complete the payment to activate your items.`,
        type: 'general',
      });
    } catch {}

    res.status(201).json({
      success: true,
      msg: 'Checkout initiated. Complete payment to activate items.',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total,
        itemCount: items.length,
        status: order.status,
      },
      payment: {
        _id: payment._id,
        amount: payment.amount,
        status: payment.paymentStatus,
        method: payment.gateway,
      },
      razorpay: {
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
      requiresPayment: true,
    });
  } else {
    /* ── FREE FLOW (total === 0): Activate via PaymentService.initiateFree() ── */
    const paymentService = new PaymentService();

    const paymentItems = items.map((item) => ({
      itemType: item.itemType === 'plan' ? 'membership' : item.itemType,
      itemId: item.itemId,
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      metadata: { name: item.name, originalPrice: item.price, image: item.image || '' },
    }));

    const payment = await paymentService.initiateFree({
      user: userId,
      items: paymentItems,
      label: `Order ${items.map((i) => i.name).join(', ')}`,
      description: 'Free items – activated via initiateFree',
      idempotencyKey,
    });

    const order = await Order.create({
      student: userId,
      subtotal,
      discount: totalDiscount,
      tax: 0,
      total: 0,
      coupon: couponId,
      couponCode,
      couponDiscount,
      status: 'completed',
      paymentMethod: 'Free',
      transactionId: idempotencyKey || payment._id.toString(),
      payment: payment._id,
      itemCount: items.length,
    });

    for (const item of items) {
      await OrderItem.create({
        order: order._id,
        itemType: item.itemType,
        itemId: item.itemId,
        name: item.name,
        image: item.image || '',
        price: item.price,
        discount: item.discount,
        finalPrice: item.finalPrice,
        coupon: item.coupon,
      });
    }

    if (couponId) {
      await Coupon.findByIdAndUpdate(couponId, { $inc: { usageCount: 1 } });
      await CouponUsage.create({
        coupon: couponId,
        user: userId,
        order: order._id,
        discountAmount: couponDiscount,
        usedAt: now,
      });
    }

    await CartItem.deleteMany({ cart: cart._id });

    for (const item of items) {
      try {
        await notify(userId, {
          title: 'Enrollment successful',
          message: `You have successfully enrolled in <strong>${item.name}</strong>.`,
          type: 'general',
        });
      } catch {}
    }

    res.status(201).json({
      success: true,
      msg: 'Free items activated successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: 0,
        itemCount: items.length,
        status: order.status,
      },
      payment: {
        _id: payment._id,
        amount: 0,
        status: payment.paymentStatus,
      },
      requiresPayment: false,
    });
  }
});
