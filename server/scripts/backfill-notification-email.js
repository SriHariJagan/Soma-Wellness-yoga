import '../loadEnv.js';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { connectDB } from '../config/db.js';

const MODULE = 'BackfillEmail';

function log(...args) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${MODULE}]`, ...args);
}

async function backfill() {
  await connectDB(process.env.MONGO_URI);
  log('Connected to MongoDB');

  const batchSize = 500;
  let processed = 0;
  let updated = 0;
  let skipped = 0;

  const cursor = Notification.find({
    $or: [
      { email: { $exists: false } },
      { email: null },
      { email: '' },
    ],
  }).cursor();

  let batch = [];

  for await (const doc of cursor) {
    processed++;
    let resolvedEmail = '';

    if (doc.recipientEmail) {
      resolvedEmail = doc.recipientEmail;
    } else if (doc.user) {
      const user = await User.findById(doc.user).select('email').lean();
      resolvedEmail = user?.email || '';
    }

    if (!resolvedEmail) {
      resolvedEmail = 'system';
    }

    batch.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { email: resolvedEmail } },
      },
    });

    if (batch.length >= batchSize) {
      await Notification.bulkWrite(batch);
      updated += batch.length;
      log(`Migrated ${updated}/${processed}...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await Notification.bulkWrite(batch);
    updated += batch.length;
  }

  log(`Done. Processed: ${processed}, Updated: ${updated}`);

  await mongoose.disconnect();
  process.exit(0);
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
