//!/usr/bin/env node

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    const db = client.db('soma');
    
    // Check current reception users
    const users = await db.collection('users').find({ role: 'reception' }).toArray();
    console.log('Current reception users:', users.length);
    users.forEach(u => {
      console.log('\n', u.name, '(' + u.email + ') - status:', u.status, 'perms:', u.permissions ? u.permissions.length : 0);
    });
    
    if (users.length === 0) {
      console.log('\n❌ No reception users found!');
      return;
    }
    
    // Reset passwords to 'Reception1!'
    const hashed = await bcrypt.hash('Reception1!', 12);
    const passwordUpdate = await db.collection('users').updateMany(
      { role: 'reception' },
      { $set: { password: hashed, status: 'active' } }
    );
    console.log('\n📝 Updated passwords for', passwordUpdate.modifiedCount, 'reception users');
    
    // Assign full permissions
    const fullPerms = [
      'customers.view','customers.create','customers.edit',
      'courses.view','courses.registration','courses.request','courses.booking',
      'sections.view','sections.booking','sections.registration',
      'classes.view','classes.attendance','classes.attendance.create','classes.attendance.edit',
      'bookings.view','bookings.create','bookings.edit','bookings.cancel',
      'attendance.view','attendance.create','attendance.edit',
    ];
    
    const permUpdate = await db.collection('users').updateMany(
      { role: 'reception' },
      { $set: { permissions: fullPerms } }
    );
    console.log('📝 Updated permissions for', permUpdate.modifiedCount, 'reception users');
    console.log('   Total permissions:', fullPerms.length);
    
    // Verify
    const updatedUsers = await db.collection('users').find({ role: 'reception' }).toArray();
    console.log('\n=== VERIFICATION ===');
    let allGood = true;
    updatedUsers.forEach(u => {
      const permCount = u.permissions ? u.permissions.length : 0;
      const statusGood = u.status === 'active';
      if (permCount === fullPerms.length && statusGood) {
        console.log('✅', u.name, '(' + u.email + ') -', permCount + ' perms, status: ' + u.status);
      } else {
        console.log('❌', u.name, '(' + u.email + ')');
        if (permCount !== fullPerms.length) console.log('   Incorrect permissions count');
        if (!statusGood) console.log('   Incorrect status');
        allGood = false;
      }
    });
    
    if (allGood) {
      console.log('\n🎉 All reception users have been fixed!');
      console.log('\n📋 Test Login Credentials:');
      console.log('   Email: reception@somawellness.co.ke');
      console.log('   Password: Reception1!');
      console.log('\n✅ All 5 tabs (Overview + Customers + Classes + Attendance + Class Invites) should now be visible');
    } else {
      console.log('\n⚠️ Some reception users still have issues');
    }
    
    await client.close();
  } catch (error) {
    console.error('Error:', error);
  }
})();
