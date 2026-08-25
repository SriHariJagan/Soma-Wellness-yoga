import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';

// ── Mocks ──────────────────────────────────────────────
const bookStore = new Map(); // id -> book doc

function chainable(result) {
  const chain = {
    select: jest.fn(() => chain),
    lean: jest.fn(async () => result),
    then: (resolve) => Promise.resolve(result).then(resolve),
    catch: (reject) => Promise.resolve(result).catch(reject),
  };
  return chain;
}

const mockBook = {
  findById: jest.fn((id) => {
    const book = bookStore.get(String(id));
    return chainable(book ? { ...book } : null);
  }),
  findOneAndUpdate: jest.fn(async (filter, update, opts) => {
    const book = bookStore.get(String(filter._id));
    if (!book) return null;
    const qty = filter.stock?.$gte;
    if (qty !== undefined && (book.stock ?? 0) < qty) return null;
    const inc = update.$inc || {};
    book.stock = (book.stock ?? 0) + (inc.stock ?? 0);
    book.reservedStock = (book.reservedStock ?? 0) + (inc.reservedStock ?? 0);
    book.soldCount = (book.soldCount ?? 0) + (inc.soldCount ?? 0);
    return { ...book };
  }),
  updateOne: jest.fn(async (filter, update) => {
    const book = bookStore.get(String(filter._id));
    if (!book) return { modifiedCount: 0 };
    const inc = update.$inc || {};
    book.stock = (book.stock ?? 0) + (inc.stock ?? 0);
    book.reservedStock = (book.reservedStock ?? 0) + (inc.reservedStock ?? 0);
    book.soldCount = (book.soldCount ?? 0) + (inc.soldCount ?? 0);
    return { modifiedCount: 1 };
  }),
};

jest.unstable_mockModule('../../../models/Book.js', () => ({ default: mockBook }));

const orders = new Map(); // id -> order doc (mutable)
const orderItems = []; // {order, itemType, itemId, quantity}

const mockOrder = {
  findOne: jest.fn((filter) => {
    const match = [...orders.values()].find((o) => {
      if (filter._id && String(o._id) !== String(filter._id)) return false;
      if (filter.kind && o.kind !== filter.kind) return false;
      if (filter.status && o.status !== filter.status) return false;
      if (filter.inventoryReleasedAt === null && o.inventoryReleasedAt !== undefined) return false;
      if (filter.createdAt?.$lt && o.createdAt >= filter.createdAt.$lt) return false;
      return true;
    });
    return chainable(match ? { ...match } : null);
  }),
  find: jest.fn((filter) => {
    const matches = [...orders.values()].filter((o) => {
      if (filter.kind && o.kind !== filter.kind) return false;
      if (filter.status && o.status !== filter.status) return false;
      if (filter.inventoryReleasedAt === null && o.inventoryReleasedAt !== undefined) return false;
      if (filter.createdAt?.$lt && o.createdAt >= filter.createdAt.$lt) return false;
      return true;
    });
    return chainable(matches.map((o) => ({ ...o })));
  }),
  updateOne: jest.fn(async (filter, update) => {
    const order = orders.get(String(filter._id));
    if (!order) return { modifiedCount: 0 };
    if (filter.inventoryReleasedAt === null && order.inventoryReleasedAt !== undefined) return { modifiedCount: 0 };
    if (filter.inventoryReleasedAt === null) order.inventoryReleasedAt = update.$set.inventoryReleasedAt;
    if (update.$push?.timeline) order.timeline = [...(order.timeline || []), update.$push.timeline];
    return { modifiedCount: 1 };
  }),
};

const mockOrderItem = {
  find: jest.fn((filter) => chainable(
    orderItems
      .filter((oi) => String(oi.order) === String(filter.order) && (!filter.itemType || oi.itemType === filter.itemType))
      .map((oi) => ({ ...oi }))
  )),
};

const payments = new Map(); // payment id -> status

const mockPayment = {
  findById: jest.fn((id) => chainable({ paymentStatus: payments.get(String(id)) || 'failed' })),
};

jest.unstable_mockModule('../../../models/Order.js', () => ({ default: mockOrder }));
jest.unstable_mockModule('../../../models/OrderItem.js', () => ({ default: mockOrderItem }));
jest.unstable_mockModule('../../../payment/models/Payment.js', () => ({ default: mockPayment }));

const { reserveStock, finalizeStock, releaseStock, restoreStock, releaseOrderReservations, releaseStaleReservations } = await import('../../../services/inventoryService.js');

const seedBook = (overrides = {}) => {
  const id = new mongoose.Types.ObjectId();
  const book = {
    _id: id,
    title: 'Test Book',
    status: 'published',
    trackInventory: true,
    allowBackorder: false,
    stock: 10,
    reservedStock: 0,
    soldCount: 0,
    ...overrides,
  };
  bookStore.set(String(id), book);
  return book;
};

const seedOrder = (overrides = {}) => {
  const order = {
    _id: new mongoose.Types.ObjectId(),
    kind: 'book',
    status: 'payment_pending',
    createdAt: new Date(),
    timeline: [],
    ...overrides,
  };
  orders.set(String(order._id), order);
  return order;
};

