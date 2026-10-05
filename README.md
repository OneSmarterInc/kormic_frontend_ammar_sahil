# Kormic Unified Frontend

This repository is the consolidated Kormic browser frontend. It builds **one deployable `dist/` directory** and exposes one authentication entry: **Kormic Login**.

## Login

Open `/login` (or `/`). The **Login as** selector contains:

- Student
- University
- Institute
- Administrator

The login keeps the existing backend authentication contract: CSRF-protected browser login, portal-specific HttpOnly refresh cookies, MFA/TOTP, password reset and `/auth/me/`. No backend endpoint changes are required.

After authentication the server-confirmed role routes to:

| Role | Route |
| --- | --- |
| Student | `/student/` |
| University | `/university/#/university/{university_id}/dashboard` |
| Institute | `/institute/#/institute/dashboard` |
| Administrator | `/superuser/#/admin/dashboard` |

University routing uses the university ID returned by the backend. The selector alone never grants a role.

## Single-frontend structure

The four existing browser applications are retained under `apps/` so their feature code and dependency sets do not interfere with each other, but they are **not separate deployments**. One root build creates one static site:

```
dist/
  index.html          # Kormic Login
  student/
  university/
  institute/
  superuser/
  claim/
  shared/
```

All five entry points run on the same frontend origin. Existing role-specific API modules are preserved; the unified integration changes only browser entry/routing plus Student web logout/entry behavior.

The Student repository also contains Android-native Gradle resources. Those are intentionally not duplicated here because this repository is the consolidated **browser frontend**; the original Student repository remains the source for native Android packaging.

## Build

Requirements: Node 22.16+.

```powershell
npm run setup
Copy-Item .env.example .env
# Set KORMIC_API_ORIGIN_LOCAL and KORMIC_API_ORIGIN_PUBLIC in .env
npm test
npm run build
npm run preview
```

The root `.env` contains `KORMIC_API_ORIGIN_LOCAL` and `KORMIC_API_ORIGIN_PUBLIC`, both without `/api`. Browser visits on localhost, 127.0.0.1, or ::1 select LOCAL; other hosts select PUBLIC. Native builds use PUBLIC. The build passes both URLs to all portals. Rebuild after editing either value. The real `.env` is Git-ignored.

Standalone Expo starts with `npm start` and reads the root `.env`. EAS cloud builds need `EXPO_PUBLIC_API_BASE_URL` and optionally `EXPO_PUBLIC_LOCAL_API_BASE_URL` configured in their build environment.

For local auth-cookie testing use the same hostname on frontend and backend, for example `127.0.0.1:5173` and `127.0.0.1:8000`.

## Deployment

`vercel.json` builds and publishes the Student, Institute, University, and Superuser portals as one static frontend distribution. Configure `KORMIC_API_ORIGIN_LOCAL` and `KORMIC_API_ORIGIN_PUBLIC` as Vercel project environment variables (available during build), or in the ignored local `.env` file for local builds. Values are backend origins without `/api`. The Student app's installed name is `Kormic`, with its Kormic launcher icon configured in `apps/student/app.json`.

On `*.vercel.app`, browser API requests use the same-origin `/api/*` route in `vercel.json`, which proxies to `https://backend.kormic.ai/api/*`. This keeps secure, host-only refresh cookies first-party even in browsers that block third-party cookies. The backend CORS/CSRF allow-list must include the exact Vercel production origin. Non-Vercel production hosts continue to use `KORMIC_API_ORIGIN_PUBLIC` directly and therefore need a same-site HTTPS hostname such as `app.kormic.ai` when cookie sessions are used.

The existing Student claim route remains `/claim?token=...` and is served by the Student web bundle.

## Validation

GitHub Actions installs every portal from its original lockfile, then runs:

- unified Kormic Login and role-routing tests;
- Student TypeScript typecheck and Jest tests;
- University tests;
- Institute tests;
- Administrator tests;
- one combined production build;
- distribution checks for all role entry points.

See `docs/ACCEPTANCE.md` for the latest verified run and the remaining live-environment checks.
