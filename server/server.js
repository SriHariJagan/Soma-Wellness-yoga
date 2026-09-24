// ============================================================
// server.js — SomaWellness API entrypoint
// ============================================================

import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import "./loadEnv.js";
import express from "express";
import compression from "compression";
import cors from "cors";
import { connectDB } from "./config/db.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import asyncHandler from "./utils/asyncHandler.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { sanitizeQueryParams } from "./middleware/sanitize.js";
import logger from "./notification/logger.js";

const MODULE = "Server";

import authRoutes from "./routes/auth.js";
import otpRoutes from "./routes/otp.js";
import studentRoutes from "./routes/student.js";
import studentsAdminRoutes from "./routes/students.js";
import adminRoutes from "./routes/admin.js";
import staffRoutes from "./routes/staff.js";
import batchRoutes from "./routes/batches.js";
import bookingRoutes from "./routes/bookings.js";
import leadRoutes from "./routes/leads.js";
import publicRoutes from "./routes/public.js";
import devRoutes from "./routes/dev.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import paymentWebhookRoutes from "./routes/paymentWebhookRoutes.js";
import paymentAdminRoutes from "./routes/paymentAdminRoutes.js";
import {
  startWebhookWorker,
  stopWebhookWorker,
  closeWebhookQueues,
} from "./payment/queue/WebhookQueue.js";
import notificationScheduler from "./notification/scheduler.js";
import notificationWorker from "./notification/worker.js";
import {
  startWorker as startBullWorker,
  stopWorker as stopBullWorker,
} from "./notification/queue/notificationWorker.js";
import { getDashboardRouter } from "./notification/queue/dashboard.js";
import {
  closeQueue,
  getNotificationQueue,
} from "./notification/queue/notificationQueue.js";
import { closeDLQ } from "./notification/queue/dlq.js";
import { closeRedisConnections } from "./notification/queue/connection.js";
import EmailChannel from "./notification/channels/email.js";
import { registerChannel } from "./notification/registry.js";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import transporter from "./mailer.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { requestTimeout } from "./middleware/requestTimeout.js";
import * as monCtrl from "./controllers/monitoringController.js";
import monitoringRoutes from "./routes/monitoring.js";
import blogRoutes from "./routes/blogs.js";
import somaRoutes from "./routes/soma.js";
import mpesaRoutes from "./routes/mpesaRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";
import chatbotRoutes from "./routes/chatbot.js";
import receptionRoutes from "./routes/reception.js";

// ── Startup validation for required SMTP env vars ──
function validateSmtpConfig() {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'FROM_EMAIL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error('');
    console.error('='.repeat(70));
    console.error('  SMTP CONFIGURATION WARNING');
    console.error('='.repeat(70));
    console.error('');
    console.error('  The following SMTP environment variables are missing:');
    console.error('');
    missing.forEach((key) => console.error(`    • ${key}`));
    console.error('');
    console.error('  Email functionality will be degraded or unavailable.');
    console.error('  Set these values in your .env file to enable email delivery.');
    console.error('');
    console.error('='.repeat(70));
    console.error('');
    return false;
  }
  return true;
}

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for correct IP detection behind reverse proxies (Render, Nginx, etc.)
app.set("trust proxy", 1);

// ── Response compression (gzip/br for JSON + static assets) ──
app.use(compression({ threshold: 1024, level: 6 }));

// ── CORS ──
const BASE_ORIGINS =
  "https://somawellness.co.ke,http://localhost:5173,http://localhost:5175,https://soma-wellness-website.onrender.com,https://soma-wellness-yoga.vercel.app";

const allowedOrigins = [
  ...new Set(
    [...BASE_ORIGINS.split(","), ...(process.env.CORS_ORIGINS || "").split(",")]
      .map((o) => o.trim())
      .filter(Boolean)
  ),
];

const isLocalhost = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin) || isLocalhost(origin))
        return cb(null, true);
      return cb(new Error("Blocked by CORS policy"), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
);

