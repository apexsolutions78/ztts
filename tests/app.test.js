process.env.NODE_ENV = 'test';

import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/server/app.js';


let server;
const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;

test.before(() => {
  return new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });
});

test.after(() => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
});

test('GET /health returns status ok with database engine info', async () => {
  const res = await fetch(`${BASE_URL}/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.ok(data.engine);
});

test('GET /api returns API information', async () => {
  const res = await fetch(`${BASE_URL}/api`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.name, 'Zahabia Travel & Tourism – Apex Solutions API');
});

test('GET /api/stats returns live platform analytics', async () => {
  const res = await fetch(`${BASE_URL}/api/stats`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(json.data.totalRevenue >= 0);
  assert.ok(json.data.flightBookingsCount >= 0);
});

test('GET /t/demo-token-hamdan-ek201?currency=AED converts currency dynamically to AED', async () => {
  const res = await fetch(`${BASE_URL}/t/demo-token-hamdan-ek201?currency=AED`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.ok(text.includes('AED'));
  assert.ok(text.includes('19,831.50') || text.includes('AED 19,831.50'));
});

test('GET /admin/settings/rates redirects unauthenticated users to login', async () => {
  const res = await fetch(`${BASE_URL}/admin/settings/rates`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.ok(res.headers.get('location').includes('/auth/login'));
});

test('GET /admin/flights/export/csv redirects unauthenticated users to login', async () => {

  const res = await fetch(`${BASE_URL}/admin/flights/export/csv`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.ok(res.headers.get('location').includes('/auth/login'));
});

test('GET /admin/finance/export/csv redirects unauthenticated users to login', async () => {
  const res = await fetch(`${BASE_URL}/admin/finance/export/csv`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.ok(res.headers.get('location').includes('/auth/login'));
});

test('POST /auth/login authenticates user and sets session cookie', async () => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'email=admin@zahabiatravel.com&password=admin123',
    redirect: 'manual'
  });
  assert.equal(res.status, 302);
  const cookie = res.headers.get('set-cookie');
  assert.ok(cookie);

  // Verify authenticated GET /admin/finance
  const finRes = await fetch(`${BASE_URL}/admin/finance`, {
    headers: { Cookie: cookie }
  });
  assert.equal(finRes.status, 200);
  const finText = await finRes.text();
  assert.ok(finText.includes('Agency Financial Ledger'));

  // Verify authenticated GET /admin/audit-logs
  const auditRes = await fetch(`${BASE_URL}/admin/audit-logs`, {
    headers: { Cookie: cookie }
  });
  assert.equal(auditRes.status, 200);
  const auditText = await auditRes.text();
  assert.ok(auditText.includes('Audit Security Trail'));
});



test('GET /auth/login renders operator login page', async () => {
  const res = await fetch(`${BASE_URL}/auth/login`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.ok(text.includes('Operator Email Address'));
});

