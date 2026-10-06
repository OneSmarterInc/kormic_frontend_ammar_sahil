import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

test('Vercel declares an API catch-all serverless proxy function', () => {
  assert.equal(config.rewrites.some(({ source }) => source.startsWith('/api/')), false);
  assert.deepEqual(config.functions['api/[...path].js'], { maxDuration: 60 });
  assert.deepEqual(config.functions['api/proxy.js'], { maxDuration: 60 });
});

test('Vercel browser builds select their own origin for cookie-backed API calls', async () => {
  const buildScript = await readFile(new URL('../scripts/build.mjs', import.meta.url), 'utf8');
  const portalClient = await readFile(new URL('../packages/portal-core/src/client.js', import.meta.url), 'utf8');
  assert.match(buildScript, /hostname\.endsWith\('\.vercel\.app'\)/);
  assert.match(buildScript, /vercel \? window\.location\.origin/);
  assert.match(portalClient, /hostname\.endsWith\('\.vercel\.app'\)/);
  assert.match(portalClient, /vercel\s*\? window\.location\.origin/);
});

