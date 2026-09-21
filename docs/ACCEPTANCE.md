# Unified Frontend Acceptance

## Automated validation

The integrated source at commit `5cf7947224473dadea09b514864a2474f4d59180` passed GitHub Actions run `35579615807`:

- pinned dependency installation: passed;
- unified Kormic Login/auth-routing tests: passed;
- Student TypeScript typecheck: passed;
- Student Jest suite: passed;
- University test suite: passed;
- Institute test suite: passed;
- Administrator test suite: passed;
- single `dist/` production build: passed;
- unified distribution verification: passed.

All original web-source paths are present in the consolidated repository: Student 131/131 browser/Expo files (excluding the Android-native Gradle tree), University 80/80, Institute 54/54, and Administrator 74/74. The original repositories were not modified.

The integration tests also assert the existing authentication endpoint contract and portal-specific API base behavior.

## Live deployment acceptance

These checks require deployed frontend/backend configuration and designated test accounts, so they are not simulated by CI:

1. Sign in once through Kormic Login as each of the four roles and confirm the correct role dashboard.
2. Verify TOTP, backup code, password reset, logout, refresh after page reload, and session expiry.
3. Verify browser back/forward after logout cannot restore protected content.
4. Verify University cannot navigate into another university ID.
5. Verify Institute roster upload/invite/download workflows and Administrator management workflows.
6. Verify Student signup, `/claim?token=...`, onboarding, profile, chat and notification flows.
7. Confirm the final frontend origin is in backend CORS/CSRF configuration and is same-site HTTPS with the API.

These are environment/credential acceptance checks, not source-integration gaps.
