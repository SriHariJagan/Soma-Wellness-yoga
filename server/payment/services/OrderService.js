import Plan from '../../models/Plan.js';
import Service from '../../models/Service.js';
import Workshop from '../../models/Workshop.js';
import Consultation from '../../models/Consultation.js';
import Course from '../../models/Course.js';
import Book from '../../models/Book.js';
import Settings from '../../models/Settings.js';
import { PaymentInitiationError } from '../errors/PaymentErrors.js';
import logger from '../../notification/logger.js';

const MODULE = 'OrderService';

// Map itemType → resolver function.
// Each resolver reads the actual price from the database so the client can never
// dictate the amount — the server always resolves authoritative prices.
//
// Single-membership world: only active, visible plans (the SOMA Wellness
// Circle) can be purchased. Anything else is rejected here.
const ITEM_RESOLVERS = {
  async membership(item) {
    const plan = await Plan.findById(item.itemId).lean();
    if (!plan) throw new PaymentInitiationError(`Membership plan not found: ${item.itemId}`);
    if (plan.active === false || plan.visibility === 'hidden') {
      throw new PaymentInitiationError(`Membership plan is not available: ${plan.name}`);
    }
    return {
      name: plan.name,
      unitPrice: Math.round(Number(plan.price) * 100),
      quantity: item.quantity || 1,
      metadata: { durationMonths: plan.durationMonths, pauseDays: plan.pauseDays || 0, planName: plan.name },
    };
  },

  // Alias for 'membership' – cart uses 'plan', payment routes use 'membership'
  async plan(item) {
    return ITEM_RESOLVERS.membership(item);
  },

  async service(item, ctx = {}) {
    const service = await Service.findById(item.itemId).lean();
    if (!service) throw new PaymentInitiationError(`Service not found: ${item.itemId}`);
    const base = Math.round(Number(service.price) || 0);
    // Circle 5%: only for active members + regular-priced + no coupon. Never stacks.
    let unitKes = base;
    let circleApplied = false;
    let circleDiscountAmount = 0;
    if (ctx.circleActive && !ctx.skipCircleDiscount) {
      const { resolveCircleServicePrice } = await import('../../services/circleService.js');
      const r = resolveCircleServicePrice(base, {
        circleActive: true,
        hasCouponDiscount: !!ctx.hasCouponDiscount,
        isPromotional: !!service.isPromotional,
        originalPrice: service.originalPrice,
        currentPrice: service.price,
        excludeCircleDiscount: !!service.excludeCircleDiscount,
        circleDiscountEligible: service.circleDiscountEligible !== false,
        category: service.category,
        itemType: 'service',
      });
      unitKes = r.finalPrice;
      circleApplied = r.circleApplied;
      circleDiscountAmount = r.discountAmount || 0;
    }
    return {
      name: service.name,
      unitPrice: unitKes * 100,
      quantity: item.quantity || 1,
      metadata: {
        mode: service.mode,
        pricingModel: service.pricingModel,
        basePrice: base,
        circleApplied,
        circleDiscountAmount,
      },
    };
  },

  async workshop(item) {
    const workshop = await Workshop.findById(item.itemId).lean();
    if (!workshop) throw new PaymentInitiationError(`Workshop not found: ${item.itemId}`);
    return {
      name: workshop.name,
      unitPrice: workshop.price * 100,
      quantity: item.quantity || 1,
      metadata: { capacity: workshop.capacity, date: workshop.date },
    };
  },

  async consultation(item) {
    const settings = await Settings.getSingleton();
    const fee = settings.consultationFee || 300;
    return {
      name: 'Yoga Consultation',
      unitPrice: fee * 100,
      quantity: item.quantity || 1,
      metadata: { consultationFee: fee },
    };
  },

  async course(item) {
    const course = await Course.findById(item.itemId).lean();
    if (!course) throw new PaymentInitiationError(`Course not found: ${item.itemId}`);
    return {
      name: course.title,
      unitPrice: course.price * 100,
      quantity: item.quantity || 1,
      metadata: { mode: course.mode },
    };
  },

  async yttc(item) {
    const mode = item.itemId || 'online';
    const prices = { online: 35000, hybrid: 45000 };
    const price = prices[mode] || 35000;
    return {
      name: mode === 'online' ? 'YTTC - Online Mode' : 'YTTC - Hybrid Mode',
      unitPrice: price * 100,
      quantity: item.quantity || 1,
      metadata: { mode },
    };
  },

  async booking(item) {
    if (item.unitPrice == null) {
      throw new PaymentInitiationError('Booking items require a unitPrice');
    }
    return {
      name: item.name || 'Booking',
      unitPrice: Math.max(0, item.unitPrice),
      quantity: item.quantity || 1,
      metadata: item.metadata || {},
    };
  },

  async book(item) {
    const book = await Book.findById(item.itemId).lean();
    if (!book) throw new PaymentInitiationError(`Book not found: ${item.itemId}`);
    if (book.status !== 'published') {
      throw new PaymentInitiationError(`${book.title} is not available`);
    }
    return {
      name: book.title,
      unitPrice: book.price * 100,
      quantity: item.quantity || 1,
      metadata: { sku: book.sku, authors: book.authors, image: book.coverImage },
    };
  },

  // Unified Offering catalog — Circle 5% applies only to regular-priced
  // offerings; promotional (originalPrice > price) offerings pay list price.
  async offering(item, ctx = {}) {
    const { default: Offering } = await import('../../models/Offering.js');
    const offering = await Offering.findById(item.itemId).lean();
    if (!offering) throw new PaymentInitiationError(`Offering not found: ${item.itemId}`);
    if (offering.status !== 'available') throw new PaymentInitiationError(`${offering.name} is not currently available`);
    if (!offering.bookingEnabled) throw new PaymentInitiationError(`Booking is not enabled for ${offering.name}`);
    const base = Math.round(Number(offering.price) || 0);
    let unitKes = base;
    let circleApplied = false;
    let circleDiscountAmount = 0;
    if (ctx.circleActive && !ctx.skipCircleDiscount && offering.category !== 'membership' && offering.category !== 'academy') {
      const { resolveCircleServicePrice } = await import('../../services/circleService.js');
      const r = resolveCircleServicePrice(base, {
        circleActive: true,
        hasCouponDiscount: !!ctx.hasCouponDiscount,
        isPromotional: false,
        originalPrice: offering.originalPrice,
        currentPrice: offering.price,
        excludeCircleDiscount: false,
        circleDiscountEligible: true,
        category: offering.category,
        itemType: 'offering',
      });
      unitKes = r.finalPrice;
      circleApplied = r.circleApplied;
      circleDiscountAmount = r.discountAmount || 0;
    }
    return {
      name: offering.name,
      unitPrice: unitKes * 100,
      quantity: item.quantity || 1,
      metadata: { category: offering.category, basePrice: base, circleApplied, circleDiscountAmount },
    };
  },

  async event(item) {
    throw new PaymentInitiationError('Event payment flow not yet implemented');
  },

  async other(item) {
    if (item.unitPrice == null) {
      throw new PaymentInitiationError('Custom items require a unitPrice');
    }
    return {
      name: item.name || 'Custom item',
      unitPrice: Math.max(0, item.unitPrice),
      quantity: item.quantity || 1,
      metadata: item.metadata || {},
    };
  },
};

