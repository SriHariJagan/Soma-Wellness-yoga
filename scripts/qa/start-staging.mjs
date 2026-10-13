#!/usr/bin/env node
/**
 * scripts/qa/start-staging.mjs
 *
 * Boots the REAL Soma Wellness API against an ISOLATED staging environment.
 *
 * Safety rails (do not remove):
 *   - MONGO_URI is forced to the local staging mongod. If it is not the local
 *     host the process refuses to start, so this can never be pointed at the
 *     production Atlas cluster.
 *   - Pesapal credentials are forced empty, so isConfigured() is false and the
 *     process can never call a real payment provider.
 *   - SMTP is forced empty, so no real email can be sent.
 *   - Graceful shutdown on SIGINT/SIGTERM.
 *
 * Usage:  node scripts/qa/start-staging.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const STAGING_MONGO = 'mongodb://127.0.0.1:27018/soma_staging';

function readStagingEnv() {
  const p = path.join(ROOT, 'test-artifacts', 'staging', '.env.staging');
  if (!fs.existsSync(p)) throw new Error('Missing test-artifacts/staging/.env.staging');
  const out = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = readStagingEnv();

// ── HARD SAFETY RAILS ──
if (!String(env.MONGO_URI).startsWith('mongodb://127.0.0.1')) {
  console.error('[staging] REFUSING TO START: MONGO_URI is not the local isolated instance.');
  process.exit(2);
}
for (const k of ['PESAPAL_CONSUMER_KEY', 'PESAPAL_CONSUMER_SECRET', 'PESAPAL_IPN_ID', 'SMTP_HOST']) {
  if (env[k]) {
    console.error(`[staging] REFUSING TO START: ${k} is set. Staging must not reach real providers.`);
    process.exit(2);
  }
}

const childEnv = {
  ...process.env,
  ...env,
  NODE_ENV: 'staging',
  MONGO_URI: STAGING_MONGO,
  PORT: env.PORT || '5100',
  PESAPAL_ENV: 'sandbox',
  PESAPAL_CONSUMER_KEY: '',
  PESAPAL_CONSUMER_SECRET: '',
  PESAPAL_IPN_ID: '',
  PESAPAL_NOTIFICATION_ID: '',
  SMTP_HOST: '',
  SMTP_USER: '',
  SMTP_PASS: '',
  SMTP_PORT: '',
  LOG_LEVEL: env.LOG_LEVEL || 'warn',
};

const child = spawn(process.execPath, [path.join(ROOT, 'server', 'server.js')], {
  cwd: ROOT,
  env: childEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
});

const stamp = () => new Date().toISOString();
child.stdout.on('data', (d) => process.stdout.write(`[staging:out ${stamp()}] ${d}`));
child.stderr.on('data', (d) => process.stderr.write(`[staging:err ${stamp()}] ${d}`));
child.on('exit', (code, sig) => {
  console.log(`[staging] exited code=${code} signal=${sig}`);
  process.exit(code ?? 0);
});

for (const s of ['SIGINT', 'SIGTERM']) {
  process.on(s, () => {
    console.log(`[staging] ${s} -> graceful shutdown`);
    child.kill(s);
    setTimeout(() => { child.kill('SIGKILL'); }, 8000);
  });
}

console.log(`[staging] launching API on :${env.PORT} against ${STAGING_MONGO}`);