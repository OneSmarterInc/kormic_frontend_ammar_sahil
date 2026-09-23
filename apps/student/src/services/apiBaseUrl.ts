const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Keep local browser requests same-site so SameSite=Lax auth cookies work. */
export function resolveApiBaseUrl(configuredUrl: string, browserHostname?: string): string {
  if (!browserHostname || !LOOPBACK_HOSTS.has(browserHostname)) return configuredUrl;
  return `http://${browserHostname}:8000/api`;
}
