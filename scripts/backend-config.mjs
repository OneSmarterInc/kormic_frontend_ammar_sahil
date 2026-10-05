import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { apiOrigin } from '../shared/auth.mjs';

export function backendOrigin(kind = 'PUBLIC') {
  const key = `KORMIC_API_ORIGIN_${kind}`;
  const fallback = kind === 'PUBLIC' ? 'https://backend.kormic.ai' : 'http://127.0.0.1:8000';
  // Vercel supplies project variables through process.env at build time.
  // Keep the checked-out .env as a local fallback without overriding Vercel.
  let value = process.env[key]?.trim();
  if (!value) {
    const envFile = fileURLToPath(new URL('../.env', import.meta.url));
    if (existsSync(envFile)) {
      process.loadEnvFile(envFile);
      value = process.env[key]?.trim();
    }
  }
  if (!value || value.includes('YOUR_')) value = fallback;
  return apiOrigin(value);
}
