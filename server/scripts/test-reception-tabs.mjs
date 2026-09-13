// test-reception-tabs.mjs — verify courses / attendance-overview / events for reception
const BASE = 'http://localhost:5000';
const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'reception3@yoga.com', password: 'Reception@123' }),
});
const { token, user } = await loginRes.json();
console.log('login:', user.role, '| perms:', user.permissions.length);
const H = { Authorization: `Bearer ${token}` };

const courses = await (await fetch(`${BASE}/api/reception/courses`, { headers: H })).json();
console.log('courses:', Array.isArray(courses) ? `${courses.length} -> ${courses.map((c) => c.title).join(' | ')}` : JSON.stringify(courses).slice(0, 200));

const att = await (await fetch(`${BASE}/api/reception/attendance/overview`, { headers: H })).json();
console.log('attendance overview keys:', Object.keys(att).join(','));

const events = await (await fetch(`${BASE}/api/reception/events`, { headers: H })).json();
console.log('events:', Array.isArray(events) ? events.length : JSON.stringify(events).slice(0, 200));

const classes = await (await fetch(`${BASE}/api/reception/classes`, { headers: H })).json();
console.log('classes status:', Array.isArray(classes) ? `${classes.length} items` : JSON.stringify(classes).slice(0, 200));
process.exit(0);
