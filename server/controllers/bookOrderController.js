import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import Cart from '../models/Cart.js';
import CartItem from '../models/CartItem.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Book from '../models/Book.js';
import Coupon from '../models/Coupon.js';
import CouponUsage from '../models/CouponUsage.js';
import ActivityLog from '../models/ActivityLog.js';
import { PaymentRepository } from '../payment/repository/PaymentRepository.js';
import { OrderService } from '../payment/services/OrderService.js';
import { IdempotencyPlugin } from '../payment/plugins/IdempotencyPlugin.js';
import shippingService from '../services/shippingService.js';
import inventoryService from '../services/inventoryService.js';
import orderStatusService from '../services/orderStatusService.js';
import { BOOK_ORDER_TRANSITIONS } from '../shared/constants/index.js';
import {
  sendOrderPacked,
  sendOrderDispatched,
  sendOrderDelivered,
  sendOrderCancelled,
} from '../services/bookEmailService.js';

const DAY = 86400000;

// ─────────────────────────────────────────────────────────────
// bookOrderController — book checkout, tracking, admin orders.
// Prices, quantities, shipping and totals are ALWAYS recomputed
// server-side. Reservation happens atomically at checkout and is
// released on failure/expiry/cancellation.
// ─────────────────────────────────────────────────────────────

function validateAddress(address) {
  if (!address || typeof address !== 'object') throw ApiError.badRequest('Shipping address is required');
  const clean = {
    fullName: String(address.fullName || '').trim(),
    phone: String(address.phone || '').trim(),
    email: String(address.email || '').trim().toLowerCase(),
    line1: String(address.line1 || '').trim(),
    line2: String(address.line2 || '').trim(),
    city: String(address.city || '').trim(),
    state: String(address.state || '').trim(),
    pincode: String(address.pincode || '').trim(),
    country: String(address.country || 'India').trim(),
  };
  if (!clean.fullName) throw ApiError.badRequest('Full name is required');
  if (!/^[6-9]\d{9}$/.test(clean.phone.replace(/\s+/g, ''))) throw ApiError.badRequest('Enter a valid 10-digit mobile number');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) throw ApiError.badRequest('Enter a valid email address');
  if (!clean.line1 || !clean.city || !clean.state) throw ApiError.badRequest('Complete address is required (line 1, city, state)');
  if (!/^\d{6}$/.test(clean.pincode)) throw ApiError.badRequest('Enter a valid 6-digit PIN code');
  return clean;
}

async function loadBookCartItems(userId) {
  const cart = await Cart.findOne({ student: userId });
  if (!cart) return [];
  return CartItem.find({ cart: cart._id }).lean();
}

/* ── POST /api/student/books/validate-cart ──
   Re-checks price, quantity and stock for every book in the cart
   and returns a server-authoritative summary. */
export const validateBookCart = asyncHandler(async (req, res) => {
  const items = await loadBookCartItems(req.user._id);
  const bookItems = items.filter((i) => i.itemType === 'book');
  if (bookItems.length === 0) throw ApiError.badRequest('Your cart has no books');

  const lines = [];
  let subtotal = 0;
  for (const item of bookItems) {
    const book = await Book.findById(item.itemId).lean();
    if (!book || book.status !== 'published') throw ApiError.badRequest(`${item.name} is no longer available`);
    if (book.trackInventory) {
      const available = book.stock;
      if (available < item.quantity) throw ApiError.badRequest(`Only ${Math.max(0, available)} copy(-ies) of "${book.title}" available`);
    }
    const price = book.price;
    const discount = Math.min(item.discount, Math.max(0, price - item.finalPrice));
    const finalPrice = Math.max(0, price - discount);
    subtotal += finalPrice * item.quantity;
    lines.push({
      cartItemId: item._id,
      bookId: book._id,
      title: book.title,
      slug: book.slug,
      sku: book.sku,
      image: book.coverImage || '',
      quantity: item.quantity,
      price,
      discount,
      finalPrice,
    });
  }

  res.json({ lines, subtotal: Math.round(subtotal * 100) / 100, itemCount: bookItems.length });
});

/* ── POST /api/student/books/checkout ──
   Creates a payment_pending book order: reserves inventory, creates
   the Razorpay order + pending Payment, snapshots shipping details. */
