import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
const root = process.cwd();
const out = path.join(root, "test-artifacts", "staging", ".env.staging");
const secret = crypto.randomBytes(48).toString("base64url"); // 64 chars
if (secret.length < 32) { console.error("secret too short"); process.exit(1); }
const content = [
  "# SOMA STAGING - ISOLATED TEST ENVIRONMENT (QA load/remediation run)",
  "# NOT the production .env. Production MONGO_URI (Atlas) is never used here.",
  "NODE_ENV=staging",
  "PORT=5100",
  "APP_NAME=Soma Wellness (STAGING)",
  "MONGO_URI=mongodb://127.0.0.1:27018/soma_staging",
  `JWT_SECRET=${secret}`,
  "JWT_ACCESS_TTL=2h",
  "JWT_REFRESH_TTL=30d",
  "REDIS_URL=redis://127.0.0.1:6379/9",
  "FRONTEND_URL=http://localhost:5173",
  "CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5100",
  "# SMTP deliberately unset -> no real email can be sent from staging",
  "# Pesapal deliberately has NO credentials -> isConfigured=false, so the app can",
  "# never call a real payment provider from staging.",
  "PESAPAL_ENV=sandbox",
  "PESAPAL_CONSUMER_KEY=",
  "PESAPAL_CONSUMER_SECRET=",
  "PESAPAL_IPN_ID=",
  "PESAPAL_NOTIFICATION_ID=",
  "SMTP_HOST=",
  "SERVER_URL=http://127.0.0.1:5100",
  "LOG_LEVEL=warn",
  "SCHEDULER_TIMEZONE=Africa/Nairobi",
  "",
].join("\n");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, content, "utf8");
console.log("staging env written; JWT_SECRET length =", secret.length, "(value not printed)");
