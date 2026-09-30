import { brotliCompressSync, gzipSync, constants } from 'node:zlib';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { apiOrigin } from '../shared/auth.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const base = resolve(root, 'dist');
const port = Number(process.env.PORT || 5173);
// Optional same-origin API for local HTTPS tunnels. Only a loopback backend
// is permitted; this is never a general-purpose forwarding proxy.
const backend = process.env.KORMIC_PROXY_BACKEND ? new URL(process.env.KORMIC_PROXY_BACKEND) : null;
if (backend && (backend.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(backend.hostname))) {
  throw new Error('KORMIC_PROXY_BACKEND must be a local HTTP backend.');
}
const types = {
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.svg':'image/svg+xml','.json':'application/json','.png':'image/png',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp',
  '.woff2':'font/woff2','.ttf':'font/ttf','.ico':'image/x-icon'
};

const assetCache = new Map();
const server = http.createServer(async (req, res) => {
  if (req.url.split('?')[0] === '/config.js' && ['GET', 'HEAD'].includes(req.method)) {
    try {
      const env = parseEnv(await readFile(resolve(root, '.env'), 'utf8'));
      const publicOrigin = apiOrigin(env.KORMIC_API_ORIGIN_PUBLIC);
      const localOrigin = apiOrigin(env.KORMIC_API_ORIGIN_LOCAL);
      const script = `(() => { const local = ['localhost','127.0.0.1','[::1]'].includes(location.hostname); const url = new URL(local ? ${JSON.stringify(localOrigin)} : ${JSON.stringify(publicOrigin)}); if (local && ['localhost','127.0.0.1','[::1]'].includes(url.hostname)) url.hostname = location.hostname; window.KORMIC_CONFIG = Object.freeze({apiOrigin: url.origin}); })();`;
      res.writeHead(200, {'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store'});
      res.end(req.method === 'HEAD' ? undefined : script);
    } catch {
      res.writeHead(503, {'Content-Type': 'application/javascript', 'Cache-Control': 'no-store'});
      res.end('throw new Error("Configure the frontend .env API origins.");');
    }
    return;
  }
  if (backend && req.url.startsWith('/api/')) {
    const headers = { ...req.headers, host: backend.host, 'x-forwarded-proto': 'https' };
    delete headers['x-forwarded-host'];
    const upstream = http.request({ hostname: backend.hostname, port: backend.port, path: req.url, method: req.method, headers }, response => {
      res.writeHead(response.statusCode, response.headers);
      response.pipe(res);
    });
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end('{"detail":"The local backend is unavailable."}');
    });
    req.on('aborted', () => upstream.destroy());
    req.pipe(upstream);
    return;
  }
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
  if (['/claim', '/claim/', '/claim/index.html'].includes(pathname)) {
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    pathname = '/claim/index.html';
  }

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
    const info = await stat(file);
    const extension = extname(file);
    const versioned = /[\\/](assets|_expo)[\\/]/.test(file) && /[-.][a-zA-Z0-9_-]{8,}\.(js|css|woff2|ttf|png|svg|webp)$/.test(file);
    const compressible = ['.js', '.mjs', '.css', '.svg', '.json'].includes(extension);
    const accepted = (req.headers['accept-encoding'] || '').split(',').map(part => {
      const [name, ...params] = part.trim().split(';');
      const q = params.find(param => param.trim().startsWith('q='));
      return { name, quality: q ? Number(q.trim().slice(2)) : 1 };
    });
    const encoding = compressible ? ['br', 'gzip'].find(name => accepted.some(item => item.name === name && item.quality > 0)) : undefined;
    const key = `${file}:${info.mtimeMs}:${info.size}:${encoding || 'identity'}`;
    let data = versioned ? assetCache.get(key) : undefined;
    if (!data) {
      data = await readFile(file);
      if (encoding === 'br') data = brotliCompressSync(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 4 } });
      if (encoding === 'gzip') data = gzipSync(data);
      if (versioned) {
        if (assetCache.size >= 128) assetCache.clear();
        assetCache.set(key, data);
      }
    }
    res.writeHead(200, {
      'Content-Type': types[extension] || 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': versioned ? 'public, max-age=31536000, immutable' : 'no-store, no-cache, must-revalidate',
      ...(compressible ? { Vary: 'Accept-Encoding' } : {}),
      ...(encoding ? { 'Content-Encoding': encoding } : {}),
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); res.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Kormic unified frontend: http://127.0.0.1:${port}`));
