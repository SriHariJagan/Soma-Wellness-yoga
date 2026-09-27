import { jest, describe, it, expect, beforeAll } from '@jest/globals';

let buildAudienceFilter;

beforeAll(async () => {
  const mod = await import('../../../services/bulkEmailService.js');
  buildAudienceFilter = mod.buildAudienceFilter;
});

describe('bulk-email audience filter (pure, no DB)', () => {
  it('targets students by default', () => {
    const f = buildAudienceFilter({ audience: {} });
    expect(f.role).toBe('student');
    expect(f.status).toEqual({ $ne: 'banned' });
  });

  it('allUsers drops the role restriction', () => {
    const f = buildAudienceFilter({ audience: { allUsers: true } });
    expect(f.role).toBeUndefined();
  });

  it('honours explicit roles', () => {
    const f = buildAudienceFilter({ audience: { roles: ['student', 'reception'] } });
    expect(f.role).toEqual({ $in: ['student', 'reception'] });
  });

  it('upper-cases country codes', () => {
    const f = buildAudienceFilter({ audience: { countries: ['ke', 'ug'] } });
    expect(f.countryCode).toEqual({ $in: ['KE', 'UG'] });
  });

  it('merges a custom userQuery (which may target any role)', () => {
    const f = buildAudienceFilter({ audience: { userQuery: { emailVerified: true } } });
    expect(f.emailVerified).toBe(true);
    // No forced student role — userQuery is trusted for custom targeting.
    expect(f.role).toBeUndefined();
  });
});
