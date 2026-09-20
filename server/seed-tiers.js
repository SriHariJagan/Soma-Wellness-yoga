// Seeds the Bronze / Silver / Gold membership tiers (3 / 6 / 12 months).
// Manage afterwards in Admin → Courses & Plans → Plans.
// Run: node seed-tiers.js
import './loadEnv.js';
import mongoose from 'mongoose';
import './models/Plan.js';

const MONGO_URI = process.env.MONGO_URI;

const PLANS = [
  {
    name: 'Bronze',
    description: 'Three months of unlimited group yoga — build your foundation.',
    price: 48000,
    currency: 'KES',
    durationMonths: 3,
    pauseDays: 7,
    benefits: [
      'Unlimited group yoga classes',
      '1 meditation session per week',
      'Mat and props provided',
      'Post-class herbal tea',
    ],
    badge: '',
    displayOrder: 1,
    isPopular: false,
    isRecommended: false,
    active: true,
    visibility: 'public',
  },
  {
    name: 'Silver',
    description: 'Six months of unlimited practice plus recovery — our most loved tier.',
    price: 88000,
    currency: 'KES',
    durationMonths: 6,
    pauseDays: 14,
    benefits: [
      'Everything in Bronze',
      '2 steam sessions per month',
      '1 massage per quarter',
      'Priority class booking',
    ],
    badge: 'Most Popular',
    displayOrder: 2,
    isPopular: true,
    isRecommended: true,
    active: true,
    visibility: 'public',
  },
  {
    name: 'Gold',
    description: 'Twelve months of all-inclusive wellness — yoga, recovery and personal guidance.',
    price: 160000,
    currency: 'KES',
    durationMonths: 12,
    pauseDays: 30,
    benefits: [
      'Everything in Silver',
      '4 steam sessions per month',
      '1 massage per month',
      '1 private session per quarter',
      'Guest passes (2 per year)',
    ],
    badge: 'Best Value',
    displayOrder: 3,
    isPopular: false,
    isRecommended: false,
    active: true,
    visibility: 'public',
  },
];

async function seedTiers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');
    const Plan = mongoose.model('Plan');
    for (const data of PLANS) {
      const existing = await Plan.findOne({ name: data.name });
      if (existing) {
        console.log(`  [SKIP] ${data.name} — already exists`);
        continue;
      }
      await Plan.create(data);
      console.log(`  [CREATE] ${data.name} — ${data.durationMonths}mo — KES ${data.price}`);
    }
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
}

seedTiers();
