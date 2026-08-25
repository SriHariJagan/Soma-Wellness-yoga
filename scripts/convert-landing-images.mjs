import sharp from "sharp";

const srcDir = "C:/Users/hante/AppData/Local/Temp/opencode";
const outDir = "public/images/landing";

const files = [
  { src: "prenatal-hero.jpg", out: "prenatal-hero.webp", w: 1600, h: 900, fit: "cover" },
  { src: "prenatal-mat.jpg", out: "prenatal-gentle.webp", w: 1000, h: 1250, fit: "cover" },
  { src: "prenatal-instructor.jpg", out: "prenatal-instructor.webp", w: 1000, h: 1250, fit: "cover" },
  { src: "prenatal-relax.jpg", out: "prenatal-relax.webp", w: 1000, h: 1250, fit: "cover" },
];

for (const f of files) {
  const info = await sharp(`${srcDir}/${f.src}`)
    .resize(f.w, f.h, { fit: f.fit, position: "attention" })
    .webp({ quality: 82 })
    .toFile(`${outDir}/${f.out}`);
  console.log(`${f.out}: ${info.width}x${info.height}, ${info.size} bytes`);
}