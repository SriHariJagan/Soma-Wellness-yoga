import { jest, describe, it, expect, beforeAll } from '@jest/globals';

let schemas;
let validate;

beforeAll(async () => {
  const mod = await import('../../../middleware/validate.js');
  schemas = mod.schemas;
  validate = mod.validate;
});

function run(schema, body) {
  const req = { method: 'POST', path: '/', baseUrl: '', ip: '127.0.0.1', body, header: jest.fn() };
  const state = { statusCode: 200, body: null };
  const res = {
    state,
    status: jest.fn((code) => { state.statusCode = code; return res; }),
    json: jest.fn((b) => { state.body = b; return res; }),
    setHeader: jest.fn(),
  };
  const next = jest.fn();
  validate(schema)(req, res, next);
  return { req, res, next, state };
}

describe('country of residency validation', () => {
  it('register accepts a valid country (KE default)', () => {
    const { next, req, state } = run(schemas.register, {
      name: 'Amina Yusuf',
      email: 'amina@example.com',
      password: 'secret123',
      country: 'Kenya',
      countryCode: 'KE',
    });
    expect(state.statusCode).toBe(200);
    expect(next).toHaveBeenCalledWith();
    expect(req.body.countryCode).toBe('KE');
    expect(req.body.country).toBe('Kenya');
  });

  it('register accepts any valid ISO country (not Kenya-only)', () => {
    const { next, req } = run(schemas.register, {
      name: 'John Smith',
      email: 'john@example.com',
      password: 'secret123',
      country: 'United States',
      countryCode: 'us',
    });
    expect(next).toHaveBeenCalledWith();
    expect(req.body.countryCode).toBe('US');
  });

  it('register rejects an invalid country code', () => {
    const { next, state } = run(schemas.register, {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'secret123',
      countryCode: 'XX',
    });
    expect(next).not.toHaveBeenCalled();
    expect(state.statusCode).toBe(400);
  });

  it('register works without country (historical/OAuth compatible)', () => {
    const { next } = run(schemas.register, {
      name: 'No Country',
      email: 'nocountry@example.com',
      password: 'secret123',
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('updateProfile accepts country changes', () => {
    const { next, req } = run(schemas.updateProfile, { country: 'Uganda', countryCode: 'UG' });
    expect(next).toHaveBeenCalledWith();
    expect(req.body.countryCode).toBe('UG');
  });

  it('updateProfile rejects invalid country code', () => {
    const { next, state } = run(schemas.updateProfile, { countryCode: 'ZZ' });
    expect(next).not.toHaveBeenCalled();
    expect(state.statusCode).toBe(400);
  });
});
