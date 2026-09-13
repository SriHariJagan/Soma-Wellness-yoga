// inspect-raw-classes.mjs — look at raw ClassSession + Course docs (bypass mongoose)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

for (const name of ['classsessions', 'courses', 'services']) {
  const cols = await db.listCollections({ name }).toArray();
  if (!cols.length) { console.log(`-- ${name}: MISSING`); continue; }
  const docs = await db.collection(name).find({}).limit(5).toArray();
  console.log(`-- ${name}: ${await db.collection(name).countDocuments()} docs`);
  for (const d of docs) {
    const shape = {};
    for (const [k, v] of Object.entries(d)) {
      shape[k] = Array.isArray(v) ? `array[${v.length}]` : (v === null ? 'null' : typeof v);
    }
    console.log('   ', JSON.stringify(shape));
    for (const [k, v] of Object.entries(d)) {
      if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && k !== '_id') {
        console.log('    OBJECT FIELD', k, '=', JSON.stringify(v).slice(0, 200));
      }
    }
  }
}
await mongoose.disconnect();
process.exit(0);
