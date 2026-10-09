import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

const row = {
  _id: '6ac884d4cc70a8fbd90e974c',
  orderNumber: 'ORD-2026-543243',
  status: 'completed',
  paymentMethod: 'Pesapal',
  subtotal: 4500,
  discount: 0,
  tax: 0,
  total: 4500,
  couponCode: '',
  couponDiscount: 0,
  coupon: null,
  transactionId: 'chk_test123',
  itemCount: 1,
  createdAt: new Date('2026-10-09T11:38:00').toISOString(),
  student: { _id: 'stu1', name: 'Sri Hari Jagan Mushini', email: 'sriharijagan04@gmail.com', phone: '+919505222778' },
  payment: {
    _id: 'pay1',
    invoiceNo: 'INV-2026-000006',
    merchant_reference: 'PAY-20261009-F8344EDF',
    provider_transaction_id: '7915264447216648504003',
    payment_provider: 'pesapal',
    paymentStatus: 'captured',
    amount: 450000,
    capturedAt: new Date('2026-10-09T11:44:00').toISOString(),
  },
  items: [{ name: 'One-to-One Yoga', itemType: 'service', itemId: 'svc1', price: 4500, discount: 0, finalPrice: 4500 }],
};

const detail = {
  ...row,
  enrollments: [{ itemType: 'service', name: 'One-to-One Yoga', status: 'active' }],
  timeline: [{ action: 'payment_verified', createdAt: row.createdAt, meta: { invoiceNo: 'INV-2026-000006' } }],
};

vi.mock('../../src/components/api/AdminServices.js', () => ({
  getAdminOrders: vi.fn(async () => ({ orders: [row], total: 1, pages: 1 })),
  getAdminOrderDetail: vi.fn(async () => detail),
}));

vi.mock('../../src/components/shared/InvoiceView.jsx', () => ({
  default: () => null,
}));

import ReportsInvoices from '../../src/components/Admin/ReportsInvoices.jsx';
import { getAdminOrderDetail } from '../../src/components/api/AdminServices.js';

describe('ReportsInvoices order detail modal', () => {
  it('opens with full data on View click', async () => {
    render(<ReportsInvoices payments={[]} metrics={{}} />);
    // ledger row renders
    expect(await screen.findByText('One-to-One Yoga')).toBeInTheDocument();
    // click the row View button
    const viewBtns = screen.getAllByRole('button', { name: /view/i });
    fireEvent.click(viewBtns[0]);
    // modal shows header + key data instantly (from ledger row, no API wait)
    expect(await screen.findByText(/Order #ORD-2026-543243/)).toBeInTheDocument();
    expect(screen.getAllByText('#INV-2026-000006').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('7915264447216648504003').length).toBeGreaterThanOrEqual(2);
    // enriched detail resolves
    await waitFor(() => expect(getAdminOrderDetail).toHaveBeenCalled());
    expect(await screen.findByText('Payment Verified')).toBeInTheDocument();
  });
});
