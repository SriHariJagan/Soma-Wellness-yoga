// Seeds the 2 missing Academy offerings (Yoga Foundations + SOMA 100)
// so /courses shows all three teacher-training courses.
// Run: node seed-academy.js
import './loadEnv.js';
import mongoose from 'mongoose';
import './models/Offering.js';

const MONGO_URI = process.env.MONGO_URI;

const OFFERINGS = [
  {
    name: 'Yoga Foundations',
    subtitle: '25-Hour Foundation Course',
    description: 'A 25-hour foundation in yoga practice and philosophy. The perfect first step before teacher training.',
    category: 'academy',
    price: 30000,
    sessions: 0,
    sessionDuration: 60,
    validityDuration: 3,
    validityUnit: 'months',
    whatIncluded: ['25 hours of training', 'Foundations of asana', 'Intro to pranayama', 'Yoga philosophy basics', 'Certificate of completion'],
    benefits: ['Start your journey', 'Expert faculty', 'Small cohorts', 'Pathway to SOMA 100'],
    tags: ['academy', 'foundations', 'beginner'],
    featured: false,
    isPopular: false,
    status: 'available',
    visibility: 'public',
    bookingEnabled: true,
    displayOrder: 78,
  },
  {
    name: 'SOMA 100',
    subtitle: 'Foundation Teacher Course',
    description: 'Our 100-hour foundation teacher course. Deepen your practice and take the first step toward teaching.',
    category: 'academy',
    price: 85000,
    sessions: 0,
    sessionDuration: 60,
    validityDuration: 4,
    validityUnit: 'months',
    whatIncluded: ['100 hours of training', 'Asana & alignment', 'Pranayama & meditation', 'Anatomy basics', 'Teaching practicum', 'Certificate'],
    benefits: ['Teach foundations', 'Expert faculty', 'Progress to SOMA 200', 'Lifetime community'],
    tags: ['academy', 'teacher-training', 'foundation'],
    featured: false,
    isPopular: false,
    status: 'available',
    visibility: 'public',
    bookingEnabled: true,
    displayOrder: 79,
  },
];

async function seedAcademy() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');
    const Offering = mongoose.model('Offering');
    for (const data of OFFERINGS) {
      const existing = await Offering.findOne({ name: data.name });
      if (existing) {
        console.log(`  [SKIP] ${data.name} — already exists`);
        continue;
      }
      await Offering.create(data);
      console.log(`  [CREATE] ${data.name} — KES ${data.price}`);
    }
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
}

seedAcademy();
