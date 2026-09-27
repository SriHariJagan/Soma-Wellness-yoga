import { jest, describe, it, expect, beforeAll } from '@jest/globals';

let adminCreateGallery;

beforeAll(async () => {
  const mod = await import('../../../controllers/galleryController.js');
  adminCreateGallery = mod.adminCreateGallery;
});

function run(body, file) {
  const req = { body, file, user: { _id: 'admin-id' } };
  const res = {};
  const next = jest.fn();
  return adminCreateGallery(req, res, next).then(() => ({ next }));
}

describe('gallery upload validation (no DB — fails before any write)', () => {
  it('rejects missing title with 400', async () => {
    const { next } = await run({ title: '', category: 'Studio' }, { buffer: Buffer.from('x'), originalname: 'a.jpg' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });

  it('rejects invalid category with 400', async () => {
    const { next } = await run({ title: 'Test', category: 'Nope' }, { buffer: Buffer.from('x'), originalname: 'a.jpg' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });

  it('rejects missing file with 400 (nothing stored)', async () => {
    const { next } = await run({ title: 'Test', category: 'Studio' }, undefined);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].statusCode).toBe(400);
    expect(next.mock.calls[0][0].message).toMatch(/Image file is required/);
  });
});
