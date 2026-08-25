// scripts/optimize-images.mjs
// One-time asset optimization: converts every PNG/JPG in public/images to
// WebP (resized + compressed) and removes the original file.
// Usage: node scripts/optimize-images.mjs [--dry-run]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve("public/images");
const DRY_RUN = process.argv.includes("--dry-run");

// Max width per use case — heroes/wide photos stay large, portraits smaller.
const MAX_WIDTH = {
  "training": 1600,
  "services": 1600,
  "instructor": 700,
  "partner": 700,
  "icons": 256,
};

const QUALITY = 78;

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(png|jpe?g)$/i.test(entry.name)) files.push(full);
  }
}
walk(ROOT);

let beforeBytes = 0;
let afterBytes = 0;
const results = [];

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const folder = rel.split(path.sep)[0];
  const maxWidth = MAX_WIDTH[folder] || 1600;

  const meta = await sharp(file).metadata();
  const width = meta.width || 0;
  const targetWidth = Math.min(width, maxWidth);
  const outFile = file.replace(/\.(png|jpe?g)$/i, ".webp");

  if (DRY_RUN) {
    beforeBytes += fs.statSync(file).size;
    results.push(`${rel.padEnd(50)} ${(fs.statSync(file).size / 1024 / 1024).toFixed(2)} MB → ${path.basename(outFile)}`);
    continue;
  }

  try {
    await sharp(file)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 6 })
      .toFile(outFile);
    const before = fs.statSync(file).size;
    const after = fs.statSync(outFile).size;
    beforeBytes += before;
    afterBytes += after;
    fs.unlinkSync(file);
    results.push(`${rel.padEnd(50)} ${(before / 1024 / 1024).toFixed(2)} MB → ${(after / 1024 / 1024).toFixed(2)} MB`);
  } catch (err) {
    results.push(`${rel.padEnd(50)} FAILED: ${err.message}`);
  }
}

console.log(results.join("\n"));
console.log("─".repeat(70));
console.log(DRY_RUN ? "DRY RUN" : "DONE");
console.log(`Before: ${(beforeBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`After:  ${(afterBytes / 1024 / 1024).toFixed(2)} MB`);
