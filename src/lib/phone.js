// Kenya-first phone utilities — fixed digits, country code default +254
export const DEFAULT_COUNTRY_CODE = '+254';

// Minimal country list — Kenya default, extend as needed
export const COUNTRIES = [
  { code: '+254', iso: 'KE', flag: '🇰🇪', name: 'Kenya', digits: 9, placeholder: '712 345 678', minDigits: 9, maxDigits: 9 },
  { code: '+91', iso: 'IN', flag: '🇮🇳', name: 'India', digits: 10, placeholder: '90000 00000', minDigits: 10, maxDigits: 10 },
  { code: '+1', iso: 'US', flag: '🇺🇸', name: 'USA', digits: 10, placeholder: '201 555 0123', minDigits: 10, maxDigits: 10 },
  { code: '+44', iso: 'GB', flag: '🇬🇧', name: 'UK', digits: 10, placeholder: '7400 000000', minDigits: 10, maxDigits: 10 },
  { code: '+971', iso: 'AE', flag: '🇦🇪', name: 'UAE', digits: 9, placeholder: '50 123 4567', minDigits: 9, maxDigits: 9 },
  { code: '+27', iso: 'ZA', flag: '🇿🇦', name: 'South Africa', digits: 9, placeholder: '71 123 4567', minDigits: 9, maxDigits: 9 },
];

export const KENYA = COUNTRIES[0];

export function getCountryByCode(code) {
  return COUNTRIES.find(c => c.code === code) || KENYA;
}

export function stripNonDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

// Parse a full phone string into { countryCode, nationalNumber }
// Handles: "+254712345678", "254712345678", "0712345678", "712345678"
export function parsePhone(fullPhone, defaultCode = DEFAULT_COUNTRY_CODE) {
  const raw = String(fullPhone || '').trim().replace(/[\s\-\(\)]/g, '');
  if (!raw) return { countryCode: defaultCode, nationalNumber: '' };

  // If starts with +, extract country code
  if (raw.startsWith('+')) {
    // Try to match known codes (longest first)
    const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
    for (const c of sorted) {
      if (raw.startsWith(c.code)) {
        return { countryCode: c.code, nationalNumber: stripNonDigits(raw.slice(c.code.length)) };
      }
    }
    // Unknown +code: take + up to 4 digits as code
    const m = raw.match(/^(\+\d{1,4})(\d*)$/);
    if (m) return { countryCode: m[1], nationalNumber: stripNonDigits(m[2]) };
  }

  // Starts with 254 without +
  if (/^254\d+/.test(raw)) {
    return { countryCode: '+254', nationalNumber: stripNonDigits(raw.slice(3)) };
  }
  // Starts with 0 (Kenyan local)
  if (raw.startsWith('0')) {
    return { countryCode: '+254', nationalNumber: stripNonDigits(raw.slice(1)) };
  }
  // Just national number
  return { countryCode: defaultCode, nationalNumber: stripNonDigits(raw) };
}

// Normalize to E.164: +254 + 9 digits, stripped spaces/dashes
export function normalizePhone(input, defaultCode = DEFAULT_COUNTRY_CODE) {
  if (!input) return '';
  const { countryCode, nationalNumber } = parsePhone(input, defaultCode);
  const digits = stripNonDigits(nationalNumber);
  // For Kenya, ensure 9 digits, strip leading 0 if present
  let nn = digits;
  if (countryCode === '+254' && nn.startsWith('0')) nn = nn.slice(1);
  return `${countryCode}${nn}`;
}

// Validate fixed digits per country
export function validatePhone(input, countryCode = DEFAULT_COUNTRY_CODE) {
  if (!input || !String(input).trim()) return 'Phone number is required';
  const { countryCode: cc, nationalNumber } = parsePhone(input, countryCode);
  const c = getCountryByCode(cc);
  const digits = stripNonDigits(nationalNumber);
  // Kenya specific strict check: exactly 9 digits, starts with 7 or 1
  if (cc === '+254') {
    if (digits.length !== 9) return `Kenya number must be exactly 9 digits after +254 (e.g. 712 345 678), got ${digits.length}`;
    if (!/^[71]/.test(digits)) return 'Kenya number must start with 7 or 1 (e.g. 712...)';
    if (!/^\d{9}$/.test(digits)) return 'Phone must contain only digits';
    return null;
  }
  const min = c.minDigits ?? c.digits;
  const max = c.maxDigits ?? c.digits;
  if (digits.length < min || digits.length > max) {
    if (min === max) return `${c.name} number must be exactly ${min} digits`;
    return `${c.name} number must be ${min}-${max} digits`;
  }
  if (!/^\d+$/.test(digits)) return 'Phone must contain only digits';
  return null;
}

export function formatPhoneDisplay(input, defaultCode = DEFAULT_COUNTRY_CODE) {
  if (!input) return '';
  const { countryCode, nationalNumber } = parsePhone(input, defaultCode);
  const digits = stripNonDigits(nationalNumber);
  if (countryCode === '+254' && digits.length === 9) {
    return `${countryCode} ${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`;
  }
  return `${countryCode} ${digits}`;
}

export function isValidPhone(input, countryCode) {
  return validatePhone(input, countryCode) === null;
}
