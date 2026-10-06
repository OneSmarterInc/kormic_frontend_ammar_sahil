import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../api/proxy.js', import.meta.url), 'utf8');
const catchAll = await readFile(new URL('../api/[...path].js', import.meta.url), 'utf8');

test('Vercel API function forwards requests to the production backend', () => {
  assert.match(source, /https:\/\/backend\.kormic\.ai/);
  assert.match(source, /request\.method/);
  assert.match(source, /request\.headers/);
});

test('Vercel API function preserves authentication cookies', () => {
  assert.match(source, /getSetCookie/);
  assert.match(source, /set-cookie/);
});

test('Vercel API catch-all delegates every API path to the proxy', () => {
  assert.match(catchAll, /proxy\.js/);
  assert.match(source, /Array\.isArray\(routePath\)/);
  assert.match(source, /routePath\.join\('\/'\)/);
});

