import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, Copy, CheckCircle2 } from "lucide-react";
import TopBar from "../../components/layout/TopBar";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import { Field, Input } from "../../components/common/Input";
import Button from "../../components/common/Button";
import ErrorBanner from "../../components/common/ErrorBanner";
import Spinner from "../../components/common/Spinner";
import { useAuth } from "../../context/AuthContext";
import { useAction, useAsync } from "../../hooks/useAsync";
import * as authApi from "../../api/authApi";
import { roleHome } from "../../lib/constants";

export default function TotpEnrollPage() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState(null);

  const { data: enrollment, loading: loadingEnrollment, error: enrollError } = useAsync(
    () => authApi.totpEnroll(),
    []
  );

  const { execute: confirm, loading: confirming, error: confirmError } = useAction(() =>
    authApi.totpVerifyEnrollment(code)
  );

  const handleConfirm = async (e) => {
    e.preventDefault();
    try {
      const res = await confirm();
      setBackupCodes(res.backup_codes);
    } catch {
      // surfaced via confirmError
    }
  };

  const handleContinue = async () => {
    const user = await refreshUser();
    navigate(roleHome(user));
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <TopBar />
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 sm:px-6">
        <Card className="w-full">
          <CardHeader
            icon={ShieldCheck}
            title="Set up two-factor authentication"
            subtitle="Required before you can use the app"
          />
          <CardBody>
            {backupCodes ? (
              <BackupCodes codes={backupCodes} onContinue={handleContinue} />
            ) : loadingEnrollment ? (
              <Spinner label="Preparing enrollment..." />
            ) : enrollError ? (
              <ErrorBanner error={enrollError} />
            ) : (
              <EnrollForm
                enrollment={enrollment}
                code={code}
                setCode={setCode}
                onSubmit={handleConfirm}
                loading={confirming}
                error={confirmError}
              />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function EnrollForm({ enrollment, code, setCode, onSubmit, loading, error }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-500">
        Scan this QR code with Google Authenticator, Authy, 1Password, or any TOTP app.
      </p>
      <div className="flex justify-center rounded-xl border border-ink-200 bg-white p-4">
        <QRCodeSVG value={enrollment.provisioning_uri} size={180} />
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-ink-500">Can't scan? Enter this key manually:</p>
        <code className="block rounded-lg bg-ink-100 px-3 py-2 text-xs text-ink-800 break-all">
          {enrollment.secret}
        </code>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorBanner error={error} />}
        <Field label="6-digit code" required>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            autoFocus
            required
          />
        </Field>
        <Button type="submit" className="w-full" loading={loading}>
          Confirm & enable
        </Button>
      </form>
    </div>
  );
}

function BackupCodes({ codes, onContinue }) {
  const copiedTimeout = useRef(null);
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    await navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    toast.success("Backup codes copied");
    clearTimeout(copiedTimeout.current);
    copiedTimeout.current = setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => () => clearTimeout(copiedTimeout.current), []);

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
        Save these backup codes somewhere safe — each works once, and this is the only time
        they'll be shown.
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-ink-200 bg-ink-50 p-3 font-mono text-sm text-ink-800">
        {codes.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      <Button variant="secondary" className="w-full" icon={copied ? CheckCircle2 : Copy} onClick={copyAll}>
        {copied ? "Copied" : "Copy all"}
      </Button>
      <Button className="w-full" onClick={onContinue}>
        Continue
      </Button>
    </div>
  );
}
