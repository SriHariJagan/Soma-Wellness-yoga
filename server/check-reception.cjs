#!/usr/bin/env node

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

(async () => {
  const uri = 'mongodb+srv://sriharijagan333_db_user:LnuehaWZeHBGz8u2@cluster0.lbulkp9.mongodb.net/?appName=Cluster0';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  const users = db.collection('users');
  
  // Check all reception users
  const receptionUsers = await users.find({ role: 'reception' }).toArray();
  console.log('=== Reception Users ===');
  receptionUsers.forEach((u, i) => {
    console.log('\n' + (i+1) + '. ' + u.name);
    console.log('   Email:', u.email);
    console.log('   Status:', u.status);
    console.log('   Role:', u.role);
    console.log('   Permissions (' + (u.permissions?.length || 0) + '):', JSON.stringify(u.permissions || []));
  });
  
  // Check students
  const students = await users.find({ role: 'student' }).toArray();
  console.log('\n=== Students (' + students.length + ') ===');
  students.forEach((s, i) => {
    console.log((i+1) + '. ' + s.name + ' (' + s.email + ') - Status: ' + s.status);
  });
  
  // Check all users count by role
  const roleCounts = await users.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } }
  ]).toArray();
  console.log('\n=== Users by Role ===');
  roleCounts.forEach(r => console.log('  ' + r._id + ': ' + r.count));
  
  // Test login for each reception user
  console.log('\n=== Testing Login ===');
  for (const user of receptionUsers) {
    const match = await bcrypt.compare('Reception1!', user.password);
    console.log(user.email + ': ' + (match ? 'PASS' : 'FAIL'));
  }
  
  await client.close();
})();