import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root=fileURLToPath(new URL('..',import.meta.url));
if(!existsSync(resolve(root,'IMPORT_COMPLETE.json')))throw new Error('Complete source import first: python scripts/import_portals.py');
for(const role of ['student','university','institute','superuser']){
  const cwd=resolve(root,'apps',role);
  if(!existsSync(resolve(cwd,'package-lock.json')))throw new Error(`Missing original lockfile for ${role}; refusing unpinned dependency installation.`);
  console.log(`Installing ${role} dependencies from its original lockfile…`);
  const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['ci'],{cwd,stdio:'inherit',shell:process.platform==='win32'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
}
