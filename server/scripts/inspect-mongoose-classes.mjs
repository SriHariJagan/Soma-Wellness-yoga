// inspect-mongoose-classes.mjs — what does the mongoose model actually return?
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

await mongoose.connect(process.env.MONGO_URI);
const { default: ClassSession } = await import('../models/ClassSession.js');
const docs = await ClassSession.find().limit(3);
for (const d of docs) {
  console.log(JSON.stringify(d.toJSON()).slice(0, 400));
}
await mongoose.disconnect();
process.exit(0);
