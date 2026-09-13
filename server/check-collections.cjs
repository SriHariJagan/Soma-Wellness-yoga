#!/usr/bin/env node

const { MongoClient } = require('mongodb');

(async () => {
  const uri = 'mongodb+srv://sriharijagan333_db_user:LnuehaWZeHBGz8u2@cluster0.lbulkp9.mongodb.net/?appName=Cluster0';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  
  // Check User collection
  const userCollection = db.collection('User');
  const userCount = await userCollection.countDocuments({});
  console.log('User collection count:', userCount);
  
  const user1 = await userCollection.findOne({ email: 'reception@somawellness.co.ke' });
  console.log('User collection - reception:', !!user1);
  if (user1) console.log('  Role:', user1.role, 'Status:', user1.status);
  
  // Check users collection
  const usersCollection = db.collection('users');
  const usersCount = await usersCollection.countDocuments({});
  console.log('\nusers collection count:', usersCount);
  
  const user2 = await usersCollection.findOne({ email: 'reception@somawellness.co.ke' });
  console.log('users collection - reception:', !!user2);
  if (user2) console.log('  Role:', user2.role, 'Status:', user2.status);
  
  // List all users in both collections
  console.log('\n=== User collection ===');
  const userDocs = await userCollection.find({}).toArray();
  userDocs.forEach(u => console.log('  -', u.email, u.role));
  
  console.log('\n=== users collection ===');
  const usersDocs = await usersCollection.find({}).toArray();
  usersDocs.forEach(u => console.log('  -', u.email, u.role));
  
  await client.close();
})();