import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * QA-001 — Redis readiness race in pingRedis().
 *
 * buildRedisOptions() sets `enableOfflineQueue: false` so that commands fail
 * fast when Redis is down instead of queueing forever. That is correct.
 *
 * The bug: pingRedis() creates the shared connection and IMMEDIATELY calls
 * conn.ping() without waiting for the client to reach status 'ready'. While the
 * client is still 'connecting', a command with enableOfflineQueue:false does not
 * queue and does not wait — it throws synchronously:
 *   "Stream isn't writeable and enableOfflineQueue options is false"
 *
 * So on a cold/slow boot pingRedis() returns false even when Redis is perfectly
 * healthy, and server.js permanently skips startBullWorker(), startWebhookWorker()
 * and notificationScheduler() for the whole process lifetime (no later re-check).
 *
 * Net effect: background notification delivery, webhook retries, reminder
 * scheduling and bulk-email scheduling silently degrade on every cold start.
 */

const listeners = new Map();
let pingImpl = null;
let statusValue = 'ready';
let readyTimer = null;

function emit(event) {
  for (const fn of listeners.get(event) || []) fn();
}

/** Schedule the simulated ioredis handshake completing after `ms`. */
function becomeReadyAfter(ms) {
  readyTimer = setTimeout(() => { statusValue = 'ready'; }, ms);
}

const mockRedis = {
  status: 'ready',
  on(ev, fn) {
    if (!listeners.has(ev)) listeners.set(ev, []);
    listeners.get(ev).push(fn);
    return mockRedis;
  },
  ping: jest.fn(async () => {
    if (typeof pingImpl === 'function') return pingImpl();
    return 'PONG';
  }),
  quit: jest.fn(async () => {}),
};

jest.unstable_mockModule('ioredis', () => ({
  default: class IORedisMock {
    constructor() {
      Object.defineProperty(this, 'status', { get: () => statusValue });
      this.ping = mockRedis.ping;
      this.quit = mockRedis.quit;
      this.on = mockRedis.on;
    }
  },
}));

jest.unstable_mockModule('../../../notification/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

let pingRedis;
let getRedisConnection;
let closeRedisConnections;

beforeEach(async () => {
  listeners.clear();
  pingImpl = null;
  statusValue = 'ready';
  if (readyTimer) { clearTimeout(readyTimer); readyTimer = null; }
  mockRedis.ping.mockClear();

  const mod = await import('../../../notification/queue/connection.js');
  pingRedis = mod.pingRedis;
  getRedisConnection = mod.getRedisConnection;
  closeRedisConnections = mod.closeRedisConnections;
  closeRedisConnections();
});

afterEach(async () => {
  if (readyTimer) { clearTimeout(readyTimer); readyTimer = null; }
  closeRedisConnections();
});

describe('QA-001 pingRedis readiness handling', () => {
  it('returns true when the client is already ready', async () => {
    statusValue = 'ready';
    await expect(pingRedis(1500)).resolves.toBe(true);
  });

  it('QA-001: waits for the client to become ready instead of throwing while connecting', async () => {
    // Simulate ioredis: status is 'connecting' at call time and flips to
    // 'ready' shortly afterwards.
    statusValue = 'connecting';
    let pingThrowsWhileNotReady = true;
    pingImpl = async () => {
      if (pingThrowsWhileNotReady && statusValue !== 'ready') {
        const err = new Error("Stream isn't writeable and enableOfflineQueue options is false");
        throw err;
      }
      return 'PONG';
    };
    becomeReadyAfter(40);

    const result = await pingRedis(3000);

    expect(result).toBe(true);
    expect(mockRedis.ping).toHaveBeenCalled();
  });

  it('returns false (does not hang) when Redis never becomes ready', async () => {
    statusValue = 'connecting';
    pingImpl = async () => {
      const err = new Error("Stream isn't writeable and enableOfflineQueue options is false");
      throw err;
    };
    const started = Date.now();
    const result = await pingRedis(300);
    expect(result).toBe(false);
    // must respect the bounded timeout rather than blocking boot
    expect(Date.now() - started).toBeLessThan(2000);
  });

it('short-circuits to true when the client status is already ready', async () => {
    statusValue = 'ready';
    // The implementation returns early on status==='ready' without issuing a
    // command. Documented so the optimisation is not mistaken for a bug.
    await expect(pingRedis(1000)).resolves.toBe(true);
    expect(mockRedis.ping).not.toHaveBeenCalled();
  });

  it('returns false on a genuine connection error while connecting', async () => {
    statusValue = 'connecting';
    pingImpl = async () => { throw new Error('ECONNREFUSED'); };
    await expect(pingRedis(1000)).resolves.toBe(false);
  });

  it('never rejects — callers treat the result as a boolean', async () => {
    statusValue = 'connecting';
    pingImpl = async () => { throw new Error('boom'); };
    const r = await pingRedis(500);
    expect(typeof r).toBe('boolean');
    expect(r).toBe(false);
  });

  it('getRedisConnection returns a stable singleton', () => {
    const a = getRedisConnection();
    const b = getRedisConnection();
    expect(a).toBe(b);
  });
});