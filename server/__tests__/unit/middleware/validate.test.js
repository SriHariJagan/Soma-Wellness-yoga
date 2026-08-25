import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

let validate;
let schemas;

beforeAll(async () => {
  const mod = await import('../../../middleware/validate.js');
  validate = mod.default;
  schemas = mod.schemas;
});

function makeReq(body) {
  return {
    method: 'POST',
    path: '/',
    baseUrl: '',
    ip: '127.0.0.1',
    body,
    header: jest.fn(),
  };
}

function makeRes() {
  const state = { statusCode: 200, body: null };
  const res = {
    state,
    status: jest.fn((code) => { state.statusCode = code; return res; }),
    json: jest.fn((body) => { state.body = body; return res; }),
    setHeader: jest.fn(),
  };
  return res;
}

describe('validate middleware', () => {
  describe('register schema', () => {
    it('should pass validation with valid data', () => {
      const middleware = validate(schemas.register);
      const req = makeReq({
        name: 'John Doe',
        email: 'JOHN@EXAMPLE.COM',
        password: 'secret123',
        phone: '1234567890',
        city: 'Mumbai',
        style: 'Vinyasa',
        level: 'Intermediate',
      });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.email).toBe('john@example.com');
      expect(req.body.name).toBe('John Doe');
      expect(req.body.phone).toBe('1234567890');
      expect(req.body.city).toBe('Mumbai');
      expect(req.body.style).toBe('Vinyasa');
      expect(req.body.level).toBe('Intermediate');
    });

    it('should apply defaults for optional fields', () => {
      const middleware = validate(schemas.register);
      const req = makeReq({
        name: 'Jane',
        email: 'jane@test.com',
        password: '123456',
      });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.phone).toBe('');
      expect(req.body.city).toBe('');
      expect(req.body.style).toBe('Hatha');
      expect(req.body.level).toBe('Beginner');
    });

    it('should fail when name is missing', () => {
      const middleware = validate(schemas.register);
      const req = makeReq({ email: 'test@test.com', password: '123456' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
      expect(res.state.body.success).toBe(false);
      expect(res.state.body.error).toBe('Validation failed');
      expect(res.state.body.details.some((d) => d.field === 'name')).toBe(true);
    });

    it('should fail when name is empty', () => {
      const middleware = validate(schemas.register);
      const req = makeReq({ name: '', email: 'test@test.com', password: '123456' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
      expect(res.state.body.details[0].field).toBe('name');
    });

    it('should fail with invalid email format', () => {
      const middleware = validate(schemas.register);
      const req = makeReq({ name: 'Test', email: 'not-an-email', password: '123456' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
      expect(res.state.body.details[0].field).toBe('email');
    });

    it('should fail when password is too short', () => {
      const middleware = validate(schemas.register);
      const req = makeReq({ name: 'Test', email: 'test@test.com', password: '12345' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
      expect(res.state.body.details[0].field).toBe('password');
    });

    it('should trim whitespace from name', () => {
      const middleware = validate(schemas.register);
      const req = makeReq({ name: '  John  ', email: 'test@test.com', password: '123456' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.name).toBe('John');
    });

    it('should lowercase email', () => {
      const middleware = validate(schemas.register);
      const req = makeReq({ name: 'Test', email: 'TEST@EXAMPLE.COM', password: '123456' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.email).toBe('test@example.com');
    });

    it('should accept password as optional and apply default', () => {
      const middleware = validate(schemas.register);
      const req = makeReq({ name: 'Test', email: 'test@test.com' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.password).toBeUndefined();
    });

    it('should fail when email exceeds 255 characters', () => {
      const middleware = validate(schemas.register);
      const longEmail = 'a'.repeat(250) + '@b.com';
      const req = makeReq({ name: 'Test', email: longEmail, password: '123456' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });

    it('should fail when password exceeds 128 characters', () => {
      const middleware = validate(schemas.register);
      const req = makeReq({ name: 'Test', email: 'test@test.com', password: 'a'.repeat(129) });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
      expect(res.state.body.details[0].field).toBe('password');
    });
  });

  describe('login schema', () => {
    it('should pass validation with valid data', () => {
      const middleware = validate(schemas.login);
      const req = makeReq({ email: 'Test@Example.COM', password: 'mypassword' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.email).toBe('test@example.com');
      expect(req.body.password).toBe('mypassword');
    });

    it('should fail when email is missing', () => {
      const middleware = validate(schemas.login);
      const req = makeReq({ password: 'mypassword' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
      expect(res.state.body.details[0].field).toBe('email');
    });

    it('should fail when password is empty', () => {
      const middleware = validate(schemas.login);
      const req = makeReq({ email: 'test@test.com', password: '' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
      expect(res.state.body.details[0].field).toBe('password');
    });

    it('should fail with invalid email format', () => {
      const middleware = validate(schemas.login);
      const req = makeReq({ email: 'invalid', password: 'password' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });

    it('should lowercase email', () => {
      const middleware = validate(schemas.login);
      const req = makeReq({ email: 'USER@DOMAIN.COM', password: 'pass' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.email).toBe('user@domain.com');
    });
  });

  describe('forgotPassword schema', () => {
    it('should pass with valid email', () => {
      const middleware = validate(schemas.forgotPassword);
      const req = makeReq({ email: 'test@test.com' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.email).toBe('test@test.com');
    });

    it('should lowercase email', () => {
      const middleware = validate(schemas.forgotPassword);
      const req = makeReq({ email: 'TEST@TEST.COM' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.email).toBe('test@test.com');
    });

    it('should fail with invalid email', () => {
      const middleware = validate(schemas.forgotPassword);
      const req = makeReq({ email: 'not-email' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });

    it('should fail when email is missing', () => {
      const middleware = validate(schemas.forgotPassword);
      const req = makeReq({});
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });
  });

  describe('resetPassword schema', () => {
    it('should pass with valid newPassword', () => {
      const middleware = validate(schemas.resetPassword);
      const req = makeReq({ newPassword: 'newpassword123' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should fail when newPassword is too short', () => {
      const middleware = validate(schemas.resetPassword);
      const req = makeReq({ newPassword: '12345' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });

    it('should fail when newPassword exceeds 128 characters', () => {
      const middleware = validate(schemas.resetPassword);
      const req = makeReq({ newPassword: 'a'.repeat(129) });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });

    it('should fail when newPassword is missing', () => {
      const middleware = validate(schemas.resetPassword);
      const req = makeReq({});
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });
  });

  describe('changePassword schema', () => {
    it('should pass with valid currentPassword and newPassword', () => {
      const middleware = validate(schemas.changePassword);
      const req = makeReq({ currentPassword: 'oldpass', newPassword: 'newpass123' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should fail when currentPassword is missing', () => {
      const middleware = validate(schemas.changePassword);
      const req = makeReq({ newPassword: 'newpass123' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
      expect(res.state.body.details[0].field).toBe('currentPassword');
    });

    it('should fail when currentPassword is empty', () => {
      const middleware = validate(schemas.changePassword);
      const req = makeReq({ currentPassword: '', newPassword: 'newpass123' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });

    it('should fail when newPassword is too short', () => {
      const middleware = validate(schemas.changePassword);
      const req = makeReq({ currentPassword: 'oldpass', newPassword: '12345' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });
  });

  describe('updateProfile schema', () => {
    it('should pass with valid partial update (name only)', () => {
      const middleware = validate(schemas.updateProfile);
      const req = makeReq({ name: 'Updated Name' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.name).toBe('Updated Name');
    });

    it('should pass with valid partial update (email not allowed)', () => {
      const middleware = validate(schemas.updateProfile);
      const req = makeReq({ phone: '9876543210', city: 'Delhi' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.phone).toBe('9876543210');
      expect(req.body.city).toBe('Delhi');
    });

    it('should pass with all optional fields', () => {
      const middleware = validate(schemas.updateProfile);
      const req = makeReq({
        name: 'Full Update',
        phone: '1111111111',
        city: 'Goa',
        style: 'Ashtanga',
        level: 'Advanced',
        bio: 'I love yoga',
        newPassword: 'newpassword',
      });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.name).toBe('Full Update');
      expect(req.body.bio).toBe('I love yoga');
      expect(req.body.newPassword).toBe('newpassword');
    });

    it('should pass with empty body (all optional)', () => {
      const middleware = validate(schemas.updateProfile);
      const req = makeReq({});
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body).toEqual({});
    });

    it('should fail when name is empty string', () => {
      const middleware = validate(schemas.updateProfile);
      const req = makeReq({ name: '' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });

    it('should fail when bio exceeds 500 characters', () => {
      const middleware = validate(schemas.updateProfile);
      const req = makeReq({ bio: 'a'.repeat(501) });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });

    it('should fail when newPassword is too short', () => {
      const middleware = validate(schemas.updateProfile);
      const req = makeReq({ newPassword: '12345' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });

    it('should trim name field', () => {
      const middleware = validate(schemas.updateProfile);
      const req = makeReq({ name: '  Spaced Name  ' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.name).toBe('Spaced Name');
    });
  });

  describe('createOrder schema', () => {
    it('should pass with valid amount', () => {
      const middleware = validate(schemas.createOrder);
      const req = makeReq({ amount: 50000 });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.amount).toBe(50000);
    });

    it('should fail when amount is below minimum', () => {
      const middleware = validate(schemas.createOrder);
      const req = makeReq({ amount: 50 });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });

    it('should fail when amount exceeds maximum', () => {
      const middleware = validate(schemas.createOrder);
      const req = makeReq({ amount: 100000001 });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });

    it('should fail when amount is not an integer', () => {
      const middleware = validate(schemas.createOrder);
      const req = makeReq({ amount: 99.99 });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });

    it('should fail when amount is missing', () => {
      const middleware = validate(schemas.createOrder);
      const req = makeReq({});
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });
  });

  describe('verifyPayment schema', () => {
    it('should pass with required fields only', () => {
      const middleware = validate(schemas.verifyPayment);
      const req = makeReq({
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'sig_123',
      });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should pass with all optional fields', () => {
      const middleware = validate(schemas.verifyPayment);
      const req = makeReq({
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'sig_123',
        userId: 'user_123',
        amount: 50000,
        totalAmount: 55000,
        description: 'Monthly pass',
      });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.userId).toBe('user_123');
      expect(req.body.amount).toBe(50000);
    });

    it('should fail when razorpay_order_id is missing', () => {
      const middleware = validate(schemas.verifyPayment);
      const req = makeReq({
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'sig_123',
      });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });

    it('should fail when razorpay_order_id is empty', () => {
      const middleware = validate(schemas.verifyPayment);
      const req = makeReq({
        razorpay_order_id: '',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'sig_123',
      });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });

    it('should fail when razorpay_payment_id is missing', () => {
      const middleware = validate(schemas.verifyPayment);
      const req = makeReq({
        razorpay_order_id: 'order_123',
        razorpay_signature: 'sig_123',
      });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });

    it('should fail when razorpay_signature is missing', () => {
      const middleware = validate(schemas.verifyPayment);
      const req = makeReq({
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
      });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
    });
  });

  describe('validation error format', () => {
    it('should return 400 with proper error structure', () => {
      const middleware = validate(schemas.register);
      const req = makeReq({ name: '', email: 'bad' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
      expect(res.state.body).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({ field: expect.any(String), message: expect.any(String) }),
          ]),
        }),
      );
    });

    it('should include all validation errors, not just the first', () => {
      const middleware = validate(schemas.register);
      const req = makeReq({ name: '', email: 'invalid', password: '12345' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.state.statusCode).toBe(400);
      expect(res.state.body.details.length).toBeGreaterThanOrEqual(3);
    });

    it('should not modify req.body when validation fails', () => {
      const body = { name: '', email: 'bad' };
      const middleware = validate(schemas.register);
      const req = makeReq(body);
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.body).toBe(body);
    });
  });
});