describe('inventoryService — stock lifecycle', () => {
  beforeEach(() => {
    bookStore.clear();
    orders.clear();
    orderItems.length = 0;
    jest.clearAllMocks();
  });

  it('rejects zero quantity reservations', async () => {
    const book = seedBook();
    await expect(reserveStock({ bookId: book._id, quantity: 0 })).rejects.toThrow('Quantity');
  });

  it('rejects reservations for unknown or unpublished books', async () => {
    await expect(reserveStock({ bookId: new mongoose.Types.ObjectId(), quantity: 1 })).rejects.toThrow('Book not found');
    seedBook({ status: 'draft' });
    await expect(reserveStock({ bookId: bookStore.keys().next().value, quantity: 1 })).rejects.toThrow('not available');
  });

  it('reserves stock atomically: stock down, reservedStock up', async () => {
    const book = seedBook({ stock: 10 });
    const result = await reserveStock({ bookId: book._id, quantity: 3 });
    expect(result.reserved).toBe(true);
    expect(result.book.stock).toBe(7);
    expect(result.book.reservedStock).toBe(3);
  });

  it('rejects an oversell when stock is insufficient (stock = available copies)', async () => {
    const book = seedBook({ stock: 1, reservedStock: 1 });
    await expect(reserveStock({ bookId: book._id, quantity: 2 })).rejects.toThrow('1 copy');
    expect(book.stock).toBe(1);
    expect(book.reservedStock).toBe(1);
  });

  it('allows backorders without a stock guard', async () => {
    const book = seedBook({ stock: 0, allowBackorder: true });
    const result = await reserveStock({ bookId: book._id, quantity: 5 });
    expect(result.backorder).toBe(true);
    expect(book.reservedStock).toBe(5);
    expect(book.stock).toBe(0);
  });

  it('does not track inventory for untracked books', async () => {
    const book = seedBook({ trackInventory: false });
    const result = await reserveStock({ bookId: book._id, quantity: 5 });
    expect(result.tracked).toBe(false);
    expect(book.stock).toBe(10);
  });

  it('finalizes a reservation: reserved → sold', async () => {
    const book = seedBook({ stock: 7, reservedStock: 3 });
    await finalizeStock({ bookId: book._id, quantity: 3 });
    expect(book.stock).toBe(7);
    expect(book.reservedStock).toBe(0);
    expect(book.soldCount).toBe(3);
  });

  it('releases a reservation: reserved → available', async () => {
    const book = seedBook({ stock: 7, reservedStock: 3 });
    await releaseStock({ bookId: book._id, quantity: 3 });
    expect(book.stock).toBe(10);
    expect(book.reservedStock).toBe(0);
  });

  it('restores sold stock on post-fulfilment cancellation', async () => {
    const book = seedBook({ stock: 7, soldCount: 3 });
    await restoreStock({ bookId: book._id, quantity: 3 });
    expect(book.stock).toBe(10);
    expect(book.soldCount).toBe(0);
  });
});

describe('inventoryService — order-level release', () => {
  beforeEach(() => {
    bookStore.clear();
    orders.clear();
    orderItems.length = 0;
    payments.clear();
    jest.clearAllMocks();
  });

  it('releases every book line of an order exactly once (atomic claim)', async () => {
    const book = seedBook({ stock: 8, reservedStock: 2 });
    const order = seedOrder();
    orderItems.push({ order: order._id, itemType: 'book', itemId: book._id, quantity: 2 });

    const first = await releaseOrderReservations(order._id, { by: 'admin', note: 'cancelled' });
    expect(first.released).toBe(true);
    expect(first.lines).toBe(1);
    expect(book.stock).toBe(10);
    expect(book.reservedStock).toBe(0);

    const second = await releaseOrderReservations(order._id, { by: 'admin', note: 'again' });
    expect(second).toEqual({ released: false, reason: 'already_released' });
    expect(book.stock).toBe(10); // no double-restore
  });

  it('ignores non-book order items', async () => {
    const book = seedBook({ stock: 8, reservedStock: 2 });
    const order = seedOrder();
    orderItems.push({ order: order._id, itemType: 'course', itemId: new mongoose.Types.ObjectId(), quantity: 1 });
    const result = await releaseOrderReservations(order._id);
    expect(result.released).toBe(true);
    expect(book.stock).toBe(8);
  });

  it('sweeps stale payment_pending orders but never captured ones', async () => {
    const book = seedBook({ stock: 5, reservedStock: 3 });
    const oldOrder = seedOrder({
      status: 'payment_pending',
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
      payment: 'pay_old',
    });
    payments.set('pay_old', 'failed');
    orderItems.push({ order: oldOrder._id, itemType: 'book', itemId: book._id, quantity: 3 });

    const paid = seedOrder({
      status: 'payment_pending',
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
      payment: 'pay_paid',
    });
    payments.set('pay_paid', 'captured');
    orderItems.push({ order: paid._id, itemType: 'book', itemId: book._id, quantity: 1 });

    const fresh = seedOrder({ status: 'payment_pending', createdAt: new Date() });

    const results = await releaseStaleReservations({ staleAfterMs: 30 * 60 * 1000 });
    expect(results.length).toBe(1);
    expect(results[0].released).toBe(true);
    expect(book.stock).toBe(8);
    expect(book.reservedStock).toBe(0);

    // paid + fresh orders keep their reservations
    expect(paid.inventoryReleasedAt).toBeUndefined();
    expect(fresh.inventoryReleasedAt).toBeUndefined();
  });
});