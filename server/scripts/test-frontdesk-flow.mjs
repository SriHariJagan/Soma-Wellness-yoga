// test-frontdesk-flow.mjs — FULL front-desk flow E2E (with cleanup):
// register (with password) → login as new user → catalog → purchase course
// → duplicate rejected → purchases history → invite ALL → roster → bulk mark
const BASE = 'http://localhost:5000';
const results = [];
function check(name, cond, extra = '') {
  results.push([cond ? 'PASS' : 'FAIL', name, extra]);
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
}
async function login(email, password) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const d = await r.json();
  return { status: r.status, token: d.token, user: d.user };
}

const R1 = await login('reception1@yoga.com', 'Reception@123');
check('reception1 login', R1.status === 200);
const H1 = { Authorization: `Bearer ${R1.token}`, 'Content-Type': 'application/json' };

// 1. Register with password
const ts = Date.now();
const newEmail = `frontdesk${ts}@example.com`;
const newPass = 'Customer@123';
const reg = await fetch(`${BASE}/api/reception/students`, {
  method: 'POST', headers: H1,
  body: JSON.stringify({ name: 'Front Desk User', email: newEmail, phone: '+254711000001', city: 'Nairobi', password: newPass }),
});
const regBody = await reg.json();
check('register with password', reg.status === 201, `id=${regBody._id}`);
const studentId = regBody._id;

// 2. Login as the new user
const U = await login(newEmail, newPass);
check('new user can login', U.status === 200 && U.user?.role === 'student', `role=${U.user?.role}`);

// 3. Catalog
const cat = await (await fetch(`${BASE}/api/reception/catalog`, { headers: H1 })).json();
check('catalog loads', Array.isArray(cat.courses) && cat.courses.length > 0, `${cat.courses?.length} courses, ${cat.plans?.length} plans, ${cat.services?.length} services`);
const course = cat.courses[0];

// 4. Purchase course
const buy = await fetch(`${BASE}/api/reception/students/${studentId}/purchases`, {
  method: 'POST', headers: H1,
  body: JSON.stringify({ kind: 'course', itemId: course._id, method: 'Cash' }),
});
const buyBody = await buy.json();
check('purchase course', buy.status === 201 && buyBody.fulfillment?.fulfilled === true,
  `${buyBody.payment?.label} ${buyBody.payment?.amount} fulfillment=${buyBody.payment?.fulfillmentStatus}`);

// 5. Duplicate rejected
const dup = await fetch(`${BASE}/api/reception/students/${studentId}/purchases`, {
  method: 'POST', headers: H1,
  body: JSON.stringify({ kind: 'course', itemId: course._id, method: 'Cash' }),
});
check('duplicate purchase rejected (409)', dup.status === 409, (await dup.json()).error?.slice(0, 60));

// 6. Invalid kind rejected
const bad = await fetch(`${BASE}/api/reception/students/${studentId}/purchases`, {
  method: 'POST', headers: H1,
  body: JSON.stringify({ kind: 'yacht', itemId: course._id }),
});
check('invalid kind rejected (400)', bad.status === 400);

// 7. Purchase history shows payment + enrollment
const hist = await (await fetch(`${BASE}/api/reception/students/${studentId}/purchases`, { headers: H1 })).json();
check('history has payment + enrollment',
  hist.payments?.length === 1 && hist.courses?.length === 1,
  `${hist.payments?.length} payments, ${hist.courses?.length} courses`);

// 8. Reception WITHOUT sell permission is denied (reception2 has no courses.booking/bookings.create)
const R2 = await login('reception2@yoga.com', 'Reception@123');
const denied = await fetch(`${BASE}/api/reception/students/${studentId}/purchases`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${R2.token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ kind: 'course', itemId: course._id }),
});
check('sell denied without permission (403)', denied.status === 403);

// 9. Invite ALL students
const all = await (await fetch(`${BASE}/api/reception/students?search=`, { headers: H1 })).json();
const allIds = all.map((u) => u._id);
const inv = await fetch(`${BASE}/api/reception/class-invites`, {
  method: 'POST', headers: H1,
  body: JSON.stringify({
    title: 'E2E All-Students Class', date: new Date().toISOString(),
    startTime: '07:00', platform: 'Zoom', recipientType: 'custom', studentIds: allIds,
  }),
});
const invBody = await inv.json();
check('invite to all students', inv.status === 201, `${invBody.invite?.totalRecipients} recipients`);
const inviteId = invBody.invite?._id;

// 10. Roster shows the new user unmarked, then bulk mark via reception2
const ros = await (await fetch(`${BASE}/api/reception/attendance/students/${inviteId}`, { headers: H1 })).json();
const row = ros.students?.find((s) => String(s.student?._id) === String(studentId));
check('roster includes new user (unmarked)', !!row && !row.attendance, `${ros.students?.length} in roster`);
const R2H = { Authorization: `Bearer ${R2.token}`, 'Content-Type': 'application/json' };
const bulk = await fetch(`${BASE}/api/reception/attendance/bulk`, {
  method: 'POST', headers: R2H,
  body: JSON.stringify({ inviteId, attendanceData: [{ user: studentId, status: 'present' }] }),
});
check('reception2 marks attendance', bulk.status === 200, JSON.stringify(await bulk.json()));
const ros2 = await (await fetch(`${BASE}/api/reception/attendance/students/${inviteId}`, { headers: H1 })).json();
const row2 = ros2.students?.find((s) => String(s.student?._id) === String(studentId));
check('attendance recorded', !!row2?.attendance, `status=${row2?.attendance?.status}`);

// ── Cleanup ──
const A = await login('admin@yoga.com', 'Admin@123');
const AH = { Authorization: `Bearer ${A.token}`, 'Content-Type': 'application/json' };
await fetch(`${BASE}/api/admin/class-invites/${inviteId}/cancel`, { method: 'PATCH', headers: AH, body: JSON.stringify({ reason: 'e2e cleanup' }) });
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;
await db.collection('users').deleteOne({ email: newEmail });
await db.collection('payments').deleteMany({ user: new mongoose.Types.ObjectId(studentId) });
await db.collection('classinvites').deleteOne({ _id: new mongoose.Types.ObjectId(inviteId) });
await db.collection('attendances').deleteMany({ invitation: new mongoose.Types.ObjectId(inviteId) });
await db.collection('courses').updateOne({ _id: new mongoose.Types.ObjectId(course._id) }, { $pull: { enrolledUsers: { user: new mongoose.Types.ObjectId(studentId) } } });
await db.collection('activitylogs').deleteMany({ targetUser: new mongoose.Types.ObjectId(studentId) });
const left = await db.collection('users').countDocuments();
console.log(`cleanup done. users in DB: ${left}`);
await mongoose.disconnect();

const failed = results.filter(([s]) => s === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
