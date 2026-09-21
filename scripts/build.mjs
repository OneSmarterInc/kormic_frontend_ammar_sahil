import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { apiOrigin } from '../shared/auth.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const loginOnly=process.argv.includes('--login-only');
if(existsSync(resolve(root,'.env')))process.loadEnvFile(resolve(root,'.env'));
if(!loginOnly&&!process.env.KORMIC_API_ORIGIN)throw new Error('Set KORMIC_API_ORIGIN in .env before the full build.');
const origin=apiOrigin(process.env.KORMIC_API_ORIGIN||'http://127.0.0.1:8000');
const out=resolve(root,loginOnly?'dist-login':'dist');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
await cp(resolve(root,'web'),out,{recursive:true});await cp(resolve(root,'shared'),resolve(out,'shared'),{recursive:true});
await writeFile(resolve(out,'config.js'),`window.KORMIC_CONFIG=Object.freeze(${JSON.stringify({apiOrigin:origin})});\n`);
async function command(cwd,packageName,args){
  const pkg=JSON.parse(await readFile(resolve(cwd,'node_modules',packageName,'package.json'),'utf8'));
  const bin=typeof pkg.bin==='string'?pkg.bin:pkg.bin[packageName];
  if(!bin)throw new Error(`No CLI for ${packageName}`);
  const result=spawnSync(process.execPath,[resolve(cwd,'node_modules',packageName,bin),...args],{
    cwd,stdio:'inherit',env:{...process.env,CI:'1',VITE_API_BASE_URL:origin,EXPO_PUBLIC_API_BASE_URL:origin+'/api'},
  });
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(`${packageName} build failed with status ${result.status}`);
}
if(!loginOnly){
  for(const role of ['university','institute','superuser']){
    const cwd=resolve(root,'apps',role);
    await command(cwd,'vite',['build','--base',`/${role}/`,'--outDir',resolve(out,role),'--emptyOutDir']);
  }
  await command(resolve(root,'apps/student'),'expo',['export','--platform','web','--output-dir',resolve(out,'student')]);
  // Preserve the existing /claim?token=… URL. Its assets are served from /student/.
  await mkdir(resolve(out,'claim'),{recursive:true});await cp(resolve(out,'student/index.html'),resolve(out,'claim/index.html'));
  // Existing Vite pages may reference this common sprite at the origin root.
  const icons=resolve(root,'apps/university/public/icons.svg');
  if(existsSync(icons))await cp(icons,resolve(out,'icons.svg'));
}
console.log(loginOnly?'Built login-only preview; portal bundles were NOT built.':'Built all four portal bundles and the shared login.');