export const checkoutBooks = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const idempotencyKey = req.body?.idempotencyKey;
  const address = validateAddress(req.body?.address);
  const now = new Date();

  const paymentRepo = new PaymentRepository();
  const orderService = new OrderService();
  const idempotencyPlugin = new IdempotencyPlugin();

  if (idempotencyKey) {
    const existing = await Order.findOne({ student: userId, transactionId: idempotencyKey, kind: 'book' }).lean();
    if (existing) {
      const orderItems = await OrderItem.find({ order: existing._id }).lean();
      return res.status(200).json({
        success: true, msg: 'Checkout already completed', requiresPayment: true,
        order: { _id: existing._id, orderNumber: existing.orderNumber, total: existing.total, status: existing.status },
        items: orderItems,
      });
    }
  }

  const items = await loadBookCartItems(userId);
  const bookItems = items.filter((i) => i.itemType === 'book');
  if (bookItems.length === 0) throw ApiError.badRequest('Your cart has no books');
  if (items.some((i) => i.itemType !== 'book')) {
    throw ApiError.badRequest('Books must be checked out separately from other items. Please remove non-book items from the cart first.');
  }

  // ── Server-authoritative line pricing ──
  const lines = [];
  const uniqueBooks = new Map();
  for (const item of bookItems) {
    const book = await Book.findById(item.itemId).lean();
    if (!book || book.status !== 'published') throw ApiError.badRequest(`${item.name} is no longer available`);

    if (book.trackInventory && !book.allowBackorder) {
      const available = book.stock;
      if (available < item.quantity) {
        throw ApiError.badRequest(`Only ${Math.max(0, available)} copy(-ies) of "${book.title}" available right now`);
      }
    }

    const price = book.price;
    const discount = Math.min(item.discount, Math.max(0, price - item.finalPrice));
    const finalPrice = Math.round(Math.max(0, price - discount) * 100) / 100;

    lines.push({ item, book, price, discount, finalPrice });
    uniqueBooks.set(String(book._id), (uniqueBooks.get(String(book._id)) || 0) + item.quantity);
  }

  const bookSubtotal = Math.round(lines.reduce((s, l) => s + l.finalPrice * l.item.quantity, 0) * 100) / 100;
  const coupon = lines.find((l) => l.item.coupon);
  let couponId = null;
  let couponCode = '';
  let couponDiscount = lines.reduce((s, l) => s + l.discount * l.item.quantity, 0);
  couponDiscount = Math.round(couponDiscount * 100) / 100;
  if (coupon) {
    const c = await Coupon.findById(coupon.item.coupon).lean();
    if (c) {
      couponId = c._id;
      couponCode = c.code;
    }
  }

  // ── Shipping decision for the destination ──
  const shipping = await shippingService.calculateShipping(bookSubtotal, {
    pincode: address.pincode,
    state: address.state,
    country: address.country,
  });
  if (!shipping.available) throw ApiError.badRequest(shipping.reason || 'Delivery is not available for this PIN code');

  const total = Math.round((bookSubtotal + shipping.shippingCharge) * 100) / 100;
  if (total <= 0) throw ApiError.badRequest('Order total must be at least KES 1 — please adjust your coupon and try again');

  // ── Reserve inventory atomically ──
  const reservations = [];
  try {
    for (const [bookId, qty] of uniqueBooks) {
      const result = await inventoryService.reserveStock({ bookId, quantity: qty });
      reservations.push(result);
    }
  } catch (err) {
    // Roll back partial reservations immediately.
    for (const r of reservations) {
      if (r?.released === false) {
        try { await inventoryService.releaseStock({ bookId: r.bookId, quantity: r.quantity }); } catch {}
      }
    }
    throw err;
  }

  const initiateCheckout = async () => {
    const receipt = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const razorpayOrder = await orderService.createRazorpayOrder(Math.round(total * 100), receipt);

    const paymentItems = lines.map((l) => ({
      itemType: 'book',
      itemId: l.book._id,
      name: l.book.title,
      quantity: l.item.quantity,
      unitPrice: Math.round(l.finalPrice * 100),
      totalPrice: Math.round(l.finalPrice * l.item.quantity * 100),
      metadata: {
        sku: l.book.sku,
        authors: l.book.authors,
        image: l.book.coverImage || '',
        originalPrice: l.price,
        discount: l.discount,
        couponId: l.item.coupon ? String(l.item.coupon) : undefined,
      },
    }));

    if (shipping.shippingCharge > 0) {
      paymentItems.push({
        itemType: 'other',
        itemId: null,
        name: `Shipping: ${address.pincode}`,
        quantity: 1,
        unitPrice: Math.round(shipping.shippingCharge * 100),
        totalPrice: Math.round(shipping.shippingCharge * 100),
        metadata: { shippingType: shipping.shippingType, pincode: address.pincode, deliveryMinDays: shipping.deliveryMinDays, deliveryMaxDays: shipping.deliveryMaxDays },
      });
    }

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

    const payment = await paymentRepo.create({
      user: userId,
      label: `Book order ${lines.map((l) => l.book.title).join(', ')}`,
      description: `Book checkout – ${lines.length} title(s), ${bookItems.length} item(s), coupon: ${couponCode || 'none'}, pincode: ${address.pincode}`,
      items: paymentItems,
      amount: Math.round(total * 100),
      currency: 'KES',
      gateway: 'razorpay',
      razorpayOrderId: razorpayOrder.id,
      paymentStatus: 'pending',
      pendingAt: now,
      idempotencyKey: idempotencyKey || undefined,
      initiatedAt: now,
      auditTrail: [{
        action: 'book_checkout_initiate',
        from: 'initiated',
        to: 'pending',
        by: userId,
        timestamp: now,
      }],
      attempts: [{
        attempt: 1,
        action: 'book_checkout',
        gatewayResponse: { razorpayOrderId: razorpayOrder.id, amount: razorpayOrder.amount },
        timestamp: now,
      }],
    });

    const order = await Order.create({
      student: userId,
      kind: 'book',
      subtotal: bookSubtotal,
      discount: couponDiscount,
      tax: 0,
      shippingCharge: shipping.shippingCharge,
      shippingType: shipping.shippingType,
      estimatedDelivery: { minDays: shipping.deliveryMinDays, maxDays: shipping.deliveryMaxDays },
      total,
      coupon: couponId,
      couponCode,
      couponDiscount,
      status: 'payment_pending',
      paymentMethod: 'Razorpay',
      transactionId: idempotencyKey || payment._id.toString(),
      payment: payment._id,
      itemCount: bookItems.length,
      customer: {
        name: address.fullName,
        fullName: address.fullName,
        email: address.email,
        phone: address.phone.replace(/\s+/g, ''),
      },
      shippingAddress: address,
      inventoryReservedAt: now,
      timeline: [{
        status: 'payment_pending',
        note: `Order placed — awaiting payment (KES ${total.toLocaleString('en-KE')})`,
        by: 'system',
        at: now,
      }],
    });

    for (const l of lines) {
      await OrderItem.create({
        order: order._id,
        itemType: 'book',
        itemId: l.book._id,
        name: l.book.title,
        image: l.book.coverImage || '',
        price: l.price,
        discount: l.discount,
        finalPrice: l.finalPrice,
        quantity: l.item.quantity,
        coupon: l.item.coupon,
        metadata: { sku: l.book.sku, authors: l.book.authors },
      });
    }

    await paymentRepo.addOrderLink(payment._id, order._id, {
      itemType: 'order',
      itemId: order._id,
      name: `Order #${order.orderNumber}`,
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      metadata: { orderNumber: order.orderNumber, kind: 'book' },
    });
    await paymentRepo.addAuditEntry(payment._id, {
      action: 'book_order_created',
      from: 'pending',
      to: 'pending',
      by: userId,
      metadata: { orderId: String(order._id), orderNumber: order.orderNumber },
    });

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

    await CartItem.deleteMany({ cart: items[0].cart, itemType: 'book' });

    return { payment, order, razorpayOrder };
  };

  let result;
  try {
    if (idempotencyKey) {
      result = await idempotencyPlugin.executeWithIdempotency(idempotencyKey, 300, initiateCheckout);
    } else {
      result = await initiateCheckout();
    }
  } catch (err) {
    // Release the reservation — the customer never completed checkout.
    for (const r of reservations) {
      try { await inventoryService.releaseStock({ bookId: r.bookId, quantity: r.quantity }); } catch {}
    }
    throw err;
  }

  const { payment, order, razorpayOrder } = result;

  res.status(201).json({
    success: true,
    msg: 'Book order initiated. Complete payment to confirm.',
    order: {
      _id: order._id,
      orderNumber: order.orderNumber,
      total,
      itemCount: bookItems.length,
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
    shipping: {
      charge: shipping.shippingCharge,
      type: shipping.shippingType,
      estimatedDelivery: { minDays: shipping.deliveryMinDays, maxDays: shipping.deliveryMaxDays },
    },
    requiresPayment: true,
  });
});

