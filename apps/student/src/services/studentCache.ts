import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { AuthSession } from '../models/onboarding';
import { StudentProfile } from '../features/profile/types';
// Private, disposable native app cache. Never stores access or refresh tokens.
const path = () => FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}kormic-profile-v1.json` : undefined;
let generation = 0;
let writeQueue: Promise<unknown> = Promise.resolve();
const owner = (session: AuthSession) => session.user?.student_id;
export const cacheGeneration = () => generation;
export async function readCachedProfile(session: AuthSession): Promise<StudentProfile | undefined> {
  if (Platform.OS === 'web' || !owner(session) || !path()) return;
  try {
    const data = JSON.parse(await FileSystem.readAsStringAsync(path()!));
    if (data.owner === owner(session) && Date.now() - data.savedAt < 7 * 86400000 && data.version === 1) return data.profile;
  } catch { /* A missing or evicted cache is a normal cache miss. */ }
}
export function cacheProfile(session: AuthSession, profile: StudentProfile, expectedGeneration = generation) {
  if (Platform.OS === 'web' || !owner(session) || !path()) return Promise.resolve();
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    if (expectedGeneration !== generation) return;
    await FileSystem.writeAsStringAsync(path()!, JSON.stringify({ version: 1, owner: owner(session), savedAt: Date.now(), profile }));
  }).catch(() => {});
  return writeQueue;
}
export function clearStudentCache() {
  generation += 1;
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    if (Platform.OS !== 'web' && path()) await FileSystem.deleteAsync(path()!, { idempotent: true });
  }).catch(() => {});
  return writeQueue;
}
