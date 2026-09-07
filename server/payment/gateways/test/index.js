// ============================================================
// test/index.js — Barrel exports for the TEST payment gateway
// (PAYMENT_MODE=test only — never loaded in live mode)
// ============================================================
export { TestPaymentService, TEST_SCENARIOS, normalizeScenario, buildTestStkIds } from './TestPaymentService.js';
