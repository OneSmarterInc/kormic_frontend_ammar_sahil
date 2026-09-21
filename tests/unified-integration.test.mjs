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
  test(`${path} delegates to the shared portal client`, async () => {
    const source = await text(path);
    assert.ok(source.includes(`@kormic/portal-core/clients/${portal}.js`));
  });
}

test('shared portal client owns error normalization and auth exemptions for all portals', async () => {
  const source = await text('packages/portal-core/src/client.js');
  assert.ok(source.includes('axios.isCancel(error)'));
  assert.ok(source.includes('Something went wrong on our end. Please try again in a moment.'));
  assert.ok(source.includes('.replace(/\\/+$/, "")'));
  assert.ok(source.includes('/auth/forgot-password/'));
  assert.ok(source.includes('/auth/reset-password/'));
});

test('all three portals share token storage, auth context, guards, and common primitives', async () => {
  for (const role of ['university', 'institute', 'superuser']) {
    assert.ok((await text(`apps/${role}/src/lib/tokenStorage.js`)).includes('@kormic/portal-core/tokenStorage.js'));
    assert.ok((await text(`apps/${role}/src/context/AuthContext.jsx`)).includes('@kormic/portal-core/AuthContext.jsx'));
    assert.ok((await text(`apps/${role}/src/components/auth/guards.jsx`)).includes('@kormic/portal-core/guards.jsx'));
    for (const component of ['Input.jsx', 'EmptyState.jsx', 'Spinner.jsx', 'Button.jsx', 'Card.jsx', 'ErrorBanner.jsx', 'ErrorBoundary.jsx', 'Modal.jsx']) {
      assert.ok((await text(`apps/${role}/src/components/common/${component}`)).includes('@kormic/portal-core/components/common'));
    }
  }
});

test('superuser create pages submit required country codes from the ISO option source', async () => {
  const countries = await text('apps/superuser/src/lib/countries.js');
  const institute = await text('apps/superuser/src/pages/admin/InstituteCreatePage.jsx');
  const university = await text('apps/superuser/src/pages/admin/UniversityCreatePage.jsx');

  assert.ok(countries.includes('COUNTRY_CODES'));
  assert.ok(countries.includes('COUNTRY_CODES.filter((code) => code !== "US")'));
  assert.ok(countries.includes('UNIVERSITY_COUNTRY_CODES = Object.freeze(["US"])'));

  assert.ok(institute.includes('country,'));
  assert.ok(institute.includes('INSTITUTE_COUNTRY_CODES.map'));
  assert.ok(university.includes('country,'));
  assert.ok(university.includes('UNIVERSITY_COUNTRY_CODES.map'));
});

test('portal-core Vite alias resolves shared dependencies from each app with one React copy', async () => {
  for (const role of ['university', 'institute', 'superuser']) {
    const config = await text(`apps/${role}/vite.config.js`);
    assert.ok(config.includes("'@kormic/portal-core'"));
    assert.ok(config.includes("dedupe: ['react', 'react-dom', 'react-router-dom']"));
  }

  const setup = await text('scripts/setup.mjs');
  for (const dependency of ['react', 'react-dom', 'react-router-dom', 'axios', 'clsx', 'lucide-react']) {
    assert.ok(setup.includes(`'${dependency}'`));
  }
});
