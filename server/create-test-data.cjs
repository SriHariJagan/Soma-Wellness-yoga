#!/usr/bin/env node

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

(async () => {
  const uri = 'mongodb+srv://sriharijagan333_db_user:LnuehaWZeHBGz8u2@cluster0.lbulkp9.mongodb.net/?appName=Cluster0';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  const users = db.collection('users');
  const courses = db.collection('courses');
  const classSessions = db.collection('classsessions');
  const bookings = db.collection('bookings');
  const classInvites = db.collection('classinvites');
  const payments = db.collection('payments');
  
  console.log('=== Creating Test Data for Reception Dashboard ===\n');
  
  // Hash password for students
  const studentPassword = await bcrypt.hash('Student123!', 12);
  
  // Create test students
  const studentData = [
    {
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      password: studentPassword,
      role: 'student',
      status: 'active',
      phone: '+254 700 111 222',
      phoneVerified: true,
      emailVerified: true,
      city: 'Nairobi',
      style: 'Hatha',
      level: 'Beginner',
      avatar: '',
      bio: 'Yoga enthusiast',
      notes: '',
      gender: 'female',
      dateOfBirth: new Date('1995-03-15'),
      birthMonth: 3,
      birthDay: 15,
      emergencyContact: '+254 700 111 333',
      planMonths: 3,
      referralCount: 0,
      unreadNotifications: 0,
      months: 3,
      certifs: 0,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Rajesh Kumar',
      email: 'rajesh.kumar@example.com',
      password: studentPassword,
      role: 'student',
      status: 'active',
      phone: '+254 700 222 333',
      phoneVerified: true,
      emailVerified: true,
      city: 'Nairobi',
      style: 'Vinyasa',
      level: 'Intermediate',
      avatar: '',
      bio: 'Regular practitioner',
      notes: '',
      gender: 'male',
      dateOfBirth: new Date('1990-07-22'),
      birthMonth: 7,
      birthDay: 22,
      emergencyContact: '+254 700 222 444',
      planMonths: 6,
      referralCount: 1,
      unreadNotifications: 0,
      months: 6,
      certifs: 1,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Anita Desai',
      email: 'anita.desai@example.com',
      password: studentPassword,
      role: 'student',
      status: 'active',
      phone: '+254 700 333 444',
      phoneVerified: true,
      emailVerified: true,
      city: 'Nairobi',
      style: 'Ashtanga',
      level: 'Advanced',
      avatar: '',
      bio: 'Yoga teacher trainee',
      notes: '',
      gender: 'female',
      dateOfBirth: new Date('1988-11-05'),
      birthMonth: 11,
      birthDay: 5,
      emergencyContact: '+254 700 333 555',
      planMonths: 12,
      referralCount: 2,
      unreadNotifications: 0,
      months: 12,
      certifs: 2,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Deepak Singh',
      email: 'deepak.singh@example.com',
      password: studentPassword,
      role: 'student',
      status: 'active',
      phone: '+254 700 444 555',
      phoneVerified: true,
      emailVerified: true,
      city: 'Nairobi',
      style: 'Hatha',
      level: 'Beginner',
      avatar: '',
      bio: 'New to yoga',
      notes: '',
      gender: 'male',
      dateOfBirth: new Date('1998-01-18'),
      birthMonth: 1,
      birthDay: 18,
      emergencyContact: '+254 700 444 666',
      planMonths: 1,
      referralCount: 0,
      unreadNotifications: 0,
      months: 1,
      certifs: 0,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Kavya Nair',
      email: 'kavya.nair@example.com',
      password: studentPassword,
      role: 'student',
      status: 'active',
      phone: '+254 700 555 666',
      phoneVerified: true,
      emailVerified: true,
      city: 'Nairobi',
      style: 'Yin',
      level: 'Intermediate',
      avatar: '',
      bio: 'Meditation focused',
      notes: '',
      gender: 'female',
      dateOfBirth: new Date('1992-09-30'),
      birthMonth: 9,
      birthDay: 30,
      emergencyContact: '+254 700 555 777',
      planMonths: 3,
      referralCount: 0,
      unreadNotifications: 0,
      months: 3,
      certifs: 0,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  
  // Insert students
  const studentResult = await users.insertMany(studentData);
  console.log('✅ Created', studentResult.insertedCount, 'students');
  
  // Create class sessions
  const sessionData = [
    {
      name: 'Morning Hatha Flow',
      description: 'Gentle morning hatha yoga for all levels',
      course: '6a9f176cbba5d4c4f5e16b9a', // Yoga Foundations course ID
      instructor: 'Priya Sharma',
      schedule: {
        days: ['Monday', 'Wednesday', 'Friday'],
        startTime: '07:00',
        endTime: '08:00',
        timezone: 'Africa/Nairobi',
      },
      capacity: 20,
      enrolled: 5,
      status: 'active',
      location: 'Studio A',
      price: 1500,
      currency: 'KES',
      startDate: new Date('2026-09-15'),
      endDate: new Date('2026-12-15'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Evening Vinyasa',
      description: 'Dynamic vinyasa flow for intermediate practitioners',
      course: '6a9f176cbba5d4c4f5e16b9a',
      instructor: 'Rajesh Kumar',
      schedule: {
        days: ['Tuesday', 'Thursday'],
        startTime: '18:00',
        endTime: '19:30',
        timezone: 'Africa/Nairobi',
      },
      capacity: 15,
      enrolled: 8,
      status: 'active',
      location: 'Studio B',
      price: 2000,
      currency: 'KES',
      startDate: new Date('2026-09-16'),
      endDate: new Date('2026-12-16'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Weekend Ashtanga Intensive',
      description: 'Traditional ashtanga primary series',
      course: '6a9f176cbba5d4c4f5e16b9a',
      instructor: 'Anita Desai',
      schedule: {
        days: ['Saturday'],
        startTime: '08:00',
        endTime: '10:00',
        timezone: 'Africa/Nairobi',
      },
      capacity: 12,
      enrolled: 3,
      status: 'active',
      location: 'Studio A',
      price: 3000,
      currency: 'KES',
      startDate: new Date('2026-09-20'),
      endDate: new Date('2026-12-20'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  
  const sessionResult = await classSessions.insertMany(sessionData);
  console.log('✅ Created', sessionResult.insertedCount, 'class sessions');
  
  // Create bookings for students
  const studentIds = studentResult.insertedIds;
  const sessionIds = sessionResult.insertedIds;
  
  const bookingData = [
    {
      student: studentIds[0],
      classSession: sessionIds[0],
      status: 'confirmed',
      paymentStatus: 'paid',
      amount: 1500,
      currency: 'KES',
      bookedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      student: studentIds[1],
      classSession: sessionIds[1],
      status: 'confirmed',
      paymentStatus: 'paid',
      amount: 2000,
      currency: 'KES',
      bookedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      student: studentIds[2],
      classSession: sessionIds[2],
      status: 'pending',
      paymentStatus: 'pending',
      amount: 3000,
      currency: 'KES',
      bookedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      student: studentIds[3],
      classSession: sessionIds[0],
      status: 'confirmed',
      paymentStatus: 'paid',
      amount: 1500,
      currency: 'KES',
      bookedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      student: studentIds[4],
      classSession: sessionIds[1],
      status: 'confirmed',
      paymentStatus: 'paid',
      amount: 2000,
      currency: 'KES',
      bookedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  
  const bookingResult = await bookings.insertMany(bookingData);
  console.log('✅ Created', bookingResult.insertedCount, 'bookings');
  
  // Create class invites
  const inviteData = [
    {
      name: 'Free Trial Class',
      description: 'Try a free yoga class before committing',
      email: 'new.student1@example.com',
      phone: '+254 700 666 777',
      status: 'sent',
      classSession: sessionIds[0],
      sentAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Corporate Wellness Invite',
      description: 'Corporate wellness program invitation',
      email: 'corporate.client@example.com',
      phone: '+254 700 777 888',
      status: 'opened',
      classSession: sessionIds[1],
      sentAt: new Date(),
      openedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Referral Invite',
      description: 'Friend referral for yoga class',
      email: 'friend.referral@example.com',
      phone: '+254 700 888 999',
      status: 'clicked',
      classSession: sessionIds[2],
      sentAt: new Date(),
      openedAt: new Date(),
      clickedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  
  const inviteResult = await classInvites.insertMany(inviteData);
  console.log('✅ Created', inviteResult.insertedCount, 'class invites');
  
  // Create payments
  const paymentData = [
    {
      student: studentIds[0],
      booking: bookingResult.insertedIds[0],
      amount: 1500,
      currency: 'KES',
      status: 'completed',
      method: 'mpesa',
      transactionId: 'MPESA123456789',
      paidAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      student: studentIds[1],
      booking: bookingResult.insertedIds[1],
      amount: 2000,
      currency: 'KES',
      status: 'completed',
      method: 'card',
      transactionId: 'CARD987654321',
      paidAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      student: studentIds[3],
      booking: bookingResult.insertedIds[3],
      amount: 1500,
      currency: 'KES',
      status: 'completed',
      method: 'mpesa',
      transactionId: 'MPESA456789123',
      paidAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      student: studentIds[4],
      booking: bookingResult.insertedIds[4],
      amount: 2000,
      currency: 'KES',
      status: 'completed',
      method: 'mpesa',
      transactionId: 'MPESA789123456',
      paidAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  
  const paymentResult = await payments.insertMany(paymentData);
  console.log('✅ Created', paymentResult.insertedCount, 'payments');
  
  // Create additional reception users
  const hashedPw = await bcrypt.hash('Reception1!', 12);
  
  const receptionData = [
    {
      name: 'Priya Reception',
      email: 'priya.reception@somawellness.co.ke',
      password: hashedPw,
      role: 'reception',
      status: 'active',
      phone: '+254 700 999 000',
      phoneVerified: true,
      emailVerified: true,
      permissions: [
        'customers.view','customers.create','customers.edit',
        'courses.view','courses.registration','courses.request','courses.booking',
        'sections.view','sections.booking','sections.registration',
        'classes.view','classes.attendance','classes.attendance.create','classes.attendance.edit',
        'bookings.view','bookings.create','bookings.edit','bookings.cancel',
        'attendance.view','attendance.create','attendance.edit',
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Amina Reception',
      email: 'amina.reception@somawellness.co.ke',
      password: hashedPw,
      role: 'reception',
      status: 'active',
      phone: '+254 700 999 111',
      phoneVerified: true,
      emailVerified: true,
      permissions: [
        'customers.view','customers.create','customers.edit',
        'courses.view','courses.registration','courses.request','courses.booking',
        'sections.view','sections.booking','sections.registration',
        'classes.view','classes.attendance','classes.attendance.create','classes.attendance.edit',
        'bookings.view','bookings.create','bookings.edit','bookings.cancel',
        'attendance.view','attendance.create','attendance.edit',
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  
  const receptionResult = await users.insertMany(receptionData);
  console.log('✅ Created', receptionResult.insertedCount, 'additional reception users');
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log('Students created:', studentResult.insertedCount);
  console.log('Class sessions created:', sessionResult.insertedCount);
  console.log('Bookings created:', bookingResult.insertedCount);
  console.log('Class invites created:', inviteResult.insertedCount);
  console.log('Payments created:', paymentResult.insertedCount);
  console.log('Reception users created:', receptionResult.insertedCount);
  
  console.log('\n=== Login Credentials ===');
  console.log('All reception users: Reception1!');
  console.log('All students: Student123!');
  
  console.log('\n=== Reception Users ===');
  console.log('1. reception@somawellness.co.ke / Reception1!');
  console.log('2. priya.reception@somawellness.co.ke / Reception1!');
  console.log('3. amina.reception@somawellness.co.ke / Reception1!');
  
  await client.close();
})();