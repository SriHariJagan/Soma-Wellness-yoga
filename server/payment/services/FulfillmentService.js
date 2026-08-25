import mongoose from 'mongoose';
import Membership from '../../models/Membership.js';
import UserService from '../../models/UserService.js';
import Service from '../../models/Service.js';
import Workshop from '../../models/Workshop.js';
import Consultation from '../../models/Consultation.js';
import Course from '../../models/Course.js';
import Booking from '../../models/Booking.js';
import Order from '../../models/Order.js';
import OrderItem from '../../models/OrderItem.js';
import Book from '../../models/Book.js';
import Plan from '../../models/Plan.js';
import User from '../../models/User.js';
import { notify } from '../../services/notificationService.js';
import logger from '../../notification/logger.js';

const MODULE = 'FulfillmentService';

export class FulfillmentService {
  async activateItem(item, paymentId, userId, session) {
    const { itemType, itemId, metadata } = item;

    switch (itemType) {
      case 'membership':
      case 'plan':
        return this._activateMembership(item, paymentId, userId, session);
      case 'service':
        return this._activateService(item, paymentId, userId, session);
      case 'workshop':
        return this._registerWorkshop(item, paymentId, userId, session);
      case 'consultation':
        return this._payConsultation(item, paymentId, session);
      case 'course':
        return this._enrollCourse(item, paymentId, userId, session);
      case 'yttc':
        return this._enrollYTTC(item, paymentId, userId, session);
      case 'booking':
        return this._confirmBooking(item, session);
      case 'order':
        return this._completeOrder(item, paymentId, session);
      case 'book':
        // Book fulfilment is handled by the order item (_completeOrder)
        // which finalises inventory and triggers notifications once.
        return { itemType: 'book', fulfilled: true, note: 'Handled via order fulfilment' };
      case 'other':
        return { itemType, fulfilled: true, note: 'No activation needed for custom item' };
      default:
        return { itemType, fulfilled: true, note: `Unknown itemType "${itemType}" – skipped activation` };
    }
  }

  async _activateMembership(item, paymentId, userId, session) {
    const plan = await Plan.findById(item.itemId).session(session).lean();
    if (!plan) throw new Error(`Plan not found: ${item.itemId}`);

    // Prevent duplicate active memberships for the same user+plan
    const existing = await Membership.findOne({
      user: userId,
      plan: plan._id,
      status: 'active',
      expiryDate: { $gt: new Date() },
    }).session(session).lean();
    if (existing) {
      throw new Error(`User already has an active membership for plan "${plan.name}"`);
    }

    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + (plan.durationMonths || 1));

    const membership = await Membership.create([{
      user: userId,
      plan: plan._id,
      invoice: paymentId,
      planType: plan.name,
      planMonths: plan.durationMonths || 1,
      price: plan.price,
      purchaseDate: now,
      status: 'active',
      startDate: now,
      expiryDate,
      benefits: plan.benefits || [],
      pauseDaysAllowed: plan.pauseDays || 0,
      history: [{ action: 'created', note: 'Payment verified – membership activated', at: now }],
    }], { session });

    logger.info(MODULE, 'Membership activated', {
      membershipId: String(membership[0]._id),
      userId: String(userId),
      plan: plan.name,
    });

