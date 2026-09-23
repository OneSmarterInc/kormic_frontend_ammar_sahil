const HANDOFF_KEY = 'kormic.web-session-handoff';
const MAX_AGE_MS = 60_000;

type WebSessionHandoff = {
  access: string;
  createdAt: number;
};

export function saveWebSessionHandoff(access: string) {
  if (typeof window === 'undefined' || !access) return;
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ access, createdAt: Date.now() }));
  } catch {
    // Session storage can be unavailable in privacy-restricted browsers.
  }
}

export function consumeWebSessionHandoff(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    sessionStorage.removeItem(HANDOFF_KEY);
    if (!raw) return undefined;
    const handoff = JSON.parse(raw) as Partial<WebSessionHandoff>;
    if (typeof handoff.access !== 'string' || !handoff.access || typeof handoff.createdAt !== 'number') {
      return undefined;
    }
    if (Date.now() - handoff.createdAt > MAX_AGE_MS || handoff.createdAt > Date.now() + 5_000) {
      return undefined;
    }
    return handoff.access;
  } catch {
    try { sessionStorage.removeItem(HANDOFF_KEY); } catch { /* Ignore storage failures. */ }
    return undefined;
  }
}
