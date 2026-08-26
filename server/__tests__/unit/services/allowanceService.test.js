import { describe, it, expect } from '@jest/globals';
import { initialAllowances, consumeAllowance, applyConsume, resetAllowances, allowanceStatus, activatePackage } from '../../../services/allowanceService.js';

describe('Allowance reset — no rollover', () => {
  it('initial allowances built from tier', () => {
    const jua = initialAllowances('JUA');
    expect(jua.groupYogaClasses).toBe(8);
    const uzima = initialAllowances('UZIMA');
    expect(uzima.groupYogaClasses).toBe(-1); // unlimited sentinel
    expect(uzima.massages60).toBe(2);
    expect(uzima.privateSessions).toBe(1);
  });

  it('consume within allowance succeeds, over-allowance fails', () => {
    const mem = { allowances: { groupYogaClasses: 8 }, allowanceUsage: { groupYogaClasses: 5 } };
    const ok = consumeAllowance(mem, 'groupYogaClasses', 3);
    expect(ok.allowed).toBe(true);
    expect(ok.remaining).toBe(0);
    const fail = consumeAllowance(mem, 'groupYogaClasses', 4);
    expect(fail.allowed).toBe(false);
  });

  it('unlimited allowance always allowed', () => {
    const mem = { allowances: { groupYogaClasses: -1 }, allowanceUsage: {} };
    const r = consumeAllowance(mem, 'groupYogaClasses', 100);
    expect(r.allowed).toBe(true);
    expect(r.unlimited).toBe(true);
  });

  it('applyConsume increments usage', () => {
    const mem = { allowances: { massages60: 2 }, allowanceUsage: { massages60: 0 } };
    applyConsume(mem, 'massages60', 1);
    expect(mem.allowanceUsage.massages60).toBe(1);
    applyConsume(mem, 'massages60', 1);
    expect(mem.allowanceUsage.massages60).toBe(2);
  });

  it('reset on billing renewal does NOT roll over — sets usage to 0', () => {
    const mem = {
      allowances: { groupYogaClasses: 8, massages60: 2 },
      allowanceUsage: { groupYogaClasses: 6, massages60: 1 },
    };
    resetAllowances(mem);
    expect(mem.allowanceUsage.groupYogaClasses).toBe(0);
    expect(mem.allowanceUsage.massages60).toBe(0);
    // No addition of remaining 2 classes to next cycle — ensured 0 not 8
    expect(mem.allowanceUsage.groupYogaClasses).not.toBe(8);
  });

  it('allowanceStatus display formats correctly', () => {
    const mem = { allowances: { groupYogaClasses: 8 }, allowanceUsage: { groupYogaClasses: 3 } };
    const status = allowanceStatus(mem);
    expect(status[0].display).toBe('3 of 8 used');
    const ul = { allowances: { groupYogaClasses: -1 }, allowanceUsage: { groupYogaClasses: 99 } };
    expect(allowanceStatus(ul)[0].display).toMatch(/unlimited/);
  });

  it('package activated_at-based expiry — not active before first use, active after', () => {
    const pkg = { activated_at: null, expiryDate: null };
    expect(activatePackage(pkg, new Date('2026-09-01T10:00:00Z')).toISOString()).toBe(new Date('2026-09-01T10:00:00Z').toISOString());
    expect(pkg.activated_at).not.toBeNull();
  });

  it('package idempotent activate — second call keeps original', () => {
    const first = new Date('2026-09-01T10:00:00Z');
    const second = new Date('2026-09-10T10:00:00Z');
    const pkg = { activated_at: new Date(first) };
    activatePackage(pkg, second);
    expect(pkg.activated_at.getTime()).toBe(first.getTime());
  });
});
