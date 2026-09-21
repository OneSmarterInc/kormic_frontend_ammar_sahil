import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = resolve(root, 'dist');
const required = [
  'index.html', 'login.mjs', 'login.css', 'config.js', 'shared/auth.mjs',
  'student/index.html', 'university/index.html', 'institute/index.html',
  'superuser/index.html', 'claim/index.html'
];
for (const relative of required) {
  if (!existsSync(resolve(dist, relative))) throw new Error(`Missing build output: ${relative}`);
}
const rootHtml = await readFile(resolve(dist, 'index.html'), 'utf8');
if (!rootHtml.includes('Kormic Login') || !rootHtml.includes('Login as')) {
  throw new Error('Unified login labels are missing from the production build.');
}
for (const role of ['university', 'institute', 'superuser']) {
  const portalHtml = await readFile(resolve(dist, role, 'index.html'), 'utf8');
  if (!portalHtml.includes(`/${role}/`)) {
    throw new Error(`${role} build is not scoped to its single-frontend route prefix.`);
  }
}
const studentHtml = await readFile(resolve(dist, 'student', 'index.html'), 'utf8');
if (!studentHtml.includes('/student')) throw new Error('Student web build is not scoped to /student.');
console.log('Unified frontend distribution verified.');
