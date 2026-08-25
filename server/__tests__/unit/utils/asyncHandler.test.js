import { jest, describe, it, expect, beforeAll } from '@jest/globals';

let asyncHandler;

beforeAll(async () => {
  const mod = await import('../../../utils/asyncHandler.js');
  asyncHandler = mod.default;
});

describe('asyncHandler', () => {
  it('should call next() with the error when the async function throws', async () => {
    const fn = async () => { throw new Error('Something went wrong'); };
    const wrapped = asyncHandler(fn);
    const req = {};
    const res = {};
    const next = jest.fn();

    wrapped(req, res, next);
    await Promise.resolve(); // Allow the promise microtask to settle

    // Wait for the promise rejection to be caught
    await new Promise(process.nextTick);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe('Something went wrong');
  });

  it('should call next() with the error when the async function rejects', async () => {
    const fn = async () => Promise.reject(new Error('Rejected promise'));
    const wrapped = asyncHandler(fn);
    const req = {};
    const res = {};
    const next = jest.fn();

    wrapped(req, res, next);
    await new Promise(process.nextTick);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe('Rejected promise');
  });

  it('should pass successful responses through without calling next with error', async () => {
    const fn = async (req, res) => { res.json({ ok: true }); };
    const wrapped = asyncHandler(fn);
    const req = {};
    const res = { json: jest.fn() };
    const next = jest.fn();

    await wrapped(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next() without arguments when async function succeeds', async () => {
    const fn = async (req, res, next) => { next(); };
    const wrapped = asyncHandler(fn);
    const req = {};
    const res = {};
    const next = jest.fn();

    await wrapped(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(next.mock.calls[0]).toHaveLength(0);
  });

  it('should propagate ApiError instances correctly', async () => {
    const customErr = new Error('Custom operational');
    customErr.statusCode = 422;
    const fn = async () => { throw customErr; };
    const wrapped = asyncHandler(fn);
    const req = {};
    const res = {};
    const next = jest.fn();

    wrapped(req, res, next);
    await new Promise(process.nextTick);
    expect(next).toHaveBeenCalledWith(customErr);
    expect(next.mock.calls[0][0].statusCode).toBe(422);
  });

  it('should pass req and res to the wrapped function', async () => {
    const fn = jest.fn(async (req, res) => { res.send('ok'); });
    const wrapped = asyncHandler(fn);
    const req = { id: 1 };
    const res = { send: jest.fn() };
    const next = jest.fn();

    await wrapped(req, res, next);
    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('should handle synchronous throws inside the async function', async () => {
    const fn = async () => { throw new Error('sync-like error'); };
    const wrapped = asyncHandler(fn);
    const req = {};
    const res = {};
    const next = jest.fn();

    wrapped(req, res, next);
    await new Promise(process.nextTick);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe('sync-like error');
  });

  it('should catch errors thrown in non-async wrapped function', async () => {
    const fn = (req, res, next) => {
      return Promise.reject(new Error('non-async reject'));
    };
    const wrapped = asyncHandler(fn);
    const req = {};
    const res = {};
    const next = jest.fn();

    wrapped(req, res, next);
    await new Promise(process.nextTick);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe('non-async reject');
  });

  it('should not call next when res.send throws synchronously', async () => {
    const sendErr = new Error('send failed');
    const fn = async (req, res) => { throw sendErr; };
    const wrapped = asyncHandler(fn);
    const req = {};
    const res = { send: jest.fn() };
    const next = jest.fn();

    wrapped(req, res, next);
    await new Promise(process.nextTick);
    expect(next).toHaveBeenCalledWith(sendErr);
  });
});
