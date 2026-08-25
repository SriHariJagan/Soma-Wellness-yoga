import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { buildUser, buildNotification } from '../../helpers.js';

// ── Mocks ──────────────────────────────────────────────

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
jest.unstable_mockModule('../../../notification/logger.js', () => ({ default: mockLogger }));

// In-memory store for User model
const userStore = new Map();
// Build a chainable Query object for Mongoose-style chaining (.select().lean().session())
function queryChain(result) {
  const chain = {
    select: jest.fn(() => chain),
    lean: jest.fn(() => chain),
    session: jest.fn(() => chain),
    exec: jest.fn(async () => result),
    then: (resolve) => Promise.resolve(result).then(resolve),
    catch: (reject) => Promise.resolve(result).catch(reject),
  };
  return chain;
}

const mockUserModel = {
  findById: jest.fn((id) => {
    const user = userStore.get(String(id));
    return queryChain(user || null);
  }),
  updateMany: jest.fn(async (filter, update) => {
    for (const [key, user] of userStore) {
      if (filter._id?.$in?.some((id) => String(id) === key)) {
        userStore.set(key, { ...user, ...(update.$set || {}), ...(update.$inc ? { unreadNotifications: (user.unreadNotifications || 0) + (update.$inc.unreadNotifications || 0) } : {}) });
      }
    }
    return { modifiedCount: filter._id?.$in?.length || 0 };
  }),
};

const notifStore = [];
const mockNotificationModel = {
  create: jest.fn(async (docs) => {
    const created = docs.map((d) => ({
      _id: new mongoose.Types.ObjectId(),
      ...d,
      createdAt: new Date(),
    }));
    notifStore.push(...created);
    return created;
  }),
  findById: jest.fn(async (id) => notifStore.find((n) => String(n._id) === String(id)) || null),
};

const recipientStore = [];
const mockRecipientModel = {
  insertMany: jest.fn(async (docs) => {
    const created = docs.map((d) => ({
      _id: new mongoose.Types.ObjectId(),
      ...d,
      createdAt: new Date(),
    }));
    recipientStore.push(...created);
    return created;
  }),
  find: jest.fn(() => ({
    populate: () => ({
      sort: () => ({
        limit: () => ({
          lean: jest.fn(async () => recipientStore.filter((r) => true)),
        }),
      }),
    }),
  })),
};

const mockNotificationService = {
  send: jest.fn(async (userId, opts) => ({
    success: true,
    notificationId: opts._existingNotificationId || new mongoose.Types.ObjectId(),
    recipients: [userId],
  })),
};

const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
  withTransaction: jest.fn(),
};

// ── Import after mocks ──
let dispatcher;

beforeAll(async () => {
  jest.unstable_mockModule('../../../models/User.js', () => ({ default: mockUserModel }));
  jest.unstable_mockModule('../../../models/Notification.js', () => ({ default: mockNotificationModel }));
  jest.unstable_mockModule('../../../models/NotificationRecipient.js', () => ({ default: mockRecipientModel }));
  jest.unstable_mockModule('../../../notification/core/NotificationService.js', () => ({ default: mockNotificationService }));

  mockSession.withTransaction.mockImplementation(async (fn) => {
    try {
      await fn();
      await mockSession.commitTransaction();
    } catch (err) {
      await mockSession.abortTransaction();
      throw err;
    }
  });

  mongoose.startSession = jest.fn(async () => mockSession);

  const mod = await import('../../../services/NotificationDispatcher.js');
  dispatcher = mod.default;
});

