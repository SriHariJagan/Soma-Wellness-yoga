// healthcheck.mjs — login + list students (reception1)
const BASE = 'http://localhost:5000';
const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'reception1@yoga.com', password: 'Reception@123' }),
});
console.log('login:', login.status);
if (!login.ok) { console.log((await login.text()).slice(0, 300)); process.exit(1); }
const { token } = await login.json();
const list = await fetch(`${BASE}/api/reception/students?search=`, {
  headers: { Authorization: `Bearer ${token}` },
});
console.log('students:', list.status);
const data = await list.json();
console.log('count:', Array.isArray(data) ? data.length : JSON.stringify(data).slice(0, 200));
if (Array.isArray(data)) console.log(data.map((u) => u.name).join(' | '));
process.exit(0);
