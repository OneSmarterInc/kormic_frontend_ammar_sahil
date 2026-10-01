import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { AuthSession } from '../models/onboarding';
import type { ChatMessage } from '../features/chat/types';
import { StudentProfile } from '../features/profile/types';
// Private, disposable native app cache. Never stores access or refresh tokens.
const path = () => FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}kormic-profile-v1.json` : undefined;
const chatPath = () => FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}kormic-chat-v1.json` : undefined;
const clearListeners = new Set<() => void>();
export const onStudentCacheClear = (listener: () => void) => { clearListeners.add(listener); };
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
  clearListeners.forEach(listener => listener());
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    if (Platform.OS !== 'web') {
      if (path()) await FileSystem.deleteAsync(path()!, { idempotent: true });
      if (chatPath()) await FileSystem.deleteAsync(chatPath()!, { idempotent: true });
    }
  }).catch(() => {});
  return writeQueue;
}

// Bounded read-through history snapshot, not an offline write queue or agent log.
export async function readCachedChat(session: AuthSession): Promise<ChatMessage[] | undefined> {
  if (Platform.OS === 'web' || !owner(session) || !chatPath()) return;
  const started = generation;
  try {
    const data = JSON.parse(await FileSystem.readAsStringAsync(chatPath()!));
    if (started !== generation || data.version !== 1 || data.owner !== owner(session) ||
        Date.now() - data.savedAt >= 7 * 86400000 || !Array.isArray(data.messages)) return;
    if (!data.messages.every((m: ChatMessage) => m && typeof m.id === 'string' &&
        typeof m.text === 'string' && ['user', 'aria'].includes(m.role))) return;
    return data.messages;
  } catch { return; }
}
export function cacheChat(session: AuthSession, messages: ChatMessage[], expectedGeneration = generation) {
  if (Platform.OS === 'web' || !owner(session) || !chatPath()) return Promise.resolve();
  // Persist confirmed messages only. Never retain pending sends, credentials or raw model metadata.
  let snapshot = messages.filter(m => m.serverId != null).slice(-200).map(m => ({
    id: m.id, serverId: m.serverId, role: m.role, text: m.text, createdAt: m.createdAt,
    editedAt: m.editedAt, pending: m.pending, queryId: m.queryId,
    escalationStatus: m.escalationStatus, wasEscalatedPrompt: m.wasEscalatedPrompt,
  }));
  while (snapshot.length && JSON.stringify(snapshot).length > 1000000) snapshot.shift();
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    if (expectedGeneration !== generation) return;
    await FileSystem.writeAsStringAsync(chatPath()!, JSON.stringify({version: 1, owner: owner(session), savedAt: Date.now(), messages: snapshot}));
  }).catch(() => {});
  return writeQueue;
}
