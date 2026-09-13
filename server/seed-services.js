import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import Service from './models/Service.js';
import { SOMA_SERVICES } from './config/somaCatalog.js';

dotenv.config();

const SERVICES = SOMA_SERVICES;

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
