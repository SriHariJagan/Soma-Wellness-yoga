//!/usr/bin/env node

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    const db = client.db('soma');
    
    console.log('=== Database Status Check ===\n');
    
    // Check collection counts
    const collections = await db.listCollections().toArray();
    console.log('Available collections:');
    collections.forEach(c => console.log('  -', c.name));
    
    // Check students
    const students = await db.collection('users').find({ role: 'student' }).toArray();
    console.log('\n=== Students (' + students.length + ') ===');
    if (students.length > 0) {
      students.forEach((s, i) => {
        console.log(`${i + 1}. ${s.name} (${s.email}) - Status: ${s.status}`);
      });
    }
    
    // Check courses
    const courses = await db.collection('courses').find({}).toArray();
    console.log('\n=== Courses (' + courses.length + ') ===');
    if (courses.length > 0) {
      courses.forEach((c, i) => {
        console.log(`${i + 1}. ${c.title} - Price: $${c.price}`);
      });
    }
    
    // Check class invites
    const invites = await db.collection('class_invites').find({}).toArray();
    console.log('\n=== Class Invites (' + invites.length + ') ===');
    if (invites.length > 0) {
      invites.forEach((i, idx) => {
        console.log(`${idx + 1}. ${i.name || 'Unnamed'} - ${i.email || 'No email'} - ${i.status || 'Unknown status'}`);
      });
    }
    
    // Check payments
    const payments = await db.collection('payments').find({}).toArray();
    console.log('\n=== Payments (' + payments.length + ') ===');
    if (payments.length > 0) {
      payments.forEach((p, i) => {
        console.log(`${i + 1}. ${p.email || 'No email'} - $${p.amount || 'N/A'} - ${p.status || 'Unknown'}`);
      });
    }
    
    // Check attendance records
    const attendance = await db.collection('attendance').find({}).toArray();
    console.log('\n=== Attendance Records (' + attendance.length + ') ===');
    if (attendance.length > 0) {
      attendance.forEach((a, i) => {
        console.log(`${i + 1}. ${a.student || 'Unknown student'} - ${a.class || 'Unknown class'} - ${a.status || 'Unknown'}`);
      });
    }
    
    // Check reception users
    const reception = await db.collection('users').find({ role: 'reception' }).toArray();
    console.log('\n=== Reception Users (' + reception.length + ') ===');
    reception.forEach((r, i) => {
      console.log(`${i + 1}. ${r.name} (${r.email}) - Status: ${r.status}`);
      console.log('   Permissions:', r.permissions ? r.permissions.length : 0);
    });
    
    console.log('\n=== Summary ===');
    console.log('Students available for reception:', students.length);
    console.log('Courses available:', courses.length);
    console.log('Class invites available:', invites.length);
    console.log('Payments available:', payments.length);
    console.log('Attendance records available:', attendance.length);
    
    // Check if reception users have permissions
    let receptionWithPerms = 0;
    reception.forEach(r => {
      if (r.permissions && r.permissions.length > 0) receptionWithPerms++;
    });
    console.log('Reception users with permissions:', receptionWithPerms);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
})();
