import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root=fileURLToPath(new URL('..',import.meta.url));
for(const role of ['student','university','institute','superuser']){
  const cwd=resolve(root,'apps',role);
  if(!existsSync(resolve(cwd,'package-lock.json')))throw new Error(`Missing original lockfile for ${role}; refusing unpinned dependency installation.`);
  console.log(`Installing ${role} dependencies from its original lockfile…`);
  const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['ci'],{cwd,stdio:'inherit',shell:process.platform==='win32'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);

  if(role !== 'student'){
    for(const dependency of ['react','react-dom','react-router-dom','axios','clsx','lucide-react']){
      if(!existsSync(resolve(cwd,'node_modules',dependency,'package.json'))){
        throw new Error(`Missing portal-core peer dependency "${dependency}" in apps/${role}/node_modules after npm ci.`);
      }
    }

    console.log(`Installing @kormic/portal-core into apps/${role} without modifying its lockfile…`);
    const coreInstall=spawnSync(
      process.platform==='win32'?'npm.cmd':'npm',
      ['install','--no-save','--package-lock=false',resolve(root,'packages','portal-core')],
      {cwd,stdio:'inherit',shell:process.platform==='win32'}
    );
    if(coreInstall.error)throw coreInstall.error;
    if(coreInstall.status!==0)process.exit(coreInstall.status||1);
  }
}
