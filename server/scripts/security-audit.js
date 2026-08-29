// ============================================================
// scripts/security-audit.js
// Automated payment-activation-chain security scanner.
// Scans the backend for code that bypasses the canonical flow:
//   Controller -> PaymentService -> VerificationService -> FulfillmentService
//
// Usage:  node server/scripts/security-audit.js
//         node server/scripts/security-audit.js --json        (JSON report)
//         node server/scripts/security-audit.js --fail-warn   (exit 1 even on WARN)
//
// Exit codes:
//   0 - no CRITICAL findings
//   1 - at least one CRITICAL finding (or WARN with --fail-warn)
// ============================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/* ── Paths ─────────────────────────────────────────────────── */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, '..');

const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', '__tests__', 'scripts', 'uploads', 'notification',
]);
const EXCLUDE_FILES = new Set([
  'security-audit.js', 'eslint.config.js', 'vite.config.js',
]);

/* ── Helpers ───────────────────────────────────────────────── */
function listFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    if (EXCLUDE_FILES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(full));
    else if (entry.isFile() && /\.(js|mjs)$/i.test(entry.name)) files.push(full);
  }
  return files;
}

function norm(p) {
  return p.replace(/\\/g, '/');
}

function relPath(absPath) {
  return norm(path.relative(SERVER_DIR, absPath));
}

function readLines(filePath) {
  return fs.readFileSync(filePath, 'utf-8').split('\n');
}

function isExemptFile(rel, patterns) {
  const n = norm(rel);
  return patterns.some((p) => n.includes(p));
}

function isExemptLine(line, patterns) {
  return patterns.some((p) => line.includes(p));
}

// Check if line is a SCHEMA/ENUM definition (not a runtime operation)
function isSchemaOrEnum(line) {
  return /\b(enum|Schema|default|validate|type\s*:\s*String|type\s*:\s*Number|type\s*:\s*Date|timestamps|_id|required)\b/.test(line)
    && /['"]/.test(line);
}

// Check if line is a READ/MATCH query (not a write)
function isReadQuery(line) {
  return /\b(find|findOne|findById|countDocuments|distinct|aggregate|exists)\s*\(/.test(line)
    || /\$match\b/.test(line);
}

// Check if line is a schema model definition (mongoose.model)
function isModelDef(line) {
  return /mongoose\.model\s*\(/.test(line) || /new\s+mongoose\.Schema/.test(line);
}

/* ── Finding accumulator ──────────────────────────────────── */
const findings = [];

function add(id, severity, description, file, lineNum, match, snippet, explanation, fix) {
  findings.push({ id, severity, description, file, line: lineNum, match, snippet, explanation, fix });
}

/* ── DETECTOR 1: Direct Payment.create outside PaymentRepository ── */
function detectDirectPaymentCreate(filePath, rel, lines) {
  if (isExemptFile(rel, ['payment/repository/PaymentRepository.js', 'seed.js', 'seed-services.js'])) return;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/\bPayment\.create\s*\(/.test(line)) continue;
    if (isExemptLine(line, ['//', '*', 'createManualPayment', 'createFreePayment', 'PaymentRepository'])) continue;
    if (isSchemaOrEnum(line) || isModelDef(line)) continue;

    add(
      'direct-payment-create', 'CRITICAL',
      'Direct Payment.create() call outside PaymentRepository',
      rel, i + 1, 'Payment.create(',
      line.trim(),
      'Payment.create() bypasses the two-axis state machine. PaymentRepository is the single authorized creator.',
      'Use PaymentRepository.create(), createManualPayment(), or createFreePayment().'
    );
  }
}

/* ── DETECTOR 2: Direct Membership.create outside FulfillmentService/seed ── */
function detectDirectMembershipCreate(filePath, rel, lines) {
  if (isExemptFile(rel, ['payment/services/FulfillmentService.js', 'seed.js', 'seed-services.js'])) return;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/\bMembership\.create\s*\(/.test(line)) continue;
    if (isExemptLine(line, ['//', '*'])) continue;
    if (isSchemaOrEnum(line) || isModelDef(line)) continue;

    add(
      'direct-membership-create', 'CRITICAL',
      'Direct Membership.create() outside FulfillmentService',
      rel, i + 1, 'Membership.create(',
      line.trim(),
      'Membership creation must go through FulfillmentService.activateItem() to guarantee it pairs with a captured payment.',
      'Delegate Membership creation to FulfillmentService.activateItem().'
    );
  }
}

/* ── DETECTOR 3: Direct UserService.create outside FulfillmentService/serviceService/seed ── */
function detectDirectUserServiceCreate(filePath, rel, lines) {
  if (isExemptFile(rel, ['payment/services/FulfillmentService.js', 'services/serviceService.js', 'seed.js', 'seed-services.js'])) return;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/\bUserService\.create\s*\(/.test(line)) continue;
    if (isExemptLine(line, ['//', '*'])) continue;
    if (isSchemaOrEnum(line) || isModelDef(line)) continue;

    add(
      'direct-userservice-create', 'CRITICAL',
      'Direct UserService.create() outside FulfillmentService or serviceService',
      rel, i + 1, 'UserService.create(',
      line.trim(),
      'UserService activation must always be paired with a captured payment via FulfillmentService or the admin serviceService flow.',
      'Delegate UserService creation to FulfillmentService.activateItem() or serviceService.'
    );
  }
}

