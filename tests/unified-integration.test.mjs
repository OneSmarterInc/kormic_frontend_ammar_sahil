import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFile(resolve(root, path));
const text = async (path) => (await read(path)).toString('utf8');
const gitBlobSha = (data) => createHash('sha1')
  .update(Buffer.concat([Buffer.from(`blob ${data.length}\\0`), data]))
  .digest('hex');

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

const originalApiHashes = {
  'apps/student/src/services/api.ts': '01630659385448b1c2ecccc7bc8695dc914025cc',
  'apps/student/src/services/apiBaseUrl.ts': 'dfdbc88c112ec9d7a4e73c13f18d4ed9a3f4beeb',
  'apps/university/src/api/client.js': '61ee5e1ef57bdebb5e986d2ffe293c0e6cf6a997',
  'apps/university/src/api/authApi.js': 'c58c6fd596f2e1cd88da2c9c723f7e17f094fe67',
  'apps/institute/src/api/client.js': 'ed5fa2dfe1a682bcba217c7383b7bdb6704abff5',
  'apps/institute/src/api/authApi.js': '516a09bf8f96039b541a553107281eb452de8b11',
  'apps/institute/src/api/instituteApi.js': '815da2ba486798517da5ce315edd11131d9a153d',
  'apps/superuser/src/api/client.js': '2ef91c1831325c97ec5be387471e70ec10836336',
  'apps/superuser/src/api/authApi.js': '8cb1d16c7df44e8c59289e6dad7b9f24b4b974b1'
};
for (const [path, expected] of Object.entries(originalApiHashes)) {
  test(`${path} is unchanged from its source repository`, async () => {
    assert.equal(gitBlobSha(await read(path)), expected);
  });
}
