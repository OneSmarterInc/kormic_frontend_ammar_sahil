# Acceptance status and remaining verification

## Evidence from this implementation session

- `node --test tests/auth.test.mjs`: 47 passed, 0 failed.
- `python -m unittest discover -s tests -p "*_test.py"`: 6 passed, 0 failed.
- JavaScript syntax checks for login, auth client, build/setup/preview scripts: passed.
- Python import utility compilation: passed.
- `node scripts/build.mjs --login-only`: passed.
- Full source import: not completed in this environment.
- Full portal builds and their existing test suites: not run.
- Browser preview navigation: blocked (`ERR_BLOCKED_BY_ADMINISTRATOR`). No browser-pass claim is made.
- Live backend password/MFA/account tests: not run; no test-account credentials were supplied.

The adapter tests use minimal fixtures. They verify transformation mechanics and API-file preservation, not the behavior of complete Student, University, Institute or Superuser portals.

## Required before deployment

1. Import every source at its pinned commit. Review `IMPORT_COMPLETE.json`, source counts, secret-screen results and the complete Git diff. All original API/service files must retain their original hashes.
2. Install each portal using its original lockfile. Run its existing tests/type checks where provided, then build every portal under its configured prefix. Missing imports, assets, native-only modules or dependency conflicts must be resolved before deployment.
3. Use real designated test accounts for all four roles. Verify password failure, MFA failure, backup codes, enrollment, reset codes, logout, session expiry and role mismatch. Confirm no tokens enter URLs, localStorage or sessionStorage.
4. Refresh a signed-in portal page; open a nested route directly; exercise browser back/forward before and after logout. The correct portal must restore from its own cookie; unauthorized data requests must remain denied by the server.
5. Test student registration and the original trusted `/claim?token=…` links. Exercise the Student profile/onboarding/chat flows and the native application separately. Native authentication was intentionally not redesigned.
6. Test University owned-institution access, Institute roster upload/invitations/downloads, and Superuser management screens against the existing backend. Verify actual network URLs and payloads, not just displayed pages.
7. Use the final same-site HTTPS frontend domain and configure backend CORS/CSRF trust. Verify cookie acceptance, `/auth/web/refresh/`, deep-link hosting and missing-asset 404 behavior there.

A successful login-only build does not satisfy these checks.
