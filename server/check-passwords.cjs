#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

(async () => {
  const uri = 'mongodb+srv://sriharijagan333_db_user:LnuehaWZeHBGz8u2@cluster0.lbulkp9.mongodb.net/?appName=Cluster0';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  const users = db.collection('users');
  
  const receptionUsers = await users.find({ role: 'reception' }).toArray();
  console.log('=== Password Hash Analysis ===\n');
  
  for (const user of receptionUsers) {
    console.log('\n' + user.email);
    console.log('  Hash:', user.password.substring(0, 30) + '...');
    console.log('  Length:', user.password.length);
    console.log('  Starts with $2b$:', user.password.startsWith('$2b$'));
    
    const match = await bcrypt.compare('Reception1!', user.password);
    console.log('  bcryptjs match:', match);
  }
  
  // Test hashing a new password
  const newHash = await bcrypt.hash('Reception1!', 12);
  console.log('\nNew hash for Reception1!:');
  console.log('  ' + newHash);
  
  const matchNew = await bcrypt.compare('Reception1!', newHash);
  console.log('  New hash matches:', matchNew);
  
  // Also test with the actual user from database using findOne to compare
  const user1 = await users.findOne({ email: 'reception@somawellness.co.ke' });
  console.log('\nDirect comparison for original user:');
  console.log('  Hash matches Reception1!: ' + (await bcrypt.compare('Reception1!', user1.password)));
  
  await client.close();
})();