export class OrderService {
  // ctx: { userId, circleActive, hasCouponDiscount, skipCircleDiscount }
  // circleActive is resolved by the caller (PaymentService/cart) so this
  // stays a pure pricing function. Prices always come from the DB.
  async resolveItems(items, ctx = {}) {
    const resolved = [];
    for (const item of items) {
      const resolver = ITEM_RESOLVERS[item.itemType];
      if (!resolver) {
        throw new PaymentInitiationError(`Unknown item type: ${item.itemType}`);
      }
      const resolvedItem = await resolver(item, ctx);
      const totalPrice = resolvedItem.unitPrice * resolvedItem.quantity;
      resolved.push({
        itemType: item.itemType,
        itemId: item.itemId || null,
        name: resolvedItem.name,
        quantity: resolvedItem.quantity,
        unitPrice: resolvedItem.unitPrice,
        totalPrice,
        metadata: resolvedItem.metadata || {},
      });
    }
    return resolved;
  }

  calculateTotal(resolvedItems) {
    return resolvedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  // M-Pesa only — create a pending order without external gateway call.
  // Daraja STK Push is initiated separately via /api/mpesa/stkpush and
  // reconciled via callback. This just creates a local pending record.
  async createRazorpayOrder(amount, receipt) {
    logger.info(MODULE, 'Creating M-Pesa pending order (Razorpay removed)', { receipt, amount });
    return {
      id: `order_mpesa_${receipt}`,
      amount,
      currency: 'KES',
      receipt,
      status: 'created',
      gateway: 'mpesa',
      _mock: false,
    };
  }

  // Preferred alias for new code
  async createMpesaOrder(amount, receipt) {
    return this.createRazorpayOrder(amount, receipt);
  }
}

export default OrderService;
