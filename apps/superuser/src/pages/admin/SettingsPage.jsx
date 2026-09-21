import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { KeyRound, ShieldOff, UserRound, Wifi } from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import Badge, { roleTone } from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import ConfirmModal from "../../components/common/ConfirmModal";
import { Field } from "../../components/common/Input";
import PasswordInput from "../../components/common/PasswordInput";
import { getUser, removeUserTotp, resetUserPassword, revokeUserSessions } from "../../api/superuserApi";
import { useAction, useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [resettingPassword, setResettingPassword] = useState(false);
  const [resettingTotp, setResettingTotp] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const { data: account, loading, error, refetch, setData: setAccount } = useAsync(
    () => getUser(currentUser.id),
    [currentUser.id]
  );

  const { execute: doResetTotp, loading: resettingTotpLoading, error: resetTotpError } = useAction(() =>
    removeUserTotp(currentUser.id)
  );

  const { execute: doRevoke, loading: revokingLoading, error: revokeError } = useAction(() =>
    revokeUserSessions(currentUser.id)
  );

  const handleResetTotp = async () => {
    try {
      await doResetTotp();
      toast.success("2FA reset — let's re-enroll now");
      navigate("/totp/enroll");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRevoke = async () => {
    try {
      const updated = await doRevoke();
      setAccount(updated);
      toast.success(
        updated.revoked_sessions
          ? `${updated.revoked_sessions} other session(s) revoked`
          : "No outstanding sessions to revoke"
      );
      setRevoking(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Spinner label="Loading settings..." />;
  if (error) return <ErrorBanner error={error} onDismiss={refetch} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Your own account — separate from the users you manage." />

      <div className="flex flex-wrap gap-2">
        <Badge tone={roleTone(account.role)} className="capitalize">
          {account.role}
        </Badge>
        <Badge tone={account.totp_enrolled ? "brand" : "neutral"}>
          {account.totp_enrolled ? "2FA enrolled" : "2FA not enrolled"}
        </Badge>
        <Badge tone="neutral">Joined {formatDate(account.date_joined)}</Badge>
      </div>

      <Card>
        <CardHeader icon={UserRound} title="Your info" subtitle={account.email} />
        <CardBody>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Name</dt>
              <dd className="mt-0.5 text-sm text-ink-800">{account.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Email</dt>
              <dd className="mt-0.5 text-sm text-ink-800 break-words">{account.email}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Security" subtitle="Manage your own authentication state." />
        <CardBody className="space-y-3">
          <ActionRow
            icon={KeyRound}
            title="Reset password"
            description="Sets a new password directly and revokes every other outstanding session."
          >
            <Button variant="secondary" size="sm" onClick={() => setResettingPassword(true)}>
              Reset password
            </Button>
          </ActionRow>

          <ActionRow
            icon={ShieldOff}
            title="Reset 2FA"
            description="Removes your current authenticator and immediately walks you through re-enrolling."
          >
            <Button variant="secondary" size="sm" onClick={() => setResettingTotp(true)}>
              Reset 2FA
            </Button>
          </ActionRow>

          <ActionRow
            icon={Wifi}
            title="Revoke sessions"
            description="Blacklists every other outstanding refresh token, signing you out on other devices."
          >
            <Button variant="secondary" size="sm" onClick={() => setRevoking(true)}>
              Revoke sessions
            </Button>
          </ActionRow>
        </CardBody>
      </Card>

      <ResetPasswordModal
        open={resettingPassword}
        onClose={() => setResettingPassword(false)}
        userId={currentUser.id}
        onDone={(updated) => {
          setAccount(updated);
          setResettingPassword(false);
        }}
      />

      <ConfirmModal
        open={resettingTotp}
        onClose={() => setResettingTotp(false)}
        onConfirm={handleResetTotp}
        loading={resettingTotpLoading}
        error={resetTotpError}
        tone="danger"
        title="Reset 2FA"
        confirmLabel="Reset 2FA"
        description="This removes your authenticator and backup codes right now — you'll be taken straight to re-enrollment so you aren't locked out."
      />

      <ConfirmModal
        open={revoking}
        onClose={() => setRevoking(false)}
        onConfirm={handleRevoke}
        loading={revokingLoading}
        error={revokeError}
        tone="danger"
        title="Revoke sessions"
        confirmLabel="Revoke sessions"
        description="Every other outstanding refresh token on your account will be blacklisted. This session stays signed in until its access token naturally expires."
      />
    </div>
  );
}

function ActionRow({ icon: Icon, title, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-ink-100 bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink-900">{title}</p>
          <p className="text-xs text-ink-500">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ResetPasswordModal({ open, onClose, userId, onDone }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { execute, loading, error, setError } = useAction(() => resetUserPassword(userId, password));

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const reset = () => {
    setPassword("");
    setConfirmPassword("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mismatch) return;
    try {
      const updated = await execute();
      toast.success("Password reset — your other sessions were signed out");
      reset();
      onDone(updated);
    } catch {
      // surfaced via error
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Reset password"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Reset password
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner error={error} />}
        <Field label="New password" required hint="Must pass Django's password validators.">
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
        </Field>
        <Field label="Confirm new password" required error={mismatch ? "Passwords don't match" : undefined}>
          <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </Field>
      </form>
    </Modal>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}
