import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as authApi from "../api/authApi";
import {
  clearAuth,
  getCachedUser,
  setAccessToken,
  setCachedUser,
} from "../lib/tokenStorage";

const AuthContext = createContext(null);

function statusForUser(user) {
  if (!user) return "guest";
  return user.totp_enrolled ? "authenticated" : "must_enroll_totp";
}

export function AuthProvider({ children }) {
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


  // Shared by register and login's "somehow still not enrolled" edge case — both
  // hand back the same {access, user, must_enroll_totp: true} shape.
  const storeMustEnroll = (res) => {
    setAccessToken(res.access);
    setCachedUser(res.user);
    setUser(res.user);
    setStatus("must_enroll_totp");
  };

  const registerAccount = useCallback(async (payload) => {
    const res = await authApi.register(payload);
    storeMustEnroll(res);
    return res.user;
  }, []);

  const loginWithPassword = useCallback(async (email, password) => {
    const res = await authApi.login(email, password);
    if (res.must_enroll_totp) {
      storeMustEnroll(res);
      return { mustEnrollTotp: true };
    }
    return { totpRequired: true, mfaToken: res.mfa_token };
  }, []);

  const completeTotpLogin = useCallback(async (mfaToken, code) => {
    const res = await authApi.verifyTotp(mfaToken, code);
    setAccessToken(res.access);
    setCachedUser(res.user);
    setUser(res.user);
    setStatus("authenticated");
    return res.user;
  }, []);

  // Enrollment keeps access in memory; the subsequent MFA login sets the refresh cookie.
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
      // Local access is cleared even if offline; server expiry still applies.
    }
    setUser(null);
    setStatus("guest");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        registerAccount,
        loginWithPassword,
        completeTotpLogin,
        completeTotpEnrollment,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
