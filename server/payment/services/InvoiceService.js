import { CounterRepository } from '../repository/CounterRepository.js';

export class InvoiceService {
  constructor() {
    this.counterRepo = new CounterRepository();
  }

  async generateInvoiceNumber(session) {
    const year = new Date().getFullYear();
    const seq = await this.counterRepo.nextSequence('invoice', session);
    return `INV-${year}-${String(seq).padStart(6, '0')}`;
  }

  async generateRefundReceiptNumber(session) {
    const year = new Date().getFullYear();
    const seq = await this.counterRepo.nextSequence('refund', session);
    return `RFND-${year}-${String(seq).padStart(6, '0')}`;
  }
}

export default InvoiceService;
