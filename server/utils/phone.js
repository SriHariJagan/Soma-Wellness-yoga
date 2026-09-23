// Server-side Kenya-first phone utilities — mirrors src/lib/phone.js
export const DEFAULT_COUNTRY_CODE = '+254';
export const COUNTRIES = [
  { code: '+254', iso: 'KE', digits: 9, minDigits: 9, maxDigits: 9 },
  { code: '+91', iso: 'IN', digits: 10, minDigits: 10, maxDigits: 10 },
  { code: '+1', iso: 'US', digits: 10, minDigits: 10, maxDigits: 10 },
  { code: '+44', iso: 'GB', digits: 10, minDigits: 10, maxDigits: 10 },
  { code: '+971', iso: 'AE', digits: 9, minDigits: 9, maxDigits: 9 },
  { code: '+27', iso: 'ZA', digits: 9, minDigits: 9, maxDigits: 9 },
];

export function stripNonDigits(s) { return String(s||'').replace(/\D/g,''); }
export function getCountryByCode(code){
  return COUNTRIES.find(c=>c.code===code) || COUNTRIES[0];
}
export function parsePhone(fullPhone, defaultCode = DEFAULT_COUNTRY_CODE){
  const raw = String(fullPhone||'').trim().replace(/[\s\-\(\)]/g,'');
  if(!raw) return { countryCode: defaultCode, nationalNumber: '' };
  if(raw.startsWith('+')){
    const sorted = [...COUNTRIES].sort((a,b)=>b.code.length-a.code.length);
    for(const c of sorted){ if(raw.startsWith(c.code)) return { countryCode: c.code, nationalNumber: stripNonDigits(raw.slice(c.code.length)) }; }
    const m = raw.match(/^(\+\d{1,4})(\d*)$/);
    if(m) return { countryCode: m[1], nationalNumber: stripNonDigits(m[2]) };
  }
  if(/^254\d+/.test(raw)) return { countryCode: '+254', nationalNumber: stripNonDigits(raw.slice(3)) };
  if(raw.startsWith('0')) return { countryCode: '+254', nationalNumber: stripNonDigits(raw.slice(1)) };
  return { countryCode: defaultCode, nationalNumber: stripNonDigits(raw) };
}
export function normalizePhone(input, defaultCode = DEFAULT_COUNTRY_CODE){
  if(!input) return '';
  const { countryCode, nationalNumber } = parsePhone(input, defaultCode);
  let nn = stripNonDigits(nationalNumber);
  if(countryCode === '+254' && nn.startsWith('0')) nn = nn.slice(1);
  return `${countryCode}${nn}`;
}
export function validatePhone(input, countryCode = DEFAULT_COUNTRY_CODE){
  if(!input || !String(input).trim()) return 'Phone number is required';
  const { countryCode: cc, nationalNumber } = parsePhone(input, countryCode);
  const c = getCountryByCode(cc);
  const digits = stripNonDigits(nationalNumber);
  if(cc === '+254'){
    if(digits.length !== 9) return `Kenya number must be exactly 9 digits after +254 (e.g. 712 345 678), got ${digits.length}`;
    if(!/^[71]/.test(digits)) return 'Kenya number must start with 7 or 1 (e.g. 712...)';
    if(!/^\d{9}$/.test(digits)) return 'Phone must contain only digits';
    return null;
  }
  const min = c.minDigits ?? c.digits;
  const max = c.maxDigits ?? c.digits;
  if(digits.length < min || digits.length > max){
    if(min===max) return `${c.iso} number must be exactly ${min} digits`;
    return `${c.iso} number must be ${min}-${max} digits`;
  }
  if(!/^\d+$/.test(digits)) return 'Phone must contain only digits';
  return null;
}
export function isValidPhone(input, countryCode){ return validatePhone(input,countryCode)===null; }
