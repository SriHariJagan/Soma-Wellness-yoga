// ============================================================
// loadEnv.js — environment loader
// Load order (earlier wins, never overrides platform-injected vars):
//   1. Root .env              (primary — shared frontend/backend config)
//   2. server/.env.{NODE_ENV} (backend-specific overrides for dev/prod)
//   3. server/.env            (legacy fallback, DEPRECATED)
//
// Vite loads .env / .env.development / .env.production automatically.
// Platform-injected vars (Render/Vercel/Docker) are never overwritten.
// ============================================================
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, "../.env");
const legacyEnv = path.resolve(__dirname, ".env");

// ── 1. Load root .env (primary) ──
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else if (fs.existsSync(legacyEnv)) {
  console.warn("[env] Root .env not found — falling back to server/.env (deprecated, please move to ../.env)");
  dotenv.config({ path: legacyEnv });
} else {
  dotenv.config(); // try default .env in cwd, else rely on platform env
}

// ── 2. Load env-specific server config based on NODE_ENV ──
// These files contain backend-only overrides (PORT, CORS, callback URLs, etc.)
// Never override vars already set by root .env or platform-injected vars.
const envMode = process.env.NODE_ENV || "development";
const envSpecificFile = path.resolve(__dirname, `.env.${envMode}`);
if (fs.existsSync(envSpecificFile)) {
  dotenv.config({ path: envSpecificFile, override: false });
}

// ── 3. Legacy server/.env fallback (DEPRECATED) ──
if (fs.existsSync(legacyEnv)) {
  dotenv.config({ path: legacyEnv, override: false });
}

// ── Zod-based validation (fail fast on any invalid/missing values) ──
import { validateEnv } from "./config/env.validation.js";
validateEnv();
