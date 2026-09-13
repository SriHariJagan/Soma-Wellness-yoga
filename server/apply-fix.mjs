#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Load .env
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^MONGO_URI=(.+)$/);
  if (m) process.env.MONGO_URI = m[1];
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Reset all reception users passwords to 'Reception1!'
    const hashed = await bcrypt.hash('Reception1!', 12);
    const updateResult = await mongoose.connection.db.collection('users').updateMany(
      { role: 'reception' },
      { $set: { password: hashed, status: 'active' } }
    );
    console.log(`Updated passwords for ${updateResult.modifiedCount} reception users`);
    
    // Assign full permissions
    const fullPerms = [
      'customers.view','customers.create','customers.edit',
      'courses.view','courses.registration','courses.request','courses.booking',
      'sections.view','sections.booking','sections.registration',
      'classes.view','classes.attendance','classes.attendance.create','classes.attendance.edit',
      'bookings.view','bookings.create','bookings.edit','bookings.cancel',
      'attendance.view','attendance.create','attendance.edit',
    ];
    
    const permResult = await mongoose.connection.db.collection('users').updateMany(
      { role: 'reception' },
      { $set: { permissions: fullPerms } }
    );
    console.log(`Updated permissions for ${permResult.modifiedCount} reception users`);
    
    // Verify all reception users
    const users = await mongoose.connection.db.collection('users')
      .find({ role: 'reception' })
      .project({ name: 1, email: 1, permissions: 1, status: 1 })
      .toArray();
    
    console.log('\n=== Final Reception Users ===');
    users.forEach((u, i) => {
      console.log(`${i + 1}. ${u.name} (${u.email}) - ${u.permissions?.length || 0} perms, ${u.status}`);
    });
    
    console.log('\n✅ All reception users have been updated!');
    console.log('\nTest login credentials:');
    console.log('Email: reception@somawellness.co.ke');
    console.log('Password: Reception1!');
    console.log('\nAll 5 tabs (Overview + Customers + Classes + Attendance + Class Invites) should now be visible.');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
