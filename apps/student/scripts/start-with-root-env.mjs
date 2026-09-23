import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
try {
  process.loadEnvFile(resolve(root, '.env'));
} catch {
  // The optional root .env may be absent.
}

// The unified frontend uses KORMIC_API_ORIGIN while Expo client code uses
// EXPO_PUBLIC_API_BASE_URL. Accept either so direct Expo development cannot
// silently fall back to an unrelated production API.
if (!process.env.EXPO_PUBLIC_API_BASE_URL && process.env.KORMIC_API_ORIGIN) {
  const origin = process.env.KORMIC_API_ORIGIN.replace(/\/+$/, '');
  process.env.EXPO_PUBLIC_API_BASE_URL = `${origin}/api`;
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(command, ['expo', 'start', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
