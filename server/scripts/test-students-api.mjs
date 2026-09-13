// test-students-api.mjs — reproduce add-student + view-users failures
const BASE = 'http://localhost:5000';

async function main() {
  // 1. Login as admin
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@yoga.com', password: 'Admin@123' }),
  });
  const loginText = await loginRes.text();
  console.log('LOGIN status:', loginRes.status);
  let token = null;
  try {
    const loginData = JSON.parse(loginText);
    token = loginData.token;
    console.log('LOGIN role:', loginData.user?.role, '| perms:', (loginData.user?.permissions || []).length);
  } catch {
    console.log('LOGIN body:', loginText.slice(0, 300));
    return;
  }
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // 2. View all users (admin students list)
  const listRes = await fetch(`${BASE}/api/admin/students`, { headers: H });
  const listText = await listRes.text();
  console.log('\nGET /api/admin/students status:', listRes.status);
  try {
    const list = JSON.parse(listText);
    console.log('Students count:', Array.isArray(list) ? list.length : JSON.stringify(list).slice(0, 200));
  } catch {
    console.log('Body:', listText.slice(0, 500));
  }

  // 3. Add new student
  const newEmail = `teststudent${Date.now()}@example.com`;
  const createRes = await fetch(`${BASE}/api/admin/students`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ name: 'Test Student', email: newEmail, phone: '+254700000099', city: 'Nairobi', planMonths: 0 }),
  });
  const createText = await createRes.text();
  console.log('\nPOST /api/admin/students status:', createRes.status);
  console.log('Body:', createText.slice(0, 800));

  // 4. Reception view (reception1 customers list)
  const rLoginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'reception1@yoga.com', password: 'Reception@123' }),
  });
  const rLogin = await rLoginRes.json();
  const RH = { 'Content-Type': 'application/json', Authorization: `Bearer ${rLogin.token}` };
  const rListRes = await fetch(`${BASE}/api/reception/students?search=`, { headers: RH });
  console.log('\nGET /api/reception/students status:', rListRes.status);
  console.log('Body:', (await rListRes.text()).slice(0, 500));

  // 5. Reception create customer
  const rCreateRes = await fetch(`${BASE}/api/reception/students`, {
    method: 'POST',
    headers: RH,
    body: JSON.stringify({ name: 'Reception Test', email: `rectest${Date.now()}@example.com`, phone: '+254700000098' }),
  });
  console.log('\nPOST /api/reception/students status:', rCreateRes.status);
  console.log('Body:', (await rCreateRes.text()).slice(0, 800));
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
