import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

test('Vercel has no API proxy or API rewrite', () => {
  assert.equal(config.proxy, undefined);
  assert.equal(config.functions, undefined);
  assert.equal(config.rewrites.some(({ source }) => source.startsWith('/api/')), false);
});

test('production browser builds call the configured backend directly', async () => {
  const buildScript = await readFile(new URL('../scripts/build.mjs', import.meta.url), 'utf8');
  const portalClient = await readFile(new URL('../packages/portal-core/src/client.js', import.meta.url), 'utf8');
  assert.doesNotMatch(buildScript, /window\.location\.origin/);
  assert.doesNotMatch(portalClient, /window\.location\.origin/);
  assert.match(buildScript, /JSON\.stringify\(origin\)/);
  assert.match(portalClient, /import\.meta\.env\.VITE_API_BASE_URL/);
});
