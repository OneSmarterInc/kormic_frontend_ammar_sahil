function queryTokens(query: string): string[] {
  return query.split('&').flatMap(pair => {
    const separator = pair.indexOf('=');
    const key = separator < 0 ? pair : pair.slice(0, separator);
    const value = separator < 0 ? '' : pair.slice(separator + 1);
    return decodeURIComponent(key.replace(/\+/g, ' ')) === 'token'
      ? [decodeURIComponent(value.replace(/\+/g, ' '))] : [];
  });
}

/** Both cold-start and running-app links pass through this allowlist.
 * Do not use the RN URL shim: its hostname/pathname only parse HTTP(S), so
 * a browser/Jest-only test can pass while custom schemes fail on Android/iOS.
 */
export function getClaimTokenFromUrl(value?: string | null): string {
  if (!value) return '';
  try {
    const parts = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]+)([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/i.exec(value.trim());
    if (!parts) return '';
    const scheme = parts[1]?.toLowerCase();
    const authority = parts[2]?.toLowerCase() ?? '';
    const path = parts[3];
    const claimPath = path === '/claim' || path === '/claim/';
    const productionLink = scheme === 'https' &&
      /^(app|backend)\.kormic\.ai(?::443)?$/.test(authority) && claimPath;
    const developmentLink = __DEV__ && (scheme === 'http' || scheme === 'https') &&
      /^(localhost|127\.0\.0\.1|10\.0\.2\.2)(?::[0-9]{1,5})?$/.test(authority) && claimPath;
    const schemeLink = scheme === 'kormicstudent' && authority === 'claim' &&
      (path === '' || path === '/');
    if (!productionLink && !developmentLink && !schemeLink) return '';

    const tokens = queryTokens(parts[4] ?? '');
    // Accept old #token= links only on the same explicitly trusted claim route.
    if (tokens.length === 0 && parts[5]) {
      const fragment = parts[5];
      tokens.push(...queryTokens(fragment.includes('?') ? fragment.slice(fragment.indexOf('?') + 1) : fragment));
    }
    if (tokens.length !== 1) return '';
    const token = tokens[0]?.trim() ?? '';
    if (token.length > 2048 || [...token].some(char => char.charCodeAt(0) < 32)) return '';
    return token;
  } catch {
    return '';
  }
}
