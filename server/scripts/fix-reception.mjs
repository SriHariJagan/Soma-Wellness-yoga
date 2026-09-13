import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('=== Fixing Reception Users ===\n');

  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('soma');

  try {
    // List all users
    const allUsers = await db.collection('users').find({}).toArray();
    console.log('All users:');
    allUsers.forEach((u, i) => {
      console.log(`\n${i + 1}. ${u.name} (${u.email}) - Role: ${u.role}`);
    });

    // List reception users
    const receptionUsers = allUsers.filter(u => u.role === 'reception');
    console.log('\n=== Reception Users ===');
    receptionUsers.forEach((u, i) => {
      console.log(`\n${i + 1}. ${u.name} (${u.email})`);
      console.log('   Status:', u.status);
      console.log('   Permissions:', u.permissions ? u.permissions.length : 0);
    });

    if (receptionUsers.length === 0) {
      console.log('\n❌ No reception users found!');
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
    let allGood = true;
    updatedReceptionUsers.forEach((u, i) => {
      const permCount = u.permissions ? u.permissions.length : 0;
      const expectedCount = fullPerms.length;
      const statusGood = u.status === 'active';
      if (permCount === expectedCount && statusGood) {
        console.log(`✅ ${u.name} (${u.email}) - ${permCount} perms, ${u.status}`);
      } else {
        console.log(`❌ ${u.name} (${u.email})`);
        if (permCount !== expectedCount) console.log('   Incorrect permissions count');
        if (!statusGood) console.log('   Incorrect status');
      }
      allGood = allGood && (permCount === expectedCount && statusGood);
    });

    if (allGood) {
      console.log('\n✅ All reception users now have proper permissions and status!');
      console.log('\n=== Test Login Credentials ===');
      console.log('Email: reception@somawellness.co.ke');
      console.log('Password: Reception1!');
      console.log('\nAll 5 tabs (Overview + Customers + Classes + Attendance + Class Invites) should be visible');
    } else {
      console.log('\n⚠️ Some reception users still have issues');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
