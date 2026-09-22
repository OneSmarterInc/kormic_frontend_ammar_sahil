import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFile(resolve(root, path));
const text = async (path) => (await read(path)).toString('utf8');
test('one visible Kormic Login has the four role choices', async () => {
  const html = await text('web/index.html');
  assert.match(html, /<h2 id="form-title">Kormic Login<\/h2>/);
  assert.match(html, /<label for="portal">Login as<\/label>/);
  for (const role of ['student', 'university', 'institute', 'superuser']) {
    assert.match(html, new RegExp(`value="${role}"`));
  }
});

for (const role of ['university', 'institute', 'superuser']) {
  test(`${role} browser login routes use the shared Kormic Login entry`, async () => {
    const app = await text(`apps/${role}/src/App.jsx`);
    assert.match(app, /UnifiedPortalEntry/);
    assert.match(app, /path="\/login" element={<UnifiedPortalEntry \/>}/);
    assert.doesNotMatch(app, /element={<(?:UniversityLoginPage|LoginPage) \/>}/);
  });
}

test('student browser login and logout use Kormic Login while native remains intact', async () => {
  const app = await text('apps/student/src/App.tsx');
  const session = await text('apps/student/src/features/auth/useStudentSession.ts');
  const config = JSON.parse(await text('apps/student/app.json'));
  assert.match(app, /Platform\.OS !== 'web'/);
  assert.match(app, /\/login\?portal=student/);
  assert.match(session, /Platform\.OS === 'web'/);
  assert.match(session, /\/login\?portal=student/);
  assert.equal(config.expo.experiments.baseUrl, '/student');
});

const endpointContracts = {
  'apps/student/src/services/api.ts': [
    '/auth/web/csrf/', '/auth/login/', '/auth/register/', '/auth/verify-totp/',
    '/auth/refresh/', '/auth/logout/', '/auth/totp/enroll/',
    '/auth/totp/verify-enrollment/', '/auth/me/'
  ],
  'apps/university/src/api/authApi.js': [
    '/auth/web/login/', '/auth/web/verify-totp/', '/auth/totp/enroll/',
    '/auth/totp/verify-enrollment/', '/auth/me/'
  ],
  'apps/institute/src/api/authApi.js': [
    '/auth/web/login/', '/auth/web/verify-totp/', '/auth/totp/enroll/',
    '/auth/totp/verify-enrollment/', '/auth/me/'
  ],
  'apps/superuser/src/api/authApi.js': [
    '/auth/web/login/', '/auth/web/verify-totp/', '/auth/totp/enroll/',
    '/auth/totp/verify-enrollment/', '/auth/me/'
  ]
};

for (const [path, endpoints] of Object.entries(endpointContracts)) {
  test(`${path} preserves the existing authentication endpoint contract`, async () => {
    const source = await text(path);
    for (const endpoint of endpoints) assert.ok(source.includes(endpoint), `${path} missing ${endpoint}`);
  });
}

for (const [path, portal] of [
  ['apps/university/src/api/client.js', 'university'],
  ['apps/institute/src/api/client.js', 'institute'],
  ['apps/superuser/src/api/client.js', 'superuser']
]) {
  test(`${path} retains its original API base and portal isolation`, async () => {
    const source = await text(path);
    assert.match(source, /baseURL:\s*\x60\$\{BASE_URL\}\/api\x60/);
    assert.ok(source.includes(`PORTAL = "${portal}"`));
    assert.ok(source.includes('/auth/web/csrf/'));
    assert.ok(source.includes('/auth/web/refresh/'));
  });
}
