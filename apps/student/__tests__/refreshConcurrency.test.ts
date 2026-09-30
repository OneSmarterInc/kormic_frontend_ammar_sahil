import { Platform } from 'react-native';
import { refreshAccessToken, getGithubOverview, fetchWithSession, subscribeSessionExpired } from '../src/services/api';
import { AuthSession } from '../src/models/onboarding';
import * as storage from '../src/services/tokenStorage';

jest.mock('../src/services/tokenStorage', () => ({
  getTokenGeneration: jest.fn(() => 0), getSavedRefreshToken: jest.fn(),
  getSavedTokens: jest.fn(),
  saveAccessToken: jest.fn(), saveRefreshToken: jest.fn(), clearSavedTokens: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  jest.mocked(storage.getSavedRefreshToken).mockResolvedValue('current-token');
  jest.mocked(storage.getSavedTokens).mockReset();
});

it('uses the stored access token when a screen retains older credentials', async () => {
  jest.mocked(storage.getSavedTokens).mockResolvedValue({access:'current-access',refresh:'current-token'});
  globalThis.fetch = jest.fn().mockResolvedValue({ok:true,status:200});
  const session = {access:'old',refresh:'old-refresh'} as AuthSession;
  await fetchWithSession(session, '/test', access => ({headers:{Authorization:`Bearer ${access}`}}));
  expect(globalThis.fetch).toHaveBeenCalledWith('/test', {headers:{Authorization:'Bearer current-access'}});
  expect(session.access).toBe('current-access');
});

it('retries a delayed 401 with credentials rotated by another request without refreshing again', async () => {
  jest.mocked(storage.getSavedTokens).mockResolvedValueOnce({access:'old',refresh:'r1'})
    .mockResolvedValueOnce({access:'new',refresh:'r2'});
  globalThis.fetch = jest.fn().mockResolvedValueOnce({status:401}).mockResolvedValueOnce({status:200});
  await fetchWithSession({access:'old'} as AuthSession, '/test', access => ({headers:{Authorization:access}}));
  expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  expect(globalThis.fetch).toHaveBeenLastCalledWith('/test', {headers:{Authorization:'new'}});
});

it('notifies the session owner when no refresh credential remains', async () => {
  const expired = jest.fn();
  const unsubscribe = subscribeSessionExpired(expired);
  globalThis.fetch = jest.fn().mockResolvedValue({status:401});
  await expect(fetchWithSession({access:'old'} as AuthSession, '/test', () => ({}))).rejects.toThrow('session expired');
  expect(expired).toHaveBeenCalledTimes(1);
  expect(storage.clearSavedTokens).toHaveBeenCalledTimes(1);
  unsubscribe();
});

it('does not clear a newer session when an old request returns 401 after logout', async () => {
  jest.mocked(storage.getTokenGeneration).mockReturnValue(0);
  globalThis.fetch = jest.fn().mockImplementation(async () => {
    jest.mocked(storage.getTokenGeneration).mockReturnValue(1);
    return {status:401};
  });
  await expect(fetchWithSession({access:'old'} as AuthSession, '/test', () => ({}))).rejects.toThrow('Session changed');
  expect(storage.clearSavedTokens).not.toHaveBeenCalled();
  jest.mocked(storage.getTokenGeneration).mockReturnValue(0);
});

it('coalesces ten native refresh requests and uses the saved rotated credential', async () => {
  const fetch = jest.fn().mockResolvedValue({ ok: true, status:200,
    text: async () => JSON.stringify({ access:'next-access', refresh:'next-refresh' }) });
  globalThis.fetch = fetch;
  const results = await Promise.all(Array.from({length:10}, () => refreshAccessToken('stale-token')));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({refresh:'current-token'});
  expect(results.every(result => result.access === 'next-access')).toBe(true);
  expect(storage.saveRefreshToken).toHaveBeenCalledTimes(1);
  expect(storage.saveRefreshToken).toHaveBeenCalledWith('next-refresh');
});

it('does not delete credentials after a transient refresh transport failure', async () => {
  globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
  await expect(refreshAccessToken()).rejects.toThrow('Network request failed');
  expect(storage.clearSavedTokens).not.toHaveBeenCalled();
});

it('signs out cleanly if the refreshed access token is also rejected', async () => {
  globalThis.fetch = jest.fn()
    .mockResolvedValueOnce({status:401})
    .mockResolvedValueOnce({ok:true,status:200,text:async()=>JSON.stringify({access:'new',refresh:'rotated'})})
    .mockResolvedValueOnce({status:401});
  const expired = jest.fn();
  const unsubscribe = subscribeSessionExpired(expired);
  await expect(fetchWithSession({access:'old',refresh:'r1'} as AuthSession, '/test', () => ({}))).rejects.toThrow('Please sign in again');
  expect(expired).toHaveBeenCalledTimes(1);
  expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  unsubscribe();
});

it('preserves login when an expired access token meets a temporary refresh outage', async () => {
  globalThis.fetch = jest.fn().mockResolvedValueOnce({ok:false,status:401,text:async()=>'{"detail":"Expired access"}'})
    .mockRejectedValueOnce(new TypeError('Network request failed'));
  await expect(getGithubOverview({access:'old',refresh:'stale'} as AuthSession)).rejects.toThrow('Could not reconnect');
  expect(storage.clearSavedTokens).not.toHaveBeenCalled();
});

it('clears credentials only after the server rejects the refresh token', async () => {
  globalThis.fetch = jest.fn().mockResolvedValue({ok:false,status:401,text:async()=>'{"detail":"Token invalid"}'});
  await expect(getGithubOverview({access:'old',refresh:'stale'} as AuthSession)).rejects.toThrow('session expired');
  expect(storage.clearSavedTokens).toHaveBeenCalledTimes(1);
});
