import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import UniversityAuthShell from "../../components/auth/UniversityAuthShell";
import { Field, Input } from "../../components/common/Input";
import Button from "../../components/common/Button";
import ErrorBanner from "../../components/common/ErrorBanner";
import { useAction } from "../../hooks/useAsync";
import { confirmResetPassword, forgotPassword, verifyResetOtp } from "../../api/authApi";

const RESEND_COOLDOWN_SECONDS = 60;

// DRF field-validation errors look like {"new_password": ["..."]}; general failures use
// {"detail": "..."}. Split them apart so each field can show its own error.
function fieldErrors(error) {
  if (!error?.data || typeof error.data !== "object") return {};
  const { message: _message, detail: _detail, error: _err, ...rest } = error.data;
  return rest;
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // email -> otp -> password -> done
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmMismatch, setConfirmMismatch] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const {
    execute: submitEmail,
    loading: emailLoading,
    error: emailError,
  } = useAction(() => forgotPassword(email));

  const {
    execute: submitOtp,
    loading: otpLoading,
    error: otpError,
    setError: setOtpError,
  } = useAction(() => verifyResetOtp(email, otp));

  const {
    execute: submitPassword,
    loading: passwordLoading,
    error: passwordError,
  } = useAction(() => confirmResetPassword(resetToken, newPassword));

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitEmail();
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStep("otp");
    } catch {
      // surfaced via emailError
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await submitEmail();
      setOtp("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success("A new code is on its way if the address is on file.");
    } catch {
      // surfaced via emailError
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await submitOtp();
      setResetToken(res.reset_token);
      setStep("password");
    } catch (err) {
      // 5 wrong attempts in a row — the code is dead, send the user back for a fresh one.
      if (err?.status === 429) {
        setOtp("");
        setOtpError(null);
        setStep("email");
        toast.error("Too many incorrect attempts. Request a new code.");
      }
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setConfirmMismatch(true);
      return;
    }
    setConfirmMismatch(false);
    try {
      await submitPassword();
      toast.success("Password reset. Please log in again.");
      navigate("/login", { replace: true });
    } catch (err) {
      // reset_token expired/invalid/already used — nothing left to do here but start over.
      if (err?.status === 401) {
        setStep("email");
        setOtp("");
        setResetToken(null);
        setNewPassword("");
        setConfirmPassword("");
      }
    }
  };

  const passwordErrors = fieldErrors(passwordError);

  return (
    <UniversityAuthShell
      eyebrow="Account recovery"
      title={
        step === "email"
          ? "Reset your password"
          : step === "otp"
          ? "Check your inbox"
          : "Choose a new password"
      }
      subtitle={
        step === "email"
          ? "Enter your work email and we'll send you a one-time code."
          : step === "otp"
          ? `Enter the 6-digit code we sent to ${email || "your email"}.`
          : "This code was valid — set a new password to finish."
      }
    >
      {step === "email" && (
        <>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {emailError && <ErrorBanner error={emailError} />}
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
            <Button type="submit" className="w-full" loading={emailLoading} icon={Mail}>
              Send code
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-ink-500">
            Remembered it?{" "}
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Back to log in
            </Link>
          </p>
        </>
      )}

      {step === "otp" && (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          {otpError && otpError.status !== 429 && (
            <ErrorBanner
              error={
                otpError.status === 400
                  ? { ...otpError, message: "Invalid or expired code." }
                  : otpError
              }
            />
          )}
          <Field label="6-digit code" required>
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
            />
          </Field>
          <Button
            type="submit"
            className="w-full"
            loading={otpLoading}
            icon={ShieldCheck}
            disabled={otp.length !== 6}
          >
            Verify code
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="font-medium text-ink-500 hover:text-ink-700"
              onClick={() => {
                setStep("email");
                setOtp("");
              }}
            >
              Use a different email
            </button>
            <button
              type="button"
              className="font-medium text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-ink-300"
              onClick={handleResend}
              disabled={cooldown > 0 || emailLoading}
            >
              {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
            </button>
          </div>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordError && passwordError.status !== 400 && <ErrorBanner error={passwordError} />}
          <Field label="New password" required error={passwordErrors.new_password?.[0]}>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
              required
            />
          </Field>
          <Field
            label="Confirm new password"
            required
            error={confirmMismatch ? "Passwords don't match." : undefined}
          >
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setConfirmMismatch(false);
              }}
              required
            />
          </Field>
          <Button type="submit" className="w-full" loading={passwordLoading} icon={KeyRound}>
            Reset password
          </Button>
        </form>
      )}
    </UniversityAuthShell>
  );
}
