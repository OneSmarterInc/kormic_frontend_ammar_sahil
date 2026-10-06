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

export default async function proxy(request) {
  const incoming = new URL(request.url);
  const upstreamUrl = new URL(`${incoming.pathname}${incoming.search}`, BACKEND_ORIGIN);
  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP_HEADERS) headers.delete(name);
  headers.set('x-forwarded-host', incoming.host);
  headers.set('x-forwarded-proto', 'https');

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await request.arrayBuffer(),
      redirect: 'manual',
    });

    const responseHeaders = new Headers(upstream.headers);
    for (const name of HOP_BY_HOP_HEADERS) responseHeaders.delete(name);
    const location = responseHeaders.get('location');
    if (location?.startsWith(BACKEND_ORIGIN)) {
      responseHeaders.set('location', location.slice(BACKEND_ORIGIN.length) || '/');
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Kormic backend proxy failed', error);
    return Response.json(
      { detail: 'The Kormic backend is temporarily unavailable.' },
      { status: 502 },
    );
  }
}

