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
  APP_NAME: z.string().default('Pragya Yoga Alliance'),

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

  // ── Razorpay ──
  RAZORPAY_KEY_ID: z
    .string()
    .min(1, 'RAZORPAY_KEY_ID is required')
    .startsWith('rzp_', 'RAZORPAY_KEY_ID must start with rzp_'),
  RAZORPAY_KEY_SECRET: z
    .string()
    .min(1, 'RAZORPAY_KEY_SECRET is required'),
  RAZORPAY_WEBHOOK_SECRET: z
    .string()
    .min(1, 'RAZORPAY_WEBHOOK_SECRET is required'),

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
  CORS_ORIGINS: z.string().default('https://pragya-yoga.vercel.app,http://localhost:5173'),
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
  FROM_NAME: z.string().default('Pragya Yoga Alliance'),
  REPLY_TO: z.string().optional(),

  // ── Admin Email ──
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email').optional(),
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
  SCHEDULER_TIMEZONE: z.string().default('Asia/Kolkata'),

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
