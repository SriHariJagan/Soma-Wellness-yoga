import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

let sanitizeQueryParams;

beforeAll(async () => {
  const mod = await import('../../../middleware/sanitize.js');
  sanitizeQueryParams = mod.default;
});

function makeReq(query, body) {
  return {
    method: 'POST',
    path: '/',
    baseUrl: '',
    ip: '127.0.0.1',
    query: query || {},
    body: body || {},
    header: jest.fn(),
  };
}

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('sanitizeQueryParams', () => {
  it('should strip $where from query object', () => {
    const req = makeReq({ $where: '1=1', name: 'test' });
    const res = makeRes();
    const next = jest.fn();

    sanitizeQueryParams(req, res, next);

    expect(req.query).not.toHaveProperty('$where');
    expect(req.query.name).toBe('test');
    expect(next).toHaveBeenCalledWith();
  });

  it('should strip $regex from body', () => {
    const req = makeReq({}, { email: { $regex: '.*' }, name: 'safe' });
    const res = makeRes();
    const next = jest.fn();

    sanitizeQueryParams(req, res, next);

    expect(req.body.email).not.toHaveProperty('$regex');
    expect(req.body.name).toBe('safe');
  });

  it('should strip $ne operator', () => {
    const req = makeReq({ age: { $ne: 25 } }, {});
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query.age).toEqual({});
  });

  it('should strip $gt operator', () => {
    const req = makeReq({ price: { $gt: 100 } }, {});
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query.price).toEqual({});
  });

  it('should strip $gte operator', () => {
    const req = makeReq({ price: { $gte: 100 } }, {});
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query.price).toEqual({});
  });

  it('should strip $lt operator', () => {
    const req = makeReq({ price: { $lt: 200 } }, {});
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query.price).toEqual({});
  });

  it('should strip $lte operator', () => {
    const req = makeReq({ price: { $lte: 200 } }, {});
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query.price).toEqual({});
  });

  it('should strip $in operator', () => {
    const req = makeReq({ role: { $in: ['admin', 'superadmin'] } }, {});
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query.role).toEqual({});
  });

  it('should strip $nin operator', () => {
    const req = makeReq({ role: { $nin: ['student'] } }, {});
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query.role).toEqual({});
  });

  it('should strip $exists operator', () => {
    const req = makeReq({ deleted: { $exists: false } }, {});
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query.deleted).toEqual({});
  });

  it('should strip $all operator', () => {
    const req = makeReq({ tags: { $all: ['yoga', 'meditation'] } }, {});
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query.tags).toEqual({});
  });

  it('should strip $elemMatch operator', () => {
    const req = makeReq(
      { scores: { $elemMatch: { subject: 'math', score: { $gte: 90 } } } },
      {},
    );
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query.scores).toEqual({});
  });

  it('should strip $mod operator', () => {
    const req = makeReq({ num: { $mod: [2, 0] } }, {});
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query.num).toEqual({});
  });

  it('should strip $text operator', () => {
    const req = makeReq({ $text: { $search: 'yoga' } }, {});
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query).not.toHaveProperty('$text');
  });

  it('should strip $search operator', () => {
    const req = makeReq({ name: { $search: 'test' } }, {});
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query.name).toEqual({});
  });

  it('should strip $slice operator', () => {
    const req = makeReq({ comments: { $slice: 5 } }, {});
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query.comments).toEqual({});
  });

  it('should strip $natural operator', () => {
    const req = makeReq({ $natural: 1 }, {});
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query).not.toHaveProperty('$natural');
  });

  it('should handle nested objects deeply', () => {
    const req = makeReq(
      { user: { profile: { role: { $ne: 'admin' }, name: 'safe' } } },
      {},
    );
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query.user.profile.role).toEqual({});
    expect(req.query.user.profile.name).toBe('safe');
  });

  it('should sanitize arrays recursively', () => {
    const req = makeReq({}, {
      users: [
        { email: 'a@b.com', role: { $ne: 'admin' } },
        { email: 'b@b.com', role: { $regex: 'admin' } },
      ],
    });
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.body.users[0].role).toEqual({});
    expect(req.body.users[1].role).toEqual({});
    expect(req.body.users[0].email).toBe('a@b.com');
    expect(req.body.users[1].email).toBe('b@b.com');
  });

  it('should leave normal fields untouched', () => {
    const query = { name: 'John', age: 30, city: 'New York' };
    const body = { email: 'john@test.com', message: 'Hello', count: 5 };
    const req = makeReq(query, body);
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query).toEqual({ name: 'John', age: 30, city: 'New York' });
    expect(req.body).toEqual({ email: 'john@test.com', message: 'Hello', count: 5 });
  });

  it('should handle empty objects', () => {
    const req = makeReq({}, {});
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query).toEqual({});
    expect(req.body).toEqual({});
  });

  it('should handle null and primitive values', () => {
    const req = makeReq({ key: null, count: 0, active: false, name: '' }, {});
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query.key).toBeNull();
    expect(req.query.count).toBe(0);
    expect(req.query.active).toBe(false);
    expect(req.query.name).toBe('');
  });

  it('should handle deeply nested arrays of objects', () => {
    const req = makeReq({}, {
      filters: [
        {
          and: [
            { field: 'age', value: { $gt: 18 } },
            { field: 'status', value: { $ne: 'banned' } },
          ],
        },
      ],
    });
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.body.filters[0].and[0].value).toEqual({});
    expect(req.body.filters[0].and[1].value).toEqual({});
    expect(req.body.filters[0].and[0].field).toBe('age');
    expect(req.body.filters[0].and[1].field).toBe('status');
  });

  it('should do case-insensitive matching of NoSQL keywords', () => {
    const req = makeReq({ $WHERE: '1=1', $REGEX: '.*' }, { $Ne: 5, $Gt: { $Gte: 10 } });
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query).not.toHaveProperty('$WHERE');
    expect(req.query).not.toHaveProperty('$REGEX');
    expect(req.body).not.toHaveProperty('$Ne');
    expect(req.body).not.toHaveProperty('$Gt');
  });

  it('should handle mixed safe and dangerous fields', () => {
    const req = makeReq(
      { name: 'test', password: { $ne: '' }, email: 'test@test.com' },
      { title: 'Hello', body: { $regex: 'bad', content: 'good' } },
    );
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query.name).toBe('test');
    expect(req.query.email).toBe('test@test.com');
    expect(req.query.password).toEqual({});
    expect(req.body.title).toBe('Hello');
    expect(req.body.body).toEqual({ content: 'good' });
  });

  it('should sanitize both query and body in a single call', () => {
    const req = makeReq(
      { $where: 'evil()', normal: 'ok' },
      { $regex: 'bad', alsoNormal: 'fine' },
    );
    const next = jest.fn();

    sanitizeQueryParams(req, makeRes(), next);

    expect(req.query).not.toHaveProperty('$where');
    expect(req.query.normal).toBe('ok');
    expect(req.body).not.toHaveProperty('$regex');
    expect(req.body.alsoNormal).toBe('fine');
  });
});
