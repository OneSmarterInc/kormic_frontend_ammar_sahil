import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LogIn, ShieldCheck } from "lucide-react";
import AuthShell from "../../components/auth/AuthShell";
import { Field, Input } from "../../components/common/Input";
import PasswordInput from "../../components/common/PasswordInput";
import Button from "../../components/common/Button";
import ErrorBanner from "../../components/common/ErrorBanner";
import { useAuth } from "../../context/AuthContext";
import { useAction } from "../../hooks/useAsync";
import { roleHome } from "../../lib/constants";

export default function LoginPage() {
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
    <AuthShell
      eyebrow="Welcome back"
      title={step === "password" ? "Log in" : "Two-factor verification"}
      subtitle={
        step === "password"
          ? "Sign in with your superuser account."
          : "Enter the 6-digit code from your authenticator app, or a backup code."
      }
    >
      {step === "password" ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordError && <ErrorBanner error={passwordError} />}
          <Field label="Email" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@korgut.com"
              autoFocus
              required
            />
          </Field>
          <Field label="Password" required>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>
          <Button type="submit" className="w-full" loading={passwordLoading} icon={LogIn}>
            Continue
          </Button>
        </form>
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
    </AuthShell>
  );
}