/* ── GET /api/public/order-tracking/:orderNumber ──
   Public tracking — requires the order number AND the customer
   email so no PII leaks via guessable numbers. */
export const trackOrder = asyncHandler(async (req, res) => {
  const { orderNumber } = req.params;
  const { email } = req.query;
  if (!orderNumber || !email) throw ApiError.badRequest('Order number and email are required');

  const order = await Order.findOne({ orderNumber: String(orderNumber).toUpperCase(), kind: 'book' }).lean();
  if (!order) throw ApiError.notFound('Order not found');
  if (!order.customer || order.customer.email?.toLowerCase() !== String(email).trim().toLowerCase()) {
    throw ApiError.notFound('Order not found');
  }

  const items = await OrderItem.find({ order: order._id }).select('name image quantity price finalPrice').lean();

  res.set('Cache-Control', 'no-store');
  res.json({
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      subtotal: order.subtotal,
      shippingCharge: order.shippingCharge,
      discount: order.discount,
      timeline: order.timeline || [],
      estimatedDelivery: order.estimatedDelivery,
      dispatchDate: order.dispatchDate,
      expectedDelivery: order.expectedDelivery,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      cancellationReason: order.cancellationReason,
      courier: order.courier,
      trackingNumber: order.trackingNumber,
    },
    items,
  });
});

