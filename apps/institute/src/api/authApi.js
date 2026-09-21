import client, { PORTAL, requestRefresh } from "./client.js";

/** POST /api/auth/register/ */
export const register = (payload) => client.post("/auth/web/register/", { ...payload, portal: PORTAL }).then((r) => r.data);

/** POST /api/auth/login/ — step 1 (password) */
export const login = (email, password) =>
  client.post("/auth/web/login/", { email, password, portal: "institute" }).then((r) => r.data);

/** POST /api/auth/totp/enroll/ — Authorization header attached automatically by the client */
export const totpEnroll = () => client.post("/auth/totp/enroll/").then((r) => r.data);

/** POST /api/auth/totp/verify-enrollment/ */
export const totpVerifyEnrollment = (code) =>
  client.post("/auth/totp/verify-enrollment/", { code }).then((r) => r.data);

/** POST /api/auth/verify-totp/ — step 2 (TOTP or backup code) */
export const verifyTotp = (mfaToken, code) =>
  client.post("/auth/web/verify-totp/", { mfa_token: mfaToken, code, portal: "institute" }).then((r) => r.data);

/** POST /api/auth/refresh/ */
export const refresh = () => requestRefresh();

/** POST /api/auth/logout/ */
export const logout = () =>
  client.post("/auth/web/logout/", { portal: PORTAL }).then((r) => r.data);

/** GET /api/auth/me/ */
export const me = () => client.get("/auth/me/").then((r) => r.data);

/** GET /api/auth/github/connect/ — returns { authorize_url } for a full browser navigation */
export const githubConnect = () => client.get("/auth/github/connect/").then((r) => r.data);

/** GET /api/auth/github/status/ */
export const githubStatus = () => client.get("/auth/github/status/").then((r) => r.data);

/** DELETE /api/auth/github/disconnect/ */
export const githubDisconnect = () => client.delete("/auth/github/disconnect/").then((r) => r.data);
