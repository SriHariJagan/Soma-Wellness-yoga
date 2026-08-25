import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

const mockIncr = jest.fn();
const mockPexpire = jest.fn();

jest.unstable_mockModule('../../../config/redis.js', () => ({
  getRedisClient: jest.fn(() => ({
    incr: mockIncr,
    pexpire: mockPexpire,
  })),
}));

let rateLimit;

beforeAll(async () => {
  const mod = await import('../../../middleware/rateLimit.js');
  rateLimit = mod.default;
});

beforeEach(() => {
  mockIncr.mockReset();
  mockPexpire.mockReset();
  mockPexpire.mockResolvedValue('OK');
});

function makeReq(ip, path = '/test', baseUrl = '') {
  return { ip, method: 'GET', path, baseUrl, header: jest.fn() };
}

function makeRes() {
  const headers = {};
  return {
    setHeader: jest.fn((k, v) => { headers[k] = v; }),
    getHeader: (k) => headers[k],
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('rateLimit', () => {
  it('should allow requests under the limit', async () => {
    const limiter = rateLimit({ windowMs: 60000, max: 5 });

    for (let i = 0; i < 5; i++) {
      mockIncr.mockResolvedValueOnce(i + 1);
      const next = jest.fn();
      const res = makeRes();
      await limiter(makeReq('1.2.3.4'), res, next);
      expect(next).toHaveBeenCalledWith();
      expect(next.mock.calls[0]).toHaveLength(0);
    }
  });

  it('should block requests over the limit with 429', async () => {
    const limiter = rateLimit({ windowMs: 60000, max: 3 });

    for (let i = 0; i < 3; i++) {
      mockIncr.mockResolvedValueOnce(i + 1);
      await limiter(makeReq('1.2.3.4'), makeRes(), jest.fn());
    }

    mockIncr.mockResolvedValueOnce(4);
    const nextBlocked = jest.fn();
    await limiter(makeReq('1.2.3.4'), makeRes(), nextBlocked);
    expect(nextBlocked).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 429 }),
    );
  });

  it('should set X-RateLimit-Limit header', async () => {
    const limiter = rateLimit({ windowMs: 60000, max: 10 });
    mockIncr.mockResolvedValueOnce(1);

    const next = jest.fn();
    const res = makeRes();
    await limiter(makeReq('1.1.1.1'), res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
  });

  it('should set X-RateLimit-Remaining header decreasing', async () => {
    const limiter = rateLimit({ windowMs: 60000, max: 5 });

    mockIncr.mockResolvedValueOnce(1);
    const res1 = makeRes();
    await limiter(makeReq('1.1.1.1'), res1, jest.fn());
    expect(res1.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);

    mockIncr.mockResolvedValueOnce(2);
    const res2 = makeRes();
    await limiter(makeReq('1.1.1.1'), res2, jest.fn());
    expect(res2.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 3);
  });

  it('should set X-RateLimit-Remaining to 0 when exceeded', async () => {
    const limiter = rateLimit({ windowMs: 60000, max: 2 });

    mockIncr.mockResolvedValueOnce(1);
    await limiter(makeReq('1.1.1.1'), makeRes(), jest.fn());
    mockIncr.mockResolvedValueOnce(2);
    await limiter(makeReq('1.1.1.1'), makeRes(), jest.fn());
    mockIncr.mockResolvedValueOnce(3);
    const res3 = makeRes();
    await limiter(makeReq('1.1.1.1'), res3, jest.fn());
    expect(res3.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
  });

  it('should separate buckets for different IPs', async () => {
    const limiter = rateLimit({ windowMs: 60000, max: 2 });

    mockIncr.mockResolvedValueOnce(1);
    mockIncr.mockResolvedValueOnce(2);
    await limiter(makeReq('1.1.1.1'), makeRes(), jest.fn());
    await limiter(makeReq('1.1.1.1'), makeRes(), jest.fn());

    mockIncr.mockResolvedValueOnce(3);
    const nextBlock = jest.fn();
    await limiter(makeReq('1.1.1.1'), makeRes(), nextBlock);
    expect(nextBlock).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 429 }));

    mockIncr.mockResolvedValueOnce(1);
    const nextOther = jest.fn();
    await limiter(makeReq('2.2.2.2'), makeRes(), nextOther);
    expect(nextOther).toHaveBeenCalledWith();
  });

  it('should separate buckets for different paths', async () => {
    const limiter = rateLimit({ windowMs: 60000, max: 2 });

    mockIncr.mockResolvedValueOnce(1);
    mockIncr.mockResolvedValueOnce(2);
    await limiter(makeReq('1.1.1.1', '/api/a'), makeRes(), jest.fn());
    await limiter(makeReq('1.1.1.1', '/api/a'), makeRes(), jest.fn());

    mockIncr.mockResolvedValueOnce(3);
    const nextBlock = jest.fn();
    await limiter(makeReq('1.1.1.1', '/api/a'), makeRes(), nextBlock);
    expect(nextBlock).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 429 }));

    mockIncr.mockResolvedValueOnce(1);
    const nextOther = jest.fn();
    await limiter(makeReq('1.1.1.1', '/api/b'), makeRes(), nextOther);
    expect(nextOther).toHaveBeenCalledWith();
  });

  it('should separate buckets for different baseUrl', async () => {
    const limiter = rateLimit({ windowMs: 60000, max: 1 });

    mockIncr.mockResolvedValueOnce(1);
    await limiter(makeReq('1.1.1.1', '/test', '/api/v1'), makeRes(), jest.fn());

    mockIncr.mockResolvedValueOnce(2);
    const nextBlock = jest.fn();
    await limiter(makeReq('1.1.1.1', '/test', '/api/v1'), makeRes(), nextBlock);
    expect(nextBlock).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 429 }));

    mockIncr.mockResolvedValueOnce(1);
    const nextOther = jest.fn();
    await limiter(makeReq('1.1.1.1', '/test', '/api/v2'), makeRes(), nextOther);
    expect(nextOther).toHaveBeenCalledWith();
  });

  it('should use default options', async () => {
    const limiter = rateLimit();

    for (let i = 0; i < 100; i++) {
      mockIncr.mockResolvedValueOnce(i + 1);
      await limiter(makeReq('1.1.1.1'), makeRes(), jest.fn());
    }

    mockIncr.mockResolvedValueOnce(101);
    const nextOver = jest.fn();
    await limiter(makeReq('1.1.1.1'), makeRes(), nextOver);
    expect(nextOver).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 429 }));
  });

  it('should support custom windowMs and max', async () => {
    const limiter = rateLimit({ windowMs: 10000, max: 1 });

    mockIncr.mockResolvedValueOnce(1);
    const res1 = makeRes();
    const next1 = jest.fn();
    await limiter(makeReq('1.1.1.1'), res1, next1);
    expect(next1).toHaveBeenCalledWith();

    mockIncr.mockResolvedValueOnce(2);
    const next2 = jest.fn();
    await limiter(makeReq('1.1.1.1'), makeRes(), next2);
    expect(next2).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 429 }));

    expect(res1.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 1);
  });

  it('should use custom error message', async () => {
    const limiter = rateLimit({ windowMs: 60000, max: 1, message: 'Custom msg' });

    mockIncr.mockResolvedValueOnce(1);
    await limiter(makeReq('1.1.1.1'), makeRes(), jest.fn());

    mockIncr.mockResolvedValueOnce(2);
    const nextOver = jest.fn();
    await limiter(makeReq('1.1.1.1'), makeRes(), nextOver);
    expect(nextOver).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 429, message: 'Custom msg' }));
  });

  it('should set pexpire on first request', async () => {
    const limiter = rateLimit({ windowMs: 60000, max: 5 });

    mockIncr.mockResolvedValueOnce(1);
    await limiter(makeReq('1.1.1.1'), makeRes(), jest.fn());
    expect(mockPexpire).toHaveBeenCalledWith(expect.stringContaining('rateLimit:'), 60000);
  });

  it('should not set pexpire on subsequent requests', async () => {
    const limiter = rateLimit({ windowMs: 60000, max: 5 });

    mockIncr.mockResolvedValueOnce(1);
    await limiter(makeReq('1.1.1.1'), makeRes(), jest.fn());
    expect(mockPexpire).toHaveBeenCalledTimes(1);

    mockIncr.mockResolvedValueOnce(2);
    await limiter(makeReq('1.1.1.1'), makeRes(), jest.fn());
    expect(mockPexpire).toHaveBeenCalledTimes(1);
  });

  it('should fail open when Redis is down', async () => {
    const limiter = rateLimit({ windowMs: 60000, max: 1 });

    mockIncr.mockRejectedValueOnce(new Error('Redis down'));

    const next = jest.fn();
    await limiter(makeReq('1.1.1.1'), makeRes(), next);
    expect(next).toHaveBeenCalledWith();
  });
});
