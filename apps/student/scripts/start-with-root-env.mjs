import { spawnSync } from 'node:child_process';
import { backendOrigin } from '../../../scripts/backend-config.mjs';

process.env.EXPO_PUBLIC_API_BASE_URL = `${backendOrigin()}/api`;

process.env.EXPO_PUBLIC_LOCAL_API_BASE_URL = `${backendOrigin('LOCAL')}/api`;

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(command, ['expo', 'start', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
