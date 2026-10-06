import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import {
  getAccessToken, setAccessToken,
  getCachedUser, setCachedUser, clearAuth, setRefreshToken,
} from '../src/lib/tokenStorage.js';
import { roleHome } from '../src/lib/constants.js';

let previousStorage;
let previousSessionStorage;
beforeEach(() => {
  clearAuth();
  previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  previousSessionStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const values = new Map();
  const sessionValues = new Map();
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (key) => sessionValues.get(key) ?? null,
      setItem: (key, value) => sessionValues.set(key, String(value)),
      removeItem: (key) => sessionValues.delete(key),
    },
  });
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
  if (previousSessionStorage) Object.defineProperty(globalThis, 'sessionStorage', previousSessionStorage);
  else delete globalThis.sessionStorage;
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
  const user = { id: 1, role: 'superuser', totp_enrolled: true };
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

test('portal landing route points to its dashboard', () => {
  assert.equal(roleHome(), '/admin/dashboard');
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
    { url: '/auth/login/', body: { email: 'officer@example.com', password: 'password', portal: 'superuser' } },
    { url: '/auth/verify-totp/', body: { mfa_token: 'challenge', code: '123456', portal: 'superuser' } },
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


test('refresh sends the tab-scoped token directly to the backend', async () => {
  setRefreshToken('superuser', 'refresh-token');
  const requests = [];
  cookieTransport.defaults.adapter = async (config) => {
    requests.push(config);
    return { data: { access: 'fresh-access' }, status: 200, headers: {}, config };
  };
  const result = await Promise.all([requestRefresh(), requestRefresh()]);
  assert.deepEqual(result, ['fresh-access', 'fresh-access']);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/auth/refresh/');
  assert.equal(requests[0].withCredentials, false);
  assert.deepEqual(JSON.parse(requests[0].data), { refresh: 'refresh-token' });
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
  setRefreshToken('superuser', 'refresh-token');
  let finish;
  cookieTransport.defaults.adapter = (config) =>
    new Promise((resolve) => { finish = () => resolve({ data: { access: 'stale-access' }, status: 200, headers: {}, config }); });
  const pending = requestRefresh();
  while (!finish) await new Promise((resolve) => setImmediate(resolve));
  clearAuth();
  finish();
  await assert.rejects(pending, /Session changed/);
  assert.equal(getAccessToken(), '');
});
