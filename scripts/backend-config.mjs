import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { apiOrigin } from '../shared/auth.mjs';

export function backendOrigin(kind = 'PUBLIC') {
  const envFile = fileURLToPath(new URL('../.env', import.meta.url));
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const key = `KORMIC_API_ORIGIN_${kind}`;
  const value = process.env[key]?.trim();
  if (!value || value.includes('YOUR_')) {
    throw new Error(`Set ${key} in the frontend root .env (backend origin without /api).`);
  }
  return apiOrigin(value);
}
