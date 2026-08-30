// ============================================================
// config/env.validation.js
// Zod-based environment variable validation.
// Fail fast on startup if any required variable is missing or
// has an invalid format.
// ============================================================
import { z } from 'zod';

const envSchema = z.object({
  // ── Application ──
  NODE_ENV: z
    .enum(['development', 'production', 'test', 'staging'])
    .default('development'),
  PORT: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(65535))
    .default('5000'),
  APP_NAME: z.string().default('Soma Wellness'),

  // ── Database ──
  MONGO_URI: z
    .string()
    .min(1, 'MONGO_URI is required')
    .refine(
      (v) => v.startsWith('mongodb://') || v.startsWith('mongodb+srv://'),
      'MONGO_URI must start with mongodb:// or mongodb+srv://'
    ),

  // ── JWT ──
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_ACCESS_TTL: z.string().default('2h'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  JWT_REFRESH_SECRET: z.string().optional(),

  // ── Razorpay (optional — disabled) ──
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // ── Redis ──
  REDIS_URL: z
    .string()
    .min(1, 'REDIS_URL is required')
    .refine(
      (v) =>
        v.startsWith('redis://') ||
        v.startsWith('rediss://') ||
        v.startsWith('redis+sentinel://'),
      'REDIS_URL must start with redis:// or rediss://'
    ),

  // ── CORS ──
  CORS_ORIGINS: z.string().default('https://somawellness.in,http://localhost:5173'),
  FRONTEND_URL: z
    .string()
    .default('http://localhost:5173')
    .refine(
      (v) => v.startsWith('http://') || v.startsWith('https://'),
      'FRONTEND_URL must be a valid URL'
    ),

  // ── SMTP ──
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().min(1).max(65535).optional()),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().optional(),
  FROM_NAME: z.string().default('Soma Wellness'),
  REPLY_TO: z.string().optional(),

  // ── Admin Email ── (comma-separated allowed)
  ADMIN_EMAIL: z.string().optional().refine(
    (v) => !v || v.split(',').every((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())),
    'ADMIN_EMAIL must be valid email(s) — comma-separated'
  ),
  SMTP_MAX_CONNECTIONS: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 5)),
  SMTP_MAX_MESSAGES_PER_CONNECTION: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 100)),
  SMTP_RATE_DELTA_MS: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1000)),
  SMTP_RATE_LIMIT_PER_SECOND: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 5)),
  SMTP_CONNECTION_TIMEOUT_MS: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10000)),
  SMTP_GREETING_TIMEOUT_MS: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10000)),
  SMTP_SOCKET_TIMEOUT_MS: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 30000)),

  // ── Legacy SMTP aliases ──
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_FROM_NAME: z.string().optional(),

  // ── Notifications ──
  CHANNEL_TIMEOUT_MS: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 60000)),

  // ── Scheduling ──
  SCHEDULER_TIMEZONE: z.string().default('Africa/Nairobi'),

  // ── Referral ──
  REFERRAL_REWARD: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 500)),

  // ── Timeouts ──
  REQUEST_TIMEOUT_MS: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 120000))
    .pipe(z.number().int().min(5000).max(600000)),
  SHUTDOWN_TIMEOUT_MS: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 30000))
    .pipe(z.number().int().min(5000).max(120000)),

  // ── Logging ──
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug'])
    .default('info'),

  // ── OTP ──
  OTP_LENGTH: z.string().optional().default('6'),
  OTP_TTL_MINUTES: z.string().optional().default('10'),
  OTP_MAX_ATTEMPTS: z.string().optional().default('5'),
  OTP_RESEND_COOLDOWN_SECONDS: z.string().optional().default('60'),
  AT_USERNAME: z.string().optional(),
  AT_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),

  // ── MPESA (Safaricom Daraja) — all optional, gateway degrades gracefully if missing ──
  MPESA_ENV: z.enum(['sandbox', 'production']).optional().default('sandbox'),
  MPESA_CONSUMER_KEY: z.string().optional(),
  MPESA_CONSUMER_SECRET: z.string().optional(),
  MPESA_SHORTCODE: z.string().optional(),
  MPESA_PASSKEY: z.string().optional(),
  MPESA_CALLBACK_URL: z.string().optional(),
  MPESA_INITIATOR_NAME: z.string().optional().default('soma'),
  MPESA_SECURITY_CREDENTIAL: z.string().optional(),

  // ── WhatsApp Business API (Meta Cloud API) — all optional ──
  WHATSAPP_DEV_MODE: z.enum(['true', 'false']).optional().default('true'),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  WHATSAPP_DISPLAY_PHONE: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().optional().default('v19.0'),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.join('.');
      return `  • ${path}: ${issue.message}`;
    });

    console.error('');
    console.error('='.repeat(70));
    console.error('  ENVIRONMENT VALIDATION FAILED');
    console.error('='.repeat(70));
    console.error('');
    console.error('  The following environment variables are invalid or missing:');
    console.error('');
    console.error(errors.join('\n'));
    console.error('');
    console.error('  Fix by:');
    console.error('    1. Copy .env.example to .env');
    console.error('    2. Fill in all [REQUIRED] values');
    console.error('    3. Restart the server');
    console.error('');
    console.error('='.repeat(70));
    console.error('');

    process.exit(1);
  }

  return result.data;
}

export default validateEnv;
