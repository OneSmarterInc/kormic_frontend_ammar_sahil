import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const base = resolve(root, 'dist');
const port = Number(process.env.PORT || 5173);
const types = {
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.svg':'image/svg+xml','.json':'application/json','.png':'image/png',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp',
  '.woff2':'font/woff2','.ttf':'font/ttf','.ico':'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }

  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://local.invalid').pathname); }
  catch { res.writeHead(400); res.end('Bad path'); return; }
  if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').includes('..')) {
    res.writeHead(400); res.end('Bad path'); return;
  }
  if (pathname.startsWith('/api/')) {
    res.writeHead(404, {'Content-Type':'application/json'});
    res.end('{"detail":"This is the frontend server, not the API."}');
    return;
  }

  if (['/', '/login', '/login/'].includes(pathname)) pathname = '/index.html';
  if (['/claim', '/claim/'].includes(pathname)) pathname = '/claim/index.html';

  const role = pathname.split('/')[1];
  const portal = ['student','university','institute','superuser'].includes(role);
  if (portal && pathname === `/${role}`) {
    res.writeHead(308, { Location: `/${role}/` }); res.end(); return;
  }

  let file = resolve(base, '.' + pathname);
  if (!file.startsWith(base + sep)) { res.writeHead(403); res.end(); return; }
  try {
    try { if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html'); }
    catch { if (portal && !extname(pathname)) file = resolve(base, role, 'index.html'); }
    const data = await readFile(file);
    res.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream'});
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); res.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Kormic unified frontend: http://127.0.0.1:${port}`));
