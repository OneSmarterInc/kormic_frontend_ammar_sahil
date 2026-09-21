# Kormic unified frontend — integration package

**Status: the four-repository merge is not complete.** The shared login code and import/build tooling are implemented, but the full original portals have not been imported and their production builds have not been verified. Do not deploy a login-only build as the finished application.

## Implemented and checked

- A single browser login for Student, University, Institute and Administrator accounts.
- Existing password, MFA, TOTP enrollment, password-reset, CSRF, cookie refresh and logout endpoint paths.
- Redirect decisions based on the server-returned role, not just the account-type selector.
- University redirects restricted to the university assigned by the server.
- No access, refresh, MFA or reset tokens written to browser storage or redirect URLs.
- 47 authentication/routing unit tests and 6 import-adapter fixture tests passed.
- The login-only static build completed. Local browser navigation was blocked by the execution environment; full browser and live-backend sign-ins are not verified.

## Complete the original-source import

Requirements: Git authenticated to the four source repositories, Python 3.10+ and Node 22.16+.

From this repository's root:

```powershell
python scripts/import_portals.py
npm run setup
npm test
python -m unittest discover -s tests -p "*_test.py"
Copy-Item .env.example .env
npm run build
npm run preview
```

Review `.env` before building. Set `KORMIC_API_ORIGIN` to the backend **origin only**, without `/api`. The build forwards the same backend to all four portals, respecting their existing API-base conventions.

The import reads the exact commits in `SOURCE_MANIFEST.json`. It does not modify the source repositories, push code, change permissions, or touch the backend. It imports all tracked files and original lockfiles, checks Git blob hashes, rejects obvious credential/environment-secret files, applies narrowly scoped browser-entry changes, and checks that no other original source files changed. The checks are safeguards, not a complete secret audit.

Existing local edits cause a stop rather than an overwrite. A pre-existing partial `apps/` folder is retained as `apps.before-import/`. Subsequent re-imports are blocked once `IMPORT_COMPLETE.json` exists.

Existing local clones can be used without downloading them again:

```powershell
python scripts/import_portals.py --repos-dir D:\KormicSources
```

That directory must contain the four repositories under their original names and must contain the pinned commits.

After a successful full import, build, and browser review, commit the resulting `apps/`, `SOURCE_FILES.json` and `IMPORT_COMPLETE.json` and push to `main`. Importing is not itself proof that all application features pass.

## Entry routes

| Account | Unified browser destination |
|---|---|
| Student | `/student/` — existing student session/onboarding logic chooses the screen |
| University | `/university/#/university/{server_assigned_id}/dashboard` |
| Institute | `/institute/#/institute/dashboard` |
| Administrator | `/superuser/#/admin/dashboard` |

The existing portal route trees and API/service files are retained. Separate bundles avoid mixing the Student application's Expo/React Native dependencies with the Vite portals. The account-type selector is necessary because the existing browser API requires a `portal` value before password verification; no new role-discovery endpoint is added.

`/claim?token=…` must serve the Student bundle while keeping the original browser URL. The existing claim-link allowlist permits production links on `app.kormic.ai` and `backend.kormic.ai`; an arbitrary new frontend hostname is not automatically supported.

## Deployment requirements

Host the frontend and backend on same-site HTTPS domains, for example `app.kormic.ai` and `backend.kormic.ai`, with the frontend origin allowed by the backend's CORS and CSRF configuration. An unrelated preview domain is not equivalent because the existing refresh cookies use `SameSite=Lax`. No backend endpoint changes are included.

Use one built `dist/` directory. The bundled preview server supports the four portal prefixes and `/claim`. It never returns frontend HTML for `/api/` requests or missing JavaScript assets. This preview server is not an API proxy.

For local testing use the same hostname on both sides, for example `127.0.0.1:5173` and `127.0.0.1:8000`, rather than mixing `localhost` and `127.0.0.1`.

## Login-only development

```powershell
npm test
npm run build:login
npm run dev:login
```

This preview intentionally returns an unavailable response for portal pages instead of pretending that an unbuilt portal is functioning. `build:login` writes `dist-login/`, not the complete deployment directory.

## Remaining acceptance checks

See `docs/ACCEPTANCE.md`. Full portal production builds, existing portal suites, live MFA sign-ins for each role, refresh/logout/back-navigation, student signup/claim flows, uploads, and role-specific data requests still require verification after the full source import.
