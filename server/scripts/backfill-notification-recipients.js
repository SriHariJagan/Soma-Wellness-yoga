/**
 * backfill-notification-recipients.js
 *
 * IDEMPOTENT production migration that creates NotificationRecipient
 * documents for any existing Notification that is missing one.
 *
 * Before the centralized NotificationDispatcher was introduced,
 * many notification flows created Notification documents WITHOUT
 * creating corresponding NotificationRecipient records. This meant
 * the student dashboard (which queries only NotificationRecipient)
 * showed zero notifications.
 *
 * SAFETY:
 *  - Uses bulkWrite with ordered: false (skips duplicates, continues on error)
 *  - Checks for existing recipient before inserting (idempotent)
 *  - Processes in batches of 100 to avoid memory pressure
 *  - Logs progress and summary
 *  - Dry-run mode available
 *
 * USAGE:
 *   node server/scripts/backfill-notification-recipients.js
 *   node server/scripts/backfill-notification-recipients.js --dry-run
 *   node server/scripts/backfill-notification-recipients.js --batch-size=500
 */

import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import NotificationRecipient from '../models/NotificationRecipient.js';
import User from '../models/User.js';

const BATCH_SIZE = 100;
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_FLAG = process.argv.find((a) => a.startsWith('--batch-size='));
const BATCH = BATCH_FLAG ? parseInt(BATCH_FLAG.split('=')[1], 10) : BATCH_SIZE;

async function main() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/pragya-yoga';
  await mongoose.connect(uri);
  console.log(`Connected to MongoDB: ${uri.replace(/\/\/.*@/, '//***:***@')}`);

  const stats = { total: 0, created: 0, skipped: 0, errors: 0, orphanUsers: 0 };

  // ── Phase 1: Find all Notification docs that have a user reference ──
  // Exclude notifications with user=null (anonymous broadcasts, system messages)
  const totalNotifs = await Notification.countDocuments({ user: { $ne: null } });
  console.log(`Total notifications with user reference: ${totalNotifs}`);

  const cursor = Notification.find({ user: { $ne: null } })
    .select('_id user')
    .sort({ createdAt: -1 })
    .cursor();

  let batch = [];
  let processed = 0;

  for await (const notif of cursor) {
    stats.total++;
    batch.push(notif);

    if (batch.length >= BATCH) {
      await processBatch(batch, stats);
      processed += batch.length;
      console.log(`  Progress: ${processed}/${totalNotifs} (created: ${stats.created}, skipped: ${stats.skipped}, errors: ${stats.errors})`);
      batch = [];
    }
  }

  // Process remaining
  if (batch.length > 0) {
    await processBatch(batch, stats);
    processed += batch.length;
  }

  // ── Phase 2: Recalculate unreadNotifications for all users ──
  console.log('\nPhase 2: Recalculating unreadNotification counts...');
  await recalculateUnreadCounts(stats);

  console.log('\n========== BACKFILL SUMMARY ==========');
  console.log(`  Total notifications inspected: ${stats.total}`);
  console.log(`  Recipients created:             ${stats.created}`);
  console.log(`  Already existed (skipped):      ${stats.skipped}`);
  console.log(`  Errors:                         ${stats.errors}`);
  console.log(`  Users without recipient:         ${stats.orphanUsers}`);
  console.log(`  Dry run:                         ${DRY_RUN}`);
  console.log('======================================');

  await mongoose.disconnect();
  process.exit(0);
}

async function processBatch(notifs, stats) {
  const operations = [];

  for (const notif of notifs) {
    const userId = notif.user?._id || notif.user;
    if (!userId) {
      stats.orphanUsers++;
      continue;
    }

    // Build filter and doc for the upsert
    const filter = { notification: notif._id, student: userId };
    const update = {
      $setOnInsert: {
        notification: notif._id,
        student: userId,
        deliveredAt: notif.createdAt || new Date(),
        isRead: false,
        readAt: null,
        archived: false,
        deleted: false,
      },
    };

    // Use updateOne with upsert to skip existing recipients
    operations.push({
      updateOne: {
        filter,
        update,
        upsert: true,
      },
    });
  }

  if (operations.length === 0) return;

  if (DRY_RUN) {
    stats.created += operations.length;
    console.log(`  [DRY RUN] Would create ${operations.length} recipients`);
    return;
  }

  try {
    const result = await NotificationRecipient.bulkWrite(operations, { ordered: false });
    stats.created += (result.upsertedCount || 0);
    stats.skipped += (result.matchedCount || 0);
    // If there were any modifyCount (matched but not upserted), count as skipped
    if (result.modifiedCount) {
      stats.skipped += result.modifiedCount;
    }
  } catch (err) {
    // bulkWrite with ordered:false continues on individual errors
    stats.errors += err.writeErrors?.length || 1;
    console.error('  Batch error:', err.message);
    if (err.writeErrors) {
      for (const we of err.writeErrors) {
        console.error(`    - Doc ${we.index}: ${we.err.message}`);
      }
    }
  }
}

async function recalculateUnreadCounts(stats) {
  // For each user, count how many unread NotificationRecipient records exist
  // and set User.unreadNotifications to the correct value.
  const pipeline = [
    { $match: { deleted: false, archived: false, isRead: false } },
    { $group: { _id: '$student', count: { $sum: 1 } } },
  ];

  const counts = await NotificationRecipient.aggregate(pipeline);
  console.log(`  Found ${counts.length} users with unread notifications`);

  if (DRY_RUN) {
    const totalUnread = counts.reduce((s, c) => s + c.count, 0);
    console.log(`  [DRY RUN] Would reset unread counts: ${totalUnread} total unread across ${counts.length} users`);
    return;
  }

  // Reset all users to 0 first, then batch-update with correct counts
  // This handles the case where old counts were inflated
  await User.updateMany({}, { unreadNotifications: 0 });

  // Now set correct counts in batches
  const batchSize = 500;
  for (let i = 0; i < counts.length; i += batchSize) {
    const batch = counts.slice(i, i + batchSize);
    const operations = batch.map(({ _id, count }) => ({
      updateOne: {
        filter: { _id },
        update: { $set: { unreadNotifications: count } },
      },
    }));
    await User.bulkWrite(operations, { ordered: false });
  }

  const totalUnread = counts.reduce((s, c) => s + c.count, 0);
  console.log(`  Reset unread counts: ${totalUnread} total unread across ${counts.length} users`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
