const SINGLE_SESSION_NAMES = [
  'Abhyanga (Ayurvedic Massage)',
  'Shirodhara (Forehead Oil-Pulling Therapy)',
];

export function isSingleSessionService(serviceName) {
  return SINGLE_SESSION_NAMES.includes(serviceName);
}

export const SINGLE_SESSION_VALIDITY_DAYS = 7;
