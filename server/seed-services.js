import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import Service from './models/Service.js';

dotenv.config();

const SERVICES = [
  { name: 'Offline Group Yoga', description: 'Community sessions in studio to enhance motivation.', mode: 'center', category: 'Group', type: 'Hatha', price: 2500, pricingModel: 'monthly', totalSessions: 0, sessionDuration: 60, scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], scheduleTime: '7:00 AM – 8:00 AM, 8:00 AM – 9:00 AM, 5:00 PM – 6:00 PM', timeSlots: [{ day: 'Monday – Friday', time: '7:00 AM – 8:00 AM', label: 'Neha' }, { day: 'Monday – Friday', time: '8:00 AM – 9:00 AM', label: 'Varsha' }, { day: 'Monday – Friday', time: '5:00 PM – 6:00 PM', label: 'Vinod' }], active: true, isPopular: true, displayOrder: 1 },
  { name: 'Online Group Yoga', description: 'Holistic online practice for fitness & clarity.', mode: 'online', category: 'Group', type: 'Vinyasa', price: 1500, pricingModel: 'monthly', totalSessions: 0, sessionDuration: 60, scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], scheduleTime: '9:00 AM – 10:00 AM, 11:30 AM – 12:30 PM IST', timeSlots: [{ day: 'Monday – Friday', time: '9:00 AM – 10:00 AM', label: 'Dr. Kapil' }, { day: 'Monday – Friday', time: '11:30 AM – 12:30 PM IST', label: 'Shreya' }], active: true, isPopular: true, displayOrder: 2 },
  { name: 'Personal Yoga (Center)', description: 'Tailored one-on-one sessions at our center for your personal goals. Includes 20 sessions within one month.', mode: 'center', category: 'Personal', type: 'Iyengar', price: 10000, pricingModel: 'monthly', totalSessions: 20, sessionDuration: 60, validityDuration: 1, validityUnit: 'months', scheduleDays: [], scheduleTime: 'Flexible', active: true, isPopular: false, displayOrder: 3 },
  { name: 'Personal Yoga (Home)', description: 'Personalized instruction at your home for maximum convenience. Includes 20 sessions within one month.', mode: 'home', category: 'Personal', type: 'Hatha', price: 12000, pricingModel: 'monthly', totalSessions: 20, sessionDuration: 60, validityDuration: 1, validityUnit: 'months', scheduleDays: [], scheduleTime: 'Flexible', active: true, isPopular: false, displayOrder: 4 },
  { name: 'Kids Yoga', description: 'Fun & engaging classes for children\'s well-being.', mode: 'center', category: 'Group', type: 'Vinyasa', price: 1500, pricingModel: 'monthly', totalSessions: 15, sessionDuration: 45, scheduleDays: [], scheduleTime: 'As per batch assignment', active: true, isPopular: false, displayOrder: 5 },
  { name: 'Pregnancy Yoga (Center)', description: 'Safe practices for expectant mothers at our center. Includes 20 sessions within one month.', mode: 'center', category: 'Specialty', type: 'Therapy', price: 10000, pricingModel: 'monthly', totalSessions: 20, sessionDuration: 60, validityDuration: 1, validityUnit: 'months', scheduleDays: [], scheduleTime: 'Flexible', active: true, isPopular: false, displayOrder: 6 },
  { name: 'Pregnancy Yoga (Home)', description: 'Safe prenatal yoga practices in the comfort of your home. Includes 20 sessions within one month.', mode: 'home', category: 'Specialty', type: 'Therapy', price: 12000, pricingModel: 'monthly', totalSessions: 20, sessionDuration: 60, validityDuration: 1, validityUnit: 'months', scheduleDays: [], scheduleTime: 'Flexible', active: true, isPopular: false, displayOrder: 7 },
  { name: 'Yoga for Stress', description: 'Targeted sessions for stress relief and mental wellness. Includes 12 sessions within one month.', mode: 'online', category: 'Specialty', type: 'Therapy', price: 1000, pricingModel: 'monthly', totalSessions: 12, sessionDuration: 30, scheduleDays: ['Monday', 'Wednesday', 'Friday'], scheduleTime: '7:30 AM – 8:00 AM', timeSlots: [{ day: 'Monday', time: '7:30 AM – 8:00 AM', label: 'Dr. Kapil' }, { day: 'Wednesday', time: '7:30 AM – 8:00 AM', label: 'Dr. Kapil' }, { day: 'Friday', time: '7:30 AM – 8:00 AM', label: 'Dr. Kapil' }], active: true, isPopular: false, displayOrder: 8 },
  { name: 'Corporate Yoga', description: 'Customized workplace wellness programs for your organization. Pricing depends on number of employees.', mode: 'hybrid', category: 'Corporate', type: 'Hatha', price: 0, pricingModel: 'contact', contactEmail: 'hello@somawellness.in', totalSessions: 0, sessionDuration: 60, scheduleDays: [], scheduleTime: 'Flexible', active: true, isPopular: false, displayOrder: 9 },
  { name: 'Advanced Yoga (Center)', description: 'Advanced asanas and intensive practice for experienced yogis.', mode: 'center', category: 'Group', type: 'Advanced', price: 5000, pricingModel: 'monthly', totalSessions: 20, sessionDuration: 60, scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], scheduleTime: '11:30 AM – 12:30 PM IST', timeSlots: [{ day: 'Monday – Friday', time: '11:30 AM – 12:30 PM IST', label: 'Vinod' }], active: true, isPopular: false, displayOrder: 10 },
  { name: 'Therapy Yoga (Center)', description: 'Therapeutic yoga practices for healing and recovery at our center. Includes 20 sessions within one month.', mode: 'center', category: 'Specialty', type: 'Therapy', price: 12000, pricingModel: 'monthly', totalSessions: 20, sessionDuration: 60, validityDuration: 1, validityUnit: 'months', scheduleDays: [], scheduleTime: 'Flexible', active: true, isPopular: false, displayOrder: 11 },
  { name: 'Therapy Yoga (Home)', description: 'Therapeutic yoga sessions in the comfort of your home. Includes 20 sessions within one month.', mode: 'home', category: 'Specialty', type: 'Therapy', price: 15000, pricingModel: 'monthly', totalSessions: 20, sessionDuration: 60, validityDuration: 1, validityUnit: 'months', scheduleDays: [], scheduleTime: 'Flexible', active: true, isPopular: false, displayOrder: 12 },
  { name: 'Abhyanga (Ayurvedic Massage)', description: 'Traditional Ayurvedic full-body oil massage for rejuvenation.', mode: 'center', category: 'Therapy', type: 'Ayurveda', price: 1200, pricingModel: 'per_session', totalSessions: 0, sessionDuration: 60, scheduleDays: [], scheduleTime: 'Flexible', active: true, isPopular: false, displayOrder: 13 },
  { name: 'Shirodhara (Forehead Oil-Pulling Therapy)', description: 'Gentle pouring of warm oil on the forehead for deep relaxation.', mode: 'center', category: 'Therapy', type: 'Ayurveda', price: 1800, pricingModel: 'per_session', totalSessions: 0, sessionDuration: 60, scheduleDays: [], scheduleTime: 'Flexible', active: true, isPopular: false, displayOrder: 14 },
];

async function run() {
  await connectDB(process.env.MONGO_URI);
  let created = 0;
  for (const svc of SERVICES) {
    const exists = await Service.findOne({ name: svc.name });
    if (!exists) {
      await Service.create(svc);
      created++;
    }
  }
  console.log(`✅ Services: ${created} created, ${SERVICES.length - created} already exist`);
  await mongoose.disconnect();
}

run().catch((err) => { console.error('❌', err); process.exit(1); });