/* ── DETECTOR 4: Hardcoded paymentStatus:'captured'/'paid' in WRITE context ── */
function detectHardcodedPaymentStatusWrite(filePath, rel, lines) {
  if (isExemptFile(rel, [
    'payment/repository/PaymentRepository.js',
    'payment/services/FulfillmentService.js',
    'payment/PaymentService.js',
    'payment/services/WebhookService.js',
  ])) return;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Only flag lines that are WRITE operations:
    // Inside a .create() call
    // Inside a .update*() / .findByIdAndUpdate() call
    // Inside an object literal assigned to a variable used for creation
    // Direct property assignment (.paymentStatus = 'captured')
    const isWrite = /\.create\s*\(/.test(lines.slice(Math.max(0, i - 5), i + 1).join(' '))
      || /\.(updateOne|updateMany|findByIdAndUpdate|findOneAndUpdate|findByIdAndReplace)\s*\(/.test(lines.slice(Math.max(0, i - 3), i + 1).join(' '))
      || /\.paymentStatus\s*=/.test(line)
      || /(\$set|\$setOnInsert)\s*:/.test(line)
      || /^\s*(const|let|var)\s+\w+\s*=\s*\{[^}]*paymentStatus/.test(line);

    if (!isWrite) continue;

    const m = line.match(/paymentStatus\s*:\s*['"](paid|captured)['"]/);
    if (!m) continue;
    if (isExemptLine(line, ['//', '*', 'enum:', 'default:'])) continue;
    if (isSchemaOrEnum(line) || isModelDef(line)) continue;

    add(
      'hardcoded-paymentstatus-write', 'CRITICAL',
      `Hardcoded paymentStatus:"${m[1]}" inside a WRITE operation outside authorized files`,
      rel, i + 1, m[0],
      line.trim(),
      'Hardcoding paymentStatus in a write bypasses the PaymentRepository state machine. Use atomicStatusTransition() or dedicated create methods.',
      'Use PaymentRepository.atomicStatusTransition(), createManualPayment(), or createFreePayment().'
    );
  }
}

/* ── DETECTOR 5: Direct Payment update bypassing repository ── */
function detectDirectPaymentUpdate(filePath, rel, lines) {
  if (isExemptFile(rel, [
    'payment/repository/PaymentRepository.js',
    'payment/services/WebhookService.js',
    'payment/PaymentService.js',
  ])) return;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/\bPayment\.(findByIdAndUpdate|findOneAndUpdate|updateOne|updateMany)\s*\(/);
    if (!m) continue;
    if (isExemptLine(line, ['//', '*', 'auditTrail', 'invoiceNo', 'receiptUrl', 'lockVersion', 'isDeleted', 'refunds'])) continue;

    add(
      'direct-payment-update', 'HIGH',
      `Direct Payment.${m[1]}() bypassing PaymentRepository`,
      rel, i + 1, m[0],
      line.trim(),
      'Direct Payment updates bypass atomicStatusTransition() concurrency-safe state machine.',
      'Use PaymentRepository.atomicStatusTransition() or updateAfterCapture().'
    );
  }
}

/* ── DETECTOR 6: Direct Membership/UserService update bypassing FulfillmentService ── */
function detectDirectModelUpdate(filePath, rel, lines) {
  if (isExemptFile(rel, [
    'payment/services/FulfillmentService.js',
    'services/serviceService.js',
  ])) return;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/\b(Membership|UserService)\.(findByIdAndUpdate|findOneAndUpdate|updateOne|updateMany)\s*\(/);
    if (!m) continue;
    if (isExemptLine(line, ['//', '*'])) continue;

    add(
      'direct-model-update', 'HIGH',
      `Direct ${m[1]}.${m[2]}() bypassing FulfillmentService`,
      rel, i + 1, m[0],
      line.trim(),
      'Direct activation status updates bypass the FulfillmentService activation chain.',
      'Use FulfillmentService.activateItem() for activation or serviceService for admin flows.'
    );
  }
}

/* ── DETECTOR 7: Route bypass - controller doesn't import PaymentService ── */
function detectRouteBypass(filePath, rel, lines) {
  // Only scan student-facing routes. Admin routes intentionally use
  // PaymentRepository directly and are authorized to bypass PaymentService.
  if (!rel.startsWith('routes/') || rel.startsWith('routes/admin')) return;

  // Build map: alias -> controllerName
  const ctrlImports = [];
  for (const line of lines) {
    const m = line.match(/import\s+\*\s+as\s+(\w+)\s+from\s+['"].*controllers\/(\w+)Controller\.js['"]/);
    if (m) ctrlImports.push({ alias: m[1], name: m[2] });
  }

  const ctrlCache = new Map();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const routeMatch = line.match(/router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\.(\w+)/);
    if (!routeMatch) continue;

    const ctrlAlias = routeMatch[3];
    const routePath = routeMatch[2];
    const handlerName = routeMatch[4];

    // Only flag payment/membership/service related routes
    if (!/payment|membership|service|enroll|renew|purchase|checkout|cart|plan|assign/i.test(routePath)
      && !/payment|membership|service|enroll|renew|purchase|assign/i.test(handlerName)) continue;

    const importInfo = ctrlImports.find((ci) => ci.alias === ctrlAlias);
    if (!importInfo) continue;

    // Check controller file for PaymentService usage
    if (!ctrlCache.has(importInfo.name)) {
      const ctrlPath = path.join(SERVER_DIR, 'controllers', `${importInfo.name}Controller.js`);
      if (!fs.existsSync(ctrlPath)) {
        ctrlCache.set(importInfo.name, false);
        continue;
      }
      const ctrlContent = fs.readFileSync(ctrlPath, 'utf-8');
      ctrlCache.set(importInfo.name, /PaymentService/.test(ctrlContent));
    }

    if (!ctrlCache.get(importInfo.name)) {
      add(
        'route-bypass-paymentservice', 'HIGH',
        `Route "${routePath}" uses ${ctrlAlias}.${handlerName} but ${importInfo.name}Controller does not import PaymentService`,
        rel, i + 1, line.trim(),
        line.trim(),
        'Payment/membership/service routes must delegate through PaymentService to enforce the activation chain.',
        `Ensure ${importInfo.name}Controller.${handlerName} delegates to PaymentService.initiate() or initiateFree().`
      );
    }
  }
}

/* ── DETECTOR 8: Direct .save() after status assignment on Payment/Membership/UserService ── */
function detectSaveAfterStatus(filePath, rel, lines) {
  if (isExemptFile(rel, [
    'payment/repository/PaymentRepository.js',
    'payment/services/FulfillmentService.js',
    'payment/PaymentService.js',
    'payment/services/WebhookService.js',
    'services/serviceService.js',
    'seed.js',
  ])) return;

  // Models that are relevant to payment activation chain
  const relevantModels = ['payment', 'membership', 'userService', 'm\\b', 'us\\b'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Only flag .save() calls on relevant model variables
    const saveMatch = line.match(/\.save\s*\(\s*\)/);
    if (!saveMatch) continue;

    // Check that the variable being saved is payment/membership/userservice
    const varName = line.split('.save')[0].trim().split(/\s+/).pop();
    const isRelevant = relevantModels.some((m) => new RegExp(m, 'i').test(varName));
    if (!isRelevant) continue;

    // Check preceding 8 lines for manual ACTIVATION status assignment
    // (paused/cancelled/expired are lifecycle transitions that don't create payments)
    const ctx = lines.slice(Math.max(0, i - 8), i + 1).join(' ');
    const statusMatch = ctx.match(/\.(status|paymentStatus)\s*=\s*['"]([^'"]+)['"]/);
    if (!statusMatch) continue;
    const val = statusMatch[2];
    if (!['active', 'paid', 'captured'].includes(val)) continue;
    if (isExemptLine(line, ['//', '*'])) continue;

    add(
      'direct-save-after-status', 'HIGH',
      'Manual .save() after status/paymentStatus assignment on Payment/Membership/UserService outside authorized files',
      rel, i + 1, '.save() after status assignment',
      line.trim(),
      'Saving a model instance after manually setting its status bypasses the activation chain and state machine.',
      'Use PaymentRepository.atomicStatusTransition() or FulfillmentService.activateItem().'
    );
  }
}

/* ── DETECTOR 9: Controller-level Payment/Membership/UserService.create outside authorized controllers ── */
function detectControllerDirectCreate(filePath, rel, lines) {
  if (!rel.startsWith('controllers/')) return;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/\b(Payment|Membership|UserService)\.create\s*\(/);
    if (!m) continue;
    if (isExemptLine(line, ['//', '*', 'PaymentService', 'paymentService', 'PaymentRepository', 'FulfillmentService', 'serviceService'])) continue;

    add(
      'controller-direct-create', 'CRITICAL',
      `Controller calling ${m[1]}.create() without going through PaymentService`,
      rel, i + 1, m[0],
      line.trim(),
      'Controllers must not directly create Payment/Membership/UserService. All activations must go through PaymentService or PaymentRepository.',
      `Delegate to PaymentService.initiate()/initiateFree() for student flows, or PaymentRepository.createManualPayment() for admin flows.`
    );
  }
}

/* ── Scanner ───────────────────────────────────────────────── */
function scan() {
  const files = listFiles(SERVER_DIR);

  for (const filePath of files) {
    const rp = relPath(filePath);
    const lines = readLines(filePath);

    detectDirectPaymentCreate(filePath, rp, lines);
    detectDirectMembershipCreate(filePath, rp, lines);
    detectDirectUserServiceCreate(filePath, rp, lines);
    detectHardcodedPaymentStatusWrite(filePath, rp, lines);
    detectDirectPaymentUpdate(filePath, rp, lines);
    detectDirectModelUpdate(filePath, rp, lines);
    detectRouteBypass(filePath, rp, lines);
    detectSaveAfterStatus(filePath, rp, lines);
    detectControllerDirectCreate(filePath, rp, lines);
  }

  return findings;
}

/* ── Report ────────────────────────────────────────────────── */
function generateReport(findings, format = 'table') {
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  findings.sort((a, b) => {
    const d = (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
    if (d !== 0) return d;
    return a.file.localeCompare(b.file) || a.line - b.line;
  });

  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const f of findings) counts[f.severity]++;

  if (format === 'json') {
    return JSON.stringify({ findings, summary: counts }, null, 2);
  }

  let report = '';
  report += '='.repeat(100) + '\n';
  report += '  SOMA WELLNESS - PAYMENT ACTIVATION CHAIN SECURITY AUDIT\n';
  report += '='.repeat(100) + '\n\n';

  if (findings.length === 0) {
    report += '  No findings - payment activation chain is secure.\n\n';
    return report;
  }

  report += `  Found ${findings.length} issue(s): ${counts.CRITICAL} CRITICAL, ${counts.HIGH} HIGH, ${counts.MEDIUM} MEDIUM, ${counts.LOW} LOW\n\n`;

  for (const f of findings) {
    const badge = { CRITICAL: 'CRITICAL', HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' }[f.severity] || f.severity;
    report += `  [${badge}] ${f.description}\n`;
    report += `         File:  ${f.file}:${f.line}\n`;
    report += `         Code:  ${f.snippet}\n`;
    report += `         Why:   ${f.explanation}\n`;
    report += `         Fix:   ${f.fix}\n\n`;
  }

  report += '-'.repeat(100) + '\n';
  report += '  SUMMARY\n';
  report += '-'.repeat(100) + '\n';
  report += `    CRITICAL  ${counts.CRITICAL}\n`;
  report += `    HIGH      ${counts.HIGH}\n`;
  report += `    MEDIUM    ${counts.MEDIUM}\n`;
  report += `    LOW       ${counts.LOW}\n`;
  report += `    TOTAL     ${findings.length}\n\n`;

  if (counts.CRITICAL > 0) {
    report += `  FAILED: ${counts.CRITICAL} critical issue(s) must be resolved before deployment.\n`;
  } else {
    report += '  PASSED: No critical issues.\n';
  }

  return report;
}

/* ── Main ──────────────────────────────────────────────────── */
function main() {
  const args = process.argv.slice(2);
  const format = args.includes('--json') ? 'json' : 'table';
  const failOnWarn = args.includes('--fail-warn');

  console.error('Scanning payment activation chain...\n');

  const results = scan();
  const report = generateReport(results, format);

  if (format === 'json') {
    console.log(report);
  } else {
    console.log(report);
  }

  const critical = results.filter((f) => f.severity === 'CRITICAL').length;
  const high = results.filter((f) => f.severity === 'HIGH').length;

  if (critical > 0) process.exit(1);
  if (failOnWarn && high > 0) process.exit(1);
  process.exit(0);
}

main();
