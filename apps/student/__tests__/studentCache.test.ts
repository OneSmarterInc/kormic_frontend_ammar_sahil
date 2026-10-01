import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { cacheGeneration, cacheProfile, clearStudentCache, readCachedProfile, cacheChat, readCachedChat } from '../src/services/studentCache';
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

it('persists bounded confirmed chat without model internals and restores only its owner', async () => {
  const messages = Array.from({length: 205}, (_, i) => ({id: String(i), serverId: i, role: 'aria' as const,
    text: 'Reply ' + i, meta: {tool_parameters: 'private-internals'}}));
  await cacheChat(session, [...messages, {id: 'optimistic', role: 'user', text: 'Not sent'}]);
  const serialized = jest.mocked(FileSystem.writeAsStringAsync).mock.calls[0]![1];
  expect(serialized).not.toContain('private-internals');
  expect(serialized).not.toContain('Not sent');
  expect(serialized).not.toContain('secret');
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(serialized);
  expect(await readCachedChat(session)).toHaveLength(200);
  expect(await readCachedChat({...session, user: {...session.user!, student_id: 'other'}})).toBeUndefined();
});
it('ignores corrupt cache and a disk read completing after logout', async () => {
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue('invalid json');
  expect(await readCachedChat(session)).toBeUndefined();
  let finish!: (data: string) => void;
  jest.mocked(FileSystem.readAsStringAsync).mockImplementation(() => new Promise(resolve => {finish = resolve;}));
  const reading = readCachedChat(session);
  await clearStudentCache();
  finish(JSON.stringify({version: 1, owner: 'one', savedAt: Date.now(), messages: []}));
  expect(await reading).toBeUndefined();
});
it('does not repopulate chat from an old request after logout', async () => {
  const generation = cacheGeneration();
  await clearStudentCache();
  await cacheChat(session, [{id: '1', serverId: 1, role: 'aria', text: 'Old reply'}], generation);
  expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
});
