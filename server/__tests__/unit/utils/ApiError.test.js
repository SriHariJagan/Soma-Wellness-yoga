import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import util from 'util';

let ApiError;

beforeAll(async () => {
  const mod = await import('../../../utils/ApiError.js');
  ApiError = mod.default;
});

describe('ApiError constructor', () => {
  it('should set statusCode, message, and isOperational', () => {
    const err = new ApiError(418, 'I am a teapot');
    expect(err.statusCode).toBe(418);
    expect(err.message).toBe('I am a teapot');
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it('should capture stack trace', () => {
    const err = new ApiError(400, 'test');
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('ApiError.test.js');
  });

  it('should set details when provided', () => {
    const details = { field: 'email', reason: 'already exists' };
    const err = new ApiError(409, 'Conflict', details);
    expect(err.details).toEqual(details);
    expect(err.statusCode).toBe(409);
  });

  it('should default details to undefined when not provided', () => {
    const err = new ApiError(400, 'Bad request');
    expect(err.details).toBeUndefined();
  });

  it('should have name "Error" by default', () => {
    const err = new ApiError(500, 'Server error');
    expect(err.name).toBe('Error');
  });
});

describe('ApiError.badRequest', () => {
  it('should return a 400 error with default message', () => {
    const err = ApiError.badRequest();
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Bad request');
  });

  it('should return a 400 error with custom message and details', () => {
    const err = ApiError.badRequest('Invalid input', { field: 'name' });
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Invalid input');
    expect(err.details).toEqual({ field: 'name' });
  });
});

describe('ApiError.unauthorized', () => {
  it('should return a 401 error with default message', () => {
    const err = ApiError.unauthorized();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Unauthorized');
  });

  it('should return a 401 error with custom message', () => {
    const err = ApiError.unauthorized('No token provided');
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('No token provided');
  });
});

describe('ApiError.forbidden', () => {
  it('should return a 403 error with default message', () => {
    const err = ApiError.forbidden();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Forbidden');
  });

  it('should return a 403 error with custom message', () => {
    const err = ApiError.forbidden('Access denied');
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Access denied');
  });
});

describe('ApiError.notFound', () => {
  it('should return a 404 error with default message', () => {
    const err = ApiError.notFound();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Resource not found');
  });

  it('should return a 404 error with custom message', () => {
    const err = ApiError.notFound('User not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('User not found');
  });
});

describe('ApiError.conflict', () => {
  it('should return a 409 error with default message', () => {
    const err = ApiError.conflict();
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('Conflict');
  });

  it('should return a 409 error with custom message and details', () => {
    const err = ApiError.conflict('Email already registered', { field: 'email' });
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('Email already registered');
    expect(err.details).toEqual({ field: 'email' });
  });
});

describe('ApiError instanceof and stack', () => {
  it('should be an instance of Error', () => {
    expect(ApiError.badRequest()).toBeInstanceOf(Error);
  });

  it('should be an instance of ApiError', () => {
    expect(ApiError.notFound()).toBeInstanceOf(ApiError);
  });

  it('should have a stack trace', () => {
    const err = ApiError.forbidden('Test');
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('ApiError');
  });

  it('should work with instanceof checks correctly', () => {
    const err = ApiError.conflict();
    expect(err instanceof Error).toBe(true);
    expect(err instanceof ApiError).toBe(true);
    expect(err.name).toBe('Error');
  });
});
