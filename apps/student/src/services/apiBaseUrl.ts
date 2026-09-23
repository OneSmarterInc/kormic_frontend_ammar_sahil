const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

/** Keep local browser requests same-site so SameSite=Lax auth cookies work. */
export function resolveApiBaseUrl(configuredUrl: string, browserHostname?: string): string {
  if (!browserHostname || !LOOPBACK_HOSTS.has(browserHostname)) return configuredUrl;
  // Local browser development must use the local Django API. A production
  // API here would bypass the local backend and break same-site cookie tests.
  return `http://${browserHostname}:8000/api`;
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
