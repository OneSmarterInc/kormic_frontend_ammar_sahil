const BACKEND_ORIGIN = 'https://backend.kormic.ai';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function upstreamUrl(requestUrl) {
  const incoming = new URL(requestUrl, 'https://frontend.invalid');
  return new URL(`${incoming.pathname}${incoming.search}`, BACKEND_ORIGIN);
}

function requestHeaders(request) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (HOP_BY_HOP_HEADERS.has(name.toLowerCase()) || value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else {
      headers.set(name, value);
    }
  }
  headers.set('x-forwarded-host', request.headers.host || '');
  headers.set('x-forwarded-proto', 'https');
  return headers;
}

async function requestBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

function responseCookies(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const cookie = headers.get('set-cookie');
  return cookie ? [cookie] : [];
}

export default async function handler(request, response) {
  try {
    const upstream = await fetch(upstreamUrl(request.url), {
      method: request.method,
      headers: requestHeaders(request),
      body: await requestBody(request),
      redirect: 'manual',
    });

    for (const [name, value] of upstream.headers.entries()) {
      const lower = name.toLowerCase();
      if (HOP_BY_HOP_HEADERS.has(lower) || lower === 'set-cookie') continue;
      response.setHeader(name, value);
    }

    const cookies = responseCookies(upstream.headers);
    if (cookies.length) response.setHeader('set-cookie', cookies);

    const location = upstream.headers.get('location');
    if (location?.startsWith(BACKEND_ORIGIN)) {
      response.setHeader('location', location.slice(BACKEND_ORIGIN.length) || '/');
    }

    response.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error('Kormic backend proxy failed', error);
    response.status(502).json({ detail: 'The Kormic backend is temporarily unavailable.' });
  }
}

