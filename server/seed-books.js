// ============================================================
// seed-books.js — Populate the Pragya Yoga book store catalogue.
// Run:  node server/seed-books.js
//
// SAFE TO RE-RUN: books are upserted by SKU; stock numbers are
// only set on first insert (never overwrite live stock).
// Factual catalogue data only — descriptions, SEO and cover
// images are intentionally left blank for the admin to fill.
// ============================================================
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import Book from './models/Book.js';

dotenv.config();

const BOOKS = [
  {
    title: 'The Confident Child',
    slug: 'the-confident-child',
    sku: 'PYA-BK-TCC',
    authors: ['Dr. Kapil Kesari'],
    price: 450,
    pages: 378,
    category: 'Parenting & Wellbeing',
    tags: ['parenting', 'confidence', 'child development'],
    language: 'English',
    isPaperback: true,
    stock: 0,
    lowStockThreshold: 5,
    trackInventory: true,
    allowBackorder: false,
    featured: true,
    displayOrder: 1,
  },
  {
    title: 'One Breath Wiser',
    slug: 'one-breath-wiser',
    sku: 'PYA-BK-OBW',
    authors: ['Rebecca Miano, EGH', 'Dr. Kapil Kesari, PhD'],
    price: 399,
    pages: 265,
    category: 'Yoga & Breathwork',
    tags: ['breathwork', 'pranayama', 'meditation'],
    language: 'English',
    isPaperback: true,
    stock: 0,
    lowStockThreshold: 5,
    trackInventory: true,
    allowBackorder: false,
    featured: true,
    displayOrder: 2,
  },
  {
    title: 'Work Well with Yoga',
    slug: 'work-well-with-yoga',
    sku: 'PYA-BK-WWY',
    authors: ['Rebecca Miano, EGH', 'Dr. Kapil Kesari, PhD'],
    price: 499,
    pages: 200,
    category: 'Yoga & Workplace Wellness',
    tags: ['workplace wellness', 'office yoga', 'desk health'],
    language: 'English',
    isPaperback: true,
    stock: 0,
    lowStockThreshold: 5,
    trackInventory: true,
    allowBackorder: false,
    featured: true,
    displayOrder: 3,
  },
  {
    title: 'The Complete YCB Exam Question Bank',
    slug: 'the-complete-ycb-exam-question-bank',
    sku: 'PYA-BK-YCBQ',
    authors: ['Dr. Kapil Kesari, PhD', 'Dr. Mrityunjay Kesari, PhD'],
    price: 1199,
    pages: 590,
    category: 'Yoga Exams & Certification',
    tags: ['ycb', 'yoga exam', 'question bank', 'certification'],
    language: 'English',
    isPaperback: true,
    stock: 0,
    lowStockThreshold: 5,
    trackInventory: true,
    allowBackorder: false,
    featured: true,
    displayOrder: 4,
  },
];

async function run() {
  await connectDB(process.env.MONGO_URI);

  let created = 0;
  let updated = 0;

  for (const data of BOOKS) {
    const existing = await Book.findOne({ sku: data.sku });
    if (existing) {
      // Never overwrite live stock, descriptions, SEO or covers.
      const { stock, ...patch } = data;
      delete patch.stock;
      await Book.updateOne({ _id: existing._id }, { $set: patch });
      updated++;
      console.log(`~ updated (stock untouched): ${data.sku} — ${data.title}`);
    } else {
      await Book.create(data);
      created++;
      console.log(`+ created: ${data.sku} — ${data.title} (stock ${data.stock}, set by admin)`);
    }
  }

  console.log(`\nDone. ${created} created, ${updated} updated.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});