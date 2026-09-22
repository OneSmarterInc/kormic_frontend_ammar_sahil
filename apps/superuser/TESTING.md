# Automated portal checks

Use Node.js 22 and `npm ci`.

- `npm test`: existing Node auth/transport regressions plus Vitest/React Testing Library component tests.
- `npm run test:watch`: interactive component tests.
- `npx playwright install chromium` (Linux CI: add `--with-deps`).
- `npm run test:e2e`: build production assets, start an isolated preview server, and run Chromium browser tests.
- `npm run test:all`: all automated suites.
- `npm run lint`: complete source lint.

CI requires lint, both unit/component suites, production build, and browser tests. Failures block the job; traces/screenshots and the HTML report are uploaded on failure. Local reports: `npx playwright show-report`.

Browser tests exercise the real application, router, auth provider and HTTP client against deterministic, stateful API fixtures. Unexpected API calls fail tests. No production credentials, email delivery or database are used. These tests verify the browser contract, not Django permissions, real TOTP cryptography, cookie security attributes or deployed CORS; the backend suite and deployment smoke tests remain required.

Coverage includes password rejection, MFA rejection/success, enrollment routing, guest/role guards, and this portal's critical management flow. Fixtures reset per test. Access tokens must remain out of localStorage. An optional `E2E_CHANNEL=chrome` uses installed Chrome locally; CI uses Playwright's pinned Chromium.
