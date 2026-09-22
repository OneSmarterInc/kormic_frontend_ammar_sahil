import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearAuth,
  getCachedUser,
  setAccessToken,
  setCachedUser,
} from "./tokenStorage.js";

export function createPortalAuth(authApi) {
  const AuthContext = createContext(null);

  function statusForUser(user) {
    if (!user) return "guest";
    return user.totp_enrolled ? "authenticated" : "must_enroll_totp";
  }

  function AuthProvider({ children }) {
    const [user, setUser] = useState(() => getCachedUser());
    const [status, setStatus] = useState("initializing");

    useEffect(() => {
      let active = true;
      authApi.refresh().then(() => authApi.me())
        .then((freshUser) => {
          if (!active) return;
          setUser(freshUser);
          setCachedUser(freshUser);
          setStatus(statusForUser(freshUser));
        })
        .catch(() => {
          if (!active) return;
          clearAuth();
          setUser(null);
          setStatus("guest");
        });
      return () => { active = false; };
    }, []);

    useEffect(() => {
      const onExpired = () => {
        setUser(null);
        setStatus("guest");
      };
      window.addEventListener("kormic:auth-expired", onExpired);
      return () => window.removeEventListener("kormic:auth-expired", onExpired);
    }, []);

    const storeMustEnroll = useCallback((res) => {
      setAccessToken(res.access);
      setCachedUser(res.user);
      setUser(res.user);
      setStatus("must_enroll_totp");
    }, []);

    const registerAccount = useCallback(async (payload) => {
      const res = await authApi.register(payload);
      storeMustEnroll(res);
      return res.user;
    }, [storeMustEnroll]);

    const loginWithPassword = useCallback(async (email, password) => {
      const res = await authApi.login(email, password);
      if (res.must_enroll_totp) {
        storeMustEnroll(res);
        return { mustEnrollTotp: true };
      }
      return { totpRequired: true, mfaToken: res.mfa_token };
    }, [storeMustEnroll]);

    const completeTotpLogin = useCallback(async (mfaToken, code) => {
      const res = await authApi.verifyTotp(mfaToken, code);
      setAccessToken(res.access);
      setCachedUser(res.user);
      setUser(res.user);
      setStatus("authenticated");
      return res.user;
    }, []);

    const completeTotpEnrollment = useCallback((res) => {
      if (res?.access) setAccessToken(res.access);
      if (res?.user) {
        setCachedUser(res.user);
        setUser(res.user);
      }
    }, []);

    const refreshUser = useCallback(async () => {
      const freshUser = await authApi.me();
      setCachedUser(freshUser);
      setUser(freshUser);
      setStatus(statusForUser(freshUser));
      return freshUser;
    }, []);

    const logout = useCallback(async () => {
      clearAuth();
      try {
        await authApi.logout();
      } catch {
        // Local access is cleared even if the server is unavailable.
      }
      setUser(null);
      setStatus("guest");
    }, []);

    const value = useMemo(() => ({
      user,
      status,
      registerAccount,
      loginWithPassword,
      completeTotpLogin,
      completeTotpEnrollment,
      refreshUser,
      logout,
    }), [user, status, registerAccount, loginWithPassword, completeTotpLogin, completeTotpEnrollment, refreshUser, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
  }

  return { AuthProvider, useAuth };
}
