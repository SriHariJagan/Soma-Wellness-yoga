// ── Payment Statuses ─────────────────────────────────────────
export const PAYMENT_STATUSES = ['initiated', 'pending', 'captured', 'failed', 'expired', 'refunding', 'refunded']  ;

// ── Payment Gateway Types ────────────────────────────────────
export const PAYMENT_GATEWAYS = ['razorpay', 'offline', 'manual']  ;

// ── Payment Sources ──────────────────────────────────────────
export const PAYMENT_SOURCES = ['student', 'admin', 'webhook', 'system']  ;

// ── Payment Fulfillment Statuses ─────────────────────────────
export const PAYMENT_FULFILLMENT_STATUSES = ['pending', 'partial', 'completed', 'cancelled']  ;

// ── Payment Item Types (Payment model — full set) ─────────────
export const PAYMENT_ITEM_TYPES = [
  'membership',
  'plan',
  'service',
  'workshop',
  'consultation',
  'course',
  'booking',
  'event',
  'order',
  'yttc',
  'book',
  'other',
]  ;

// ── Cart/Order Item Types (subset) ───────────────────────────
export const CART_ITEM_TYPES = ['plan', 'service', 'course', 'workshop', 'consultation', 'yttc', 'book']  ;

// ── Payment Routes Valid Item Types ──────────────────────────
export const VALID_ITEM_TYPES = ['membership', 'service', 'workshop', 'consultation', 'booking', 'event', 'course', 'yttc', 'book', 'other']  ;

// ── Order Statuses ───────────────────────────────────────────
// Legacy service/membership order statuses (kept for backward compatibility):
//   'pending', 'completed', 'cancelled', 'refunded'
// Book store fulfilment statuses (kind: 'book' orders):
//   'new', 'payment_pending', 'payment_confirmed', 'packed', 'dispatched',
//   'delivered', 'on_hold', 'returned'
export const ORDER_STATUSES = ['pending', 'completed', 'cancelled', 'refunded', 'new', 'payment_pending', 'payment_confirmed', 'packed', 'dispatched', 'delivered', 'on_hold', 'returned']  ;

// ── Book Store Order Status Machine ──────────────────────────
export const BOOK_ORDER_STATUSES = ['new', 'payment_pending', 'payment_confirmed', 'packed', 'dispatched', 'delivered', 'on_hold', 'cancelled', 'returned']  ;

export const BOOK_ORDER_TRANSITIONS = {
  new:              ['payment_pending', 'cancelled'],
  payment_pending:  ['payment_confirmed', 'on_hold', 'cancelled'],
  payment_confirmed:['packed', 'on_hold', 'cancelled'],
  packed:           ['dispatched', 'on_hold', 'cancelled'],
  dispatched:       ['delivered', 'on_hold', 'returned'],
  delivered:        ['returned'],
  on_hold:          ['payment_pending', 'payment_confirmed', 'packed', 'dispatched', 'cancelled', 'returned'],
  cancelled:        [],
  returned:         [],
}  ;

// ── Book Statuses ────────────────────────────────────────────
export const BOOK_STATUSES = ['draft', 'published', 'archived']  ;

// ── Shipping Rule Types ──────────────────────────────────────
export const SHIPPING_TYPES = ['flat', 'free', 'unavailable']  ;

// ── Bulk Enquiry Statuses ────────────────────────────────────
export const BULK_ENQUIRY_STATUSES = ['NEW', 'CONTACTED', 'QUOTATION_SENT', 'CONFIRMED', 'REJECTED']  ;

// ── Refund Statuses ──────────────────────────────────────────
export const REFUND_STATUSES = ['pending', 'processed', 'failed']  ;

// ── Coupon Discount Types ────────────────────────────────────
export const COUPON_DISCOUNT_TYPES = ['Percentage', 'Flat']  ;

// ── Coupon Applicable Types ──────────────────────────────────
export const COUPON_APPLICABLE_TO = ['all', 'specific']  ;

// ── Payment Currencies ───────────────────────────────────────
export const PAYMENT_CURRENCIES = ['INR']  ;
