// test-courses-tab-sale.mjs — register → sell course (M-Pesa) → buyer login → cleanup
const BASE = 'http://localhost:5000';
const r = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'reception1@yoga.com', password: 'Reception@123' }),
});
const { token } = await r.json();
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const cat = await (await fetch(`${BASE}/api/reception/catalog`, { headers: { Authorization: `Bearer ${token}` } })).json();
console.log('courses:');
for (const c of cat.courses) console.log(` - ${c.title} | ${c.duration} | ${c.price} | desc:${(c.description || '').slice(0, 40)}`);

const ts = Date.now();
const nu = await (await fetch(`${BASE}/api/reception/students`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ name: 'Course Buyer', email: `buyer${ts}@example.com`, password: 'Buyer@123' }),
})).json();
console.log('registered:', nu._id);

const sale = await (await fetch(`${BASE}/api/reception/students/${nu._id}/purchases`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ kind: 'course', itemId: cat.courses[0]._id, method: 'M-Pesa' }),
})).json();
console.log('sold:', sale?.payment?.label, sale?.payment?.amount, 'fulfilled:', sale?.fulfillment?.fulfilled);

const li = await (await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: `buyer${ts}@example.com`, password: 'Buyer@123' }),
})).json();
console.log('buyer login role:', li?.user?.role);

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;
const sid = new mongoose.Types.ObjectId(nu._id);
await db.collection('users').deleteOne({ _id: sid });
await db.collection('payments').deleteMany({ user: sid });
await db.collection('courses').updateOne(
  { _id: new mongoose.Types.ObjectId(cat.courses[0]._id) },
  { $pull: { enrolledUsers: { user: sid } } },
);
console.log('cleanup ok, users:', await db.collection('users').countDocuments());
await mongoose.disconnect();
process.exit(0);