beforeEach(() => {
  userStore.clear();
  notifStore.length = 0;
  recipientStore.length = 0;
  jest.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────

describe('NotificationDispatcher', () => {
  describe('dispatch (single recipient)', () => {
    it('should create notification + recipient via notificationService.send()', async () => {
      const userId = new mongoose.Types.ObjectId();
      userStore.set(String(userId), { email: 'user@test.com', unreadNotifications: 0 });

      const result = await dispatcher.dispatch({
        recipients: userId,
        title: 'Test title',
        message: 'Test message',
        type: 'info',
      });

      expect(result).toBeTruthy();
      expect(mockNotificationService.send).toHaveBeenCalledTimes(1);
      const sendCall = mockNotificationService.send.mock.calls[0];
      expect(sendCall[0]).toEqual(userId);
      expect(sendCall[1].title).toBe('Test title');
      expect(sendCall[1].message).toBe('Test message');
    });

    it('should use inApp as default channel for single recipient', async () => {
      const userId = new mongoose.Types.ObjectId();
      userStore.set(String(userId), { email: 'user@test.com' });

      await dispatcher.dispatch({ recipients: userId, message: 'hello' });

      const channels = mockNotificationService.send.mock.calls[0][1].channels;
      expect(channels).toEqual(['inApp']);
    });

    it('should pass provided channels to notificationService.send()', async () => {
      const userId = new mongoose.Types.ObjectId();
      userStore.set(String(userId), { email: 'user@test.com' });

      await dispatcher.dispatch({ recipients: userId, message: 'hello', channels: ['email', 'whatsapp'] });

      const channels = mockNotificationService.send.mock.calls[0][1].channels;
      expect(channels).toEqual(['email', 'whatsapp']);
    });

    it('should return null when no recipients provided', async () => {
      const result = await dispatcher.dispatch({ recipients: [], message: 'hello' });
      expect(result).toBeNull();
    });
  });

  describe('dispatch (broadcast / multi-recipient)', () => {
    it('should create one Notification + N recipients in a transaction', async () => {
      const userIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
      for (const id of userIds) {
        userStore.set(String(id), { email: `user${id}@test.com`, unreadNotifications: 0 });
      }

      const result = await dispatcher.dispatch({
        recipients: userIds,
        title: 'Broadcast',
        message: 'To all',
        type: 'workshop_update',
      });

      expect(result).toBeTruthy();
      expect(mockSession.withTransaction).toHaveBeenCalled();
      expect(mockNotificationModel.create).toHaveBeenCalledTimes(1);
      expect(mockRecipientModel.insertMany).toHaveBeenCalledTimes(1);
      expect(mockRecipientModel.insertMany.mock.calls[0][0]).toHaveLength(3);
      expect(mockUserModel.updateMany).toHaveBeenCalledTimes(1);

      const updateFilter = mockUserModel.updateMany.mock.calls[0][0];
      expect(updateFilter._id.$in).toHaveLength(3);
    });

    it('should roll back transaction on error', async () => {
      const userIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
      for (const id of userIds) {
        userStore.set(String(id), { email: 'fail@test.com' });
      }

      mockRecipientModel.insertMany.mockRejectedValueOnce(new Error('DB write failed'));

      let result;
      try {
        result = await dispatcher.dispatch({
          recipients: userIds,
          message: 'Will rollback',
        });
      } catch (e) {
        result = e;
      }

      expect(result).toBeInstanceOf(Error);
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should dispatch channels asynchronously after commit', async () => {
      const userIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
      for (const id of userIds) {
        userStore.set(String(id), { email: `user${id}@test.com`, unreadNotifications: 0 });
      }

      await dispatcher.dispatch({
        recipients: userIds,
        title: 'Async channels',
        message: 'Channel test',
        channels: ['email'],
      });

      // Channel dispatch should have been called
      expect(mockNotificationService.send).toHaveBeenCalled();
      // Should use _existingNotificationId
      const sendCalls = mockNotificationService.send.mock.calls;
      expect(sendCalls.length).toBeGreaterThanOrEqual(2);
      for (const call of sendCalls) {
        expect(call[1]._existingNotificationId).toBeTruthy();
      }
    });
  });

  describe('notify() convenience method', () => {
    it('should delegate to dispatch with single recipient', async () => {
      const userId = new mongoose.Types.ObjectId();
      userStore.set(String(userId), { email: 'notify@test.com' });

      await dispatcher.notify(userId, { message: 'Convenience test' });

      expect(mockNotificationService.send).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.send.mock.calls[0][0]).toEqual(userId);
    });
  });

  describe('broadcast() convenience method', () => {
    it('should delegate to dispatch with multi recipients', async () => {
      const userIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
      for (const id of userIds) {
        userStore.set(String(id), { email: 'broadcast@test.com' });
      }

      await dispatcher.broadcast(userIds, { message: 'Broadcast convenience' });

      expect(mockNotificationModel.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle single string recipient', async () => {
      const userId = new mongoose.Types.ObjectId();
      userStore.set(String(userId), { email: 'string@test.com' });

      await dispatcher.dispatch({ recipients: userId.toString(), message: 'String ID' });

      expect(mockNotificationService.send).toHaveBeenCalledTimes(1);
    });

    it('should handle undefined/null recipients gracefully', async () => {
      const result1 = await dispatcher.dispatch({ recipients: undefined, message: 'no recipients' });
      expect(result1).toBeNull();

      const result2 = await dispatcher.dispatch({ recipients: null, message: 'null recipients' });
      expect(result2).toBeNull();
    });

    it('should filter out falsy values from recipient array', async () => {
      const userId = new mongoose.Types.ObjectId();
      userStore.set(String(userId), { email: 'filter@test.com' });

      const result = await dispatcher.dispatch({ recipients: [userId, null, undefined, ''], message: 'mixed' });

      expect(result).toBeTruthy();
      expect(mockNotificationService.send).toHaveBeenCalledTimes(1);
    });
  });
});
