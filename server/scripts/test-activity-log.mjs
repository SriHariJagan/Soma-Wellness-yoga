// test-activity-log.mjs — verify populated activity feed
const BASE = 'http://localhost:5000';
const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'reception1@yoga.com', password: 'Reception@123' }),
});
const { token } = await loginRes.json();
const res = await fetch(`${BASE}/api/reception/activity-log`, {
  headers: { Authorization: `Bearer ${token}` },
});
console.log('status:', res.status);
const logs = await res.json();
for (const l of logs.slice(0, 5)) {
  const actor = l.performedBy && typeof l.performedBy === 'object' ? l.performedBy.name : l.performedBy;
  const target = l.targetUser && typeof l.targetUser === 'object' ? l.targetUser.name : l.targetUser;
  console.log(`- [${l.createdAt}] "${l.action}" | by: ${actor} | target: ${target || '—'}`);
}
process.exit(0);
