// ============================================================
// server.js — Pragya Yoga API entrypoint
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
import studentRoutes from "./routes/student.js";
import studentsAdminRoutes from "./routes/students.js";
import adminRoutes from "./routes/admin.js";
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
const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  "https://pragya-yoga.vercel.app,http://localhost:5173,http://localhost:5175, https://pragya-yoga-website.onrender.com"
)
  .split(",")
  .map((o) => o.trim());

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
    credentials: false,
  }),
);

// Security headers with strict CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://checkout.razorpay.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.razorpay.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        frameSrc: ["https://api.razorpay.com"],
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
  express.raw({ type: "application/json" }),
  paymentWebhookRoutes,
);

app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

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
    status: "Pragya Yoga API is running ✅",
    time: new Date().toISOString(),
  }),
);

app.get("/api/health", asyncHandler(monCtrl.healthSummary));
app.get("/api/health/smtp", asyncHandler(monCtrl.healthSmtp));
app.get("/api/health/mongodb", asyncHandler(monCtrl.healthMongo));
app.get("/api/health/queue", asyncHandler(monCtrl.healthQueue));
app.get("/api/health/scheduler", asyncHandler(monCtrl.healthScheduler));

app.use("/api", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/students", studentsAdminRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/payments", paymentAdminRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/blogs", blogRoutes);

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

// ── Book store: sweep stale orders (every 15 min) ──
//  - 30 min: release inventory reservations + send "payment cancelled" email
//  - 1 hour: send "payment incomplete" notice email, then delete the order
import { sweepExpiredBookOrders } from "./services/bookOrderCleanupService.js";
import { sendLowStockAlerts } from "./services/bookEmailService.js";
const STORE_SWEEP_INTERVAL = 15 * 60 * 1000; // 15 minutes
setInterval(() => {
  sweepExpiredBookOrders().catch(() => {});
  sendLowStockAlerts().catch(() => {});
}, STORE_SWEEP_INTERVAL);

// ── Seed / update official membership plans ──
const OFFICIAL_PLANS = [
  {
    name: "1 Month Membership",
    description:
      "Perfect for beginners to start their yoga journey with essential studio access.",
    price: 1500,
    durationMonths: 1,
    pauseDays: 0,
    displayOrder: 1,
    benefits: ["Unlimited Yoga Classes", "Community Support"],
    badge: "",
    isPopular: false,
    isRecommended: false,
  },
  {
    name: "3 Month Membership",
    description:
      "Build a consistent practice with added flexibility to pause when needed.",
    price: 4000,
    durationMonths: 3,
    pauseDays: 15,
    displayOrder: 2,
    benefits: [
      "Unlimited Yoga Classes",
      "Community Support",
      "Membership Pause up to 15 Days",
    ],
    badge: "Recommended",
    isPopular: false,
    isRecommended: true,
  },
  {
    name: "6 Month Membership",
    description:
      "Our most popular plan with premium content access and a free personal consultation.",
    price: 7000,
    durationMonths: 6,
    pauseDays: 30,
    displayOrder: 3,
    benefits: [
      "Unlimited Yoga Classes",
      "Premium Content Access",
      "Free 1 Personal Consultation",
      "Membership Pause up to 30 Days",
    ],
    badge: "Most Popular",
    isPopular: true,
    isRecommended: false,
  },
  {
    name: "12 Month Membership",
    description:
      "The ultimate commitment to your wellness journey with maximum benefits.",
    price: 12000,
    durationMonths: 12,
    pauseDays: 60,
    displayOrder: 4,
    benefits: [
      "Unlimited Yoga Classes",
      "Premium Content Access",
      "Workshops Included",
      "Free Personal Consultation",
      "Free Diet Consultation",
      "Membership Pause up to 60 Days",
    ],
    badge: "Best Value",
    isPopular: false,
    isRecommended: false,
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
}

// ── Seed / update official services ──
const OFFICIAL_SERVICES = [
  {
    name: "Offline Group Yoga",
    description: "Community sessions in studio to enhance motivation.",
    mode: "center",
    category: "Group",
    type: "Hatha",
    price: 2500,
    pricingModel: "monthly",
    totalSessions: 0,
    sessionDuration: 60,
    scheduleDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    scheduleTime: "7:00 AM – 8:00 AM, 8:00 AM – 9:00 AM, 5:00 PM – 6:00 PM",
    timeSlots: [
      { day: "Monday – Friday", time: "7:00 AM – 8:00 AM", label: "Neha" },
      { day: "Monday – Friday", time: "8:00 AM – 9:00 AM", label: "Varsha" },
      { day: "Monday – Friday", time: "5:00 PM – 6:00 PM", label: "Vinod" },
    ],
    active: true,
    isPopular: true,
    displayOrder: 1,
  },
  {
    name: "Online Group Yoga",
    description: "Holistic online practice for fitness & clarity.",
    mode: "online",
    category: "Group",
    type: "Vinyasa",
    price: 1500,
    pricingModel: "monthly",
    totalSessions: 0,
    sessionDuration: 60,
    scheduleDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    scheduleTime: "9:00 AM – 10:00 AM, 11:30 AM – 12:30 PM IST",
    timeSlots: [
      {
        day: "Monday – Friday",
        time: "9:00 AM – 10:00 AM",
        label: "Dr. Kapil",
      },
      {
        day: "Monday – Friday",
        time: "11:30 AM – 12:30 PM IST",
        label: "Shreya",
      },
    ],
    active: true,
    isPopular: true,
    displayOrder: 2,
  },
  {
    name: "Personal Yoga (Center)",
    description:
      "Tailored one-on-one sessions at our center for your personal goals. Includes 20 sessions within one month.",
    mode: "center",
    category: "Personal",
    type: "Iyengar",
    price: 10000,
    pricingModel: "monthly",
    totalSessions: 20,
    sessionDuration: 60,
    validityDuration: 1,
    validityUnit: "months",
    scheduleDays: [],
    scheduleTime: "Flexible",
    active: true,
    isPopular: false,
    displayOrder: 3,
  },
  {
    name: "Personal Yoga (Home)",
    description:
      "Personalized instruction at your home for maximum convenience. Includes 20 sessions within one month.",
    mode: "home",
    category: "Personal",
    type: "Hatha",
    price: 12000,
    pricingModel: "monthly",
    totalSessions: 20,
    sessionDuration: 60,
    validityDuration: 1,
    validityUnit: "months",
    scheduleDays: [],
    scheduleTime: "Flexible",
    active: true,
    isPopular: false,
    displayOrder: 4,
  },
  {
    name: "Kids Yoga",
    description: "Fun & engaging classes for children's well-being.",
    mode: "center",
    category: "Group",
    type: "Vinyasa",
    price: 1500,
    pricingModel: "monthly",
    totalSessions: 15,
    sessionDuration: 45,
    scheduleDays: [],
    scheduleTime: "As per batch assignment",
    active: true,
    isPopular: false,
    displayOrder: 5,
  },
  {
    name: "Pregnancy Yoga (Center)",
    description:
      "Safe practices for expectant mothers at our center. Includes 20 sessions within one month.",
    mode: "center",
    category: "Specialty",
    type: "Therapy",
    price: 10000,
    pricingModel: "monthly",
    totalSessions: 20,
    sessionDuration: 60,
    validityDuration: 1,
    validityUnit: "months",
    scheduleDays: [],
    scheduleTime: "Flexible",
    active: true,
    isPopular: false,
    displayOrder: 6,
  },
  {
    name: "Pregnancy Yoga (Home)",
    description:
      "Safe prenatal yoga practices in the comfort of your home. Includes 20 sessions within one month.",
    mode: "home",
    category: "Specialty",
    type: "Therapy",
    price: 12000,
    pricingModel: "monthly",
    totalSessions: 20,
    sessionDuration: 60,
    validityDuration: 1,
    validityUnit: "months",
    scheduleDays: [],
    scheduleTime: "Flexible",
    active: true,
    isPopular: false,
    displayOrder: 7,
  },
  {
    name: "Yoga for Stress",
    description:
      "Targeted sessions for stress relief and mental wellness. Includes 12 sessions within one month.",
    mode: "online",
    category: "Specialty",
    type: "Therapy",
    price: 1000,
    pricingModel: "monthly",
    totalSessions: 12,
    sessionDuration: 30,
    scheduleDays: ["Monday", "Wednesday", "Friday"],
    scheduleTime: "7:30 AM – 8:00 AM",
    timeSlots: [
      { day: "Monday", time: "7:30 AM – 8:00 AM", label: "Dr. Kapil" },
      { day: "Wednesday", time: "7:30 AM – 8:00 AM", label: "Dr. Kapil" },
      { day: "Friday", time: "7:30 AM – 8:00 AM", label: "Dr. Kapil" },
    ],
    active: true,
    isPopular: false,
    displayOrder: 8,
  },
  {
    name: "Corporate Yoga",
    description:
      "Customized workplace wellness programs for your organization. Pricing depends on number of employees.",
    mode: "hybrid",
    category: "Corporate",
    type: "Hatha",
    price: 0,
    pricingModel: "contact",
    contactEmail: "pragyayogaofficial@gmail.com",
    totalSessions: 0,
    sessionDuration: 60,
    scheduleDays: [],
    scheduleTime: "Flexible",
    active: true,
    isPopular: false,
    displayOrder: 9,
  },
  {
    name: "Advanced Yoga (Center)",
    description:
      "Advanced asanas and intensive practice for experienced yogis.",
    mode: "center",
    category: "Group",
    type: "Advanced",
    price: 5000,
    pricingModel: "monthly",
    totalSessions: 20,
    sessionDuration: 60,
    scheduleDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    scheduleTime: "11:30 AM – 12:30 PM IST",
    timeSlots: [
      {
        day: "Monday – Friday",
        time: "11:30 AM – 12:30 PM IST",
        label: "Vinod",
      },
    ],
    active: true,
    isPopular: false,
    displayOrder: 10,
  },
  {
    name: "Therapy Yoga (Center)",
    description:
      "Therapeutic yoga practices for healing and recovery at our center. Includes 20 sessions within one month.",
    mode: "center",
    category: "Specialty",
    type: "Therapy",
    price: 12000,
    pricingModel: "monthly",
    totalSessions: 20,
    sessionDuration: 60,
    validityDuration: 1,
    validityUnit: "months",
    scheduleDays: [],
    scheduleTime: "Flexible",
    active: true,
    isPopular: false,
    displayOrder: 11,
  },
  {
    name: "Therapy Yoga (Home)",
    description:
      "Therapeutic yoga sessions in the comfort of your home. Includes 20 sessions within one month.",
    mode: "home",
    category: "Specialty",
    type: "Therapy",
    price: 15000,
    pricingModel: "monthly",
    totalSessions: 20,
    sessionDuration: 60,
    validityDuration: 1,
    validityUnit: "months",
    scheduleDays: [],
    scheduleTime: "Flexible",
    active: true,
    isPopular: false,
    displayOrder: 12,
  },
  {
    name: "Abhyanga (Ayurvedic Massage)",
    description:
      "Traditional Ayurvedic full-body oil massage for rejuvenation.",
    mode: "center",
    category: "Therapy",
    type: "Ayurveda",
    price: 1200,
    pricingModel: "per_session",
    totalSessions: 0,
    sessionDuration: 60,
    scheduleDays: [],
    scheduleTime: "Flexible",
    active: true,
    isPopular: false,
    displayOrder: 13,
  },
  {
    name: "Shirodhara (Forehead Oil-Pulling Therapy)",
    description:
      "Gentle pouring of warm oil on the forehead for deep relaxation.",
    mode: "center",
    category: "Therapy",
    type: "Ayurveda",
    price: 1800,
    pricingModel: "per_session",
    totalSessions: 0,
    sessionDuration: 60,
    scheduleDays: [],
    scheduleTime: "Flexible",
    active: true,
    isPopular: false,
    displayOrder: 14,
  },
];

async function seedDefaultServices() {
  const ADMIN_ID = null;
  const OLD_SERVICE_NAMES = ["Pranayama & Meditation", "Yoga at Home"];
  await Service.deleteMany({ name: { $in: OLD_SERVICE_NAMES } });

  // Rename "Yoga at Home" service enrollments to "Personal Yoga (Home)"
  await UserService.updateMany(
    { serviceName: "Yoga at Home" },
    { $set: { serviceName: "Personal Yoga (Home)" } },
  );

  for (const svc of OFFICIAL_SERVICES) {
    await Service.findOneAndUpdate(
      { name: svc.name },
      { $set: svc },
      { upsert: true, returnDocument: "after" },
    );
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

    notificationWorker.start();

    await seedDefaultPlans().catch(() => {});
    await seedDefaultServices().catch(() => {});
    expireDueEnrollments().catch(() => {});

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
