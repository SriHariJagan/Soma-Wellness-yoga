import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

/**
 * Sanitize a string by stripping all HTML tags and trimming whitespace.
 */
export function sanitizeString(input, maxLength = 5000) {
  if (typeof input !== 'string') return input;
  return purify.sanitize(input, { ALLOWED_TAGS: [] }).trim().slice(0, maxLength);
}

/**
 * Sanitize multiple string fields on an object (mutates in place).
 */
export function sanitizeFields(obj, fields) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const field of fields) {
    if (obj[field] && typeof obj[field] === 'string') {
      obj[field] = sanitizeString(obj[field]);
    }
  }
  return obj;
}

export default sanitizeString;
