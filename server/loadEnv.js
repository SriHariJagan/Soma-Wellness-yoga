// ============================================================
// loadEnv.js — single-env loader (root .env only)
// - Root:  C:\Users\hante\OneDrive\Desktop\Soma-Wellness-yoga\.env  (ONLY file you edit)
// - Vite loads the same file automatically
// - server/.env is DEPRECATED and ignored (kept only for legacy fallback)
// Platform-injected vars (Render/Vercel/Docker) are never overwritten.
// ============================================================
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, "../.env");
const legacyEnv = path.resolve(__dirname, ".env");

// Prefer root .env (single source). Fallback to server/.env only if root missing.
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
  // Optionally also load legacy if it exists but don't override existing vars
  if (fs.existsSync(legacyEnv)) {
    dotenv.config({ path: legacyEnv, override: false });
  }
} else if (fs.existsSync(legacyEnv)) {
  console.warn("[env] Root .env not found — falling back to server/.env (deprecated, please move to ../.env)");
  dotenv.config({ path: legacyEnv });
} else {
  dotenv.config(); // try default .env in cwd, else rely on platform env
}

// ── Zod-based validation (fail fast on any invalid/missing values) ──
import { validateEnv } from "./config/env.validation.js";
validateEnv();
