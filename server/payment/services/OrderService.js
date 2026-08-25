import Plan from '../../models/Plan.js';
import Service from '../../models/Service.js';
import Workshop from '../../models/Workshop.js';
import Consultation from '../../models/Consultation.js';
import Course from '../../models/Course.js';
import Book from '../../models/Book.js';
import Settings from '../../models/Settings.js';
import razorpay from '../../config/razorpay.js';
import { PaymentInitiationError, GatewayError } from '../errors/PaymentErrors.js';
import logger from '../../notification/logger.js';

const MODULE = 'OrderService';

// Map itemType → resolver function.
// Each resolver reads the actual price from the database so the client can never
// dictate the amount — the server always resolves authoritative prices.
const ITEM_RESOLVERS = {
  async membership(item) {
    const plan = await Plan.findById(item.itemId).lean();
    if (!plan) throw new PaymentInitiationError(`Membership plan not found: ${item.itemId}`);
    return {
      name: plan.name,
      unitPrice: plan.price * 100,
      quantity: item.quantity || 1,
      metadata: { durationMonths: plan.durationMonths, pauseDays: plan.pauseDays },
    };
  },

  // Alias for 'membership' – cart uses 'plan', payment routes use 'membership'
  async plan(item) {
    return ITEM_RESOLVERS.membership(item);
  },

  async service(item) {
    const service = await Service.findById(item.itemId).lean();
    if (!service) throw new PaymentInitiationError(`Service not found: ${item.itemId}`);
    return {
      name: service.name,
      unitPrice: service.price * 100,
      quantity: item.quantity || 1,
      metadata: { mode: service.mode, pricingModel: service.pricingModel },
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
  async resolveItems(items) {
    const resolved = [];
    for (const item of items) {
      const resolver = ITEM_RESOLVERS[item.itemType];
      if (!resolver) {
        throw new PaymentInitiationError(`Unknown item type: ${item.itemType}`);
      }
      const resolvedItem = await resolver(item);
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

  async createRazorpayOrder(amount, receipt) {
    const options = {
      amount,
      currency: 'INR',
      receipt,
    };

    try {
      const order = await razorpay.orders.create(options);
      logger.info(MODULE, 'Razorpay order created', {
        razorpayOrderId: order.id,
        amount: order.amount,
      });
      return order;
    } catch (err) {
      logger.error(MODULE, 'Razorpay order creation failed', {
        error: err.message,
        statusCode: err.statusCode,
      });
      throw new GatewayError(
        err.statusCode === 401 ? 'Razorpay authentication failed' : 'Failed to create payment order',
        { razorpayError: err.message },
      );
    }
  }
}

export default OrderService;
