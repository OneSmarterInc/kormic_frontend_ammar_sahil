import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../api/[...path].js', import.meta.url), 'utf8');

test('Vercel API function forwards requests to the production backend', () => {
  assert.match(source, /https:\/\/backend\.kormic\.ai/);
  assert.match(source, /request\.method/);
  assert.match(source, /request\.headers/);
});

test('Vercel API function preserves authentication cookies', () => {
  assert.match(source, /getSetCookie/);
  assert.match(source, /set-cookie/);
});

