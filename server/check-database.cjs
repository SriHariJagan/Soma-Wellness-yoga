#!/usr/bin/env node

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const uri = 'mongodb+srv://sriharijagan333_db_user:LnuehaWZeHBGz8u2@cluster0.lbulkp9.mongodb.net/?appName=Cluster0';
    const client = new MongoClient(uri);
    await client.connect();
    
    // List all databases to find the right one
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log('Available databases:');
    dbs.databases.forEach(db => console.log('  -', db.name));
    
    // Try connecting to the default database (no name in URI)
    // Mongoose might create a database named "soma" or use the default
    const db = client.db('soma'); // Try 'soma' as database name
    
    // List all collections in this database
    const collections = await db.listCollections().toArray();
    console.log('\nCollections in "soma" database:');
    if (collections.length === 0) {
      console.log('  (empty)');
    } else {
      collections.forEach(c => console.log('  -', c.name));
    }
    
    // Try other possible database names
    const possibleNames = ['soma', 'soma-wellness', 'soma_wellness', 'test', 'admin', 'production'];
    
    for (const name of possibleNames) {
      const testDb = client.db(name);
      const testCollections = await testDb.listCollections().toArray();
      if (testCollections.length > 0) {
        console.log(`\n=== Found data in database: ${name} ===`);
        console.log('Collections:');
        testCollections.forEach(c => console.log('  -', c.name));
        
        // Check students
        const students = await testDb.collection('users').find({ role: 'student' }).toArray();
        console.log(`\n=== Students in ${name} (${students.length}) ===`);
        if (students.length > 0) {
          students.forEach((s, i) => {
            console.log(`${i + 1}. ${s.name} (${s.email}) - Status: ${s.status}`);
          });
        }
        
        // Check courses
        const courses = await testDb.collection('courses').find({}).toArray();
        console.log(`\n=== Courses in ${name} (${courses.length}) ===`);
        if (courses.length > 0) {
          courses.forEach((c, i) => {
            console.log(`${i + 1}. ${c.title} - Price: $${c.price}`);
          });
        }
        
        // Check reception users
        const reception = await testDb.collection('users').find({ role: 'reception' }).toArray();
        console.log(`\n=== Reception Users in ${name} (${reception.length}) ===`);
        reception.forEach((r, i) => {
          console.log(`${i + 1}. ${r.name} (${r.email}) - Status: ${r.status}`);
          console.log('   Permissions:', r.permissions ? r.permissions.length : 0);
        });
        
        break;
      }
    }
    
    await client.close();
  } catch (error) {
    console.error('Error:', error);
  }
})();