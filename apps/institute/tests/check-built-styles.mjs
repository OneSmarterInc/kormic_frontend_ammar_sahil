import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const directory = new URL('../dist/assets/', import.meta.url);
const files = (await readdir(directory)).filter(name => name.endsWith('.css'));
assert.ok(files.length, 'Build the portal before checking production styles.');
const css = (await Promise.all(files.map(name => readFile(new URL(name, directory), 'utf8')))).join('');
for (const selector of ['.bg-red-600{', '.hover\\:bg-red-700', '.disabled\\:bg-red-300', '.focus-visible\\:outline-red-600', '.text-white{']) {
  assert.ok(css.includes(selector), `Missing confirmation-button style: ${selector}`);
}
console.log('Production confirmation-button styles verified.');