/* ── GET /api/student/books/orders ── (customer order history) */
export const myBookOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ student: req.user._id, kind: 'book' })
    .select('orderNumber status total shippingCharge estimatedDelivery timeline createdAt dispatchDate deliveredAt courier trackingNumber')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ orders });
});

// ─────────────────────────────── ADMIN ───────────────────────────────

/* ── GET /api/admin/orders/books ── */
export const adminListBookOrders = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const skip = (Math.max(1, parseInt(page)) - 1) * Math.max(1, parseInt(limit));

  const filter = { kind: 'book' };
  if (status) filter.status = status;
  if (search) {
    const esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(esc, 'i');
    filter.$or = [
      { orderNumber: regex },
      { 'customer.fullName': regex },
      { 'customer.email': regex },
      { 'customer.phone': regex },
      { 'shippingAddress.pincode': regex },
    ];
  }

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Math.max(1, parseInt(limit))).lean(),
    Order.countDocuments(filter),
  ]);

  res.json({ orders, total, page: Math.max(1, parseInt(page)), pages: Math.ceil(total / Math.max(1, parseInt(limit))) });
});

/* ── GET /api/admin/orders/books/:id ── */
export const adminGetBookOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).lean();
  if (!order || order.kind !== 'book') throw ApiError.notFound('Book order not found');
  const items = await OrderItem.find({ order: order._id }).lean();
  res.json({ order, items });
});

/* ── PATCH /api/admin/orders/books/:id/status ──
   Controlled transitions only (orderStatusService). */
