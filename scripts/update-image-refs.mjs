// scripts/update-image-refs.mjs
// UTF-8-safe replacement of image references (.png/.jpg -> .webp) in src/.
import fs from "node:fs";
import path from "node:path";

const REPLACEMENTS = [
  ["logo.png", "logo.webp"],
  ["studio.jpg", "studio.webp"],
  ["Home_about.jpg", "Home_about.webp"],
  ["Yoga_logo13-300x55.png", "Yoga_logo13-300x55.webp"],
  ["skm_yoga.png", "skm_yoga.webp"],
  ["gyanish-logo-300x165.png", "gyanish-logo-300x165.webp"],
  ["kapil.png", "kapil.webp"],
  ["Shreya.png", "Shreya.webp"],
  ["Mrityunjay.png", "Mrityunjay.webp"],
  ["Vinod.png", "Vinod.webp"],
  ["Ashish.png", "Ashish.webp"],
  ["Sunil.png", "Sunil.webp"],
  ["Deepak.jpg", "Deepak.webp"],
  ["teacher-hero.png", "teacher-hero.webp"],
  ["yoga1.png", "yoga1.webp"],
  ["yoga2.png", "yoga2.webp"],
  ["about.png", "about.webp"],
  ["Aboutus.png", "Aboutus.webp"],
  ["YTTC.png", "YTTC.webp"],
  ["Hatha_yoga.png", "Hatha_yoga.webp"],
  ["Power_Yoga.png", "Power_Yoga.webp"],
  ["Vinyasa_Yoga.png", "Vinyasa_Yoga.webp"],
  ["Iyengar_Yoga.png", "Iyengar_Yoga.webp"],
  ["therapy.png", "therapy.webp"],
  ["workshop.jpg", "workshop.webp"],
  ["yoga-mat.png", "yoga-mat.webp"],
  ["clock.png", "clock.webp"],
  ["exam.png", "exam.webp"],
  ["recording.png", "recording.webp"],
  ["calendar.png", "calendar.webp"],
  ["earth.png", "earth.webp"],
  ["lotus.png", "lotus.webp"],
  ["yoga.png", "yoga.webp"],
  ["book.png", "book.webp"],
  ["anatomy.png", "anatomy.webp"],
  ["teachings.png", "teachings.webp"],
  ["meditation.png", "meditation.webp"],
  ["@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Jost:wght@400;500;600&display=swap');", ""],
  ["font-family: 'Jost', sans-serif;", "font-family: var(--font-body, 'Inter', sans-serif);"],
  ["font-family: 'Cormorant Garamond', serif;", "font-family: var(--font-heading, 'Outfit', sans-serif);"],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx|js|css)$/.test(entry.name)) files.push(full);
  }
  return files;
}

let updated = 0;
for (const file of walk("src")) {
  const content = fs.readFileSync(file, "utf8");
  let next = content;
  for (const [from, to] of REPLACEMENTS) next = next.split(from).join(to);
  if (next !== content) {
    fs.writeFileSync(file, next, "utf8");
    updated++;
    console.log(`updated ${file}`);
  }
}
console.log(`\n${updated} files updated`);