    return { itemType: 'membership', fulfilled: true, referenceId: membership[0]._id };
  }

  async _activateService(item, paymentId, userId, session) {
    const service = await Service.findById(item.itemId).session(session).lean();
    if (!service) throw new Error(`Service not found: ${item.itemId}`);

    const now = new Date();
    let expiryDate = null;
    if (service.validityDuration && service.validityUnit) {
      expiryDate = new Date(now);
      if (service.validityUnit === 'days') {
        expiryDate.setDate(expiryDate.getDate() + service.validityDuration);
      } else if (service.validityUnit === 'weeks') {
        expiryDate.setDate(expiryDate.getDate() + service.validityDuration * 7);
      } else if (service.validityUnit === 'months') {
        expiryDate.setMonth(expiryDate.getMonth() + service.validityDuration);
      }
    }

    const userService = await UserService.create([{
      user: userId,
      service: service._id,
      payment: paymentId,
      serviceName: service.name,
      category: service.category,
      type: service.type,
      mode: service.mode,
      pricingModel: service.pricingModel,
      price: service.price,
      totalSessions: service.totalSessions || 0,
      instructor: service.instructor || undefined,
      instructors: service.instructors || [],
      status: 'active',
      purchaseDate: now,
      activationDate: now,
      expiryDate,
      history: [{ action: 'activated', note: 'Payment verified – service activated', at: now }],
    }], { session });

    const userServiceDoc = userService[0];

    logger.info(MODULE, 'UserService activated', {
      userServiceId: String(userServiceDoc._id),
      userId: String(userId),
      service: service.name,
    });

    return { itemType: 'service', fulfilled: true, referenceId: userServiceDoc._id };
  }

  async _registerWorkshop(item, paymentId, userId, session) {
    const workshop = await Workshop.findById(item.itemId).session(session);
    if (!workshop) throw new Error(`Workshop not found: ${item.itemId}`);

    const already = workshop.registrations.find((r) => String(r.user) === String(userId));
    if (already) {
      already.paid = true;
    } else {
      workshop.registrations.push({
        user: userId,
        paid: true,
        at: new Date(),
      });
    }

    await workshop.save({ session });

    logger.info(MODULE, 'Workshop registration paid', {
      workshopId: item.itemId,
      userId: String(userId),
    });

    return { itemType: 'workshop', fulfilled: true, referenceId: workshop._id };
  }

  async _payConsultation(item, paymentId, session) {
    const consultation = await Consultation.findById(item.itemId).session(session);
    if (!consultation) throw new Error(`Consultation not found: ${item.itemId}`);

    consultation.paymentStatus = 'paid';
    consultation.paymentRef = paymentId;
    await consultation.save({ session });

    logger.info(MODULE, 'Consultation marked paid', {
      consultationId: item.itemId,
    });

    return { itemType: 'consultation', fulfilled: true, referenceId: consultation._id };
  }

  async _enrollCourse(item, paymentId, userId, session) {
    const course = await Course.findById(item.itemId).session(session);
    if (!course) throw new Error(`Course not found: ${item.itemId}`);

    const already = course.enrolledUsers.find((e) => String(e.user) === String(userId));
    if (!already) {
      course.enrolledUsers.push({ user: userId, enrolledAt: new Date() });
    }

    await course.save({ session });

    logger.info(MODULE, 'Course enrollment completed', {
      courseId: item.itemId,
      userId: String(userId),
    });

    return { itemType: 'course', fulfilled: true, referenceId: course._id };
  }

  async _enrollYTTC(item, paymentId, userId, session) {
    const mode = item.itemId || 'online';

    const user = await User.findById(userId).session(session);
    if (!user) throw new Error(`User not found: ${userId}`);

    if (user.yttcEnrollment?.isEnrolled) {
      logger.info(MODULE, 'YTTC already enrolled – skipping', {
        userId: String(userId),
      });
      return { itemType: 'yttc', fulfilled: true, note: 'Already enrolled in YTTC' };
    }

    user.yttcEnrollment = {
      isEnrolled: true,
      mode,
      status: 'active',
      enrolledAt: new Date(),
    };
    await user.save({ session });

    try {
      await notify(userId, {
        title: 'YTTC enrollment confirmed',
        message: `You are enrolled in the 200 Hours Yoga Teacher Training Course (${mode} mode).`,
        type: 'success',
        channels: ['inApp', 'email'],
      });
    } catch { /* non-blocking */ }

    logger.info(MODULE, 'YTTC enrollment completed', {
      userId: String(userId),
      mode,
    });

    return { itemType: 'yttc', fulfilled: true };
  }

  async _confirmBooking(item, session) {
    if (!mongoose.Types.ObjectId.isValid(item.itemId)) {
      logger.info(MODULE, 'Booking itemId is not a valid ObjectId – skipping fulfillment (booking saved separately)', {
        itemId: item.itemId,
      });
      return { itemType: 'booking', fulfilled: true, note: 'Booking created after payment via standalone flow' };
    }

    const booking = await Booking.findById(item.itemId).session(session);
    if (!booking) {
      logger.info(MODULE, 'Booking not found yet – skipping fulfillment (may be created after payment)', {
        itemId: item.itemId,
      });
      return { itemType: 'booking', fulfilled: true, note: 'Booking not found at fulfillment time' };
    }

    booking.status = 'Confirmed';
    await booking.save({ session });

    logger.info(MODULE, 'Booking confirmed', {
      bookingId: item.itemId,
    });

    return { itemType: 'booking', fulfilled: true, referenceId: booking._id };
  }

  async _completeOrder(item, paymentId, session) {
    const order = await Order.findById(item.itemId).session(session);
    if (!order) throw new Error(`Order not found: ${item.itemId}`);

    if (order.kind === 'book') {
      // Book store order — move through the controlled status machine.
      // Atomic guard: only one path (verify or webhook) may finalise,
      // so inventory is never decremented twice.
      const updated = await Order.updateOne(
        { _id: order._id, status: 'payment_pending' },
        {
          $set: { status: 'payment_confirmed', payment: paymentId },
          $push: {
            timeline: {
              status: 'payment_confirmed',
              note: 'Payment verified — order confirmed',
              by: 'system',
              at: new Date(),
            },
          },
        },
        { session },
      );

      if (updated.modifiedCount === 0) {
        // Already confirmed by a concurrent path — nothing else to do.
        return { itemType: 'order', fulfilled: true, referenceId: order._id, bookStore: true };
      }

      // Finalise inventory: reserved → sold.
      const items = await OrderItem.find({ order: order._id, itemType: 'book' }).session(session).lean();
      for (const oi of items) {
        await Book.updateOne(
          { _id: oi.itemId },
          { $inc: { reservedStock: -(oi.quantity || 1), soldCount: oi.quantity || 1 } }
        ).session(session);
      }

      logger.info(MODULE, 'Book order payment confirmed', {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
      });

      return { itemType: 'order', fulfilled: true, referenceId: order._id, bookStore: true };
    }

    order.status = 'completed';
    order.payment = paymentId;
    await order.save({ session });

    logger.info(MODULE, 'Order completed', {
      orderId: item.itemId,
    });

    return { itemType: 'order', fulfilled: true, referenceId: order._id };
  }
}

export default FulfillmentService;
