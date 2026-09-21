# Local student web authentication

Set `EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api` before starting Expo, then run `npx expo start --web --port 8081` with the Django backend on port 8000. Restart Expo after changing its environment.

The browser can open either `http://localhost:8081` or `http://127.0.0.1:8081`. When both the configured API and the page use loopback addresses, the student web client aligns the API hostname with the page hostname. Ports and protocols are preserved. Native Android/iOS and production API addresses are unchanged.

Mixing a `localhost` page with a `127.0.0.1` API makes the requests cross-site. The browser can then discard SameSite=Lax cookies, causing `CSRF Failed: CSRF cookie not set.` even though `/api/auth/web/csrf/` returned a token. The token header alone is insufficient: Django also requires the cookie.

Keep backend debug mode enabled only for local HTTP development. Its default origin allow-list includes both loopback names on port 8081. If `DJANGO_CORS_ALLOWED_ORIGINS` is overridden, include the exact student page origin. Production web and API domains must share a site and use HTTPS with explicit trusted origins; do not disable CSRF or weaken cookies to work around a hostname mismatch.
