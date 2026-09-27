import { jest, describe, it, expect, beforeAll } from '@jest/globals';

let validateWeeklyBody;

beforeAll(async () => {
  const mod = await import('../../../controllers/bulkEmailController.js');
  validateWeeklyBody = mod.validateWeeklyBody;
});

const valid = {
  name: 'Monday motivation',
  subject: 'Your weekly note',
  bodyHtml: '<p>Hello</p>',
  dayOfWeek: 1,
  time: '09:00',
};

describe('bulk-email schedule validation', () => {
  it('accepts a valid weekly campaign (Monday 09:00)', () => {
    expect(() => validateWeeklyBody(valid)).not.toThrow();
  });

  it('accepts every weekday 1–7', () => {
    for (let d = 1; d <= 7; d++) {
      expect(() => validateWeeklyBody({ ...valid, dayOfWeek: d })).not.toThrow();
    }
  });

  it('rejects invalid weekday', () => {
    expect(() => validateWeeklyBody({ ...valid, dayOfWeek: 0 })).toThrow();
    expect(() => validateWeeklyBody({ ...valid, dayOfWeek: 8 })).toThrow();
  });

  it('rejects invalid time', () => {
    expect(() => validateWeeklyBody({ ...valid, time: '9am' })).toThrow();
    expect(() => validateWeeklyBody({ ...valid, time: '24:00' })).toThrow();
  });

  it('rejects missing name/subject/body', () => {
    expect(() => validateWeeklyBody({ ...valid, name: '' })).toThrow();
    expect(() => validateWeeklyBody({ ...valid, subject: '' })).toThrow();
    expect(() => validateWeeklyBody({ ...valid, bodyHtml: '' })).toThrow();
  });
});
