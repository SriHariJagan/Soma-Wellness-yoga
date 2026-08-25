// ============================================================
// loadEnv.js — load and validate environment variables.
// Imported first in server.js so the project-root .env is available
// to modules that read process.env at import time. Platform-injected
// vars (Render, Vercel, etc.) are never overwritten.
// ============================================================
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ── Zod-based validation (fail fast on any invalid/missing values) ──
import { validateEnv } from "./config/env.validation.js";
validateEnv();