export const adminSetBookOrderStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order || order.kind !== 'book') throw ApiError.notFound('Book order not found');

  const transition = orderStatusService.assertCanTransition(order.status, status);
  if (transition.requiresReason && !String(reason || '').trim()) {
    throw ApiError.badRequest('A reason is required for this transition');
  }

  const now = new Date();
  const patch = { status };
  const sideEffects = [];

  if (status === 'dispatched') {
    if (!order.courier || !order.trackingNumber) {
      throw ApiError.badRequest('Set courier and tracking number first (dispatch action)');
    }
    patch.dispatchDate = order.dispatchDate || now;
    const maxDays = order.estimatedDelivery?.maxDays || 5;
    patch.expectedDelivery = new Date(now.getTime() + maxDays * DAY);
  }
  if (status === 'delivered') patch.deliveredAt = now;
  if (status === 'cancelled') {
    if (reason) patch.cancellationReason = reason;
    patch.cancelledAt = now;
    if (order.status === 'payment_pending') {
      sideEffects.push(inventoryService.releaseOrderReservations(order._id, { by: 'admin', note: `Cancelled by admin: ${reason || 'no reason given'}` }));
    } else if (['payment_confirmed', 'packed', 'dispatched'].includes(order.status)) {
      const items = await OrderItem.find({ order: order._id, itemType: 'book' }).lean();
      for (const oi of items) {
        sideEffects.push(inventoryService.restoreStock({ bookId: oi.itemId, quantity: oi.quantity || 1 }));
      }
    }
  }
  if (status === 'on_hold') {
    if (!reason) throw ApiError.badRequest('A reason is required to hold an order');
    patch.internalNotes = [...(order.internalNotes || []), `[Hold] ${reason} (${req.user.name || req.user.email})`];
  }

  Object.assign(order, patch);
  order.timeline = [...(order.timeline || []), {
    status,
    note: reason || transition.label,
    by: req.user.email || 'admin',
    at: now,
  }];
  await order.save();

  await Promise.all(sideEffects);

  await ActivityLog.create({
    action: 'book_order_status_changed',
    performedBy: req.user._id,
    meta: { orderId: order._id, orderNumber: order.orderNumber, from: transition.from, to: status, reason },
  });

  // Notifications (deduplicated, failures never roll back).
  const notifyMap = {
    packed: sendOrderPacked,
    dispatched: sendOrderDispatched,
    delivered: sendOrderDelivered,
    cancelled: sendOrderCancelled,
  };
  if (notifyMap[status]) notifyMap[status](order._id).catch(() => {});

  res.json({ success: true, order, availableTransitions: orderStatusService.getNextStatuses(status) });
});

/* ── PATCH /api/admin/orders/books/:id/dispatch ── (courier + AWB) */
export const adminDispatchBookOrder = asyncHandler(async (req, res) => {
  const { courier, trackingNumber } = req.body || {};
  if (!courier || !String(courier).trim()) throw ApiError.badRequest('Courier name is required');
  if (!trackingNumber || !String(trackingNumber).trim()) throw ApiError.badRequest('Tracking number is required');

  const order = await Order.findById(req.params.id);
  if (!order || order.kind !== 'book') throw ApiError.notFound('Book order not found');
  if (!['payment_confirmed', 'packed', 'dispatched'].includes(order.status)) {
    throw ApiError.badRequest(`Dispatch details can only be set for confirmed orders (current: ${order.status})`);
  }

  const now = new Date();
  order.courier = String(courier).trim();
  order.trackingNumber = String(trackingNumber).trim();
  order.dispatchDate = order.dispatchDate || now;
  const maxDays = order.estimatedDelivery?.maxDays || 5;
  order.expectedDelivery = new Date(now.getTime() + maxDays * DAY);
  order.timeline = [...(order.timeline || []), {
    status: 'dispatch_details_set',
    note: `Courier: ${order.courier}, Tracking: ${order.trackingNumber}`,
    by: req.user.email || 'admin',
    at: now,
  }];
  await order.save();

  await ActivityLog.create({
    action: 'book_order_dispatched',
    performedBy: req.user._id,
    meta: { orderId: order._id, orderNumber: order.orderNumber, courier: order.courier, trackingNumber: order.trackingNumber },
  });

  res.json({ success: true, order });
});

/* ── POST /api/admin/orders/books/:id/notes ── (internal notes) */
export const adminAddBookOrderNote = asyncHandler(async (req, res) => {
  const { note } = req.body;
  if (!note || !String(note).trim()) throw ApiError.badRequest('Note is required');

  const order = await Order.findById(req.params.id);
  if (!order || order.kind !== 'book') throw ApiError.notFound('Book order not found');

  order.internalNotes = [...(order.internalNotes || []), `[${new Date().toISOString()}] ${req.user.email || 'admin'}: ${String(note).trim()}`];
  await order.save();

  await ActivityLog.create({
    action: 'book_order_note_added',
    performedBy: req.user._id,
    meta: { orderId: order._id, orderNumber: order.orderNumber },
  });

  res.json({ success: true, order });
});

export default { validateBookCart, checkoutBooks, trackOrder, myBookOrders, adminListBookOrders, adminGetBookOrder, adminSetBookOrderStatus, adminDispatchBookOrder, adminAddBookOrderNote };