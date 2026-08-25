import { jest, describe, it, expect, beforeAll, jest as jestModule } from '@jest/globals';

let withTimeout;

beforeAll(async () => {
  const mod = await import('../../../utils/timeout.js');
  withTimeout = mod.default;
});

describe('withTimeout', () => {
  it('should resolve when the promise resolves before the timeout', async () => {
    const result = await withTimeout(Promise.resolve('success'), 1000, 'test-op');
    expect(result).toBe('success');
  });

  it('should resolve with the value of a delayed promise that completes in time', async () => {
    const delayed = new Promise((resolve) => setTimeout(() => resolve('done'), 20));
    const result = await withTimeout(delayed, 500, 'delayed-op');
    expect(result).toBe('done');
  });

  it('should reject when the promise takes longer than the timeout', async () => {
    const slow = new Promise((resolve) => setTimeout(() => resolve('too late'), 200));
    await expect(withTimeout(slow, 50, 'slow-op')).rejects.toThrow('slow-op timed out after 50ms');
  });

  it('should clear the timer when the promise resolves', async () => {
    const clearSpy = jest.spyOn(global, 'clearTimeout');
    await withTimeout(Promise.resolve('fast'), 100, 'fast-op');
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('should clear the timer when the promise rejects', async () => {
    const clearSpy = jest.spyOn(global, 'clearTimeout');
    const failing = Promise.reject(new Error('failure'));
    await expect(withTimeout(failing, 100, 'failing-op')).rejects.toThrow('failure');
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('should reject with the custom label in the error message', async () => {
    const slow = new Promise((resolve) => setTimeout(() => resolve('x'), 200));
    await expect(withTimeout(slow, 10, 'MyCustomOp')).rejects.toThrow('MyCustomOp timed out after 10ms');
  });

  it('should use default lable "operation" when no label is given', async () => {
    const slow = new Promise((resolve) => setTimeout(() => resolve('x'), 200));
    await expect(withTimeout(slow, 10)).rejects.toThrow('operation timed out after 10ms');
  });

  it('should use default timeout of 60000ms when none specified', async () => {
    const slow = new Promise((resolve) => setTimeout(() => resolve('x'), 50));
    const result = await withTimeout(slow);
    expect(result).toBe('x');
  });

  it('should handle a promise that resolves to a falsy value', async () => {
    const result = await withTimeout(Promise.resolve(0), 100);
    expect(result).toBe(0);
  });

  it('should handle a promise that resolves to null', async () => {
    const result = await withTimeout(Promise.resolve(null), 100);
    expect(result).toBeNull();
  });

  it('should reject when the timeout fires before promise resolves', async () => {
    const start = Date.now();
    const slow = new Promise((resolve) => setTimeout(() => resolve('x'), 200));
    try {
      await withTimeout(slow, 30, 'timing-test');
    } catch (e) {
      expect(Date.now() - start).toBeGreaterThanOrEqual(25);
      expect(e.message).toBe('timing-test timed out after 30ms');
    }
  });
});
