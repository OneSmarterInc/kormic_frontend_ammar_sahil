/** Direct browser authentication. Refresh credentials are scoped to this tab. */
export const PORTALS = Object.freeze(['student', 'university', 'institute', 'superuser']);
export const isPortal = (value) => PORTALS.includes(value);
const refreshKey = (portal) => `kormic.refresh.${portal}`;

function getRefresh(portal) {
  try { return sessionStorage.getItem(refreshKey(portal)) || ''; } catch { return ''; }
}

function saveRefresh(portal, token) {
  if (typeof token !== 'string' || !token) return;
  try { sessionStorage.setItem(refreshKey(portal), token); }
  catch { throw new AuthError('Your browser blocked session storage. Allow it and sign in again.'); }
}

function clearRefresh(portal) {
  try { sessionStorage.removeItem(refreshKey(portal)); } catch { /* The tab has no stored session. */ }
}

export class AuthError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export function apiOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw new AuthError('Configure a valid backend origin.'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new AuthError('The backend must use HTTPS, except on localhost.');
  }
  if (url.username || url.password || url.search || url.hash || !['/', ''].includes(url.pathname)) {
    throw new AuthError('Use the backend origin only, without /api or credentials.');
  }
  return url.origin;
}

export function roleHome(user) {
  if (user?.role === "department" && /^[A-Za-z0-9_-]{1,128}$/.test(String(user.university_id ?? ""))) return `/university/#/university/${user.university_id}/agent-queries?tab=departments`;
  if (!isPortal(user?.role)) throw new AuthError('This account has no supported portal.');
  switch (user.role) {
    case 'student': return '/student/';
    case 'institute': return '/institute/#/institute/dashboard';
    case 'superuser': return '/superuser/#/admin/dashboard';
    case 'university': {
      const id = String(user.university_id ?? '');
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
        throw new AuthError('No valid university is assigned to this account. Contact your administrator.');
      }
      return `/university/#/university/${encodeURIComponent(id)}/dashboard`;
    }
  }
}

/** Only return to the authenticated role and, for universities, its own institution. */
export function safeDestination(user, next, origin = 'https://frontend.invalid') {
  const home = roleHome(user);
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || /[\\\r\n]/.test(next)) return home;
  let url;
  try { url = new URL(next, origin); } catch { return home; }
  if (url.origin !== new URL(origin).origin || url.username || url.password || url.search) return home;
  if (url.pathname !== `/${user.role}/`) return home;
  let route;
  try { route = decodeURIComponent(url.hash.slice(1)); } catch { return home; }
  if (/[\\\r\n]/.test(route) || route.split('/').some((part) => part === '..' || part === '.')) return home;
  if (user.role === 'student') return home; // Student onboarding chooses its next screen.
  const prefix = user.role === 'university'
    ? `/university/${user.university_id}/`
    : user.role === 'superuser' ? '/admin/' : '/institute/';
  if (!route.startsWith(prefix) || route.includes('?') || route.includes('#')) return home;
  return url.pathname + url.hash;
}

export function createAuthClient({ origin, fetchImpl = globalThis.fetch, timeoutMs = 30000 }) {
  const base = `${apiOrigin(origin)}/api`;
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError('Invalid timeout.');

  async function request(path, { method = 'GET', body, access, csrf } = {}) {
    if (!path.startsWith('/auth/')) throw new TypeError('Unsupported authentication path.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (access) headers.Authorization = `Bearer ${access}`;
    if (csrf) headers['X-CSRFToken'] = csrf;
    try {
      const response = await fetchImpl(base + path, {
        method, headers, credentials: 'omit', cache: 'no-store',
        redirect: 'error', signal: controller.signal,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      let data = {};
      if (response.status !== 204) {
        try { data = await response.json(); } catch {
          throw new AuthError('The backend returned an unreadable response.', response.status);
        }
      }
      if (!response.ok) {
        const text = data?.detail ?? data?.message ?? data?.error;
        const message = response.status >= 500 ? 'The service is temporarily unavailable. Please try again.'
          : response.status === 429 ? 'Too many attempts. Please wait before trying again.'
          : typeof text === 'string' && text.length <= 500 ? text
          : 'The request could not be completed. Check your details and try again.';
        throw new AuthError(message, response.status);
      }
      return data;
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError(controller.signal.aborted
        ? 'The request timed out. Please try again.'
        : 'Cannot connect to the backend. Check your connection and the server configuration.');
    } finally { clearTimeout(timer); }
  }

  async function confirmSession(portal) {
    if (!isPortal(portal)) throw new AuthError('Choose your account type.');
    const refresh = getRefresh(portal);
    if (!refresh) throw new AuthError('Your sign-in session is missing. Please sign in again.', 401);
    const session = await request('/auth/refresh/', {
      method: 'POST',
      body: { refresh },
    });
    if (typeof session.access !== 'string' || !session.access) throw new AuthError('The backend did not return an access token.');
    if (session.refresh) saveRefresh(portal, session.refresh);
    const user = await request('/auth/me/', { access: session.access });
    if (user?.role !== portal && !(portal === "university" && user?.role === "department")) {
      try { await request('/auth/logout/', { method: 'POST', access: session.access, body: { refresh } }); } catch { /* Still deny access. */ }
      clearRefresh(portal);
      throw new AuthError('This account is not authorized for the selected portal.', 403);
    }
    roleHome(user); // Validate institution assignment before leaving the login page.
    return user;
  }

  return Object.freeze({
    login: (portal, email, password) => {
      if (!isPortal(portal)) throw new AuthError('Choose your account type.');
      clearRefresh(portal);
      return request('/auth/login/', { method: 'POST', body: { portal, email: email.trim(), password } });
    },
    verifyTotp: async (portal, mfaToken, code) => {
      if (!isPortal(portal)) throw new AuthError('Choose your account type.');
      const result = await request('/auth/verify-totp/', { method: 'POST', body: { portal, mfa_token: mfaToken, code: code.trim() } });
      if (result.refresh) saveRefresh(portal, result.refresh);
      return result;
    },
    logout: async (portal) => {
      const refresh = getRefresh(portal);
      clearRefresh(portal);
      if (!refresh) return {};
      const session = await request('/auth/refresh/', { method: 'POST', body: { refresh } });
      return request('/auth/logout/', { method: 'POST', access: session.access, body: { refresh } });
    },
    confirmSession,
    enroll: (access) => request('/auth/totp/enroll/', { method: 'POST', access }),
    verifyEnrollment: (access, code) => request('/auth/totp/verify-enrollment/', { method: 'POST', access, body: { code: code.trim() } }),
    forgotPassword: (email) => request('/auth/forgot-password/', { method: 'POST', body: { email: email.trim() } }),
    verifyResetOtp: (email, otp) => request('/auth/reset-password/verify-otp/', { method: 'POST', body: { email: email.trim(), otp: otp.trim() } }),
    resetPassword: (resetToken, password) => request('/auth/reset-password/confirm/', { method: 'POST', body: { reset_token: resetToken, new_password: password } }),
  });
}
