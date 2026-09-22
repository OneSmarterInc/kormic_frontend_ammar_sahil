import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const { expo } = JSON.parse(readFileSync(new URL('app.json', root), 'utf8'));
assert.equal(expo.scheme, 'kormicstudent');
assert.equal(expo.android.package, 'com.kormic.student');
assert.equal(expo.ios.bundleIdentifier, 'com.kormic.student');
assert.deepEqual(expo.ios.associatedDomains, ['applinks:app.kormic.ai']);
assert.equal(expo.android.intentFilters.length, 1);
const filter = expo.android.intentFilters[0];
assert.equal(filter.autoVerify, true);
assert.equal(filter.action, 'VIEW');
assert.deepEqual([...filter.category].sort(), ['BROWSABLE', 'DEFAULT']);
assert.deepEqual(filter.data, [
  { scheme: 'https', host: 'app.kormic.ai', path: '/claim' },
  { scheme: 'https', host: 'app.kormic.ai', path: '/claim/' },
]);

const manifest = readFileSync(new URL('android/app/src/main/AndroidManifest.xml', root), 'utf8');
const verified = manifest.match(/<intent-filter android:autoVerify="true">[\s\S]*?<\/intent-filter>/g) ?? [];
assert.equal(verified.length, 1, 'Native Android must have exactly one verified filter');
for (const path of ['/claim', '/claim/']) {
  assert.ok(verified[0].includes(`android:scheme="https" android:host="app.kormic.ai" android:path="${path}"`));
}
assert.equal((verified[0].match(/<data /g) ?? []).length, 2);
assert.ok(manifest.includes('android:scheme="kormicstudent"'));
assert.ok(!manifest.includes('android:host="localhost"'));
assert.ok(!manifest.includes('android:host="backend.kormic.ai"'));
console.log('Expo and checked-in native app-link configuration agree.');
