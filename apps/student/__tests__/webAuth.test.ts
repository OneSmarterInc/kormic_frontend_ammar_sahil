import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { clearSavedTokens, getSavedTokens, getSavedRefreshToken, saveTokens } from '../src/services/tokenStorage';
import { loginStudent, refreshAccessToken, logoutSession } from '../src/services/api';

jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(), getItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));

const originalFetch = globalThis.fetch;
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const fetchMock = jest.fn();
function response(data: unknown, status = 200) {
  return { ok: status < 400, status, text: async () => JSON.stringify(data), json: async () => data };
}

beforeEach(async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } });
  await clearSavedTokens();
  jest.clearAllMocks();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});
afterAll(() => {
  globalThis.fetch = originalFetch;
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});

test('web never persists access or refresh tokens', async () => {
  await saveTokens({ access: 'access', refresh: 'must-not-persist' });
  expect(await getSavedTokens()).toEqual({ access: 'access', refresh: undefined });
  expect(await getSavedRefreshToken()).toBeUndefined();
  expect(localStorage.getItem('kormic.access')).toBeNull();
  expect(localStorage.getItem('kormic.refresh')).toBeNull();
  expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  localStorage.setItem('kormic.refresh', 'legacy');
  await clearSavedTokens();
  expect(localStorage.getItem('kormic.refresh')).toBeNull();
  expect(await getSavedTokens()).toBeUndefined();
});

test.each(['android', 'ios'])('native %s retains SecureStore', async (os) => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
  await saveTokens({ access: 'access', refresh: 'native-refresh' });
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('kormic.refresh', 'native-refresh');
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('kormic.access', 'access');
});

test('web login carries cookies and CSRF and uses the student portal', async () => {
  fetchMock.mockResolvedValueOnce(response({ csrfToken: 'csrf' })).mockResolvedValueOnce(response({ mfa_token: 'challenge' }));
  await loginStudent({ email: 'student@example.com', password: 'password' });
  expect(fetchMock.mock.calls[1][0]).toMatch(/\/auth\/web\/login\/$/);
  expect(fetchMock.mock.calls[1][1]).toMatchObject({ credentials: 'include', headers: { 'X-CSRFToken': 'csrf' } });
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ portal: 'student' });
});

test('web reload can refresh without a JS refresh token and shares concurrent requests', async () => {
  fetchMock.mockResolvedValueOnce(response({ access: 'restored', user: { role: 'student' } }));
  const results = await Promise.all([refreshAccessToken(), refreshAccessToken()]);
  expect(results[0].access).toBe('restored');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/web\/refresh\/$/);
  expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
  expect(fetchMock.mock.calls[0][1].headers['X-CSRFToken']).toBeUndefined();
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ portal: 'student' });
});

test('web logout reaches the cookie endpoint even without an access token', async () => {
  fetchMock.mockResolvedValueOnce(response({ csrfToken: 'csrf' })).mockResolvedValueOnce(response({}, 204));
  await logoutSession();
  expect(fetchMock.mock.calls[1][0]).toMatch(/\/auth\/web\/logout\/$/);
  expect(fetchMock.mock.calls[1][1].credentials).toBe('include');
});

test('native refresh still sends its SecureStore token to the native endpoint', async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  fetchMock.mockResolvedValueOnce(response({ access: 'native-access' }));
  await refreshAccessToken('native-refresh');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/refresh\/$/);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ refresh: 'native-refresh' });
});