// Security headers with strict CSP — M-Pesa only (Razorpay removed)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://sandbox.safaricom.co.ke", "https://api.safaricom.co.ke"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Static serving for blog images only — all other uploads require auth.
const UPLOADS_PATH = path.join(__dirname, "uploads");
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"]);
app.use("/uploads", (req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  if (IMAGE_EXTS.has(ext)) {
    // Hashed uploads are immutable; others get a long CDN cache window.
    res.setHeader(
      "Cache-Control",
      /\/[a-f0-9]{16,}\.[a-z0-9]+$/i.test(req.path)
        ? "public, max-age=31536000, immutable"
        : "public, max-age=604800"
    );
    express.static(UPLOADS_PATH)(req, res, next);
  } else {
    res
      .status(403)
      .json({ error: "Direct file access denied. Use the download API." });
  }
});

// ── Webhook route (must be before JSON parser — needs raw body for HMAC) ──
app.use(
  "/api/payment/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  paymentWebhookRoutes,
);

app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

// ── Passport (OAuth) ──
import passport from "./config/passport.js";
app.use(passport.initialize());

// ── Request timeout (prevents hung connections) ──
app.use(requestTimeout());

// ── NoSQL injection sanitisation ──
app.use(sanitizeQueryParams);

// ── Request logging (must be before all routes) ──
app.use(requestLogger);

// ── Global rate limit (100 req / 15 min per IP) ──
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please slow down.",
});
app.use("/api", globalLimiter);

// ── Routes ──
app.get("/", (req, res) =>
  res.json({
    status: "SomaWellness API is running ✅",
    time: new Date().toISOString(),
  }),
);

app.get("/api/health", requireAuth, requireAdmin, asyncHandler(monCtrl.healthSummary));
app.get("/api/health/smtp", requireAuth, requireAdmin, asyncHandler(monCtrl.healthSmtp));
app.get("/api/health/mongodb", requireAuth, requireAdmin, asyncHandler(monCtrl.healthMongo));
app.get("/api/health/queue", requireAuth, requireAdmin, asyncHandler(monCtrl.healthQueue));
app.get("/api/health/scheduler", requireAuth, requireAdmin, asyncHandler(monCtrl.healthScheduler));

