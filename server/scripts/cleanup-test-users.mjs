// cleanup-test-users.mjs — remove users created by test-students-api.mjs
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const c = (await mongoose.connect(process.env.MONGO_URI)).connection.db.collection('users');
const pattern = /^(teststudent|rectest)[0-9]+@example\.com$/;
const victims = await c.find({}).toArray();
let removed = 0;
for (const u of victims) {
  if (pattern.test(u.email)) {
    await c.deleteOne({ _id: u._id });
    removed++;
  }
}
console.log('Removed test users: ' + removed);
console.log('Remaining: ' + (await c.countDocuments()));
await mongoose.disconnect();
process.exit(0);
