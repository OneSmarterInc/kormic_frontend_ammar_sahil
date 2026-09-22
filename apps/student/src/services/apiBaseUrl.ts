const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

/** Keep local browser requests same-site so SameSite=Lax auth cookies work. */
export function resolveApiBaseUrl(configuredUrl: string, browserHostname?: string): string {
  if (!browserHostname || !LOOPBACK_HOSTS.has(browserHostname)) return configuredUrl;
  try {
    const url = new URL(configuredUrl);
    if (!LOOPBACK_HOSTS.has(url.hostname) || !['http:', 'https:'].includes(url.protocol)) {
      return configuredUrl;
    }
    url.hostname = browserHostname;
    return url.toString().replace(/\/$/, '');
  } catch {
    return configuredUrl;
  }
}
