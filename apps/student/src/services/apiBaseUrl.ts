const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Keep local browser requests same-site so SameSite=Lax auth cookies work. */
export function resolveApiBaseUrl(configuredUrl: string, browserHostname?: string, localUrl?: string): string {
  // Unified web hosting supplies this before the bundle executes. Native builds
  // keep their Expo configuration; browser requests use the shared frontend .env.
  const runtime = (globalThis as typeof globalThis & { KORMIC_CONFIG?: { apiOrigin?: string } }).KORMIC_CONFIG;
  if (browserHostname && runtime?.apiOrigin) return runtime.apiOrigin.replace(/\/$/, '') + '/api';
  if (!browserHostname || !LOOPBACK_HOSTS.has(browserHostname)) return configuredUrl;
  configuredUrl = localUrl || configuredUrl;
  let url: URL;
  try { url = new URL(configuredUrl); } catch { return configuredUrl; }
  if (!LOOPBACK_HOSTS.has(url.hostname)) return configuredUrl;
  url.hostname = browserHostname;
  return url.toString();
}
