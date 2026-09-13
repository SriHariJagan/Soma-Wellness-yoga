"use strict";

import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

// Load env
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^MONGO_URI=(.+)$/);
  if (m) process.env.MONGO_URI = m[1];
}

async function main() {
  console.log('=== Fixing Reception Users ===\n');

  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('soma');

  try {
    // List all users
    const allUsers = await db.collection('users').find({}).toArray();
    console.log('All users in the system:');
    allUsers.forEach((u, i) => {
      console.log(`\n${i + 1}. ${u.name} (${u.email})`);
      console.log('   Role:', u.role);
      console.log('   Status:', u.status);
      console.log('   Permissions:', u.permissions ? u.permissions.length : 0);
    });

    // List reception users
    const receptionUsers = allUsers.filter(u => u.role === 'reception');
    console.log('\n=== Reception Users ===');
    receptionUsers.forEach((u, i) => {
      console.log(`\n${i + 1}. ${u.name} (${u.email})`);
      console.log('   Status:', u.status);
      console.log('   Permissions (' + (u.permissions ? u.permissions.length : 0) + '):', JSON.stringify(u.permissions || []));
    });

    if (receptionUsers.length === 0) {
      console.log('\n❌ No reception users found!');
      console.log('Please create reception users first.');
      return;
    }

    // Reset passwords to 'Reception1!' for all reception users
    console.log('\n=== Resetting Passwords ===');
    const hashed = await bcrypt.hash('Reception1!', 12);
    const passwordUpdateResult = await db.collection('users').updateMany(
      { role: 'reception' },
      { $set: { password: hashed } }
    );
    console.log(`✅ Updated passwords for ${passwordUpdateResult.modifiedCount} reception users`);

    // Assign full permissions to all reception users
    console.log('\n=== Assigning Full Permissions ===');
    const fullPerms = [
      'customers.view', 'customers.create', 'customers.edit',
      'courses.view', 'courses.registration', 'courses.request', 'courses.booking',
      'sections.view', 'sections.booking', 'sections.registration',
      'classes.view', 'classes.attendance', 'classes.attendance.create', 'classes.attendance.edit',
      'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.cancel',
      'attendance.view', 'attendance.create', 'attendance.edit',
    ];

    const permUpdateResult = await db.collection('users').updateMany(
      { role: 'reception' },
      { $set: { permissions: fullPerms, status: 'active' } }
    );
    console.log(`✅ Updated permissions for ${permUpdateResult.modifiedCount} reception users`);
    console.log('   Total permissions:', fullPerms.length);

    // Verify all reception users now have full permissions
    const updatedReceptionUsers = await db.collection('users')
      .find({ role: 'reception' })
      .project({ name: 1, email: 1, permissions: 1, status: 1 })
      .toArray();

    console.log('\n=== Verification ===');
    updatedReceptionUsers.forEach((u, i) => {
      const permCount = u.permissions ? u.permissions.length : 0;
      const expectedCount = fullPerms.length;
      const status = permCount === expectedCount ? '✅' : '❌';
      console.log(`${status} ${u.name} (${u.email})`);
      console.log('   Permissions:', permCount + '/' + expectedCount);
      console.log('   Status:', u.status);
    });

    // Check if any reception users have insufficient permissions
    console.log('\n=== Checking for Issues ===');
    let hasIssues = false;
    updatedReceptionUsers.forEach(u => {
      if (!u.permissions || u.permissions.length < fullPerms.length) {
        hasIssues = true;
        console.log(`❌ ${u.name} has insufficient permissions`);
      }
      if (u.status !== 'active') {
        hasIssues = true;
        console.log(`❌ ${u.name} has incorrect status: ${u.status}`);
      }
    });

    if (hasIssues) {
      console.log('\n⚠️  Issues detected. Reception users need to be fixed.');
    } else {
      console.log('\n✅ All reception users have proper permissions and status!');
    }

    console.log('\n=== Next Steps ===');
    console.log('1. Log out of admin account');
    console.log('2. Log in as any reception user (e.g., reception@somawellness.co.ke)');
    console.log('3. Password: Reception1!');
    console.log('4. All 5 tabs (Overview + Customers + Classes + Attendance + Class Invites) should be visible');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
