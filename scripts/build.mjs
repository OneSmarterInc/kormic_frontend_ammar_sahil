import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { backendOrigin } from './backend-config.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const origin=backendOrigin();
const localOrigin=backendOrigin('LOCAL');
const out=resolve(root,'dist');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
await cp(resolve(root,'web'),out,{recursive:true});await cp(resolve(root,'shared'),resolve(out,'shared'),{recursive:true});
await writeFile(resolve(out,'config.js'), `(() => {
  const loopback = ['localhost', '127.0.0.1', '[::1]'];
  const local = loopback.includes(window.location.hostname);
  const vercel = window.location.hostname.endsWith('.vercel.app');
  const url = new URL(local ? ${JSON.stringify(localOrigin)} : vercel ? window.location.origin : ${JSON.stringify(origin)});
  if (local && loopback.includes(url.hostname)) url.hostname = window.location.hostname;
  window.KORMIC_CONFIG = Object.freeze({apiOrigin: url.origin});
})();\n`);
async function command(cwd,packageName,args){
  const pkg=JSON.parse(await readFile(resolve(cwd,'node_modules',packageName,'package.json'),'utf8'));
  const bin=typeof pkg.bin==='string'?pkg.bin:pkg.bin[packageName];
  if(!bin)throw new Error(`No CLI for ${packageName}`);
  const result=spawnSync(process.execPath,[resolve(cwd,'node_modules',packageName,bin),...args],{
    cwd,stdio:'inherit',env:{...process.env,CI:'1',VITE_API_BASE_URL:origin,EXPO_PUBLIC_API_BASE_URL:origin+'/api',EXPO_PUBLIC_LOCAL_API_BASE_URL:localOrigin+'/api'},
  });
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(`${packageName} build failed with status ${result.status}`);
}
for(const role of ['university','institute','superuser']){
    const cwd=resolve(root,'apps',role);
    await command(cwd,'vite',['build','--base',`/${role}/`,'--outDir',resolve(out,role),'--emptyOutDir']);
}
// Metro can reuse transformed modules containing the previous inlined API URL.
// Clear its cache so changing the frontend .env also updates student auth.
await command(resolve(root,'apps/student'),'expo',['export','--clear','--platform','web','--output-dir',resolve(out,'student')]);
const studentHtml = resolve(out, 'student/index.html');
await writeFile(studentHtml, (await readFile(studentHtml, 'utf8')).replace('<head>', '<head><script src="/config.js"></script>'));
// Preserve the existing /claim?token=ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ URL. Its assets are served from /student/.
await mkdir(resolve(out,'claim'),{recursive:true});await cp(resolve(out,'student/index.html'),resolve(out,'claim/index.html'));
// Existing Vite pages may reference this common sprite at the origin root.
const icons=resolve(root,'apps/university/public/icons.svg');
if(existsSync(icons))await cp(icons,resolve(out,'icons.svg'));
console.log('Built Kormic as one frontend distribution.');
