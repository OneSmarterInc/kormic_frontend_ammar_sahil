import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'kormic.access';
const REFRESH_TOKEN_KEY = 'kormic.refresh';

let webAccess: string | null = null;
let generation = 0;
export const getTokenGeneration = () => generation;

type SavedTokens = {
  access: string;
  refresh?: string;
};

function purgeLegacyWebTokens() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch { /* Storage may be disabled. */ }
}
if (Platform.OS === 'web') purgeLegacyWebTokens();

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    if (key === ACCESS_TOKEN_KEY) webAccess = value;
    return; // Refresh tokens are managed exclusively by HttpOnly cookies.
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string) {
  if (Platform.OS === 'web') return key === ACCESS_TOKEN_KEY ? webAccess : null;
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (Platform.OS === 'web') {
    if (key === ACCESS_TOKEN_KEY) webAccess = null;
    purgeLegacyWebTokens();
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveAccessToken(accessToken: string) {
  await setItem(ACCESS_TOKEN_KEY, accessToken);
}

export async function saveRefreshToken(refreshToken: string) {
  await setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function saveTokens(tokens: { access?: string; refresh?: string }) {
  if (tokens.access) {
    await saveAccessToken(tokens.access);
  }
  if (tokens.refresh) {
    await saveRefreshToken(tokens.refresh);
  }
}

export async function getSavedRefreshToken() {
  return (await getItem(REFRESH_TOKEN_KEY)) ?? undefined;
}

export async function getSavedTokens(): Promise<SavedTokens | undefined> {
  const access = await getItem(ACCESS_TOKEN_KEY);
  if (!access) {
    return undefined;
  }

  return {
    access,
    refresh: (await getItem(REFRESH_TOKEN_KEY)) ?? undefined,
  };
}

export async function clearSavedTokens() {
  generation += 1;
  await Promise.all([deleteItem(ACCESS_TOKEN_KEY), deleteItem(REFRESH_TOKEN_KEY)]);
}
