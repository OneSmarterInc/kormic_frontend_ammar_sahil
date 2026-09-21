import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LogIn, ShieldCheck } from "lucide-react";
import UniversityAuthShell from "../../components/auth/UniversityAuthShell";
import { Field, Input } from "../../components/common/Input";
import Button from "../../components/common/Button";
import ErrorBanner from "../../components/common/ErrorBanner";
import { useAuth } from "../../context/AuthContext";
import { useAction } from "../../hooks/useAsync";
import { roleHome } from "../../lib/constants";

export default function UniversityLoginPage() {
  const { status, user, loginWithPassword, completeTotpLogin } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [code, setCode] = useState("");

  const {
    execute: submitPassword,
    loading: passwordLoading,
    error: passwordError,
  } = useAction(() => loginWithPassword(email, password));

  const {
    execute: submitTotp,
    loading: totpLoading,
    error: totpError,
  } = useAction(() => completeTotpLogin(mfaToken, code));

  if (status === "authenticated") return <Navigate to={roleHome(user)} replace />;
  if (status === "must_enroll_totp") return <Navigate to="/totp/enroll" replace />;

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await submitPassword();
      if (res.mustEnrollTotp) {
        navigate("/totp/enroll");
      } else {
        setMfaToken(res.mfaToken);
        setStep("totp");
      }
    } catch {
      // surfaced via passwordError
    }
  };

  const handleTotpSubmit = async (e) => {
    e.preventDefault();
    try {
      const loggedInUser = await submitTotp();
      toast.success(`Welcome back, ${loggedInUser.name}`);
      navigate(roleHome(loggedInUser));
    } catch {
      // surfaced via totpError
    }
  };

  return (
    <UniversityAuthShell
      eyebrow="Welcome back"
      title={step === "password" ? "Log in" : "Two-factor verification"}
      subtitle={
        step === "password"
          ? "Sign in with your officer account."
          : "Enter the 6-digit code from your authenticator app, or a backup code."
      }
    >
      {step === "password" ? (
        <>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordError && <ErrorBanner error={passwordError} />}
            <Field label="Work email" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@university.edu"
                autoFocus
                required
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>
            <div className="-mt-2 text-right">
              <Link to="/forgot-password" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full" loading={passwordLoading} icon={LogIn}>
              Continue
            </Button>
          </form>
          {/* <p className="mt-4 text-center text-sm text-ink-500">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">
              Register your university
            </Link>
          </p> */}
        </>
      ) : (
        <form onSubmit={handleTotpSubmit} className="space-y-4">
          {totpError && <ErrorBanner error={totpError} />}
          <Field label="Code" required>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              autoFocus
              required
            />
          </Field>
          <Button type="submit" className="w-full" loading={totpLoading} icon={ShieldCheck}>
            Verify
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setStep("password");
              setCode("");
            }}
          >
            Back
          </Button>
        </form>
      )}
    </UniversityAuthShell>
  );
}