app.use("/api", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/auth/otp", otpRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/students", studentsAdminRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/reception", receptionRoutes);
app.use("/api/admin/payments", paymentAdminRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/soma", somaRoutes);
app.use("/api/mpesa", mpesaRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/chatbot", chatbotRoutes);

// ── Unified Offering Catalog ──
import offeringRoutes from "./routes/offerings.js";
app.use("/api/offerings", offeringRoutes);

// ── Admin Monitoring (authed) ──
import { requireAuth, requireAdmin } from "./middleware/auth.js";
app.use("/api/admin/monitoring", requireAuth, requireAdmin, monitoringRoutes);

// ── System Health (authed admin) ──
import systemHealthRoutes from "./routes/systemHealth.js";
app.use("/api/admin/system", requireAuth, requireAdmin, systemHealthRoutes);

// ── Bull Board Queue Dashboard (admin only) ──
app.use("/admin/queues", requireAuth, requireAdmin, getDashboardRouter());

if (process.env.NODE_ENV === "development") {
  app.use("/api/dev", devRoutes);
}

// ── Error handling (must be last) ──
app.use(notFound);
app.use(errorHandler);

// ── Auto-expiry for memberships, services & free trials (runs every hour) ──
import { expireDueEnrollments } from "./services/expiryService.js";
import Plan from "./models/Plan.js";
import Service from "./models/Service.js";
import UserService from "./models/UserService.js";
const ENROLLMENT_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
setInterval(() => {
  expireDueEnrollments().catch(() => {});
}, ENROLLMENT_CHECK_INTERVAL);

// ── SOMA cron: allowance reset, voucher expiry, founding window/rollover (every hour) ──
import { startSomaCron } from "./services/cron/somaCron.js";

// ── Seed / update official membership plans ──
// NOTE: SOMA monthly tiers are hidden from Membership listings
// (visibility: 'hidden'). The ONLY purchasable membership is the
// SOMA Wellness Circle (KES 36,500/year). Legacy tier catalog docs are
// deleted — purchase history lives in Membership/Payment/Order snapshots,
// so existing records and reports are unaffected.
const OFFICIAL_PLANS = [
  {
    name: "Soma Wellness Circle",
    description:
      "Annual Privilege Membership — Your year of wellness, inspiration and member-only privileges.",
    price: 36500,
    durationMonths: 12,
    pauseDays: 0,
    displayOrder: 0,
    benefits: [
      "5% saving on regular-priced SOMA services.*",
      "Weekly motivational and wellness inspiration.",
      "One curated “Good Read” wellness article every month.",
      "Member-only premium content: short yoga, breathwork, meditation and wellness resources.",
      "Complimentary access to designated SOMA meditation, garden and reading/relaxation spaces during member hours.",
      "Priority booking for appointments, workshops and selected events.",
      "A birthday wellness gift from SOMA.",
      "One guest privilege each year for a selected community/meditation experience.",
      "Early invitations to new programs, special events and member experiences.",
    ],
    badge: "Annual Privilege Membership",
    isPopular: true,
    isRecommended: true,
    visibility: "public",
    active: true,
  },
];

async function seedDefaultPlans() {
  // Remove old/demo plans that are not part of the official offerings
  const OLD_DEMO_NAMES = [
    "Monthly Pass",
    "Quarterly Pass",
    "Half-Yearly Pass",
    "Annual Pass",
    "2-Year Pass",
    "1 Month Membership",
    "3 Month Membership",
    "6 Month Membership",
    "12 Month Membership",
  ];
  await Plan.deleteMany({ name: { $in: OLD_DEMO_NAMES } });

  // Upsert each official plan
  for (const plan of OFFICIAL_PLANS) {
    await Plan.findOneAndUpdate(
      { name: plan.name },
      { $set: plan },
      { upsert: true, returnDocument: "after" },
    );
  }

  // Permanently remove legacy + auxiliary catalog docs (history lives in snapshots).
  // Only the SOMA Wellness Circle may exist as a plan.
  await Plan.deleteMany({ name: { $in: ["Bronze", "Silver", "Gold", ...AUXILIARY_PLAN_NAMES] } });
}

const AUXILIARY_PLAN_NAMES = [
  "SOMA JUA", "SOMA AMANI", "SOMA UZIMA", "SOMA FAMILY",
  "5-Class Pass", "10-Class Pass",
  "SOMA DAILY — Monthly", "SOMA DAILY — Annual",
];

// ── Seed / update official services (approved SOMA catalog) ──
// WHITELIST: only PUBLIC_CATALOG items may exist. Everything else
// in Service + Offering is deleted on every boot.
async function seedDefaultServices() {
  const {
    PUBLIC_CATALOG,
    PUBLIC_SERVICE_NAMES,
    RETIRED_SERVICE_NAMES,
    RETIRED_OFFERING_NAMES,
    toServiceDoc,
    toOfferingDoc,
  } = await import("./config/publicCatalog.js");
  const Offering = (await import("./models/Offering.js")).default;

  // Hard wipe: remove anything not on the official list
  await Service.deleteMany({
    $or: [
      { name: { $nin: PUBLIC_SERVICE_NAMES } },
      { name: { $in: RETIRED_SERVICE_NAMES } },
    ],
  });
  await Offering.deleteMany({
    $or: [
      { name: { $nin: PUBLIC_SERVICE_NAMES } },
      { name: { $in: RETIRED_OFFERING_NAMES } },
    ],
  });

  await UserService.updateMany(
    { serviceName: "Yoga at Home" },
    { $set: { serviceName: "Home / Hotel Session" } },
  );

  for (const entry of PUBLIC_CATALOG) {
    await Service.findOneAndUpdate(
      { name: entry.name },
      { $set: toServiceDoc(entry) },
      { upsert: true, returnDocument: "after" },
    );
    await Offering.findOneAndUpdate(
      { name: entry.name },
      { $set: toOfferingDoc(entry) },
      { upsert: true, returnDocument: "after" },
    );
  }
}

// ── Prune auxiliary plan docs ──────────────────────────────────
// Single-membership world: monthly tiers, passes and DAILY live in the
// Services/Offerings catalog (and somaCatalog.js config) — they must NOT
// exist as Plan docs. This deletes any that reappear, so boot, sync and
// migration can never reintroduce them.
async function seedSomaPlans() {
  await Plan.deleteMany({ name: { $in: AUXILIARY_PLAN_NAMES } });
}

// ── SOMA: Seed SOMA services (massage, meditation, signatures, life stages) ─
// Retired: the approved 47-record catalog in somaCatalog.js (seedDefaultServices
// above) is now the single source — this legacy seeder is intentionally a no-op
// so boot never reintroduces superseded service names.
async function seedSomaServices() {
  return;
}
async function seedFoundingSettings() {
  const FoundingSettings = (await import('./models/FoundingSettings.js')).default;
  await FoundingSettings.getSingleton();
}

async function seedSomaCourses() {
  const Course = (await import('./models/Course.js')).default;
  const SOMA_COURSES = [
    { title: 'SOMA 200 Yoga Teacher Training', duration: '200 hours', price: 130000, hours: 200, installmentsAllowed: true, installmentsConfig: { count: 6, interval: 'monthly' }, active: true, category: 'academy' },
  ];
  const keep = SOMA_COURSES.map((c) => c.title);
  await Course.deleteMany({ title: { $nin: keep } });
  for (const c of SOMA_COURSES) {
    await Course.findOneAndUpdate({ title: c.title }, { $set: c }, { upsert: true, returnDocument: 'after' });
  }
}

// ── Boot ──
let server;

connectDB(process.env.MONGO_URI)
  .then(async () => {
    // Validate SMTP configuration on startup
    const smtpOk = validateSmtpConfig();
    if (!smtpOk) {
      logger.warn(MODULE, "SMTP config incomplete — email features will be limited");
    }

    registerChannel("email", new EmailChannel());

    // Register WhatsApp channel (gracefully degrades if not configured)
    import("./notification/channels/whatsapp.js").then((mod) => {
      const WhatsAppChannel = mod.default || mod.WhatsAppChannel;
      registerChannel("whatsapp", new WhatsAppChannel());
      logger.info(MODULE, "Registered channel: whatsapp");
    }).catch(() => {});

    registerChannel("inApp", {
      send: async () => ({
        success: true,
        channel: "inApp",
        providerMessageId: `inapp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }),
    });
    logger.info(MODULE, "Registered channels: email, inApp");

    transporter
      .verify()
      .then((ok) => {
        if (ok) logger.info(MODULE, "SMTP connection verified");
        else
          logger.warn(
            MODULE,
            "SMTP not configured — emails will be logged, not sent",
          );
      })
      .catch((err) => {
        logger.warn(MODULE, "SMTP verification issue", { error: err.message });
      });

    // Skip BullMQ-backed workers when Redis is down (local dev without
    // Redis). Otherwise every worker logs "Command timed out" every few
    // seconds and every rate-limited request waits 2s. Direct-send fallback
    // in notificationQueue still delivers notifications.
    let redisOk = false;
    try {
      const { pingRedis } = await import("./notification/queue/connection.js");
      redisOk = await pingRedis(1500);
    } catch (err) {
      logger.warn(MODULE, "Redis ping failed — running without BullMQ workers", {
        error: err.message,
      });
    }

    if (redisOk) {
      try {
        startBullWorker();
      } catch (err) {
        logger.error(MODULE, "Failed to start BullMQ worker", {
          error: err.message,
        });
      }

      try {
        startWebhookWorker();
      } catch (err) {
        logger.error(MODULE, "Failed to start webhook retry worker", {
          error: err.message,
        });
      }

      notificationScheduler.start().catch((err) => {
        logger.error(MODULE, "Failed to start reminder scheduler", {
          error: err.message,
        });
      });
    } else {
      logger.warn(
        MODULE,
        "Redis unavailable — skipped BullMQ notification worker, webhook worker and reminder scheduler",
      );
    }

    notificationWorker.start();

    // Start payment expiry checker for MPESA and other initiated payments
    import("./services/paymentExpiryService.js").then((mod) => mod.default.start()).catch(() => {});

    await seedDefaultPlans().catch(() => {});
    await seedDefaultServices().catch(() => {});
    await seedSomaPlans().catch((e) => logger.warn(MODULE, "SOMA plan seed skipped", { error: e.message }));
    await seedSomaServices().catch((e) => logger.warn(MODULE, "SOMA service seed skipped", { error: e.message }));
    await seedFoundingSettings().catch(() => {});
    await seedSomaCourses().catch(() => {});
    expireDueEnrollments().catch(() => {});
    try { startSomaCron(); } catch {}

    server = app.listen(PORT, () => {
      logger.info(MODULE, "Listening", { port: PORT });
    });
  })
  .catch((err) => {
    logger.error(MODULE, "Failed to start server", { error: err.message });
    process.exit(1);
  });

// ── Graceful Shutdown ──────────────────────────────────────────
//
// On SIGTERM/SIGINT:
//   1. Stop accepting new HTTP requests.
//   2. Stop the scheduler (no new reminder checks).
//   3. Drain the worker (wait for active deliveries to complete).
//   4. Close the SMTP connection pool.
//   5. Disconnect from MongoDB.
//   6. Exit.

const SHUTDOWN_TIMEOUT_MS =
  parseInt(process.env.SHUTDOWN_TIMEOUT_MS, 10) || 30000;

async function shutdown(signal) {
  logger.info(MODULE, `Received ${signal} — starting graceful shutdown`);

  // Enforce a maximum shutdown timeout — if any step hangs, force exit.
  const forceExit = setTimeout(() => {
    logger.error(MODULE, "Shutdown timed out — forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  // 1. Stop HTTP server.
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    logger.info(MODULE, "HTTP server closed");
  }

  // 2. Stop reminder scheduler (BullMQ repeatable jobs + worker).
  await notificationScheduler.stop();

  // 3. Drain legacy polling worker.
  await notificationWorker.stop();

  // 4. Drain BullMQ workers (waits for active jobs).
  await stopBullWorker();
  await stopWebhookWorker();

  // 5. Close BullMQ queues.
  await closeQueue();
  await closeDLQ();
  await closeWebhookQueues();

  // 6. Close SMTP provider.
  transporter.close();

  // 7. Close Redis connections.
  await closeRedisConnections();

  // 8. Disconnect MongoDB.
  const mongoose = (await import("mongoose")).default;
  await mongoose.disconnect();
  logger.info(MODULE, "MongoDB disconnected");

  logger.info(MODULE, "Graceful shutdown complete");
  clearTimeout(forceExit);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ── Crash handlers (prevent silent process death) ─────────────
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Process", "Unhandled Rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on("uncaughtException", (err) => {
  logger.error("Process", "Uncaught Exception", {
    error: err.message,
    stack: err.stack,
  });

  // Attempt graceful shutdown before crashing
  shutdown("UNCAUGHT_EXCEPTION").catch(() => {
    logger.error("Process", "Forced exit after shutdown failure");
    process.exit(1);
  });

  // Force exit after 30s if shutdown hangs
  setTimeout(() => process.exit(1), 30000);
});

export default app;
