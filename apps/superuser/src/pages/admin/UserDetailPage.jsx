import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Building2,
  GraduationCap,
  KeyRound,
  Landmark,
  ListChecks,
  Power,
  ShieldOff,
  Trash2,
  UserRound,
  Wifi,
} from "lucide-react";
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
import {
  deleteUser,
  getUser,
  removeUserTotp,
  resetUserPassword,
  revokeUserSessions,
  setUserActive,
} from "../../api/superuserApi";
import { useAction, useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";

export default function UserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [resettingPassword, setResettingPassword] = useState(false);
  const [removingTotp, setRemovingTotp] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: account, loading, error, refetch, setData: setAccount } = useAsync(
    () => getUser(userId),
    [userId]
  );

  const isSelf = account && String(account.user_id) === String(currentUser.id);

  const { execute: toggleActive, loading: toggling } = useAction(() =>
    setUserActive(account.user_id, !account.is_active)
  );

  const { execute: doRemoveTotp, loading: removingTotpLoading, error: removeTotpError } = useAction(() =>
    removeUserTotp(account.user_id)
  );

  const { execute: doRevoke, loading: revokingLoading, error: revokeError } = useAction(() =>
    revokeUserSessions(account.user_id)
  );

  const { execute: doDelete, loading: deletingLoading, error: deleteError } = useAction(() =>
    deleteUser(account.user_id)
  );

  const handleToggleActive = async () => {
    try {
      const updated = await toggleActive();
      setAccount(updated);
      toast.success(updated.is_active ? "Account activated" : "Account deactivated");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRemoveTotp = async () => {
    try {
      const updated = await doRemoveTotp();
      setAccount(updated);
      toast.success("2FA removed — user will be prompted to re-enroll on next login");
      setRemovingTotp(false);
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
          ? `${updated.revoked_sessions} session(s) revoked`
          : "No outstanding sessions to revoke"
      );
      setRevoking(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    try {
      await doDelete();
      toast.success("User removed");
      navigate("/admin/users");
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Spinner label="Loading user..." />;
  if (error) return <ErrorBanner error={error} onDismiss={refetch} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        onClick={() => navigate("/admin/users")}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to users
      </button>

      <PageHeader
        title={account.name || account.email}
        description={account.email}
        action={
          <Button
            variant="danger"
            icon={Trash2}
            disabled={isSelf}
            onClick={() => setDeleting(true)}
          >
            Delete account
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge tone={roleTone(account.role)} className="capitalize">
          {account.role}
          {isSelf && " (you)"}
        </Badge>
        <Badge tone={account.is_active ? "success" : "danger"}>
          {account.is_active ? "Active" : "Inactive"}
        </Badge>
        <Badge tone={account.totp_enrolled ? "brand" : "neutral"}>
          {account.totp_enrolled ? "2FA enrolled" : "2FA not enrolled"}
        </Badge>
        <Badge tone="neutral">Joined {formatDate(account.date_joined)}</Badge>
      </div>

      <Card>
        <CardHeader icon={UserRound} title="Account" subtitle={account.email} />
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
            {account.role === "student" && account.student_id && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Student profile</dt>
                <dd className="mt-0.5 text-sm">
                  <Link
                    to={`/admin/students/${account.student_id}`}
                    className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700"
                  >
                    <GraduationCap className="h-3.5 w-3.5" /> View student profile
                  </Link>
                </dd>
              </div>
            )}
            {account.role === "university" && account.university_id && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">University</dt>
                <dd className="mt-0.5 text-sm">
                  <Link
                    to={`/admin/universities/${account.university_id}`}
                    className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700"
                  >
                    <Building2 className="h-3.5 w-3.5" /> View university profile
                  </Link>
                </dd>
              </div>
            )}
            {account.role === "institute" && account.institute_id && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Institute</dt>
                <dd className="mt-0.5 text-sm">
                  <Link
                    to={`/admin/institutes/${account.institute_id}`}
                    className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700"
                  >
                    <Landmark className="h-3.5 w-3.5" /> View institute profile
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Security actions"
          subtitle="Manage this account's authentication state. Not for routine profile edits."
        />
        <CardBody className="space-y-3">
          <ActionRow
            icon={Power}
            title={account.is_active ? "Deactivate account" : "Activate account"}
            description={
              account.is_active
                ? "Prevents this account from logging in until reactivated."
                : "Restores this account's ability to log in."
            }
          >
            <Button
              variant="secondary"
              size="sm"
              disabled={isSelf}
              loading={toggling}
              onClick={handleToggleActive}
            >
              {account.is_active ? "Deactivate" : "Activate"}
            </Button>
          </ActionRow>

          <ActionRow
            icon={KeyRound}
            title="Reset password"
            description="Sets a new password directly and revokes every outstanding refresh token."
          >
            <Button variant="secondary" size="sm" onClick={() => setResettingPassword(true)}>
              Reset password
            </Button>
          </ActionRow>

          <ActionRow
            icon={ShieldOff}
            title="Remove 2FA"
            description="Deletes their TOTP device and backup codes — the only recovery path when someone's locked out."
          >
            <Button
              variant="secondary"
              size="sm"
              disabled={isSelf || !account.totp_enrolled}
              onClick={() => setRemovingTotp(true)}
            >
              Remove 2FA
            </Button>
          </ActionRow>

          <ActionRow
            icon={Wifi}
            title="Revoke sessions"
            description="Blacklists every outstanding refresh token, forcing re-authentication on other devices."
          >
            <Button variant="secondary" size="sm" onClick={() => setRevoking(true)}>
              Revoke sessions
            </Button>
          </ActionRow>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          icon={ListChecks}
          title="Audit trail"
          subtitle="Security actions performed on or by this account."
          action={
            <Link
              to={`/admin/audit-log?email=${encodeURIComponent(account.email)}`}
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              View in audit log
            </Link>
          }
        />
      </Card>

      <ResetPasswordModal
        open={resettingPassword}
        onClose={() => setResettingPassword(false)}
        userId={account.user_id}
        onDone={(updated) => {
          setAccount(updated);
          setResettingPassword(false);
        }}
      />

      <ConfirmModal
        open={removingTotp}
        onClose={() => setRemovingTotp(false)}
        onConfirm={handleRemoveTotp}
        loading={removingTotpLoading}
        error={removeTotpError}
        tone="danger"
        title="Remove 2FA"
        confirmLabel="Remove 2FA"
        description={`${account.email} will be signed out of their authenticator and required to re-enroll TOTP on their next login.`}
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
        description={`Every outstanding refresh token for ${account.email} will be blacklisted. Their current access token (if any) still works until it naturally expires.`}
      />

      <ConfirmModal
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={handleDelete}
        loading={deletingLoading}
        error={deleteError}
        title="Delete account"
        confirmLabel="Delete permanently"
        description={`This removes ${account.email}'s login only. Any StudentProfile or University row they're linked to is kept — use the Students or Universities page for a full purge.`}
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
  const { execute, loading, error, setError } = useAction(() => resetUserPassword(userId, password));

  const handleClose = () => {
    setPassword("");
    setError(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updated = await execute();
      toast.success("Password reset — user's other sessions were signed out");
      setPassword("");
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
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
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
