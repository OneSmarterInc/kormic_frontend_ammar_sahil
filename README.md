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
# Set KORMIC_API_ORIGIN in .env, e.g. https://backend.kormic.ai
npm test
npm run build
npm run preview
```

`KORMIC_API_ORIGIN` is the backend origin only, without `/api`.

For local auth-cookie testing use the same hostname on frontend and backend, for example `127.0.0.1:5173` and `127.0.0.1:8000`.

## Deployment

`vercel.json` builds and publishes the single `dist/` directory. Configure `KORMIC_API_ORIGIN` in the deployment environment and ensure the deployed frontend origin is allowed by the backend CORS/CSRF settings.

Production browser auth requires same-site HTTPS with the backend because the existing refresh cookies are secure, host-only and `SameSite=Lax`.

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
