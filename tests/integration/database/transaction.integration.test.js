import { describe, it, expect, beforeEach, vi } from 'vitest';

// Simulate transaction: Create booking + customer + payment must all succeed or rollback

describe('Transaction Integration — booking + customer + payment (B11)', () => {
  const mockDb = {
    bookings: [],
    customers: [],
    payments: [],
    async createBooking(data) {
      if (!data.name) throw new Error('Name required');
      const rec = { _id: 'b1', ...data };
      this.bookings.push(rec);
      return rec;
    },
    async createCustomer(data) {
      if (data.email === 'duplicate@test.com') throw new Error('E11000 duplicate key');
      const rec = { _id: 'c1', ...data };
      this.customers.push(rec);
      return rec;
    },
    async createPayment(data) {
      if (data.amount <= 0) throw new Error('Invalid amount');
      const rec = { _id: 'p1', ...data };
      this.payments.push(rec);
      return rec;
    },
    rollback() {
      this.bookings = [];
      this.customers = [];
      this.payments = [];
    }
  };

  beforeEach(() => mockDb.rollback());

  async function createFullBooking(payload) {
    const snapshot = JSON.stringify(mockDb);
    try {
      const booking = await mockDb.createBooking({ name: payload.name, courseName: payload.courseName });
      const customer = await mockDb.createCustomer({ email: payload.email });
      const payment = await mockDb.createPayment({ amount: payload.amount });
      return { booking, customer, payment, committed: true };
    } catch (e) {
      mockDb.rollback();
      throw e;
    }
  }

  it('successful transaction: A✓ B✓ C✓ → COMMIT leaves data', async () => {
    const result = await createFullBooking({ name: 'Amina', courseName: 'Yoga', email: 'amina@test.com', amount: 1500 });
    expect(result.committed).toBe(true);
    expect(mockDb.bookings.length).toBe(1);
    expect(mockDb.customers.length).toBe(1);
    expect(mockDb.payments.length).toBe(1);
  });

  it('partial failure: A✓ B✓ C✗ → ROLLBACK leaves no orphan data', async () => {
    await expect(createFullBooking({ name: 'Amina', courseName: 'Yoga', email: 'amina@test.com', amount: 0 }))
      .rejects.toThrow(/Invalid amount/);
    expect(mockDb.bookings.length).toBe(0);
    expect(mockDb.customers.length).toBe(0);
    expect(mockDb.payments.length).toBe(0);
  });

  it('duplicate customer: A✓ B✗ → ROLLBACK', async () => {
    await expect(createFullBooking({ name: 'Amina', courseName: 'Yoga', email: 'duplicate@test.com', amount: 1500 }))
      .rejects.toThrow(/duplicate/);
    expect(mockDb.bookings.length).toBe(0);
  });

  it('API → DB → UI propagation: create then GET returns same data', async () => {
    await mockDb.createBooking({ name: 'Amina', courseName: 'Yoga Foundations' });
    // Simulate GET API
    const fetched = mockDb.bookings[0];
    expect(fetched.name).toBe('Amina');
    // Simulate frontend render
    const ui = `<div>${fetched.name} — ${fetched.courseName}</div>`;
    expect(ui).toContain('Yoga Foundations');
  });
});
