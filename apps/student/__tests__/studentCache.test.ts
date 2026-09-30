import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { cacheGeneration, cacheProfile, clearStudentCache, readCachedProfile } from '../src/services/studentCache';
import { AuthSession } from '../src/models/onboarding';
jest.mock('expo-file-system/legacy', () => ({ cacheDirectory: 'file:///private/cache/', readAsStringAsync: jest.fn(), writeAsStringAsync: jest.fn(), deleteAsync: jest.fn() }));
const session = { access: 'secret', refresh: 'secret-refresh', user: { student_id: 'one' } } as AuthSession;
beforeEach(() => { jest.clearAllMocks(); Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' }); });
it('does not cache credentials and rejects another account or expired data', async () => {
  await cacheProfile(session, { name: 'Saved profile' } as any);
  const serialized = jest.mocked(FileSystem.writeAsStringAsync).mock.calls[0]![1];
  expect(serialized).not.toContain('secret');
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(serialized);
  expect((await readCachedProfile(session))?.name).toBe('Saved profile');
  expect(await readCachedProfile({ ...session, user: { ...session.user!, student_id: 'two' } })).toBeUndefined();
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(JSON.stringify({ ...JSON.parse(serialized), savedAt: 0 }));
  expect(await readCachedProfile(session)).toBeUndefined();
});
it('prevents an old request from recreating cached data after logout', async () => {
  const generation = cacheGeneration();
  await clearStudentCache();
  await cacheProfile(session, { name: 'Old response' } as any, generation);
  expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
  expect(FileSystem.deleteAsync).toHaveBeenCalled();
});
