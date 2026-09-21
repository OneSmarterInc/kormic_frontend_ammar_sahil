import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import {
  getAccessToken, setAccessToken,
  getCachedUser, setCachedUser, clearAuth,
} from '../src/lib/tokenStorage.js';
import { roleHome } from '../src/lib/constants.js';

let previousStorage;
beforeEach(() => {
  clearAuth();
  previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  });
});
afterEach(() => {
  if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
  else delete globalThis.localStorage;
});

test('a fresh session has no credentials or cached user', () => {
  assert.equal(getAccessToken(), '');
  assert.equal(getCachedUser(), null);
});

test('access tokens stay in memory and are never persisted', () => {
  setAccessToken('expired-access');
  setAccessToken('new-access');
  assert.equal(getAccessToken(), 'new-access');
  assert.equal(localStorage.getItem('kormic.access_token'), null);
  assert.equal(localStorage.getItem('kormic.refresh_token'), null);
});

test('cached user data survives serialization', () => {
  const user = { id: 1, role: 'university', totp_enrolled: true };
  setCachedUser(user);
  assert.deepEqual(getCachedUser(), user);
});

test('malformed cached user data is treated as a missing session', () => {
  localStorage.setItem('kormic.user', '{broken');
  assert.equal(getCachedUser(), null);
});

test('logout removes all auth data and preserves unrelated preferences', () => {
  setAccessToken('access');
  setCachedUser({ id: 1 });
  localStorage.setItem('theme', 'dark');
  clearAuth();
  assert.equal(getAccessToken(), '');
  assert.equal(getCachedUser(), null);
  assert.equal(localStorage.getItem('theme'), 'dark');
});

test('logout is safe when no session exists', () => {
  clearAuth();
  clearAuth();
  assert.equal(getCachedUser(), null);
});

test('university landing route is scoped to the signed-in university', () => {
  assert.equal(roleHome({ role: 'university', university_id: 'school-42' }), '/university/school-42/dashboard');
});

test('other account roles cannot enter the university dashboard', () => {
  for (const role of ['student', 'institute', 'superuser']) {
    assert.equal(roleHome({ role, university_id: 'school-42' }), '/access-restricted');
  }
});


// Exercise the real transport/interceptors, with no external HTTP calls.
import client, { cookieTransport, requestRefresh } from '../src/api/client.js';
import { login, verifyTotp } from '../src/api/authApi.js';

let previousAdapter;
let previousCookieAdapter;
beforeEach(() => {
  previousAdapter = client.defaults.adapter;
  previousCookieAdapter = cookieTransport.defaults.adapter;
  cookieTransport.defaults.adapter = async (config) => ({ data: { csrfToken: 'csrf' }, status: 200, headers: {}, config });
});
afterEach(() => { client.defaults.adapter = previousAdapter; cookieTransport.defaults.adapter = previousCookieAdapter; });

test('password and MFA requests stay bound to this portal', async () => {
  const requests = [];
  client.defaults.adapter = async (config) => {
    requests.push({ url: config.url, body: JSON.parse(config.data) });
    return { data: { mfa_token: 'challenge' }, status: 200, statusText: 'OK', headers: {}, config };
  };
  await login('officer@example.com', 'password');
  await verifyTotp('challenge', '123456');
  assert.deepEqual(requests, [
    { url: '/auth/web/login/', body: { email: 'officer@example.com', password: 'password', portal: 'university' } },
    { url: '/auth/web/verify-totp/', body: { mfa_token: 'challenge', code: '123456', portal: 'university' } },
  ]);
});

test('wrong-portal rejection remains a password-stage error without refresh or token storage', async () => {
  let requests = 0;
  client.defaults.adapter = async (config) => {
    requests += 1;
    throw { config, response: { status: 401, data: { detail: 'Invalid credentials.' } } };
  };
  await assert.rejects(login('wrong-role@example.com', 'password'), (error) => {
    assert.equal(error.status, 401);
    assert.equal(error.message, 'Invalid credentials.');
    return true;
  });
  assert.equal(requests, 1);
  assert.equal(getAccessToken(), '');
  assert.equal(getCachedUser(), null);
});


test('refresh uses credentials and CSRF without sending a JS-readable refresh token', async () => {
  const requests = [];
  cookieTransport.defaults.adapter = async (config) => {
    requests.push(config);
    return { data: config.method === 'get' ? { csrfToken: 'masked-token' } : { access: 'fresh-access' }, status: 200, headers: {}, config };
  };
  const result = await Promise.all([requestRefresh(), requestRefresh()]);
  assert.deepEqual(result, ['fresh-access', 'fresh-access']);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].url, '/auth/web/refresh/');
  assert.equal(requests[1].withCredentials, true);
  assert.equal(requests[1].headers['X-CSRFToken'], 'masked-token');
  assert.equal(Object.hasOwn(JSON.parse(requests[1].data), 'refresh'), false);
  assert.equal(getAccessToken(), 'fresh-access');
});

test('legacy persisted credentials are removed while preferences survive', async () => {
  localStorage.setItem('kormic.refresh_token', 'legacy-refresh');
  localStorage.setItem('kormic.access_token', 'legacy-access');
  localStorage.setItem('theme', 'dark');
  const reloaded = await import('../src/lib/tokenStorage.js?reload');
  assert.equal(reloaded.getAccessToken(), '');
  assert.equal(localStorage.getItem('kormic.refresh_token'), null);
  assert.equal(localStorage.getItem('kormic.access_token'), null);
  assert.equal(localStorage.getItem('theme'), 'dark');
});

test('logout prevents an in-flight refresh from restoring access', async () => {
  let finish;
  cookieTransport.defaults.adapter = (config) => config.method === 'get'
    ? Promise.resolve({ data: { csrfToken: 'csrf' }, status: 200, headers: {}, config })
    : new Promise((resolve) => { finish = () => resolve({ data: { access: 'stale-access' }, status: 200, headers: {}, config }); });
  const pending = requestRefresh();
  while (!finish) await new Promise((resolve) => setImmediate(resolve));
  clearAuth();
  finish();
  await assert.rejects(pending, /Session changed/);
  assert.equal(getAccessToken(), '');
});
