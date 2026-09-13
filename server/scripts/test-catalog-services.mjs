// test-catalog-services.mjs — catalog has courses+services+plans; sell a service; cleanup
const BASE = 'http://localhost:5000';
const r = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'reception1@yoga.com', password: 'Reception@123' }),
});
if (r.status !== 200) { console.log('login:', r.status, (await r.text()).slice(0, 150)); process.exit(1); }
const { token } = await r.json();
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const cat = await (await fetch(`${BASE}/api/reception/catalog`, { headers: { Authorization: `Bearer ${token}` } })).json();
console.log(`catalog: ${cat.courses?.length} courses, ${cat.services?.length} services, ${cat.plans?.length} plans`);
console.log('course[0] keys:', Object.keys(cat.courses?.[0] || {}).join(','));
console.log('service[0]:', cat.services?.[0]?.name, '|', cat.services?.[0]?.price, '|', cat.services?.[0]?.category);

// service sale e2e
const ts = Date.now();
const nu = await (await fetch(`${BASE}/api/reception/students`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ name: 'Service Buyer', email: `svc${ts}@example.com`, password: 'Buyer@123' }),
})).json();
console.log('registered:', nu._id);
const sale = await (await fetch(`${BASE}/api/reception/students/${nu._id}/purchases`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ kind: 'service', itemId: cat.services[0]._id, method: 'Card' }),
})).json();
console.log('service sold:', sale?.payment?.label, sale?.payment?.amount, 'fulfilled:', sale?.fulfillment?.fulfilled);
const hist = await (await fetch(`${BASE}/api/reception/students/${nu._id}/purchases`, { headers: { Authorization: `Bearer ${token}` } })).json();
console.log('history services:', hist.services?.length, '| payments:', hist.payments?.length);

// cleanup
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
await db.collection('userservices').deleteMany({ user: sid });
console.log('cleanup ok, users:', await db.collection('users').countDocuments());
await mongoose.disconnect();
process.exit(0);
